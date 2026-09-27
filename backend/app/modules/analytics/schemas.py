"""
Analytics schemas for Admin Dashboard Summary and Sales Reports.
Per docs/11-ADMIN-PANEL.md and docs/06-API-SPECIFICATION.md.
"""
from pydantic import BaseModel, ConfigDict


class TodayMetrics(BaseModel):
    orders: int
    revenue: float
    average_order_value: float


class LowStockItem(BaseModel):
    variant_id: str
    product_id: str
    product_name: str
    variant_label: str
    stock_quantity: int | None = None
    stock_status: str
    sku: str | None = None


class DashboardSummaryResponse(BaseModel):
    today: TodayMetrics
    pending_orders: int
    orders_awaiting_action: int
    total_active_products: int
    low_stock_items: list[LowStockItem]


class SalesGroupItem(BaseModel):
    group_key: str
    total_orders: int
    total_units: int
    total_revenue: float


class SalesReportSummary(BaseModel):
    total_orders: int
    total_units: int
    total_revenue: float
    average_order_value: float


class SalesReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_date: str
    end_date: str
    group_by: str
    summary: SalesReportSummary
    items: list[SalesGroupItem]
