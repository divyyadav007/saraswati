"""
Offers and Banners Public API Router.
Per docs/06-API-SPECIFICATION.md §6.10
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.offers_banners.schemas import BannerResponse, OfferResponse
from app.modules.offers_banners.service import OffersBannersService

offers_banners_router = APIRouter(tags=["Offers & Banners (Public)"])


@offers_banners_router.get("/banners", response_model=list[BannerResponse])
async def list_active_banners(db: AsyncSession = Depends(get_db)):
    """List active promotional banners for storefront home display."""
    return await OffersBannersService.list_active_banners(db=db)


@offers_banners_router.get("/offers", response_model=list[OfferResponse])
async def list_active_offers(db: AsyncSession = Depends(get_db)):
    """List active sweetshop promotional deals and offers."""
    return await OffersBannersService.list_active_offers(db=db)
