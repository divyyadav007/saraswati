"""
Notifications API Router.
Per docs/10-NOTIFICATIONS.md and docs/06-API-SPECIFICATION.md
"""
import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.modules.notifications.schemas import (
    DeviceTokenRequest,
    NotificationListResponse,
    NotificationPreferencesResponse,
    NotificationResponse,
    UpdateNotificationPreferencesRequest,
)
from app.modules.notifications.service import NotificationService

notification_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@notification_router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List authenticated user's notifications."""
    return await NotificationService.get_user_notifications(
        user_id=current_user.user_id,
        page=page,
        page_size=page_size,
        db=db,
    )


@notification_router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read."""
    return await NotificationService.mark_as_read(
        notification_id=id,
        user_id=current_user.user_id,
        db=db,
    )


@notification_router.post("/device-token", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def register_device_token(
    request: Request,
    payload: DeviceTokenRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or update FCM device token for mobile push notifications."""
    return await NotificationService.update_device_token(
        user_id=current_user.user_id,
        fcm_token=payload.fcm_token,
        db=db,
    )


@notification_router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notification channel preferences for authenticated user."""
    return await NotificationService.get_preferences(
        user_id=current_user.user_id,
        db=db,
    )


@notification_router.patch("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    payload: UpdateNotificationPreferencesRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update promotional notification preference."""
    return await NotificationService.update_preferences(
        user_id=current_user.user_id,
        opt_in=payload.notif_promotional_opt_in,
        db=db,
    )
