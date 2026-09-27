"""
Phase 4 Test Suite — Online Payments, Razorpay Gateway, Signature Verification,
Webhooks, Deduplication, and Admin Refunds.
Per docs/09-PAYMENTS.md, docs/06-API-SPECIFICATION.md §6.8, and docs/15-TESTING-STRATEGY.md
"""
import json
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.db.models.auth import Address, Profile
from app.db.models.cart import Cart, CartItem
from app.db.models.orders import (
    DeliverySlot,
    Order,
    OrderItem,
    Payment,
    ProcessedWebhookEvent,
)
from app.db.session import get_db
from app.main import app
from tests.conftest import MockResult
from tests.test_checkout import InMemoryPhase3Db


class InMemoryPaymentDb(InMemoryPhase3Db):
    """Extended in-memory test database handling Payment, ProcessedWebhookEvent, and Order transitions."""

    def __init__(self):
        super().__init__()
        self.payments: dict[uuid.UUID, Payment] = {}
        self.webhook_events: dict[str, ProcessedWebhookEvent] = {}

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # ProcessedWebhookEvent
        if "processed_webhook_events" in stmt_str:
            found = None
            try:
                params = stmt.compile().params
                for val in params.values():
                    if val in self.webhook_events:
                        found = self.webhook_events[val]
                        break
            except Exception:
                pass
            return MockResult(found)

        # Payments
        if "payments" in stmt_str:
            matched_payments = []
            try:
                params = stmt.compile().params
                for val in params.values():
                    for p in self.payments.values():
                        if p.razorpay_order_id == val or p.razorpay_payment_id == val or p.id == val or str(p.order_id) == str(val):
                            if p not in matched_payments:
                                matched_payments.append(p)
            except Exception:
                pass

            if not matched_payments:
                matched_payments = list(self.payments.values())

            class PaymentResult:
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

            return PaymentResult(matched_payments)

        # Orders (by id or list)
        if "orders" in stmt_str:
            is_count = "count(" in stmt_str.lower()
            order_items = list(self.orders.values())

            order_id_param = None
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.orders:
                        order_id_param = val
                        break
                    elif isinstance(val, str):
                        try:
                            uid = uuid.UUID(val)
                            if uid in self.orders:
                                order_id_param = uid
                                break
                        except ValueError:
                            pass
            except Exception:
                pass

            if order_id_param:
                order_items = [self.orders[order_id_param]]

            class OrderResult:
                def __init__(self, items, is_count=False):
                    self._items = items
                    self._is_count = is_count
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                        def first(self): return self.it[0] if self.it else None
                    return L(self._items)
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalar_one(self):
                    if self._is_count:
                        return len(self._items)
                    return self._items[0] if self._items else None

            return OrderResult(order_items, is_count=is_count)

        return await super().execute(stmt, *args, **kwargs)

    def add(self, instance):
        if isinstance(instance, Payment):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.payments[instance.id] = instance
            if instance.order_id in self.orders:
                order = self.orders[instance.order_id]
                if not hasattr(order, "payments") or order.payments is None:
                    order.payments = []
                if instance not in order.payments:
                    order.payments.append(instance)
                instance.order = order
        elif isinstance(instance, ProcessedWebhookEvent):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.webhook_events[instance.event_id] = instance
        elif isinstance(instance, Order):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not hasattr(instance, "items") or instance.items is None:
                instance.items = []
            if not hasattr(instance, "payments") or instance.payments is None:
                instance.payments = []
            if instance.delivery_slot_id and instance.delivery_slot_id in self.slots:
                instance.delivery_slot = self.slots[instance.delivery_slot_id]
            self.orders[instance.id] = instance
        elif isinstance(instance, OrderItem):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.order_items[instance.id] = instance
            if instance.order_id in self.orders:
                self.orders[instance.order_id].items.append(instance)
                instance.order = self.orders[instance.order_id]
        else:
            super().add(instance)


@pytest.fixture
def payment_db() -> InMemoryPaymentDb:
    return InMemoryPaymentDb()


@pytest.fixture
def client(payment_db: InMemoryPaymentDb):
    async def override_get_db():
        yield payment_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _setup_cart_and_slot(db: InMemoryPaymentDb, user_id: uuid.UUID):
    # Setup Profile
    db.add_profile(Profile(id=user_id, role="CUSTOMER", is_active=True))

    # Setup Address
    addr = Address(
        id=uuid.uuid4(),
        user_id=user_id,
        recipient_name="Vikram Verma",
        phone="+919876543210",
        line1="Civil Lines, Near Clock Tower",
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
        end_time=datetime.strptime("12:00:00", "%H:%M:%S").time(),
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

def test_online_checkout_creates_pending_order_and_gateway_id(client: TestClient, payment_db: InMemoryPaymentDb, make_token):
    """Selecting ONLINE payment generates PENDING_PAYMENT order and Razorpay order ID."""
    user_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(payment_db, user_id)
    token = make_token(user_id=user_id, role="CUSTOMER")

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
    }
    res = client.post("/api/v1/checkout", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["status"] == "PENDING_PAYMENT"
    assert data["payment_status"] == "PENDING"
    assert data["payment_method"] == "ONLINE"
    assert data["razorpay_order_id"] is not None
    assert data["razorpay_order_id"].startswith("order_")
    assert data["razorpay_key_id"] is not None
    assert data["currency"] == "INR"


def test_verify_client_payment_success(client: TestClient, payment_db: InMemoryPaymentDb, make_token):
    """Valid Razorpay signature successfully confirms order and transitions to PLACED/CAPTURED."""
    user_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(payment_db, user_id)
    token = make_token(user_id=user_id, role="CUSTOMER")

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
    }
    order_res = client.post("/api/v1/checkout", json=payload, headers=headers)
    order_data = order_res.json()
    order_id = order_data["id"]
    rzp_order_id = order_data["razorpay_order_id"]

    # Verify using mock signature supported in dev mode
    rzp_payment_id = "pay_test_123456"
    verify_payload = {
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": f"mock_sig_{rzp_payment_id}",
    }
    verify_res = client.post("/api/v1/payments/verify", json=verify_payload, headers=headers)
    assert verify_res.status_code == 200
    vdata = verify_res.json()
    assert vdata["success"] is True
    assert vdata["status"] == "PLACED"
    assert vdata["payment_status"] == "CAPTURED"

    # Idempotent second verification
    second_res = client.post("/api/v1/payments/verify", json=verify_payload, headers=headers)
    assert second_res.status_code == 200
    assert second_res.json()["success"] is True


