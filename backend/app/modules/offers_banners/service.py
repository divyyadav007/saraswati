"""
Offers and Banners Service Layer.
Per docs/06-API-SPECIFICATION.md §6.10, §6.18 and docs/05-DATABASE-SCHEMA.md §2.17–2.18
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError
from app.db.models.promotions import Banner, Coupon, Offer
from app.modules.offers_banners.schemas import (
    BannerCreateRequest,
    BannerResponse,
    BannerUpdateRequest,
    OfferCreateRequest,
    OfferResponse,
    OfferUpdateRequest,
)


class OffersBannersService:

    # ── Banners ───────────────────────────────────────────────────────────────
    @staticmethod
    async def list_active_banners(db: AsyncSession) -> list[BannerResponse]:
        now_utc = datetime.now(timezone.utc)
        query = (
            select(Banner)
            .filter(
                Banner.is_active.is_(True),
                or_(Banner.starts_at.is_(None), Banner.starts_at <= now_utc),
                or_(Banner.ends_at.is_(None), Banner.ends_at >= now_utc),
            )
            .order_by(Banner.display_order.asc(), Banner.created_at.desc())
        )
        res = await db.execute(query)
        banners = res.scalars().all()
        return [BannerResponse.model_validate(b) for b in banners]

    @staticmethod
    async def admin_list_banners(
        is_active: bool | None,
        db: AsyncSession,
    ) -> list[BannerResponse]:
        query = select(Banner).order_by(Banner.display_order.asc(), Banner.created_at.desc())
        if is_active is not None:
            query = query.filter(Banner.is_active == is_active)
        res = await db.execute(query)
        banners = res.scalars().all()
        return [BannerResponse.model_validate(b) for b in banners]

    @staticmethod
    async def create_banner(payload: BannerCreateRequest, db: AsyncSession) -> BannerResponse:
        banner = Banner(
            title=payload.title.strip(),
            image_url=payload.image_url.strip(),
            link_type=payload.link_type,
            link_value=payload.link_value.strip() if payload.link_value else None,
            display_order=payload.display_order,
            is_active=payload.is_active,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
        )
        db.add(banner)
        await db.commit()
        await db.refresh(banner)
        return BannerResponse.model_validate(banner)

    @staticmethod
    async def update_banner(
        banner_id: uuid.UUID,
        payload: BannerUpdateRequest,
        db: AsyncSession,
    ) -> BannerResponse:
        res = await db.execute(select(Banner).filter(Banner.id == banner_id))
        banner = res.scalar_one_or_none()
        if not banner:
            raise NotFoundError(f"Banner with ID {banner_id} not found.")

        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(banner, key, val)

        await db.commit()
        await db.refresh(banner)
        return BannerResponse.model_validate(banner)

    @staticmethod
    async def delete_banner(banner_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(Banner).filter(Banner.id == banner_id))
        banner = res.scalar_one_or_none()
        if not banner:
            raise NotFoundError(f"Banner with ID {banner_id} not found.")
        await db.delete(banner)
        await db.commit()

    # ── Offers ────────────────────────────────────────────────────────────────
    @staticmethod
    async def list_active_offers(db: AsyncSession) -> list[OfferResponse]:
        now_utc = datetime.now(timezone.utc)
        query = (
            select(Offer)
            .filter(
                Offer.is_active.is_(True),
                or_(Offer.starts_at.is_(None), Offer.starts_at <= now_utc),
                or_(Offer.ends_at.is_(None), Offer.ends_at >= now_utc),
            )
            .order_by(Offer.display_order.asc(), Offer.created_at.desc())
        )
        res = await db.execute(query)
        offers = res.scalars().all()
        return [await OffersBannersService._map_offer_response(o, db) for o in offers]

    @staticmethod
    async def admin_list_offers(
        is_active: bool | None,
        db: AsyncSession,
    ) -> list[OfferResponse]:
        query = select(Offer).order_by(Offer.display_order.asc(), Offer.created_at.desc())
        if is_active is not None:
            query = query.filter(Offer.is_active == is_active)
        res = await db.execute(query)
        offers = res.scalars().all()
        return [await OffersBannersService._map_offer_response(o, db) for o in offers]

    @staticmethod
    async def create_offer(payload: OfferCreateRequest, db: AsyncSession) -> OfferResponse:
        offer = Offer(
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            image_url=payload.image_url.strip() if payload.image_url else None,
            coupon_id=payload.coupon_id,
            display_order=payload.display_order,
            is_active=payload.is_active,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
        )
        db.add(offer)
        await db.commit()
        await db.refresh(offer)
        return await OffersBannersService._map_offer_response(offer, db)

    @staticmethod
    async def update_offer(
        offer_id: uuid.UUID,
        payload: OfferUpdateRequest,
        db: AsyncSession,
    ) -> OfferResponse:
        res = await db.execute(select(Offer).filter(Offer.id == offer_id))
        offer = res.scalar_one_or_none()
        if not offer:
            raise NotFoundError(f"Offer with ID {offer_id} not found.")

        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(offer, key, val)

        await db.commit()
        await db.refresh(offer)
        return await OffersBannersService._map_offer_response(offer, db)

    @staticmethod
    async def delete_offer(offer_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(Offer).filter(Offer.id == offer_id))
        offer = res.scalar_one_or_none()
        if not offer:
            raise NotFoundError(f"Offer with ID {offer_id} not found.")
        await db.delete(offer)
        await db.commit()

    @staticmethod
    async def _map_offer_response(offer: Offer, db: AsyncSession) -> OfferResponse:
        coupon_code = None
        if offer.coupon_id:
            c_res = await db.execute(select(Coupon.code).filter(Coupon.id == offer.coupon_id))
            coupon_code = c_res.scalar_one_or_none()

        return OfferResponse(
            id=offer.id,
            title=offer.title,
            description=offer.description,
            image_url=offer.image_url,
            coupon_id=offer.coupon_id,
            coupon_code=coupon_code,
            display_order=offer.display_order,
            is_active=offer.is_active,
            starts_at=offer.starts_at,
            ends_at=offer.ends_at,
            created_at=offer.created_at,
            updated_at=offer.updated_at,
        )
