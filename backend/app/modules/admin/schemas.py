"""
Schemas for Admin Customer Management.
Per docs/11-ADMIN-PANEL.md and docs/06-API-SPECIFICATION.md.
"""
from pydantic import BaseModel, ConfigDict


class CustomerOrderSummary(BaseModel):
    order_id: str
    order_number: str
    total_amount: float
    status: str
    created_at: str


class CustomerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str
    is_active: bool
    total_orders: int
    total_spend: float
    created_at: str


class CustomerListResponse(BaseModel):
    items: list[CustomerListItem]
    total: int
    page: int
    page_size: int


class CustomerDetailResponse(BaseModel):
    id: str
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str
    is_active: bool
    total_orders: int
    total_spend: float
    recent_orders: list[CustomerOrderSummary]
    created_at: str
