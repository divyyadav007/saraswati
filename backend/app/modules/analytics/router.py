"""
Admin Analytics & Reporting API Router.
Per docs/11-ADMIN-PANEL.md §3 and docs/06-API-SPECIFICATION.md §6.10.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.analytics.schemas import DashboardSummaryResponse, SalesReportResponse
from app.modules.analytics.service import AnalyticsService

admin_analytics_router = APIRouter(prefix="/admin", tags=["Admin Analytics"])


@admin_analytics_router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    summary="Get admin dashboard summary metrics",
    description="Returns today's orders, revenue, pending order count, and low stock items. Server-side aggregated.",
)
async def get_dashboard_summary(
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve operational and financial overview for staff and administrators."""
    return await AnalyticsService.get_dashboard_summary(db=db)


@admin_analytics_router.get(
    "/reports/sales",
    response_model=SalesReportResponse,
    summary="Get sales report aggregated by category or product",
    description="Calculates sales volume, units sold, and revenue across the specified date range.",
)
async def get_sales_report(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    group_by: str = Query("category", pattern="^(category|product)$"),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve structured sales performance data."""
    return await AnalyticsService.get_sales_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )


@admin_analytics_router.get(
    "/reports/sales/export",
    summary="Export sales report as CSV",
    description="Downloads a clean, server-side generated CSV of sales metrics for the date range.",
)
async def export_sales_report_csv(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    group_by: str = Query("category", pattern="^(category|product)$"),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download sales report CSV."""
    report = await AnalyticsService.get_sales_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )
    csv_content = AnalyticsService.generate_sales_csv(report)
    filename = f"sales_report_{start_date}_{end_date}_{group_by}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
