"""
Notification Pydantic Schemas.
Per docs/10-NOTIFICATIONS.md and docs/06-API-SPECIFICATION.md
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    type: str
    channel: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    is_read: bool
    sent_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class DeviceTokenRequest(BaseModel):
    fcm_token: str = Field(..., min_length=10, max_length=500)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class NotificationPreferencesResponse(BaseModel):
    notif_promotional_opt_in: bool


class UpdateNotificationPreferencesRequest(BaseModel):
    notif_promotional_opt_in: bool
