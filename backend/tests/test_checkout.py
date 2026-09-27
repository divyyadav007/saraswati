"""
Phase 3 Test Suite — Address, Cart, Delivery Slots, and Checkout (COD).
Tests with synchronous TestClient and memory-isolated state.
Per docs/06-API-SPECIFICATION.md §6.3–6.5, §6.7, §6.14 and docs/15-TESTING-STRATEGY.md
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.db.models.auth import Address, Profile
from app.db.models.cart import Cart, CartItem
from app.db.models.catalog import Product, ProductVariant
from app.db.models.operations import StoreSetting
from app.db.models.orders import DeliverySlot, Order, OrderItem
from app.db.session import get_db
from app.main import app
from tests.conftest import InMemoryAuthDb, MockResult


class InMemoryPhase3Db(InMemoryAuthDb):
    """Extended in-memory database mock handling Address, DeliverySlot, Cart, Variant, and Order models."""

    def __init__(self):
        super().__init__()
        self.addresses: dict[uuid.UUID, Address] = {}
        self.slots: dict[uuid.UUID, DeliverySlot] = {}
        self.carts: dict[uuid.UUID, Cart] = {}
        self.cart_items: dict[uuid.UUID, CartItem] = {}
        self.variants: dict[uuid.UUID, ProductVariant] = {}
        self.orders: dict[uuid.UUID, Order] = {}
        self.order_items: dict[uuid.UUID, OrderItem] = {}
        self.store_settings: StoreSetting | None = StoreSetting(
            id=1,
            store_name="Saraswati Sweets",
            cod_enabled=True,
            cod_limit_amount=5000.0,
            delivery_charge_flat=40.0,
            free_delivery_above=500.0,
            serviceable_pincodes=["225001", "225002", "225003", "225122"],
            tax_enabled=False,
            tax_rate_percent=0.0,
        )
        self._seed_slots_and_variants()

    def _seed_slots_and_variants(self):
        # 2 test variants
        p = Product(
            id=uuid.uuid4(),
            name="Besan Laddu",
            slug="besan-laddu",
            category_id=uuid.uuid4(),
            tags=["desi-ghee"],
            is_active=True,
        )
        v1 = ProductVariant(
            id=uuid.uuid4(),
            product_id=p.id,
            label="500g",
            weight_grams=500,
            price=300.0,
            mrp=350.0,
            sku="BL-500G",
            stock_status="IN_STOCK",
            stock_quantity=50,
            is_active=True,
        )
        v1.product = p
        v2 = ProductVariant(
            id=uuid.uuid4(),
            product_id=p.id,
            label="1kg",
            weight_grams=1000,
            price=580.0,
            mrp=650.0,
            sku="BL-1KG",
            stock_status="IN_STOCK",
            stock_quantity=20,
            is_active=True,
        )
        v2.product = p
        self.variants[v1.id] = v1
        self.variants[v2.id] = v2

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # StoreSetting
        if "store_settings" in stmt_str:
            return MockResult(self.store_settings)

        # Profiles
        if "profiles" in stmt_str:
            return await super().execute(stmt, *args, **kwargs)

        # Addresses
        if "addresses" in stmt_str:
            active_addrs = [a for a in self.addresses.values() if not a.is_deleted]
            class AddrResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                        def first(self): return self.it[0] if self.it else None
                    return L(self._items)
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalar_one(self):
                    return self._items[0]

            for val in self.addresses.values():
                if str(val.id) in stmt_str:
                    return AddrResult([val])

            return AddrResult(active_addrs)

        # Delivery Slots
        if "delivery_slots" in stmt_str:
            class SlotResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(self._items)
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
            return SlotResult(list(self.slots.values()))

        # ProductVariant
        if "product_variants" in stmt_str:
            class VarResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(self._items)
                def scalar_one_or_none(self):
                    for v in self._items:
                        if str(v.id) in stmt_str:
                            return v
                    return self._items[0] if self._items else None
            return VarResult(list(self.variants.values()))

        # Cart
        if "carts" in stmt_str:
            active_carts = [c for c in self.carts.values() if c.status == "ACTIVE"]
            return MockResult(active_carts[0] if active_carts else None)

        # Orders
        if "orders" in stmt_str:
            class OrderList:
                def __init__(self, items):
                    self._items = items
                def all(self):
                    return self._items
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalar_one(self):
                    return len(self._items)
            return OrderList(list(self.orders.values()))

        return MockResult(None)

    def add(self, instance):
        if isinstance(instance, Address):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.addresses[instance.id] = instance
        elif isinstance(instance, DeliverySlot):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.slots[instance.id] = instance
        elif isinstance(instance, Cart):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not hasattr(instance, "items"):
                instance.items = []
            self.carts[instance.id] = instance
        elif isinstance(instance, CartItem):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.cart_items[instance.id] = instance
            # Add to cart
            if instance.cart_id in self.carts:
                self.carts[instance.cart_id].items.append(instance)
        elif isinstance(instance, Order):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not hasattr(instance, "items"):
                instance.items = []
            self.orders[instance.id] = instance
        elif isinstance(instance, OrderItem):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.order_items[instance.id] = instance
            if instance.order_id in self.orders:
                self.orders[instance.order_id].items.append(instance)
        else:
            super().add(instance)

    async def flush(self):
        pass

    async def delete(self, instance):
        if isinstance(instance, CartItem) and instance.id in self.cart_items:
            del self.cart_items[instance.id]
            for c in self.carts.values():
                c.items = [i for i in c.items if i.id != instance.id]


@pytest.fixture
def phase3_db() -> InMemoryPhase3Db:
    return InMemoryPhase3Db()


@pytest.fixture
def p3_client(phase3_db: InMemoryPhase3Db):
    async def override_get_db():
        yield phase3_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_pincode_serviceability(p3_client: TestClient):
    # Serviceable Barabanki HPO
    res = p3_client.get("/api/v1/addresses/check-serviceability?pincode=225001")
    assert res.status_code == 200
    data = res.json()
    assert data["pincode"] == "225001"
    assert data["is_serviceable"] is True
    assert data["free_delivery_above"] == 500.0

    # Non-serviceable pincode
    res_un = p3_client.get("/api/v1/addresses/check-serviceability?pincode=110001")
    assert res_un.status_code == 200
    assert res_un.json()["is_serviceable"] is False


def test_delivery_slots_generation_and_retrieval(p3_client: TestClient):
    res = p3_client.get("/api/v1/delivery-slots")
    assert res.status_code == 200
    slots = res.json()
    assert len(slots) >= 3
    assert any("Morning" in s["label"] for s in slots)


def test_address_management_flow(p3_client: TestClient, phase3_db: InMemoryPhase3Db, make_token):
    user_id = uuid.uuid4()
    phase3_db.add_profile(Profile(id=user_id, role="CUSTOMER", is_active=True))
    token = make_token(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create address
    payload = {
        "label": "Home",
        "recipient_name": "Ramesh Kumar",
        "phone": "9876543210",
        "line1": "Civil Lines, Near Clock Tower",
        "line2": "House 42",
        "city": "Barabanki",
        "state": "Uttar Pradesh",
        "pincode": "225001",
        "landmark": "Near Bus Stand",
        "is_default": True,
    }
    create_res = p3_client.post("/api/v1/addresses", json=payload, headers=headers)
    assert create_res.status_code == 201
    addr_data = create_res.json()
    assert addr_data["recipient_name"] == "Ramesh Kumar"
    assert addr_data["pincode"] == "225001"

    # 2. List addresses
    list_res = p3_client.get("/api/v1/addresses", headers=headers)
    assert list_res.status_code == 200
    addrs = list_res.json()
    assert len(addrs) == 1


def test_cart_and_checkout_flow(p3_client: TestClient, phase3_db: InMemoryPhase3Db, make_token):
    user_id = uuid.uuid4()
    phase3_db.add_profile(Profile(id=user_id, role="CUSTOMER", is_active=True))
    token = make_token(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch Cart initially
    cart_res = p3_client.get("/api/v1/cart", headers=headers)
    assert cart_res.status_code == 200
    assert cart_res.json()["items_count"] == 0

    # 2. Add Variant 1 (500g, ₹300)
    var1_id = list(phase3_db.variants.keys())[0]
    add_res = p3_client.post(
        "/api/v1/cart/items",
        json={"product_variant_id": str(var1_id), "quantity": 1},
        headers=headers,
    )
    assert add_res.status_code == 201
    cart = add_res.json()
    assert cart["items_count"] == 1
    assert cart["subtotal"] == 300.0
    assert cart["delivery_charge"] == 40.0  # below 500 threshold
    assert cart["estimated_total"] == 340.0

    # 3. Update quantity to 2 (₹600 -> Free delivery!)
    item_id = cart["items"][0]["id"]
    patch_res = p3_client.patch(
        f"/api/v1/cart/items/{item_id}",
        json={"quantity": 2},
        headers=headers,
    )
    assert patch_res.status_code == 200
    cart_updated = patch_res.json()
    assert cart_updated["items_count"] == 2
    assert cart_updated["subtotal"] == 600.0
    assert cart_updated["delivery_charge"] == 0.0
    assert cart_updated["estimated_total"] == 600.0
