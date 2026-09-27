"""
Cart and Cart Items SQLAlchemy models.
Per docs/05-DATABASE-SCHEMA.md §2.9–2.10
"""
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.catalog import GiftHamper, ProductVariant


class Cart(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "carts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    items: Mapped[list[CartItem]] = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "cart_items"

    cart_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    product_variant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    gift_hamper_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gift_hampers.id", ondelete="CASCADE"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    added_price_snapshot: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    cart: Mapped[Cart] = relationship("Cart", back_populates="items")
    variant: Mapped[ProductVariant | None] = relationship("ProductVariant")
    gift_hamper: Mapped[GiftHamper | None] = relationship("GiftHamper")
