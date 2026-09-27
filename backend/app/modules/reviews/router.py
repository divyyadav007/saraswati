"""
Customer Reviews Router.
Per docs/06-API-SPECIFICATION.md §6.11
"""
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.modules.reviews.schemas import (
    ProductReviewsSummaryResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from app.modules.reviews.service import ReviewService

review_router = APIRouter(prefix="/reviews", tags=["Customer Reviews"])


@review_router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
async def submit_product_review(
    request: Request,
    payload: ReviewCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a review for a delivered product.
    Gated on verified purchase from an order in DELIVERED status.
    Review is queued for admin moderation before public display.
    """
    return await ReviewService.submit_review(
        user_id=current_user.user_id,
        payload=payload,
        db=db,
    )


@review_router.get(
    "/product/{product_id}",
    response_model=ProductReviewsSummaryResponse,
)
async def get_product_reviews(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get published reviews and average rating statistics for a product.
    """
    return await ReviewService.list_product_reviews(product_id=product_id, db=db)
