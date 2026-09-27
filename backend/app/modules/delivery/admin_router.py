"""
Admin Delivery Partners and Assignments API Router.
Per docs/06-API-SPECIFICATION.md §6.14, §6.18 and docs/14-DELIVERY-SYSTEM.md
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.delivery.schemas import (
    AssignDeliveryRequest,
    DeliveryAssignmentBrief,
    DeliveryPartnerCreateRequest,
    DeliveryPartnerResponse,
    DeliveryPartnerUpdateRequest,
)
from app.modules.delivery.service import DeliveryService

admin_delivery_router = APIRouter(prefix="/admin", tags=["Admin — Delivery & Logistics"])


@admin_delivery_router.get("/delivery-partners", response_model=list[DeliveryPartnerResponse])
async def list_delivery_partners(
    is_active: bool | None = Query(None),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """List delivery partners (staff/admin only)."""
    return await DeliveryService.list_partners(is_active_only=is_active, db=db)


@admin_delivery_router.post(
    "/delivery-partners",
    response_model=DeliveryPartnerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_delivery_partner(
    payload: DeliveryPartnerCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new delivery partner."""
    return await DeliveryService.create_partner(payload=payload, db=db)


@admin_delivery_router.get(
    "/delivery-partners/{partner_id}",
    response_model=DeliveryPartnerResponse,
)
async def get_delivery_partner(
    partner_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery partner details by ID."""
    return await DeliveryService.get_partner(partner_id=partner_id, db=db)


@admin_delivery_router.patch(
    "/delivery-partners/{partner_id}",
    response_model=DeliveryPartnerResponse,
)
async def update_delivery_partner(
    partner_id: uuid.UUID,
    payload: DeliveryPartnerUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update delivery partner details."""
    return await DeliveryService.update_partner(partner_id=partner_id, payload=payload, db=db)


@admin_delivery_router.delete(
    "/delivery-partners/{partner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_delivery_partner(
    partner_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate delivery partner (soft-delete)."""
    await DeliveryService.delete_partner(partner_id=partner_id, db=db)


@admin_delivery_router.post(
    "/orders/{order_id}/assign-delivery",
    response_model=DeliveryAssignmentBrief,
)
async def assign_order_delivery(
    order_id: uuid.UUID,
    payload: AssignDeliveryRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a delivery partner to an order.
    Per docs/14-DELIVERY-SYSTEM.md §5 and docs/06-API-SPECIFICATION.md §6.14.
    """
    return await DeliveryService.assign_delivery(
        order_id=order_id,
        partner_id=payload.delivery_partner_id,
        notes=payload.notes,
        db=db,
    )
