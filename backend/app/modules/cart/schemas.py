"""
Cart Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.3 and docs/03-FEATURE-SPECIFICATION.md §2
"""
import uuid

from pydantic import BaseModel, Field


class CartItemAddRequest(BaseModel):
    product_variant_id: uuid.UUID | None = None
    gift_hamper_id: uuid.UUID | None = None
    quantity: int = Field(default=1, ge=1, le=50)


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=0, le=50, description="Set to 0 to remove item")


class CartGuestItem(BaseModel):
    product_variant_id: uuid.UUID | None = None
    gift_hamper_id: uuid.UUID | None = None
    quantity: int = Field(..., ge=1, le=50)


class CartMergeRequest(BaseModel):
    items: list[CartGuestItem] = Field(default_factory=list)


class CartItemResponse(BaseModel):
    id: uuid.UUID
    item_type: str = "PRODUCT"
    product_id: uuid.UUID | None = None
    product_variant_id: uuid.UUID | None = None
    gift_hamper_id: uuid.UUID | None = None
    product_name: str
    product_slug: str
    variant_label: str
    weight_grams: int | None = None
    unit_price: float
    mrp: float | None = None
    quantity: int
    line_total: float
    image_url: str | None = None
    stock_status: str
    is_available: bool


class CartResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    items: list[CartItemResponse]
    items_count: int
    subtotal: float
    delivery_charge: float
    free_delivery_above: float | None = None
    free_delivery_remaining: float | None = None
    estimated_total: float
    has_out_of_stock_items: bool
