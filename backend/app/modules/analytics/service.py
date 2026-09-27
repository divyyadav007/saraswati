"""
Analytics service: server-side aggregations for dashboard and sales reports.
Per docs/11-ADMIN-PANEL.md §3 and docs/06-API-SPECIFICATION.md.
"""
import csv
import io
from datetime import date, datetime, time, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.catalog import Product, ProductVariant
from app.db.models.orders import Order, OrderItem
from app.modules.analytics.schemas import (
    DashboardSummaryResponse,
    LowStockItem,
    SalesGroupItem,
    SalesReportResponse,
    SalesReportSummary,
    TodayMetrics,
)


class AnalyticsService:
    @staticmethod
    async def get_dashboard_summary(db: AsyncSession) -> DashboardSummaryResponse:
        """
        Calculates today's operational and financial metrics.
        Follows strict financial accounting rules:
        - Excludes CANCELLED orders
        - Only counts revenue from PAID/CAPTURED online payments or active COD orders
        """
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)

        # 1. Today's orders & revenue query
        # Filter for revenue eligibility:
        # Online paid or COD active orders
        revenue_filter = and_(
            Order.created_at >= today_start,
            Order.status.not_in(["CANCELLED"]),
            (
                Order.payment_status.in_(["PAID", "CAPTURED"])
                | (
                    (Order.payment_method == "COD")
                    & Order.status.in_(["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"])
                )
            ),
        )

        today_query = select(
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("revenue_sum"),
        ).where(revenue_filter)

        today_res = (await db.execute(today_query)).one()
        today_orders = int(today_res.order_count or 0)
        today_revenue = float(today_res.revenue_sum or 0.0)
        avg_order_val = round(today_revenue / today_orders, 2) if today_orders > 0 else 0.0

        # 2. Pending orders count (any active, non-delivered, non-cancelled order)
        pending_query = select(func.count(Order.id)).where(
            Order.status.in_(["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"])
        )
        pending_orders = int((await db.execute(pending_query)).scalar() or 0)

        # 3. Orders awaiting action (PENDING state)
        awaiting_query = select(func.count(Order.id)).where(Order.status == "PENDING")
        orders_awaiting_action = int((await db.execute(awaiting_query)).scalar() or 0)

        # 4. Total active products count
        active_products_query = select(func.count(Product.id)).where(Product.is_active.is_(True))
        total_active_products = int((await db.execute(active_products_query)).scalar() or 0)

        # 5. Low stock variants
        low_stock_query = (
            select(ProductVariant, Product.name.label("product_name"))
            .join(Product, ProductVariant.product_id == Product.id)
            .where(
                ProductVariant.is_active.is_(True),
                (
                    (ProductVariant.stock_status == "LOW_STOCK")
                    | (
                        ProductVariant.stock_quantity.is_not(None)
                        & (ProductVariant.stock_quantity <= 5)
                    )
                ),
            )
            .limit(20)
        )
        low_stock_rows = (await db.execute(low_stock_query)).all()
        low_stock_items = [
            LowStockItem(
                variant_id=str(row[0].id),
                product_id=str(row[0].product_id),
                product_name=str(row[1]),
                variant_label=row[0].label,
                stock_quantity=row[0].stock_quantity,
                stock_status=row[0].stock_status,
                sku=row[0].sku,
            )
            for row in low_stock_rows
        ]

        return DashboardSummaryResponse(
            today=TodayMetrics(
                orders=today_orders,
                revenue=today_revenue,
                average_order_value=avg_order_val,
            ),
            pending_orders=pending_orders,
            orders_awaiting_action=orders_awaiting_action,
            total_active_products=total_active_products,
            low_stock_items=low_stock_items,
        )

    @staticmethod
    async def get_sales_report(
        db: AsyncSession,
        start_date: date,
        end_date: date,
        group_by: str = "category",
    ) -> SalesReportResponse:
        """
        Generates sales performance report aggregated by Category or Product.
        Excludes cancelled and payment-failed orders.
        """
        start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

        # Base query for eligible orders in range
        order_filter = and_(
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
            Order.status.not_in(["CANCELLED"]),
            Order.payment_status.not_in(["FAILED"]),
        )

        orders_query = (
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.variant_rel).selectinload(ProductVariant.product).selectinload(Product.category)
            )
            .where(order_filter)
        )
        orders = (await db.execute(orders_query)).scalars().all()

        # Aggregation maps
        groups: dict[str, dict[str, Any]] = {}
        total_revenue = 0.0
        total_units = 0
        order_ids_counted = set()

        for order in orders:
            order_ids_counted.add(order.id)
            for item in order.items:
                total_units += item.quantity
                line_amount = float(item.line_total)
                total_revenue += line_amount

                if group_by == "product":
                    key = item.product_name_snapshot or "Unknown Product"
                else:  # category
                    if item.variant_rel and item.variant_rel.product and item.variant_rel.product.category:
                        key = item.variant_rel.product.category.name
                    elif item.gift_hamper_id:
                        key = "Gift Hampers"
                    else:
                        key = "General Sweets"

                if key not in groups:
                    groups[key] = {
                        "orders": set(),
                        "units": 0,
                        "revenue": 0.0,
                    }
                groups[key]["orders"].add(order.id)
                groups[key]["units"] += item.quantity
                groups[key]["revenue"] += line_amount

        items = [
            SalesGroupItem(
                group_key=k,
                total_orders=len(v["orders"]),
                total_units=v["units"],
                total_revenue=round(v["revenue"], 2),
            )
            for k, v in sorted(groups.items(), key=lambda x: x[1]["revenue"], reverse=True)
        ]

        total_orders = len(order_ids_counted)
        summary = SalesReportSummary(
            total_orders=total_orders,
            total_units=total_units,
            total_revenue=round(total_revenue, 2),
            average_order_value=round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0,
        )

        return SalesReportResponse(
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            group_by=group_by,
            summary=summary,
            items=items,
        )

    @staticmethod
    def generate_sales_csv(report: SalesReportResponse) -> str:
        """
        Builds RFC-4180 compliant CSV text from sales report data.
        """
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        group_header = "Category" if report.group_by == "category" else "Product"
        writer.writerow(["Date Range", f"{report.start_date} to {report.end_date}"])
        writer.writerow(["Grouped By", group_header])
        writer.writerow([])
        writer.writerow([group_header, "Total Orders", "Units Sold", "Revenue (INR)"])

        for item in report.items:
            writer.writerow([
                item.group_key,
                item.total_orders,
                item.total_units,
                f"{item.total_revenue:.2f}",
            ])

        writer.writerow([])
        writer.writerow([
            "TOTAL / SUMMARY",
            report.summary.total_orders,
            report.summary.total_units,
            f"{report.summary.total_revenue:.2f}",
        ])
        writer.writerow(["Average Order Value (INR)", f"{report.summary.average_order_value:.2f}"])

        return output.getvalue()
