"""
Orders, Order Items, Payments, Webhook Events, and Delivery Slots SQLAlchemy models.
Per docs/05-DATABASE-SCHEMA.md §2.11–2.14
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB, UUID, ENUM as PG_ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.catalog import GiftHamper, ProductVariant
    from app.db.models.operations import DeliveryAssignment


class DeliverySlot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "delivery_slots"

    slot_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    booked_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cutoff_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    orders: Mapped[list[Order]] = relationship("Order", back_populates="delivery_slot")


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"

    order_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False)
    address_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    address_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    delivery_slot_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("delivery_slots.id", ondelete="RESTRICT"), nullable=True)
    status: Mapped[str] = mapped_column(PG_ENUM("PENDING_PAYMENT", "PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED", name="order_status", create_type=False), default="PENDING_PAYMENT", nullable=False)
    payment_method: Mapped[str] = mapped_column(PG_ENUM("ONLINE", "COD", name="payment_method", create_type=False), nullable=False)
    payment_status: Mapped[str] = mapped_column(PG_ENUM("PENDING", "SUCCESS", "FAILED", "REFUNDED", "COD_PENDING", name="payment_status", create_type=False), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    delivery_charge: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    packaging_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    placed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    preparing_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    out_for_delivery_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    delivery_slot: Mapped[DeliverySlot | None] = relationship("DeliverySlot", back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    delivery_assignment: Mapped[DeliveryAssignment | None] = relationship("DeliveryAssignment", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_type: Mapped[str] = mapped_column(PG_ENUM("PRODUCT", "HAMPER", name="order_item_type", create_type=False), nullable=False)
    product_variant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=True)
    gift_hamper_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gift_hampers.id", ondelete="RESTRICT"), nullable=True)
    product_name_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    variant_label_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="items")
    gift_hamper: Mapped[GiftHamper | None] = relationship("GiftHamper")
    variant_rel: Mapped[ProductVariant | None] = relationship("ProductVariant", foreign_keys=[product_variant_id])


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    razorpay_order_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(PG_ENUM("PENDING", "SUCCESS", "FAILED", "REFUNDED", "COD_PENDING", name="payment_status", create_type=False), nullable=False)
    method: Mapped[str] = mapped_column(PG_ENUM("ONLINE", "COD", name="payment_method", create_type=False), nullable=False)
    raw_webhook_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    refunded_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="payments")


class ProcessedWebhookEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "processed_webhook_events"

    event_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
