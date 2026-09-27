"""
Admin Offers & Banners Management Router.
Per docs/06-API-SPECIFICATION.md §6.18
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.offers_banners.schemas import (
    BannerCreateRequest,
    BannerResponse,
    BannerUpdateRequest,
    OfferCreateRequest,
    OfferResponse,
    OfferUpdateRequest,
)
from app.modules.offers_banners.service import OffersBannersService

admin_offers_banners_router = APIRouter(prefix="/admin", tags=["Admin — Offers & Banners"])


# ── Banners Admin ─────────────────────────────────────────────────────────────
@admin_offers_banners_router.get("/banners", response_model=list[BannerResponse])
async def admin_list_banners(
    is_active: bool | None = Query(None),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.admin_list_banners(is_active=is_active, db=db)


@admin_offers_banners_router.post(
    "/banners",
    response_model=BannerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_banner(
    payload: BannerCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.create_banner(payload=payload, db=db)


@admin_offers_banners_router.patch("/banners/{banner_id}", response_model=BannerResponse)
async def admin_update_banner(
    banner_id: uuid.UUID,
    payload: BannerUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.update_banner(banner_id=banner_id, payload=payload, db=db)


@admin_offers_banners_router.delete("/banners/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_banner(
    banner_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await OffersBannersService.delete_banner(banner_id=banner_id, db=db)


# ── Offers Admin ──────────────────────────────────────────────────────────────
@admin_offers_banners_router.get("/offers", response_model=list[OfferResponse])
async def admin_list_offers(
    is_active: bool | None = Query(None),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.admin_list_offers(is_active=is_active, db=db)


@admin_offers_banners_router.post(
    "/offers",
    response_model=OfferResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_offer(
    payload: OfferCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.create_offer(payload=payload, db=db)


@admin_offers_banners_router.patch("/offers/{offer_id}", response_model=OfferResponse)
async def admin_update_offer(
    offer_id: uuid.UUID,
    payload: OfferUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await OffersBannersService.update_offer(offer_id=offer_id, payload=payload, db=db)


@admin_offers_banners_router.delete("/offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_offer(
    offer_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    await OffersBannersService.delete_offer(offer_id=offer_id, db=db)
