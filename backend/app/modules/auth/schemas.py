"""
Auth Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.1
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SyncProfileRequest(BaseModel):
    """Request payload for syncing profile after Supabase authentication."""
    full_name: str | None = Field(None, max_length=150, description="Customer or staff full name")
    email: str | None = Field(
        None,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        description="Email address",
    )
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,15}$", description="E.164 or 10-digit mobile number")

    fcm_token: str | None = Field(None, description="Firebase Cloud Messaging device token for push notifications")
    notif_promotional_opt_in: bool | None = Field(None, description="Opt-in/out preference for promotional SMS/WhatsApp/Push")


class UpdateProfileRequest(BaseModel):
    """Payload for customer updating their own personal profile."""
    full_name: str | None = Field(None, min_length=1, max_length=150, description="Customer full name")
    email: str | None = Field(
        None,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        description="Email address",
    )


class UserProfileResponse(BaseModel):
    """Public profile representation returned to client."""
    id: uuid.UUID
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str
    is_active: bool
    notif_promotional_opt_in: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
