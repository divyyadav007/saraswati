"""
Admin Reviews Moderation API Router.
Per docs/06-API-SPECIFICATION.md §6.18
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.reviews.schemas import ReviewModerationRequest, ReviewResponse
from app.modules.reviews.service import ReviewService

admin_review_router = APIRouter(prefix="/admin/reviews", tags=["Admin — Review Moderation"])


@admin_review_router.get("", response_model=list[ReviewResponse])
async def list_admin_reviews(
    is_published: bool | None = Query(None),
    product_id: uuid.UUID | None = Query(None),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """List customer reviews for moderation, optionally filtered by published status or product."""
    return await ReviewService.admin_list_reviews(
        is_published=is_published,
        product_id=product_id,
        db=db,
    )


@admin_review_router.patch("/{review_id}/moderation", response_model=ReviewResponse)
async def moderate_review(
    review_id: uuid.UUID,
    payload: ReviewModerationRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve or unpublish a customer review."""
    return await ReviewService.moderate_review(
        review_id=review_id,
        is_published=payload.is_published,
        db=db,
    )


@admin_review_router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a review (admin/staff only)."""
    await ReviewService.delete_review(review_id=review_id, db=db)
