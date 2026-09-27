"""
Test suite validating that all 27 SQLAlchemy models are properly mapped.
"""
from app.db.models import (
    Base,
    Category,
    StoreSetting,
)


def test_models_metadata_registered():
    """Verify all 27 required domain tables are registered on Base.metadata."""
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "profiles",
        "addresses",
        "categories",
        "products",
        "product_variants",
        "product_images",
        "gift_hampers",
        "gift_hamper_images",
        "gift_hamper_items",
        "carts",
        "cart_items",
        "delivery_slots",
        "coupons",
        "orders",
        "order_items",
        "payments",
        "processed_webhook_events",
        "coupon_usage",
        "offers",
        "banners",
        "delivery_partners",
        "delivery_assignments",
        "reviews",
        "notifications",
        "bulk_order_enquiries",
        "store_settings",
        "audit_logs",
    }
    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"
    assert len(table_names) == 27


def test_model_instantiation():
    """Verify that models can be instantiated with required fields."""
    category = Category(name="Mithai", slug="mithai", is_active=True)
    assert category.name == "Mithai"
    assert category.slug == "mithai"
    assert category.is_active is True

    setting = StoreSetting(
        id=1,
        store_name="Saraswati Sweets",
        store_phone="+919999999999",
        delivery_charge_flat=50.0,
    )
    assert setting.store_name == "Saraswati Sweets"
    assert setting.delivery_charge_flat == 50.0
