"""
Admin Coupons API Router.
Per docs/06-API-SPECIFICATION.md §6.18 and docs/08-SECURITY.md §13 (ADMIN role required).
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_admin
from app.db.session import get_db
from app.modules.coupons.schemas import (
    CouponCreateRequest,
    CouponResponse,
    CouponUpdateRequest,
)
from app.modules.coupons.service import CouponService

admin_coupon_router = APIRouter(prefix="/admin/coupons", tags=["Admin — Coupons & Promotions"])


@admin_coupon_router.get("", response_model=list[CouponResponse])
async def list_admin_coupons(
    is_active: bool | None = Query(None),
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all coupons (admin only)."""
    return await CouponService.list_coupons(is_active_only=is_active, db=db)


@admin_coupon_router.post(
    "",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_coupon(
    payload: CouponCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new promotional coupon (admin only)."""
    return await CouponService.create_coupon(payload=payload, db=db)


@admin_coupon_router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get coupon details by ID (admin only)."""
    return await CouponService.get_coupon(coupon_id=coupon_id, db=db)


@admin_coupon_router.patch("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: uuid.UUID,
    payload: CouponUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update coupon configuration (admin only)."""
    return await CouponService.update_coupon(coupon_id=coupon_id, payload=payload, db=db)


@admin_coupon_router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate coupon (soft delete, admin only)."""
    await CouponService.delete_coupon(coupon_id=coupon_id, db=db)
