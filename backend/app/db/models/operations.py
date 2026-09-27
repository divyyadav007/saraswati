"""
Operations SQLAlchemy models: Delivery, Reviews, Notifications, Enquiries, Settings, Audit.
Per docs/05-DATABASE-SCHEMA.md §2.19–2.23, §2.26–2.27
"""
import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID, ENUM as PG_ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.auth import Profile
    from app.db.models.catalog import Product
    from app.db.models.orders import Order


class DeliveryPartner(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "delivery_partners"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    vehicle_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class DeliveryAssignment(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "delivery_assignments"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    delivery_partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("delivery_partners.id", ondelete="RESTRICT"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    delivery_partner: Mapped["DeliveryPartner"] = relationship("DeliveryPartner")
    order: Mapped["Order"] = relationship("Order", back_populates="delivery_assignment")


class Review(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "reviews"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["Profile"] = relationship("Profile")
    product: Mapped["Product"] = relationship("Product")
    order: Mapped["Order"] = relationship("Order")


class Notification(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)
    type: Mapped[str] = mapped_column(PG_ENUM("ORDER_PLACED", "ORDER_STATUS_CHANGED", "PAYMENT_FAILED", "PROMOTIONAL", name="notification_type", create_type=False), nullable=False)
    channel: Mapped[str] = mapped_column(PG_ENUM("PUSH", "EMAIL", name="notification_channel", create_type=False), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class BulkOrderEnquiry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "bulk_order_enquiries"

    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    enquiry_type: Mapped[str] = mapped_column(PG_ENUM("WEDDING", "CORPORATE", "FESTIVAL", "CUSTOM", name="bulk_enquiry_type", create_type=False), nullable=False)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimated_quantity: Mapped[str | None] = mapped_column(Text, nullable=True)
    items_of_interest: Mapped[str | None] = mapped_column(Text, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(PG_ENUM("NEW", "IN_PROGRESS", "CLOSED", "CONVERTED", name="bulk_enquiry_status", create_type=False), default="NEW", nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class StoreSetting(Base):
    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    store_name: Mapped[str] = mapped_column(Text, default="Saraswati Sweets", nullable=False)
    store_phone: Mapped[str] = mapped_column(Text, default="+919999999999", nullable=False)
    store_email: Mapped[str] = mapped_column(Text, default="info@saraswatisweets.com", nullable=False)
    address_text: Mapped[str] = mapped_column(Text, default="Barabanki, Uttar Pradesh", nullable=False)
    cod_limit_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=5000.00, nullable=False)
    cod_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tax_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tax_rate_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    delivery_charge_flat: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    free_delivery_above: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    serviceable_pincodes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    max_qty_per_cart_item: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    business_hours: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class AuditLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    before_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
