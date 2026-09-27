"""
Offers and Banners Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.10, §6.18 and docs/05-DATABASE-SCHEMA.md §2.17–2.18
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Banner Schemas ────────────────────────────────────────────────────────────
class BannerCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    image_url: str = Field(..., min_length=5)
    link_type: str = Field(default="NONE", pattern=r"^(CATEGORY|PRODUCT|OFFER|URL|NONE)$")
    link_value: str | None = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class BannerUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=150)
    image_url: str | None = Field(None, min_length=5)
    link_type: str | None = Field(None, pattern=r"^(CATEGORY|PRODUCT|OFFER|URL|NONE)$")
    link_value: str | None = None
    display_order: int | None = Field(None, ge=0)
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class BannerResponse(BaseModel):
    id: uuid.UUID
    title: str
    image_url: str
    link_type: str
    link_value: str | None = None
    display_order: int
    is_active: bool
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Offer Schemas ─────────────────────────────────────────────────────────────
class OfferCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    image_url: str | None = None
    coupon_id: uuid.UUID | None = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class OfferUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=150)
    description: str | None = None
    image_url: str | None = None
    coupon_id: uuid.UUID | None = None
    display_order: int | None = Field(None, ge=0)
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class OfferResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    image_url: str | None = None
    coupon_id: uuid.UUID | None = None
    coupon_code: str | None = None
    display_order: int
    is_active: bool
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
