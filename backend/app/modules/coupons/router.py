"""
Coupons Customer Router.
Per docs/06-API-SPECIFICATION.md §6.6
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.modules.coupons.schemas import CouponValidateRequest, CouponValidateResponse
from app.modules.coupons.service import CouponService

coupon_router = APIRouter(prefix="/coupons", tags=["Coupons & Discounts"])


@coupon_router.post("/validate", response_model=CouponValidateResponse)
@limiter.limit("15/minute")
async def validate_coupon(
    request: Request,
    payload: CouponValidateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a coupon code against customer cart total.
    Returns preview discount amount or error explanation.
    """
    try:
        coupon, discount = await CouponService.validate_coupon(
            code=payload.code,
            subtotal=payload.cart_total,
            user_id=current_user.user_id,
            db=db,
        )
        return CouponValidateResponse(
            is_valid=True,
            code=coupon.code,
            discount_amount=discount,
            message=f"Coupon {coupon.code} applied! Saved ₹{discount:.2f}",
            coupon_id=coupon.id,
        )
    except Exception as exc:
        return CouponValidateResponse(
            is_valid=False,
            code=payload.code,
            discount_amount=0.0,
            message=str(exc),
            coupon_id=None,
        )
