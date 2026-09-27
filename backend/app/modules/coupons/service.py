"""
Coupons Business Logic & Validation Engine.
Per docs/06-API-SPECIFICATION.md §6.6, §6.18 and docs/03-FEATURE-SPECIFICATION.md §4.1
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import (
    BusinessRuleViolationError,
    ConflictError,
    NotFoundError,
)
from app.db.models.promotions import Coupon, CouponUsage
from app.modules.coupons.schemas import (
    CouponCreateRequest,
    CouponResponse,
    CouponUpdateRequest,
)


class CouponService:

    @staticmethod
    async def validate_coupon(
        code: str,
        subtotal: float,
        user_id: uuid.UUID,
        db: AsyncSession,
    ) -> tuple[Coupon, float]:
        """
        Validate coupon against active rules, validity dates, subtotal, and usage limits.
        Returns the coupon model and computed discount amount.
        """
        normalized_code = code.strip().upper()
        res = await db.execute(select(Coupon).filter(Coupon.code == normalized_code))
        coupon = res.scalar_one_or_none()

        if not coupon or not coupon.is_active:
            raise BusinessRuleViolationError("Invalid or inactive coupon code.")

        now_utc = datetime.now(timezone.utc)
        valid_from = (
            coupon.valid_from.replace(tzinfo=timezone.utc)
            if coupon.valid_from.tzinfo is None
            else coupon.valid_from
        )
        valid_until = (
            coupon.valid_until.replace(tzinfo=timezone.utc)
            if coupon.valid_until.tzinfo is None
            else coupon.valid_until
        )

        if now_utc < valid_from:
            raise BusinessRuleViolationError("This coupon is not active yet.")

        if now_utc > valid_until:
            raise BusinessRuleViolationError("This coupon has expired.")

        min_val = float(coupon.min_order_value)
        if subtotal < min_val:
            raise BusinessRuleViolationError(
                f"Minimum cart subtotal of ₹{min_val:.0f} required for coupon {coupon.code}."
            )

        # Check total usage limit
        if coupon.usage_limit_total is not None:
            total_usages_res = await db.execute(
                select(func.count(CouponUsage.id)).filter(CouponUsage.coupon_id == coupon.id)
            )
            total_usages = total_usages_res.scalar() or 0
            if total_usages >= coupon.usage_limit_total:
                raise BusinessRuleViolationError("Coupon usage limit has been reached.")

        # Check per-user usage limit
        user_usages_res = await db.execute(
            select(func.count(CouponUsage.id)).filter(
                CouponUsage.coupon_id == coupon.id,
                CouponUsage.user_id == user_id,
            )
        )
        user_usages = user_usages_res.scalar() or 0
        if user_usages >= coupon.usage_limit_per_user:
            raise BusinessRuleViolationError(
                f"You have already redeemed coupon {coupon.code} the maximum allowed times."
            )

        # Compute Discount Amount
        if coupon.type == "PERCENTAGE":
            discount = (subtotal * float(coupon.value)) / 100.0
            if coupon.max_discount_amount is not None:
                discount = min(discount, float(coupon.max_discount_amount))
            discount = min(discount, subtotal)
        elif coupon.type == "FLAT":
            discount = min(float(coupon.value), subtotal)
        else:
            discount = 0.0

        return coupon, round(discount, 2)

    @staticmethod
    async def list_coupons(
        is_active_only: bool | None,
        db: AsyncSession,
    ) -> list[CouponResponse]:
        query = select(Coupon).order_by(Coupon.created_at.desc())
        if is_active_only is not None:
            query = query.filter(Coupon.is_active == is_active_only)

        res = await db.execute(query)
        coupons = res.scalars().all()

        results = []
        for c in coupons:
            # Query usage count
            u_res = await db.execute(
                select(func.count(CouponUsage.id)).filter(CouponUsage.coupon_id == c.id)
            )
            usage_count = u_res.scalar() or 0
            results.append(
                CouponResponse(
                    id=c.id,
                    code=c.code,
                    type=c.type,
                    value=float(c.value),
                    min_order_value=float(c.min_order_value),
                    max_discount_amount=float(c.max_discount_amount) if c.max_discount_amount is not None else None,
                    usage_limit_total=c.usage_limit_total,
                    usage_limit_per_user=c.usage_limit_per_user,
                    valid_from=c.valid_from,
                    valid_until=c.valid_until,
                    is_active=c.is_active,
                    total_usages=usage_count,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )
        return results

    @staticmethod
    async def get_coupon(coupon_id: uuid.UUID, db: AsyncSession) -> CouponResponse:
        res = await db.execute(select(Coupon).filter(Coupon.id == coupon_id))
        c = res.scalar_one_or_none()
        if not c:
            raise NotFoundError(f"Coupon with ID {coupon_id} not found.")

        u_res = await db.execute(
            select(func.count(CouponUsage.id)).filter(CouponUsage.coupon_id == c.id)
        )
        usage_count = u_res.scalar() or 0
        return CouponResponse(
            id=c.id,
            code=c.code,
            type=c.type,
            value=float(c.value),
            min_order_value=float(c.min_order_value),
            max_discount_amount=float(c.max_discount_amount) if c.max_discount_amount is not None else None,
            usage_limit_total=c.usage_limit_total,
            usage_limit_per_user=c.usage_limit_per_user,
            valid_from=c.valid_from,
            valid_until=c.valid_until,
            is_active=c.is_active,
            total_usages=usage_count,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    @staticmethod
    async def create_coupon(payload: CouponCreateRequest, db: AsyncSession) -> CouponResponse:
        existing = await db.execute(select(Coupon).filter(Coupon.code == payload.code))
        if existing.scalar_one_or_none():
            raise ConflictError(f"Coupon with code '{payload.code}' already exists.")

        if payload.valid_from >= payload.valid_until:
            raise BusinessRuleViolationError("Coupon valid_from must be earlier than valid_until.")

        coupon = Coupon(
            code=payload.code,
            type=payload.type,
            value=payload.value,
            min_order_value=payload.min_order_value,
            max_discount_amount=payload.max_discount_amount,
            usage_limit_total=payload.usage_limit_total,
            usage_limit_per_user=payload.usage_limit_per_user,
            valid_from=payload.valid_from,
            valid_until=payload.valid_until,
            is_active=payload.is_active,
        )
        db.add(coupon)
        await db.commit()
        await db.refresh(coupon)

        return CouponResponse(
            id=coupon.id,
            code=coupon.code,
            type=coupon.type,
            value=float(coupon.value),
            min_order_value=float(coupon.min_order_value),
            max_discount_amount=float(coupon.max_discount_amount) if coupon.max_discount_amount is not None else None,
            usage_limit_total=coupon.usage_limit_total,
            usage_limit_per_user=coupon.usage_limit_per_user,
            valid_from=coupon.valid_from,
            valid_until=coupon.valid_until,
            is_active=coupon.is_active,
            total_usages=0,
            created_at=coupon.created_at,
            updated_at=coupon.updated_at,
        )

    @staticmethod
    async def update_coupon(
        coupon_id: uuid.UUID,
        payload: CouponUpdateRequest,
        db: AsyncSession,
    ) -> CouponResponse:
        res = await db.execute(select(Coupon).filter(Coupon.id == coupon_id))
        coupon = res.scalar_one_or_none()
        if not coupon:
            raise NotFoundError(f"Coupon with ID {coupon_id} not found.")

        data = payload.model_dump(exclude_unset=True)
        if "code" in data and data["code"] != coupon.code:
            existing = await db.execute(select(Coupon).filter(Coupon.code == data["code"]))
            if existing.scalar_one_or_none():
                raise ConflictError(f"Coupon with code '{data['code']}' already exists.")

        for key, val in data.items():
            setattr(coupon, key, val)

        await db.commit()
        await db.refresh(coupon)
        return await CouponService.get_coupon(coupon.id, db)

    @staticmethod
    async def delete_coupon(coupon_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(Coupon).filter(Coupon.id == coupon_id))
        coupon = res.scalar_one_or_none()
        if not coupon:
            raise NotFoundError(f"Coupon with ID {coupon_id} not found.")

        # Soft delete: deactive
        coupon.is_active = False
        await db.commit()
