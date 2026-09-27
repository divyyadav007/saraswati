"""
Admin Gift Hampers Router.
Requires staff or admin privileges.
Per docs/06-API-SPECIFICATION.md §6.17
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.gift_hampers.schemas import (
    GiftHamperCreateRequest,
    GiftHamperDetailResponse,
    GiftHamperImageCreateRequest,
    GiftHamperItemCreateRequest,
    GiftHamperUpdateRequest,
    PaginatedGiftHampersResponse,
)
from app.modules.gift_hampers.service import GiftHamperService

admin_gift_hamper_router = APIRouter(prefix="/admin/gift-hampers", tags=["Admin — Gift Hampers"])


@admin_gift_hamper_router.get("", response_model=PaginatedGiftHampersResponse)
async def admin_list_gift_hampers(
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    """Staff/Admin endpoint listing all gift hampers including inactive/drafts."""
    return await GiftHamperService.list_hampers(
        is_active=is_active,
        page=page,
        page_size=page_size,
        db=db,
    )


@admin_gift_hamper_router.get("/{id}", response_model=GiftHamperDetailResponse)
async def admin_get_gift_hamper(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await GiftHamperService.get_hamper_by_id(id, db)


@admin_gift_hamper_router.post("", response_model=GiftHamperDetailResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_gift_hamper(
    payload: GiftHamperCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await GiftHamperService.create_hamper(payload, db)


@admin_gift_hamper_router.patch("/{id}", response_model=GiftHamperDetailResponse)
async def admin_update_gift_hamper(
    id: uuid.UUID,
    payload: GiftHamperUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await GiftHamperService.update_hamper(id, payload, db)


@admin_gift_hamper_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_gift_hamper(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    await GiftHamperService.delete_hamper(id, db)


@admin_gift_hamper_router.post("/{id}/items", response_model=GiftHamperDetailResponse, status_code=status.HTTP_201_CREATED)
async def admin_add_gift_hamper_item(
    id: uuid.UUID,
    payload: GiftHamperItemCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await GiftHamperService.add_hamper_item(id, payload, db)


@admin_gift_hamper_router.delete("/{id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_gift_hamper_item(
    id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    await GiftHamperService.delete_hamper_item(id, item_id, db)


@admin_gift_hamper_router.post("/{id}/images", response_model=GiftHamperDetailResponse, status_code=status.HTTP_201_CREATED)
async def admin_add_gift_hamper_image(
    id: uuid.UUID,
    payload: GiftHamperImageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await GiftHamperService.add_hamper_image(id, payload, db)


@admin_gift_hamper_router.delete("/{id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_gift_hamper_image(
    id: uuid.UUID,
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    await GiftHamperService.delete_hamper_image(id, image_id, db)
