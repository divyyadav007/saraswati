"""
Admin Orders Management API Router.
Per docs/06-API-SPECIFICATION.md §6.14
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.orders.schemas import (
    AdminOrderStatusUpdateRequest,
    OrderResponse,
    PaginatedOrdersResponse,
)
from app.modules.orders.service import OrderService

admin_orders_router = APIRouter(prefix="/admin/orders", tags=["Admin — Orders"])


@admin_orders_router.get("", response_model=PaginatedOrdersResponse)
async def admin_list_orders(
    status: str | None = Query(None, description="Filter by status"),
    q: str | None = Query(None, description="Search by order number, customer name or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin/Staff order list with status filters and customer search."""
    return await OrderService.admin_list_orders(
        status_filter=status,
        q=q,
        page=page,
        page_size=page_size,
        db=db,
    )


@admin_orders_router.get("/{order_id}", response_model=OrderResponse)
async def admin_get_order(
    order_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin get full order details."""
    return await OrderService.get_order_by_id(
        order_id=order_id,
        user_id=None,
        is_staff=True,
        db=db,
    )


@admin_orders_router.patch("/{order_id}/status", response_model=OrderResponse)
async def admin_update_order_status(
    order_id: uuid.UUID,
    payload: AdminOrderStatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Transition order status forward along state machine:
    PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED (or CANCELLED)
    """
    return await OrderService.admin_update_status(
        order_id=order_id,
        payload=payload,
        db=db,
    )
