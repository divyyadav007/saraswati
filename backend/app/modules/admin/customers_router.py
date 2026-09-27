"""
Admin Customer Management Router.
Provides customer lookup, lifetime spend analytics, and customer detail views.
Per docs/11-ADMIN-PANEL.md §7 and docs/06-API-SPECIFICATION.md §6.10.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.models.auth import Profile
from app.db.models.orders import Order
from app.db.session import get_db
from app.modules.admin.schemas import (
    CustomerDetailResponse,
    CustomerListItem,
    CustomerListResponse,
    CustomerOrderSummary,
)

admin_customers_router = APIRouter(prefix="/admin/customers", tags=["Admin Customers"])


@admin_customers_router.get(
    "",
    response_model=CustomerListResponse,
    summary="List and search customers",
    description="Returns paginated customer list with lifetime order counts and spend.",
)
async def list_customers(
    search: str | None = Query(None, description="Search by name, phone, or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve customer directory with server-side aggregations."""
    # Filter conditions
    filters = []
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Profile.full_name.ilike(term),
                Profile.phone.ilike(term),
                Profile.email.ilike(term),
            )
        )

    # Subquery for order stats per profile to prevent N+1
    order_stats_subq = (
        select(
            Order.user_id,
            func.count(Order.id).label("total_orders"),
            func.coalesce(
                func.sum(
                    Order.total_amount
                ),
                0.0,
            ).label("total_spend"),
        )
        .where(Order.status != "CANCELLED")
        .group_by(Order.user_id)
        .subquery()
    )

    # Count total matching profiles
    count_stmt = select(func.count(Profile.id))
    if filters:
        count_stmt = count_stmt.where(*filters)
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Query profiles joined with order stats
    query = (
        select(
            Profile,
            func.coalesce(order_stats_subq.c.total_orders, 0).label("total_orders"),
            func.coalesce(order_stats_subq.c.total_spend, 0.0).label("total_spend"),
        )
        .outerjoin(order_stats_subq, Profile.id == order_stats_subq.c.user_id)
        .order_by(desc(Profile.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    if filters:
        query = query.where(*filters)

    rows = (await db.execute(query)).all()

    items = [
        CustomerListItem(
            id=str(row[0].id),
            full_name=row[0].full_name,
            phone=row[0].phone,
            email=row[0].email,
            role=row[0].role,
            is_active=row[0].is_active,
            total_orders=int(row[1]),
            total_spend=float(row[2]),
            created_at=row[0].created_at.isoformat() if row[0].created_at else "",
        )
        for row in rows
    ]

    return CustomerListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
    )


@admin_customers_router.get(
    "/{customer_id}",
    response_model=CustomerDetailResponse,
    summary="Get customer detail and order history",
)
async def get_customer_detail(
    customer_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full customer record and order history."""
    profile = await db.get(Profile, customer_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    # Fetch recent orders
    orders_stmt = (
        select(Order)
        .where(Order.user_id == customer_id)
        .order_by(desc(Order.created_at))
        .limit(25)
    )
    orders = (await db.execute(orders_stmt)).scalars().all()

    total_orders = len(orders)
    total_spend = sum(float(o.total_amount) for o in orders if o.status != "CANCELLED")

    recent_orders = [
        CustomerOrderSummary(
            order_id=str(o.id),
            order_number=o.order_number,
            total_amount=float(o.total_amount),
            status=o.status,
            created_at=o.created_at.isoformat() if o.created_at else "",
        )
        for o in orders
    ]

    return CustomerDetailResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        phone=profile.phone,
        email=profile.email,
        role=profile.role,
        is_active=profile.is_active,
        total_orders=total_orders,
        total_spend=round(total_spend, 2),
        recent_orders=recent_orders,
        created_at=profile.created_at.isoformat() if profile.created_at else "",
    )
