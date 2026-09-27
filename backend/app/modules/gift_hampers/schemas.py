"""
Gift Hampers Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.11, §6.17 and docs/03-FEATURE-SPECIFICATION.md §6.2
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GiftHamperItemCreateRequest(BaseModel):
    product_id: uuid.UUID
    product_variant_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)


class GiftHamperItemResponse(BaseModel):
    id: uuid.UUID
    gift_hamper_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str | None = None
    product_variant_id: uuid.UUID
    variant_label: str | None = None
    quantity: int

    model_config = {"from_attributes": True}


class GiftHamperImageCreateRequest(BaseModel):
    url: str
    storage_path: str = ""
    is_primary: bool = False
    display_order: int = 0


class GiftHamperImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    storage_path: str
    is_primary: bool
    display_order: int

    model_config = {"from_attributes": True}


class GiftHamperCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str | None = None
    description: str | None = None
    hamper_price: float = Field(..., gt=0)
    is_active: bool = True
    items: list[GiftHamperItemCreateRequest] = Field(default_factory=list)
    images: list[GiftHamperImageCreateRequest] = Field(default_factory=list)


class GiftHamperUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    slug: str | None = None
    description: str | None = None
    hamper_price: float | None = Field(None, gt=0)
    is_active: bool | None = None


class GiftHamperResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    hamper_price: float
    is_active: bool
    primary_image_url: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class GiftHamperDetailResponse(GiftHamperResponse):
    images: list[GiftHamperImageResponse] = Field(default_factory=list)
    items: list[GiftHamperItemResponse] = Field(default_factory=list)


class PaginatedGiftHampersResponse(BaseModel):
    items: list[GiftHamperResponse]
    total: int
    page: int
    page_size: int
