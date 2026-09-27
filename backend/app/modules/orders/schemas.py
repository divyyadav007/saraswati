"""
Checkout and Orders Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.7, §6.14 and docs/03-FEATURE-SPECIFICATION.md §3
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.delivery.schemas import DeliveryAssignmentBrief


# ── Checkout Request & Response ───────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    address_id: uuid.UUID
    delivery_slot_id: uuid.UUID
    payment_method: str = Field(default="COD", pattern=r"^(COD|ONLINE)$")
    special_instructions: str | None = Field(None, max_length=500)
    packaging_notes: str | None = Field(None, max_length=500)
    coupon_code: str | None = Field(None, max_length=50)


# ── Order Schemas ─────────────────────────────────────────────────────────────
class OrderItemResponse(BaseModel):
    id: uuid.UUID
    item_type: str
    product_variant_id: uuid.UUID | None = None
    product_name_snapshot: str
    variant_label_snapshot: str | None = None
    unit_price: float
    quantity: int
    line_total: float

    model_config = {"from_attributes": True}


class DeliverySlotBrief(BaseModel):
    id: uuid.UUID
    slot_date: str
    start_time: str
    end_time: str
    label: str


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    user_id: uuid.UUID
    status: str
    payment_method: str
    payment_status: str
    subtotal: float
    discount_amount: float
    delivery_charge: float
    tax_amount: float
    total_amount: float
    address_snapshot: dict
    delivery_slot: DeliverySlotBrief | None = None
    special_instructions: str | None = None
    packaging_notes: str | None = None
    placed_at: datetime | None = None
    confirmed_at: datetime | None = None
    preparing_at: datetime | None = None
    ready_at: datetime | None = None
    out_for_delivery_at: datetime | None = None
    delivered_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    items: list[OrderItemResponse] = Field(default_factory=list)
    razorpay_order_id: str | None = None
    razorpay_key_id: str | None = None
    currency: str = "INR"
    delivery_assignment: DeliveryAssignmentBrief | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class OrderCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255)


class AdminOrderStatusUpdateRequest(BaseModel):
    status: str = Field(
        ...,
        pattern=r"^(CONFIRMED|PREPARING|READY_FOR_PICKUP|OUT_FOR_DELIVERY|DELIVERED|CANCELLED)$",
    )
    cancel_reason: str | None = None


class PaginatedOrdersResponse(BaseModel):
    items: list[OrderResponse]
    page: int
    page_size: int
    total_items: int
    total_pages: int
