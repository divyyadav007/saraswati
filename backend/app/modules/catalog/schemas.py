"""
Catalogue Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.2, §6.13 and docs/05-DATABASE-SCHEMA.md §2.4–2.7
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Category Schemas ──────────────────────────────────────────────────────────
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    slug: str | None = Field(None, max_length=150)
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class CategoryCreateRequest(CategoryBase):
    pass


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    slug: str | None = Field(None, max_length=150)
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    display_order: int | None = None
    is_active: bool | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    parent_id: uuid.UUID | None = None
    display_order: int
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Product Variant Schemas ───────────────────────────────────────────────────
class ProductVariantBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=100, description="e.g. 250g, 500g, 1kg, 1 pc")
    weight_grams: int | None = Field(None, ge=0)
    price: float = Field(..., gt=0, description="Selling price in INR")
    mrp: float | None = Field(None, gt=0, description="Maximum Retail Price in INR")
    sku: str | None = Field(None, max_length=100)
    stock_status: str = Field(default="IN_STOCK", pattern=r"^(IN_STOCK|LOW_STOCK|OUT_OF_STOCK)$")
    stock_quantity: int | None = Field(None, ge=0)
    is_active: bool = Field(default=True)


class ProductVariantCreateRequest(ProductVariantBase):
    pass


class ProductVariantUpdateRequest(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=100)
    weight_grams: int | None = Field(None, ge=0)
    price: float | None = Field(None, gt=0)
    mrp: float | None = Field(None, gt=0)
    sku: str | None = Field(None, max_length=100)
    stock_status: str | None = Field(None, pattern=r"^(IN_STOCK|LOW_STOCK|OUT_OF_STOCK)$")
    stock_quantity: int | None = Field(None, ge=0)
    is_active: bool | None = None


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    label: str
    weight_grams: int | None = None
    price: float
    mrp: float | None = None
    sku: str | None = None
    stock_status: str
    stock_quantity: int | None = None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Product Image Schemas ─────────────────────────────────────────────────────
class ProductImageCreateRequest(BaseModel):
    url: str = Field(..., min_length=1)
    storage_path: str = Field(..., min_length=1)
    is_primary: bool = Field(default=False)
    display_order: int = Field(default=0)


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    url: str
    storage_path: str
    is_primary: bool
    display_order: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Product Schemas ───────────────────────────────────────────────────────────
class ProductBase(BaseModel):
    category_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(None, max_length=200)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_active: bool = Field(default=True)
    is_featured: bool = Field(default=False)


class ProductCreateRequest(ProductBase):
    pass


class ProductUpdateRequest(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, max_length=200)
    description: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class ProductListItemResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str | None = None
    name: str
    slug: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_active: bool
    is_featured: bool
    primary_image_url: str | None = None
    starting_price: float | None = None
    min_price: float | None = None
    max_price: float | None = None
    variants: list[ProductVariantResponse] = Field(default_factory=list)
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductRatingSummary(BaseModel):
    average_rating: float = 0.0
    total_reviews: int = 0


class ProductDetailResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category: CategoryResponse | None = None
    name: str
    slug: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_active: bool
    is_featured: bool
    variants: list[ProductVariantResponse] = Field(default_factory=list)
    images: list[ProductImageResponse] = Field(default_factory=list)
    rating_summary: ProductRatingSummary = Field(default_factory=ProductRatingSummary)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Product Review Schemas ────────────────────────────────────────────────────
class ProductReviewResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    rating: int
    comment: str | None = None
    user_name: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
