"""
Public Gift Hampers Router.
Per docs/06-API-SPECIFICATION.md §6.11
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.gift_hampers.schemas import (
    GiftHamperDetailResponse,
    PaginatedGiftHampersResponse,
)
from app.modules.gift_hampers.service import GiftHamperService

gift_hamper_router = APIRouter(prefix="/gift-hampers", tags=["Gift Hampers"])


@gift_hamper_router.get("", response_model=PaginatedGiftHampersResponse)
async def list_active_gift_hampers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Public customer endpoint listing all active festive gift hampers."""
    return await GiftHamperService.list_hampers(
        is_active=True,
        page=page,
        page_size=page_size,
        db=db,
    )


@gift_hamper_router.get("/{slug}", response_model=GiftHamperDetailResponse)
async def get_gift_hamper_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public customer endpoint viewing a gift hamper's details and constituent sweets."""
    return await GiftHamperService.get_hamper_by_slug(slug, db)
