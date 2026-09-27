"""
Phase 5 Test Suite — Delivery Partners CRUD, Delivery Assignment,
Order State Machine Transitions (End-to-End), and Notifications.
Per docs/14-DELIVERY-SYSTEM.md, docs/10-NOTIFICATIONS.md, docs/06-API-SPECIFICATION.md §6.14, §6.18
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.db.models.auth import Address, Profile
from app.db.models.cart import Cart, CartItem
from app.db.models.operations import DeliveryAssignment, DeliveryPartner, Notification
from app.db.models.orders import DeliverySlot, Order
from app.db.session import get_db
from app.main import app
from tests.test_payments import InMemoryPaymentDb


class InMemoryDeliveryDb(InMemoryPaymentDb):
    """Extended in-memory test database handling DeliveryPartner, DeliveryAssignment, and Notifications."""

    def __init__(self):
        super().__init__()
        self.delivery_partners: dict[uuid.UUID, DeliveryPartner] = {}
        self.delivery_assignments: dict[uuid.UUID, DeliveryAssignment] = {}
        self.notifications: dict[uuid.UUID, Notification] = {}

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # Delivery Partners
        if "delivery_partners" in stmt_str:
            matched_partners = []
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.delivery_partners:
                        matched_partners.append(self.delivery_partners[val])
            except Exception:
                pass

            if not matched_partners:
                matched_partners = list(self.delivery_partners.values())

            # Filter by is_active if present in query
            if "delivery_partners.is_active = true" in stmt_str.lower() or "is_active = :is_active_1" in stmt_str.lower():
                try:
                    params = stmt.compile().params
                    if "is_active_1" in params:
                        act_val = params["is_active_1"]
                        matched_partners = [p for p in matched_partners if p.is_active == act_val]
                except Exception:
                    pass

            class PartnerResult:
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

            return PartnerResult(matched_partners)

        # Delivery Assignments
        if "delivery_assignments" in stmt_str:
            matched_assignments = []
            try:
                params = stmt.compile().params
                for val in params.values():
                    for a in self.delivery_assignments.values():
                        if a.order_id == val or a.id == val:
                            if a not in matched_assignments:
                                matched_assignments.append(a)
            except Exception:
                pass

            if not matched_assignments:
                matched_assignments = list(self.delivery_assignments.values())

            class AssignmentResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(self._items)
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalar_one(self):
                    return self._items[0]

            return AssignmentResult(matched_assignments)

        # Notifications
        if "notifications" in stmt_str:
            is_count = "count(" in stmt_str.lower()
            notifs = list(self.notifications.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID):
                        notifs = [n for n in notifs if n.user_id == val or n.id == val]
            except Exception:
                pass

            if is_count and "is_read" in stmt_str.lower():
                notifs = [n for n in notifs if not n.is_read]

            class NotificationResult:
                def __init__(self, items, is_count=False):
                    self._items = items
                    self._is_count = is_count
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(self._items)
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalar_one(self):
                    if self._is_count:
                        return len(self._items)
                    return self._items[0] if self._items else None

            return NotificationResult(notifs, is_count=is_count)

        return await super().execute(stmt, *args, **kwargs)

    def add(self, instance):
        if isinstance(instance, DeliveryPartner):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.delivery_partners[instance.id] = instance
        elif isinstance(instance, DeliveryAssignment):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if instance.delivery_partner_id in self.delivery_partners:
                instance.delivery_partner = self.delivery_partners[instance.delivery_partner_id]
            self.delivery_assignments[instance.id] = instance
            if instance.order_id in self.orders:
                self.orders[instance.order_id].delivery_assignment = instance
                instance.order = self.orders[instance.order_id]
        elif isinstance(instance, Notification):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.notifications[instance.id] = instance
        elif isinstance(instance, Order):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not hasattr(instance, "items") or instance.items is None:
                instance.items = []
            if not hasattr(instance, "payments") or instance.payments is None:
                instance.payments = []
            if not hasattr(instance, "delivery_assignment"):
                instance.delivery_assignment = None
            if instance.delivery_slot_id and instance.delivery_slot_id in self.slots:
                instance.delivery_slot = self.slots[instance.delivery_slot_id]
            self.orders[instance.id] = instance
        else:
            super().add(instance)


@pytest.fixture
def delivery_db() -> InMemoryDeliveryDb:
    return InMemoryDeliveryDb()


@pytest.fixture
def client(delivery_db: InMemoryDeliveryDb):
    async def override_get_db():
        yield delivery_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _setup_cart_and_slot(db: InMemoryDeliveryDb, user_id: uuid.UUID):
    # Setup Profile
    db.add_profile(Profile(id=user_id, role="CUSTOMER", is_active=True))

    # Setup Address
    addr = Address(
        id=uuid.uuid4(),
        user_id=user_id,
        recipient_name="Amitabh Bachchan",
        phone="+919876543210",
        line1="Station Road, Civil Lines",
        city="Barabanki",
        state="Uttar Pradesh",
        pincode="225001",
        is_default=True,
        is_deleted=False,
    )
    db.add(addr)

    # Setup Delivery Slot
    slot = DeliverySlot(
        id=uuid.uuid4(),
        slot_date=datetime.now(timezone.utc).date(),
        start_time=datetime.strptime("10:00:00", "%H:%M:%S").time(),
        end_time=datetime.strptime("13:00:00", "%H:%M:%S").time(),
        cutoff_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        capacity=50,
        booked_count=0,
        status="ACTIVE",
    )
    db.add(slot)

    # Setup Cart with item
    cart = Cart(id=uuid.uuid4(), user_id=user_id, status="ACTIVE", items=[])
    db.add(cart)
    v1 = list(db.variants.values())[0]
    ci = CartItem(
        id=uuid.uuid4(),
        cart_id=cart.id,
        product_variant_id=v1.id,
        quantity=2,
    )
    db.add(ci)

    return addr, slot


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_delivery_partner_crud(client: TestClient, delivery_db: InMemoryDeliveryDb, make_token):
    """Admin/staff can perform CRUD on delivery partners; customer is forbidden."""
    admin_id = uuid.uuid4()
    cust_id = uuid.uuid4()
    delivery_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))
    delivery_db.add_profile(Profile(id=cust_id, role="CUSTOMER", is_active=True))

    admin_headers = {"Authorization": f"Bearer {make_token(user_id=admin_id, role='ADMIN')}"}
    cust_headers = {"Authorization": f"Bearer {make_token(user_id=cust_id, role='CUSTOMER')}"}

    partner_payload = {
        "name": "Rajesh Kumar",
        "phone": "+919876543211",
        "is_active": True,
    }

    # 1. Customer forbidden
    res = client.post("/api/v1/admin/delivery-partners", json=partner_payload, headers=cust_headers)
    assert res.status_code == 403

    # 2. Admin creates partner
    create_res = client.post("/api/v1/admin/delivery-partners", json=partner_payload, headers=admin_headers)
    assert create_res.status_code == 201
    partner = create_res.json()
    assert partner["name"] == "Rajesh Kumar"
    partner_id = partner["id"]

    # 3. List partners
    list_res = client.get("/api/v1/admin/delivery-partners", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Update partner
    patch_res = client.patch(
        f"/api/v1/admin/delivery-partners/{partner_id}",
        json={"name": "Rajesh Kumar (Senior Rider)"},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Rajesh Kumar (Senior Rider)"

    # 5. Soft delete (deactivate) partner
    del_res = client.delete(f"/api/v1/admin/delivery-partners/{partner_id}", headers=admin_headers)
    assert del_res.status_code == 204
    assert delivery_db.delivery_partners[uuid.UUID(partner_id)].is_active is False


def test_delivery_assignment_and_customer_view(client: TestClient, delivery_db: InMemoryDeliveryDb, make_token):
    """Admin assigns delivery partner to an order and customer sees the details in order response."""
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(delivery_db, user_id)
    delivery_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))

    cust_token = make_token(user_id=user_id, role="CUSTOMER")
    admin_token = make_token(user_id=admin_id, role="ADMIN")
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create delivery partner
    p = DeliveryPartner(id=uuid.uuid4(), name="Mohan Lal", phone="+919415099999", is_active=True)
    delivery_db.add(p)

    # 2. Customer checks out COD order
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "COD",
    }, headers=cust_headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 3. Admin assigns delivery partner
    assign_res = client.post(
        f"/api/v1/admin/orders/{order_id}/assign-delivery",
        json={"delivery_partner_id": str(p.id), "notes": "Handle sweet boxes with care"},
        headers=admin_headers,
    )
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    assert assign_data["partner_name"] == "Mohan Lal"
    assert assign_data["partner_phone"] == "+919415099999"

    # 4. Customer views order and sees delivery assignment
    get_res = client.get(f"/api/v1/orders/{order_id}", headers=cust_headers)
    assert get_res.status_code == 200
    order_data = get_res.json()
    assert order_data["delivery_assignment"] is not None
    assert order_data["delivery_assignment"]["partner_name"] == "Mohan Lal"


def test_order_status_state_machine_end_to_end(client: TestClient, delivery_db: InMemoryDeliveryDb, make_token):
    """
    Test full state machine lifecycle:
    PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED.
    Enforces forward-only transitions and sets timestamps.
    """
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(delivery_db, user_id)
    delivery_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))

    cust_headers = {"Authorization": f"Bearer {make_token(user_id=user_id, role='CUSTOMER')}"}
    admin_headers = {"Authorization": f"Bearer {make_token(user_id=admin_id, role='ADMIN')}"}

    # 1. Place COD order
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "COD",
    }, headers=cust_headers)
    order_id = order_res.json()["id"]

    # 2. Illegal jump: PLACED -> DELIVERED (fails)
    bad_res = client.patch(f"/api/v1/admin/orders/{order_id}/status", json={"status": "DELIVERED"}, headers=admin_headers)
    assert bad_res.status_code == 400

    # 3. Valid progression
    steps = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"]
    for s in steps:
        res = client.patch(f"/api/v1/admin/orders/{order_id}/status", json={"status": s}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["status"] == s

    # 4. Once DELIVERED: COD payment becomes PAID
    final_order = client.get(f"/api/v1/orders/{order_id}", headers=cust_headers).json()
    assert final_order["status"] == "DELIVERED"
    assert final_order["payment_status"] == "PAID"
    assert final_order["delivered_at"] is not None


def test_notifications_flow(client: TestClient, delivery_db: InMemoryDeliveryDb, make_token):
    """Placing order and status transitions generate notifications for customer; customer can list and mark read."""
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(delivery_db, user_id)
    delivery_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))

    cust_headers = {"Authorization": f"Bearer {make_token(user_id=user_id, role='CUSTOMER')}"}
    admin_headers = {"Authorization": f"Bearer {make_token(user_id=admin_id, role='ADMIN')}"}

    # 1. Customer registers device token
    token_res = client.post(
        "/api/v1/notifications/device-token",
        json={"fcm_token": "fcm_test_token_sample_1234567890"},
        headers=cust_headers,
    )
    assert token_res.status_code == 200
    assert delivery_db.profiles[user_id].fcm_token == "fcm_test_token_sample_1234567890"

    # 2. Place COD order (triggers PLACED notification)
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "COD",
    }, headers=cust_headers)
    order_id = order_res.json()["id"]

    # 3. Admin confirms order (triggers CONFIRMED notification)
    client.patch(f"/api/v1/admin/orders/{order_id}/status", json={"status": "CONFIRMED"}, headers=admin_headers)

    # 4. Customer checks notifications
    notifs_res = client.get("/api/v1/notifications", headers=cust_headers)
    assert notifs_res.status_code == 200
    data = notifs_res.json()
    assert len(data["items"]) >= 2
    assert data["unread_count"] >= 2

    # 5. Mark first notification as read
    first_notif_id = data["items"][0]["id"]
    read_res = client.patch(f"/api/v1/notifications/{first_notif_id}/read", headers=cust_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
