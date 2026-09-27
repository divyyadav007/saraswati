"""
Cart API Router.
Per docs/06-API-SPECIFICATION.md §6.3
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.modules.cart.schemas import (
    CartItemAddRequest,
    CartItemUpdateRequest,
    CartMergeRequest,
    CartResponse,
)
from app.modules.cart.service import CartService

cart_router = APIRouter(prefix="/cart", tags=["Cart"])


@cart_router.get("", response_model=CartResponse)
async def get_cart(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current active cart with dynamically recomputed subtotal and stock check.
    """
    return await CartService.get_cart_view(current_user.user_id, db)


@cart_router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
async def add_item_to_cart(
    payload: CartItemAddRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a product variant to the customer's cart."""
    return await CartService.add_item(current_user.user_id, payload, db)


@cart_router.patch("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: uuid.UUID,
    payload: CartItemUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update item quantity or remove if quantity is 0."""
    return await CartService.update_item_quantity(current_user.user_id, item_id, payload, db)


@cart_router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove item from cart."""
    return await CartService.remove_item(current_user.user_id, item_id, db)


@cart_router.post("/merge", response_model=CartResponse)
async def merge_cart(
    payload: CartMergeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Merge guest cart items into user's authenticated active cart."""
    return await CartService.merge_guest_cart(current_user.user_id, payload, db)
