"""
Store Settings API Router.
Per docs/11-ADMIN-PANEL.md §8 and docs/06-API-SPECIFICATION.md §6.10.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_admin, require_staff_or_admin
from app.db.session import get_db
from app.modules.store_settings.schemas import (
    StoreSettingResponse,
    StoreSettingUpdateRequest,
)
from app.modules.store_settings.service import StoreSettingsService

admin_store_settings_router = APIRouter(prefix="/admin/store-settings", tags=["Store Settings"])


@admin_store_settings_router.get(
    "",
    response_model=StoreSettingResponse,
    summary="Get current store operational settings",
)
async def get_store_settings(
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve operational settings including delivery charges, COD limits, and business hours."""
    setting = await StoreSettingsService.get_or_create_settings(db)
    return StoreSettingResponse(
        id=setting.id,
        store_name=setting.store_name,
        store_phone=setting.store_phone,
        store_email=setting.store_email,
        address_text=setting.address_text,
        cod_limit_amount=float(setting.cod_limit_amount),
        cod_enabled=setting.cod_enabled,
        tax_enabled=setting.tax_enabled,
        tax_rate_percent=float(setting.tax_rate_percent),
        delivery_charge_flat=float(setting.delivery_charge_flat),
        free_delivery_above=float(setting.free_delivery_above) if setting.free_delivery_above else None,
        serviceable_pincodes=setting.serviceable_pincodes,
        max_qty_per_cart_item=setting.max_qty_per_cart_item,
        business_hours=setting.business_hours,
        updated_at=setting.updated_at.isoformat() if setting.updated_at else "",
    )


@admin_store_settings_router.patch(
    "",
    response_model=StoreSettingResponse,
    summary="Update store operational settings",
    description="Updates operational thresholds. Restricted to administrators. Generates audit trail.",
)
async def update_store_settings(
    payload: StoreSettingUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only update of operational parameters."""
    setting = await StoreSettingsService.update_settings(
        db=db,
        payload=payload,
        actor_user_id=current_user.user_id,
    )
    return StoreSettingResponse(
        id=setting.id,
        store_name=setting.store_name,
        store_phone=setting.store_phone,
        store_email=setting.store_email,
        address_text=setting.address_text,
        cod_limit_amount=float(setting.cod_limit_amount),
        cod_enabled=setting.cod_enabled,
        tax_enabled=setting.tax_enabled,
        tax_rate_percent=float(setting.tax_rate_percent),
        delivery_charge_flat=float(setting.delivery_charge_flat),
        free_delivery_above=float(setting.free_delivery_above) if setting.free_delivery_above else None,
        serviceable_pincodes=setting.serviceable_pincodes,
        max_qty_per_cart_item=setting.max_qty_per_cart_item,
        business_hours=setting.business_hours,
        updated_at=setting.updated_at.isoformat() if setting.updated_at else "",
    )
