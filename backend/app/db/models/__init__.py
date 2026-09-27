"""
Central SQLAlchemy Models Package
All models are imported here so that Base.metadata contains the full schema.
Per docs/21-CODING-CONVENTIONS.md §3.
"""
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.models.auth import Address, Profile
from app.db.models.cart import Cart, CartItem
from app.db.models.catalog import (
    Category,
    GiftHamper,
    GiftHamperImage,
    GiftHamperItem,
    Product,
    ProductImage,
    ProductVariant,
)
from app.db.models.operations import (
    AuditLog,
    BulkOrderEnquiry,
    DeliveryAssignment,
    DeliveryPartner,
    Notification,
    Review,
    StoreSetting,
)
from app.db.models.orders import (
    DeliverySlot,
    Order,
    OrderItem,
    Payment,
    ProcessedWebhookEvent,
)
from app.db.models.promotions import Banner, Coupon, CouponUsage, Offer

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "Profile",
    "Address",
    "Category",
    "Product",
    "ProductVariant",
    "ProductImage",
    "GiftHamper",
    "GiftHamperImage",
    "GiftHamperItem",
    "Cart",
    "CartItem",
    "DeliverySlot",
    "Order",
    "OrderItem",
    "Payment",
    "ProcessedWebhookEvent",
    "Coupon",
    "CouponUsage",
    "Offer",
    "Banner",
    "DeliveryPartner",
    "DeliveryAssignment",
    "Review",
    "Notification",
    "BulkOrderEnquiry",
    "StoreSetting",
    "AuditLog",
]
