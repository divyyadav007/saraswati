"""
Reviews Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.11, §6.18 and docs/05-DATABASE-SCHEMA.md §2.21
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    product_id: uuid.UUID | None = None
    product_variant_id: uuid.UUID | None = None
    order_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)


class ReviewModerationRequest(BaseModel):
    is_published: bool


class ReviewResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str | None = None
    user_id: uuid.UUID
    user_name: str | None = None
    order_id: uuid.UUID
    rating: int
    comment: str | None = None
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductReviewsSummaryResponse(BaseModel):
    average_rating: float
    total_reviews: int
    reviews: list[ReviewResponse]
