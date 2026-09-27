"""
Auth and Profile Database Repository.
Per docs/04-ARCHITECTURE.md §3 and docs/05-DATABASE-SCHEMA.md §2.2
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.auth import Profile


class AuthRepository:
    """Repository encapsulating database operations on profiles."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_profile_by_id(self, user_id: uuid.UUID) -> Profile | None:
        """Fetch profile by UUID primary key."""
        stmt = select(Profile).where(Profile.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_profile_by_phone(self, phone: str) -> Profile | None:
        """Fetch profile by unique phone number."""
        stmt = select(Profile).where(Profile.phone == phone)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_profile_by_email(self, email: str) -> Profile | None:
        """Fetch profile by unique email address."""
        stmt = select(Profile).where(Profile.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_profile(
        self,
        user_id: uuid.UUID,
        full_name: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        fcm_token: str | None = None,
        notif_promotional_opt_in: bool | None = None,
        default_role: str = "CUSTOMER",
    ) -> Profile:
        """
        Idempotent upsert of profile row from verified identity.
        If profile exists, updates provided attributes.
        If profile does not exist, inserts new row with default role.
        """
        profile = await self.get_profile_by_id(user_id)

        if profile is None:
            profile = Profile(
                id=user_id,
                full_name=full_name,
                phone=phone,
                email=email,
                role=default_role,
                is_active=True,
                fcm_token=fcm_token,
                notif_promotional_opt_in=notif_promotional_opt_in if notif_promotional_opt_in is not None else True,
            )
            self.db.add(profile)
        else:
            if full_name is not None:
                profile.full_name = full_name
            if phone is not None:
                profile.phone = phone
            if email is not None:
                profile.email = email
            if fcm_token is not None:
                profile.fcm_token = fcm_token
            if notif_promotional_opt_in is not None:
                profile.notif_promotional_opt_in = notif_promotional_opt_in

        await self.db.commit()
        await self.db.refresh(profile)
        return profile
