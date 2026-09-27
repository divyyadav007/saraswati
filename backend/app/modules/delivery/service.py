"""
Delivery Partner and Assignment Service Layer.
Per docs/14-DELIVERY-SYSTEM.md, docs/06-API-SPECIFICATION.md §6.14, §6.18
"""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import BusinessRuleViolationError, NotFoundError
from app.db.models.operations import DeliveryAssignment, DeliveryPartner
from app.db.models.orders import Order
from app.modules.delivery.schemas import (
    DeliveryAssignmentBrief,
    DeliveryPartnerCreateRequest,
    DeliveryPartnerResponse,
    DeliveryPartnerUpdateRequest,
)
from app.modules.notifications.service import NotificationService

logger = logging.getLogger(__name__)


class DeliveryService:
    @classmethod
    async def list_partners(
        cls,
        is_active_only: bool | None,
        db: AsyncSession,
    ) -> list[DeliveryPartnerResponse]:
        """List delivery partners with optional active filter."""
        query = select(DeliveryPartner).order_by(DeliveryPartner.name.asc())
        if is_active_only is not None:
            query = query.filter(DeliveryPartner.is_active == is_active_only)

        res = await db.execute(query)
        partners = res.scalars().all()
        return [DeliveryPartnerResponse.model_validate(p) for p in partners]

    @classmethod
    async def get_partner(
        cls,
        partner_id: uuid.UUID,
        db: AsyncSession,
    ) -> DeliveryPartnerResponse:
        """Fetch delivery partner by ID."""
        res = await db.execute(
            select(DeliveryPartner).filter(DeliveryPartner.id == partner_id)
        )
        partner = res.scalar_one_or_none()
        if not partner:
            raise NotFoundError("Delivery partner not found.")
        return DeliveryPartnerResponse.model_validate(partner)

    @classmethod
    async def create_partner(
        cls,
        payload: DeliveryPartnerCreateRequest,
        db: AsyncSession,
    ) -> DeliveryPartnerResponse:
        """Create a new delivery partner."""
        partner = DeliveryPartner(
            id=uuid.uuid4(),
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            is_active=payload.is_active,
        )
        db.add(partner)
        await db.commit()
        await db.refresh(partner)
        return DeliveryPartnerResponse.model_validate(partner)

    @classmethod
    async def update_partner(
        cls,
        partner_id: uuid.UUID,
        payload: DeliveryPartnerUpdateRequest,
        db: AsyncSession,
    ) -> DeliveryPartnerResponse:
        """Update existing delivery partner."""
        res = await db.execute(
            select(DeliveryPartner).filter(DeliveryPartner.id == partner_id)
        )
        partner = res.scalar_one_or_none()
        if not partner:
            raise NotFoundError("Delivery partner not found.")

        if payload.name is not None:
            partner.name = payload.name.strip()
        if payload.phone is not None:
            partner.phone = payload.phone.strip()
        if payload.is_active is not None:
            partner.is_active = payload.is_active

        await db.commit()
        return DeliveryPartnerResponse.model_validate(partner)

    @classmethod
    async def delete_partner(
        cls,
        partner_id: uuid.UUID,
        db: AsyncSession,
    ) -> None:
        """Soft delete (deactivate) delivery partner."""
        res = await db.execute(
            select(DeliveryPartner).filter(DeliveryPartner.id == partner_id)
        )
        partner = res.scalar_one_or_none()
        if not partner:
            raise NotFoundError("Delivery partner not found.")

        partner.is_active = False
        await db.commit()

    @classmethod
    async def assign_delivery(
        cls,
        order_id: uuid.UUID,
        partner_id: uuid.UUID,
        notes: str | None,
        db: AsyncSession,
    ) -> DeliveryAssignmentBrief:
        """
        Assign a delivery partner to an order.
        Per docs/14-DELIVERY-SYSTEM.md §5:
        One active assignment per order; reassignment updates the existing row.
        """
        # 1. Fetch Order
        res = await db.execute(
            select(Order)
            .filter(Order.id == order_id)
            .options(selectinload(Order.delivery_assignment))
        )
        order = res.scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")

        if order.status in ("CANCELLED", "PENDING_PAYMENT", "REFUNDED"):
            raise BusinessRuleViolationError(
                f"Cannot assign delivery partner to order in '{order.status}' status."
            )

        # 2. Fetch Partner
        p_res = await db.execute(
            select(DeliveryPartner).filter(DeliveryPartner.id == partner_id)
        )
        partner = p_res.scalar_one_or_none()
        if not partner:
            raise NotFoundError("Delivery partner not found.")

        if not partner.is_active:
            raise BusinessRuleViolationError("Cannot assign an inactive delivery partner.")

        now_utc = datetime.now(timezone.utc)

        # 3. Create or update assignment
        assignment_res = await db.execute(
            select(DeliveryAssignment).filter(DeliveryAssignment.order_id == order_id)
        )
        assignment = assignment_res.scalar_one_or_none()

        if assignment:
            assignment.delivery_partner_id = partner.id
            assignment.assigned_at = now_utc
            if notes is not None:
                assignment.notes = notes
        else:
            assignment = DeliveryAssignment(
                id=uuid.uuid4(),
                order_id=order.id,
                delivery_partner_id=partner.id,
                assigned_at=now_utc,
                notes=notes,
            )
            db.add(assignment)

        await db.flush()

        # 4. Notify customer of delivery assignment
        await NotificationService.notify_delivery_assigned(
            order=order,
            partner_name=partner.name,
            partner_phone=partner.phone,
            db=db,
        )

        await db.commit()

        return DeliveryAssignmentBrief(
            id=assignment.id,
            order_id=order.id,
            delivery_partner_id=partner.id,
            partner_name=partner.name,
            partner_phone=partner.phone,
            assigned_at=assignment.assigned_at,
            delivered_at=assignment.delivered_at,
            notes=assignment.notes,
        )
