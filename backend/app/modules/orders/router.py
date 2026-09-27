"""
Customer Checkout & Orders API Router.
Per docs/06-API-SPECIFICATION.md §6.7
"""
import uuid

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.modules.orders.schemas import (
    CheckoutRequest,
    OrderCancelRequest,
    OrderResponse,
    PaginatedOrdersResponse,
)
from app.modules.orders.service import OrderService

checkout_router = APIRouter(prefix="/checkout", tags=["Checkout"])
orders_router = APIRouter(prefix="/orders", tags=["Orders"])


@checkout_router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def checkout(
    request: Request,
    payload: CheckoutRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Process server-side Cash on Delivery (COD) checkout.
    Calculates subtotal, applies delivery fee rules, reserves slot, creates order snapshot, and clears cart.
    Accepts Idempotency-Key header to safely guard against duplicate submissions.
    """
    return await OrderService.process_checkout(
        user_id=current_user.user_id,
        payload=payload,
        idempotency_key=idempotency_key,
        db=db,
    )


@orders_router.get("", response_model=PaginatedOrdersResponse)
async def list_customer_orders(
    status: str | None = Query(None, description="Filter by status e.g. PLACED, DELIVERED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List authenticated customer's past orders with pagination."""
    return await OrderService.get_user_orders(
        user_id=current_user.user_id,
        status_filter=status,
        page=page,
        page_size=page_size,
        db=db,
    )


@orders_router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single order detail for authenticated customer."""
    is_staff = current_user.role in ("ADMIN", "STAFF")
    return await OrderService.get_order_by_id(
        order_id=order_id,
        user_id=current_user.user_id,
        is_staff=is_staff,
        db=db,
    )


@orders_router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: uuid.UUID,
    payload: OrderCancelRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Customer-initiated cancellation of pending order."""
    return await OrderService.customer_cancel_order(
        order_id=order_id,
        user_id=current_user.user_id,
        reason=payload.reason,
        db=db,
    )
