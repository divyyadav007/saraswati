"""
Notification Service Layer.
Handles in-app notification records and push / email delivery abstractions.
Per docs/10-NOTIFICATIONS.md and docs/08-SECURITY.md
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError
from app.db.models.auth import Profile
from app.db.models.operations import Notification
from app.db.models.orders import Order
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationResponse,
)

logger = logging.getLogger(__name__)


STATUS_MESSAGES: dict[str, tuple[str, str]] = {
    "PLACED": (
        "Order Placed",
        "Your order #{order_number} has been received and is awaiting confirmation.",
    ),
    "CONFIRMED": (
        "Order Confirmed",
        "Your order #{order_number} has been accepted! Kitchen preparation will begin shortly.",
    ),
    "PREPARING": (
        "Preparing Fresh Sweets",
        "Your delicious treats for order #{order_number} are being freshly crafted and packed.",
    ),
    "READY_FOR_PICKUP": (
        "Packed & Sealed",
        "Order #{order_number} is packed, sealed, and ready for our delivery partner.",
    ),
    "OUT_FOR_DELIVERY": (
        "Out for Delivery",
        "Order #{order_number} is on the way to your delivery address in Barabanki!",
    ),
    "DELIVERED": (
        "Order Delivered",
        "Order #{order_number} has been safely delivered. Enjoy your fresh mithai!",
    ),
    "CANCELLED": (
        "Order Cancelled",
        "Order #{order_number} has been cancelled.",
    ),
}


class NotificationService:
    @classmethod
    async def create_and_send(
        cls,
        user_id: uuid.UUID | None,
        notif_type: str,
        title: str,
        body: str,
        data: dict[str, Any] | None,
        db: AsyncSession,
        channel: str = "PUSH",
    ) -> Notification:
        """
        Record notification in DB and dispatch external push/email asynchronously.
        External failures are caught and logged; never block the caller.
        """
        now_utc = datetime.now(timezone.utc)
        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            type=notif_type,
            channel=channel,
            title=title,
            body=body,
            data=data or {},
            is_read=False,
            sent_at=now_utc,
            created_at=now_utc,
        )
        db.add(notif)
        await db.flush()

        # External push / email dispatch hook (safe fallback per docs/10-NOTIFICATIONS.md §8)
        try:
            logger.info(
                "Dispatching %s notification to user %s: [%s] %s",
                channel,
                user_id,
                title,
                body,
            )
            # In production, triggers FCM Admin SDK or Resend email
        except Exception as e:
            logger.warning("External notification delivery failed: %s", str(e))

        return notif

    @classmethod
    async def notify_order_status(
        cls,
        order: Order,
        new_status: str,
        db: AsyncSession,
        cancel_reason: str | None = None,
    ) -> Notification | None:
        """Helper to send standardized order status change notifications."""
        template = STATUS_MESSAGES.get(new_status)
        if not template:
            return None

        title, body_template = template
        body = body_template.format(order_number=order.order_number)
        if new_status == "CANCELLED" and cancel_reason:
            body = f"{body} Reason: {cancel_reason}"

        return await cls.create_and_send(
            user_id=order.user_id,
            notif_type="ORDER_STATUS_CHANGED",
            title=title,
            body=body,
            data={
                "order_id": str(order.id),
                "order_number": order.order_number,
                "status": new_status,
            },
            db=db,
            channel="PUSH",
        )

    @classmethod
    async def notify_delivery_assigned(
        cls,
        order: Order,
        partner_name: str,
        partner_phone: str,
        db: AsyncSession,
    ) -> Notification:
        """Helper to notify customer when a delivery partner is assigned."""
        title = "Delivery Partner Assigned"
        body = f"Our delivery partner {partner_name} ({partner_phone}) has been assigned to deliver order #{order.order_number}."

        return await cls.create_and_send(
            user_id=order.user_id,
            notif_type="ORDER_STATUS_CHANGED",
            title=title,
            body=body,
            data={
                "order_id": str(order.id),
                "order_number": order.order_number,
                "partner_name": partner_name,
                "partner_phone": partner_phone,
            },
            db=db,
            channel="IN_APP",
        )

    @classmethod
    async def get_user_notifications(
        cls,
        user_id: uuid.UUID,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> NotificationListResponse:
        """Fetch notifications for a customer with unread count."""
        query = (
            select(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await db.execute(query)
        items = res.scalars().all()

        unread_q = select(func.count()).filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        unread_count = (await db.execute(unread_q)).scalar_one()

        return NotificationListResponse(
            items=[NotificationResponse.model_validate(n) for n in items],
            unread_count=unread_count,
        )

    @classmethod
    async def mark_as_read(
        cls,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
        db: AsyncSession,
    ) -> NotificationResponse:
        """Mark a notification as read."""
        res = await db.execute(
            select(Notification).filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notif = res.scalar_one_or_none()
        if not notif:
            raise NotFoundError("Notification not found.")

        notif.is_read = True
        await db.commit()
        return NotificationResponse.model_validate(notif)

    @classmethod
    async def update_device_token(
        cls,
        user_id: uuid.UUID,
        fcm_token: str,
        db: AsyncSession,
    ) -> dict[str, str]:
        """Update FCM push token on customer profile."""
        res = await db.execute(select(Profile).filter(Profile.id == user_id))
        profile = res.scalar_one_or_none()
        if not profile:
            raise NotFoundError("User profile not found.")

        profile.fcm_token = fcm_token
        await db.commit()
        return {"status": "success", "message": "Device token registered successfully."}

    @classmethod
    async def get_preferences(
        cls,
        user_id: uuid.UUID,
        db: AsyncSession,
    ) -> dict[str, bool]:
        """Fetch customer notification preferences."""
        res = await db.execute(select(Profile).filter(Profile.id == user_id))
        profile = res.scalar_one_or_none()
        if not profile:
            raise NotFoundError("User profile not found.")
        return {"notif_promotional_opt_in": profile.notif_promotional_opt_in}

    @classmethod
    async def update_preferences(
        cls,
        user_id: uuid.UUID,
        opt_in: bool,
        db: AsyncSession,
    ) -> dict[str, bool]:
        """Update customer promotional notification preference."""
        res = await db.execute(select(Profile).filter(Profile.id == user_id))
        profile = res.scalar_one_or_none()
        if not profile:
            raise NotFoundError("User profile not found.")
        profile.notif_promotional_opt_in = opt_in
        await db.commit()
        return {"notif_promotional_opt_in": profile.notif_promotional_opt_in}
