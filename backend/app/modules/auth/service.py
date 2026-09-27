"""
Auth and Profile Service.
Per docs/04-ARCHITECTURE.md §3 and docs/06-API-SPECIFICATION.md §6.1
"""
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError
from app.db.models.auth import Profile
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import SyncProfileRequest, UpdateProfileRequest

logger = logging.getLogger(__name__)


class AuthService:
    """Business logic service for identity sync and profile management."""

    def __init__(self, db: AsyncSession):
        self.repository = AuthRepository(db)

    async def get_user_profile(self, user_id: uuid.UUID) -> Profile:
        """Retrieve profile for the authenticated user, or raise NotFoundError."""
        profile = await self.repository.get_profile_by_id(user_id)
        if not profile:
            raise NotFoundError("User profile not found. Please sync your profile.")
        return profile

    async def sync_profile(
        self,
        user_id: uuid.UUID,
        data: SyncProfileRequest,
        fallback_phone: str | None = None,
        fallback_email: str | None = None,
    ) -> Profile:
        """
        Idempotent profile synchronization.
        Uses verified identity details (fallback_phone, fallback_email) if not provided in payload.
        """
        phone = data.phone or fallback_phone
        email = str(data.email) if data.email else fallback_email

        logger.info(
            "Syncing profile for user %s",
            user_id,
            extra={"user_id": str(user_id)},
        )

        return await self.repository.upsert_profile(
            user_id=user_id,
            full_name=data.full_name,
            phone=phone,
            email=email,
            fcm_token=data.fcm_token,
            notif_promotional_opt_in=data.notif_promotional_opt_in,
        )

    async def update_user_profile(
        self,
        user_id: uuid.UUID,
        data: "UpdateProfileRequest",
    ) -> Profile:
        """Update authenticated user profile fields while strictly preserving role and status."""
        profile = await self.get_user_profile(user_id)
        if data.full_name is not None:
            profile.full_name = data.full_name.strip()
        if data.email is not None:
            profile.email = data.email.strip()

        await self.repository.db.commit()
        await self.repository.db.refresh(profile)
        return profile
