"""
Store Settings Service.
Manages global store parameters and creates audit trail for setting updates.
Per docs/11-ADMIN-PANEL.md §8 and docs/08-SECURITY.md §9.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.audit import log_audit_event
from app.db.models.operations import StoreSetting
from app.modules.store_settings.schemas import StoreSettingUpdateRequest


class StoreSettingsService:
    @staticmethod
    async def get_or_create_settings(db: AsyncSession) -> StoreSetting:
        """Fetch existing store settings singleton or create initial defaults."""
        stmt = select(StoreSetting).where(StoreSetting.id == 1)
        setting = (await db.execute(stmt)).scalar_one_or_none()

        if not setting:
            setting = StoreSetting(
                id=1,
                store_name="Saraswati Sweets",
                store_phone="+919999999999",
                store_email="info@saraswatisweets.com",
                address_text="Barabanki, Uttar Pradesh",
                cod_limit_amount=5000.0,
                cod_enabled=True,
                tax_enabled=False,
                tax_rate_percent=0.0,
                delivery_charge_flat=0.0,
                free_delivery_above=None,
                serviceable_pincodes=["225001", "225002", "225003"],
                max_qty_per_cart_item=20,
                business_hours={"opening": "08:00", "closing": "22:00", "timezone": "Asia/Kolkata"},
            )
            db.add(setting)
            await db.commit()
            await db.refresh(setting)

        return setting

    @staticmethod
    async def update_settings(
        db: AsyncSession,
        payload: StoreSettingUpdateRequest,
        actor_user_id: uuid.UUID,
    ) -> StoreSetting:
        """
        Updates allowed store operational settings and records audit log.
        """
        setting = await StoreSettingsService.get_or_create_settings(db)

        # Snapshot before data
        before_data = {
            "store_name": setting.store_name,
            "store_phone": setting.store_phone,
            "store_email": setting.store_email,
            "address_text": setting.address_text,
            "cod_limit_amount": float(setting.cod_limit_amount),
            "cod_enabled": setting.cod_enabled,
            "delivery_charge_flat": float(setting.delivery_charge_flat),
            "free_delivery_above": float(setting.free_delivery_above) if setting.free_delivery_above else None,
            "serviceable_pincodes": setting.serviceable_pincodes,
            "max_qty_per_cart_item": setting.max_qty_per_cart_item,
        }

        update_fields = payload.model_dump(exclude_unset=True)
        for key, value in update_fields.items():
            setattr(setting, key, value)

        setting.updated_at = datetime.now(timezone.utc)
        await db.flush()

        after_data = {
            "store_name": setting.store_name,
            "store_phone": setting.store_phone,
            "store_email": setting.store_email,
            "address_text": setting.address_text,
            "cod_limit_amount": float(setting.cod_limit_amount),
            "cod_enabled": setting.cod_enabled,
            "delivery_charge_flat": float(setting.delivery_charge_flat),
            "free_delivery_above": float(setting.free_delivery_above) if setting.free_delivery_above else None,
            "serviceable_pincodes": setting.serviceable_pincodes,
            "max_qty_per_cart_item": setting.max_qty_per_cart_item,
        }

        # Log audit entry
        await log_audit_event(
            db=db,
            actor_user_id=actor_user_id,
            action="UPDATE_STORE_SETTINGS",
            entity_type="STORE_SETTING",
            entity_id=None,
            before_data=before_data,
            after_data=after_data,
        )

        await db.commit()
        await db.refresh(setting)
        return setting