def test_verify_client_payment_invalid_signature(client: TestClient, payment_db: InMemoryPaymentDb, make_token):
    """Invalid signature rejects verification with 400 error."""
    user_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(payment_db, user_id)
    token = make_token(user_id=user_id, role="CUSTOMER")

    headers = {"Authorization": f"Bearer {token}"}
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
    }, headers=headers)
    order_data = order_res.json()

    verify_payload = {
        "order_id": order_data["id"],
        "razorpay_order_id": order_data["razorpay_order_id"],
        "razorpay_payment_id": "pay_fraud_999",
        "razorpay_signature": "invalid_forged_signature_hex",
    }
    res = client.post("/api/v1/payments/verify", json=verify_payload, headers=headers)
    assert res.status_code == 400
    err_data = res.json().get("error", {})
    assert "signature" in err_data.get("message", "").lower() or err_data.get("code") == "PAYMENT_SIGNATURE_INVALID"


def test_razorpay_webhook_payment_captured_and_deduplication(client: TestClient, payment_db: InMemoryPaymentDb, make_token):
    """Webhook processes payment.captured, confirms order, and deduplicates repeated delivery."""
    user_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(payment_db, user_id)
    token = make_token(user_id=user_id, role="CUSTOMER")

    headers = {"Authorization": f"Bearer {token}"}
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
    }, headers=headers)
    order_data = order_res.json()
    rzp_order_id = order_data["razorpay_order_id"]

    webhook_event = {
        "entity": "event",
        "account_id": "acc_test_123",
        "event": "payment.captured",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_999",
                    "order_id": rzp_order_id,
                    "amount": 60000,
                    "status": "captured",
                }
            }
        },
        "event_id": "evt_capture_12345",
    }
    body_bytes = json.dumps(webhook_event).encode("utf-8")
    webhook_headers = {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": "mock_webhook_sig_test",
    }

    # First delivery
    wh_res = client.post("/api/v1/payments/webhook/razorpay", content=body_bytes, headers=webhook_headers)
    assert wh_res.status_code == 200
    assert wh_res.json()["status"] == "processed"

    # Verify order transitioned to PLACED / CAPTURED
    order = payment_db.orders[uuid.UUID(order_data["id"])]
    assert order.status == "PLACED"
    assert order.payment_status == "CAPTURED"

    # Second delivery (replay/duplicate event)
    dup_res = client.post("/api/v1/payments/webhook/razorpay", content=body_bytes, headers=webhook_headers)
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "ignored"
    assert dup_res.json()["reason"] == "duplicate_event"


def test_admin_refund_online_payment(client: TestClient, payment_db: InMemoryPaymentDb, make_token):
    """Admin can issue a refund for captured online payment via Razorpay adapter."""
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(payment_db, user_id)
    payment_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))

    token = make_token(user_id=user_id, role="CUSTOMER")
    admin_token = make_token(user_id=admin_id, role="ADMIN")

    # 1. Customer places online order
    headers = {"Authorization": f"Bearer {token}"}
    order_res = client.post("/api/v1/checkout", json={
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
    }, headers=headers)
    order_data = order_res.json()
    order_id = order_data["id"]

    # 2. Verify payment to mark CAPTURED
    client.post("/api/v1/payments/verify", json={
        "order_id": order_id,
        "razorpay_order_id": order_data["razorpay_order_id"],
        "razorpay_payment_id": "pay_test_refund_1",
        "razorpay_signature": "mock_sig_pay_test_refund_1",
    }, headers=headers)

    # 3. Customer attempts admin refund -> 403 Forbidden
    cust_rfnd = client.post(f"/api/v1/admin/orders/{order_id}/refund", json={
        "amount": 200.0,
        "reason": "Customer cancellation",
    }, headers=headers)
    assert cust_rfnd.status_code == 403

    # 4. Admin issues refund
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_rfnd = client.post(f"/api/v1/admin/orders/{order_id}/refund", json={
        "amount": 200.0,
        "reason": "Quality issue customer report",
    }, headers=admin_headers)
    assert admin_rfnd.status_code == 200
    rdata = admin_rfnd.json()
    assert rdata["order_id"] == order_id
    assert rdata["refund_id"].startswith("rfnd_")
    assert rdata["refunded_amount"] == 200.0
    assert rdata["order_status"] == "REFUNDED"
    assert rdata["payment_status"] == "REFUNDED"
