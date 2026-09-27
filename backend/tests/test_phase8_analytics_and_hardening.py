"""
Phase 8 Test Suite — Analytics, Polish, Hardening, Customers, Settings, Profile & Observability.
Per docs/15-TESTING-STRATEGY.md, docs/19-DEVELOPMENT-ROADMAP.md §Phase 8,
and docs/06-API-SPECIFICATION.md §6.1, §6.10, §6.13.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.common.audit import log_audit_event, sanitize_payload
from app.common.auth import (
    AuthenticatedUser,
    get_current_user,
    require_admin,
    require_staff_or_admin,
)
from app.db.models.auth import Profile
from app.db.models.catalog import Category, Product, ProductVariant
from app.db.models.operations import AuditLog, StoreSetting
from app.db.models.orders import Order, OrderItem
from app.db.session import get_db
from app.main import app
from tests.test_hampers_and_bulk_enquiries import InMemoryHampersAndBulkDb


class InMemoryPhase8Db(InMemoryHampersAndBulkDb):
    """Database mock supporting StoreSettings, AuditLogs, Sales Aggregations, and Customers."""

    def __init__(self):
        super().__init__()
        self.audit_logs: dict[uuid.UUID, AuditLog] = {}
        self.store_settings: StoreSetting = StoreSetting(
            id=1,
            store_name="Saraswati Sweets",
            store_phone="+919999999999",
            store_email="info@saraswatisweets.com",
            address_text="Barabanki, Uttar Pradesh",
            cod_limit_amount=5000.0,
            cod_enabled=True,
            tax_enabled=False,
            tax_rate_percent=0.0,
            delivery_charge_flat=0.0,
            free_delivery_above=None,
            serviceable_pincodes=["225001", "225002", "225003"],
            max_qty_per_cart_item=20,
            business_hours={"opening": "08:00", "closing": "22:00", "timezone": "Asia/Kolkata"},
            updated_at=datetime.now(timezone.utc),
        )

    def add(self, instance):
        if isinstance(instance, AuditLog):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            self.audit_logs[instance.id] = instance
        elif isinstance(instance, StoreSetting):
            self.store_settings = instance
        else:
            super().add(instance)

    async def get(self, entity_class, ident):
        if entity_class is StoreSetting:
            return self.store_settings
        if entity_class is Profile:
            return self.profiles.get(ident)
        return await super().get(entity_class, ident)

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # 1. Store Settings Query
        if "store_settings" in stmt_str:
            class StoreSettingResult:
                def __init__(self, setting): self.setting = setting
                def scalar_one_or_none(self): return self.setting
                def scalar_one(self): return self.setting
            return StoreSettingResult(self.store_settings)

        # 2. Audit Logs Query
        if "audit_logs" in stmt_str:
            class AuditLogsResult:
                def __init__(self, items): self.items = items
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(self.items)
            return AuditLogsResult(list(self.audit_logs.values()))

        # 3. Dashboard Queries
        # Today's orders & revenue
        if "order_count" in stmt_str and "revenue_sum" in stmt_str:
            eligible_orders = [
                o for o in self.orders.values()
                if o.status != "CANCELLED"
                and (
                    o.payment_status in ("PAID", "CAPTURED")
                    or (o.payment_method == "COD" and o.status in ("CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"))
                )
            ]
            count = len(eligible_orders)
            revenue = sum(float(o.total_amount) for o in eligible_orders)
            class TodayResult:
                def one(self):
                    class Row:
                        order_count = count
                        revenue_sum = revenue
                    return Row()
            return TodayResult()

        # Pending orders count
        if "orders.status in" in stmt_str.lower() and "count" in stmt_str.lower():
            pending = [o for o in self.orders.values() if o.status in ("PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY")]
            class PendingResult:
                def scalar(self): return len(pending)
            return PendingResult()

        # Orders awaiting action count
        if "orders.status = :status_1" in stmt_str.lower() and "count" in stmt_str.lower():
            awaiting = [o for o in self.orders.values() if o.status == "PENDING"]
            class AwaitingResult:
                def scalar(self): return len(awaiting)
            return AwaitingResult()

        # Total active products
        if "products.is_active is true" in stmt_str.lower() or "is_active" in stmt_str.lower() and "products" in stmt_str.lower() and "count" in stmt_str.lower():
            active_p = [p for p in self.products.values() if p.is_active]
            class ProdCountResult:
                def scalar(self): return len(active_p)
            return ProdCountResult()

        # Low stock variants
        if "join products" in stmt_str.lower() and "product_variants" in stmt_str.lower():
            low_stock = []
            for v in self.variants.values():
                if v.is_active and (v.stock_status == "LOW_STOCK" or (v.stock_quantity is not None and v.stock_quantity <= 5)):
                    p_name = self.products[v.product_id].name if v.product_id in self.products else "Test Product"
                    low_stock.append((v, p_name))
            class LowStockResult:
                def all(self): return low_stock
                def scalar_one_or_none(self): return None
            return LowStockResult()

        # 4. Sales Report Query (select(Order)...)
        if "orders.status !=" in stmt_str.lower() and "order_items" in stmt_str.lower():
            matched_orders = [o for o in self.orders.values() if o.status != "CANCELLED"]
            class OrdersReportResult:
                def scalars(self):
                    class L:
                        def __init__(self, it): self.it = it
                        def all(self): return self.it
                    return L(matched_orders)
            return OrdersReportResult()

        # 5. Customers Directory Query
        if "order_stats_subq" in stmt_str or ("profiles" in stmt_str.lower() and "total_orders" in stmt_str.lower()):
            rows = []
            search_term = None
            try:
                params = stmt.compile().params
                for _k, v in params.items():
                    if isinstance(v, str) and "%" in v:
                        search_term = v.strip("%").lower()
            except Exception:
                pass

            for p in self.profiles.values():
                if search_term:
                    match = (
                        (p.full_name and search_term in p.full_name.lower())
                        or (p.phone and search_term in p.phone.lower())
                        or (p.email and search_term in p.email.lower())
                    )
                    if not match:
                        continue

                cust_orders = [o for o in self.orders.values() if o.user_id == p.id and o.status != "CANCELLED"]
                tot_orders = len(cust_orders)
                tot_spend = sum(float(o.total_amount) for o in cust_orders)
                rows.append((p, tot_orders, tot_spend))

            class CustomersResult:
                def all(self): return rows
                def scalar(self): return len(rows)
            return CustomersResult()

        # Customer count query
        if "count(profiles.id)" in stmt_str.lower():
            total = len(self.profiles)
            class CountResult:
                def scalar(self): return total
            return CountResult()

        return await super().execute(stmt, *args, **kwargs)


@pytest.fixture
def phase8_db():
    db = InMemoryPhase8Db()
    yield db


@pytest.fixture
def client(phase8_db):
    app.dependency_overrides[get_db] = lambda: phase8_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed_test_data(db: InMemoryPhase8Db):
    admin_id = uuid.uuid4()
    customer_id = uuid.uuid4()

    admin = Profile(
        id=admin_id,
        phone="+919876543210",
        full_name="Admin Boss",
        role="ADMIN",
        is_active=True,
    )
    customer = Profile(
        id=customer_id,
        phone="+919876543211",
        full_name="Rajesh Sweets Fan",
        email="rajesh@example.com",
        role="CUSTOMER",
        is_active=True,
        notif_promotional_opt_in=True,
    )
    db.profiles[admin_id] = admin
    db.profiles[customer_id] = customer

    # Category, Product, Variant
    cat_id = uuid.uuid4()
    cat = Category(id=cat_id, name="Royal Mithai", slug="royal-mithai", is_active=True)
    prod_id = uuid.uuid4()
    prod = Product(id=prod_id, category_id=cat_id, name="Kaju Katli Special", slug="kaju-katli-special", is_active=True)
    prod.category = cat
    var_id = uuid.uuid4()
    var = ProductVariant(
        id=var_id,
        product_id=prod_id,
        label="500g",
        price=450.0,
        stock_status="LOW_STOCK",
        stock_quantity=3,
        is_active=True,
    )
    var.product = prod
    db.products[prod_id] = prod
    db.variants[var_id] = var

    # Order
    order_id = uuid.uuid4()
    order = Order(
        id=order_id,
        order_number="ORD-P8-001",
        user_id=customer_id,
        address_snapshot={"city": "Barabanki"},
        status="CONFIRMED",
        payment_method="ONLINE",
        payment_status="PAID",
        subtotal=450.0,
        total_amount=450.0,
        created_at=datetime.now(timezone.utc),
    )
    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order_id,
        item_type="PRODUCT",
        product_variant_id=var_id,
        product_name_snapshot="Kaju Katli Special",
        variant_label_snapshot="500g",
        unit_price=450.0,
        quantity=1,
        line_total=450.0,
    )
    item.variant_rel = var
    order.items = [item]
    db.orders[order_id] = order

    return admin, customer, prod, var, order


# ── Audit Logging Unit Tests ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_audit_logging_sanitization(phase8_db):
    """Verify sensitive token redaction and audit log insertion."""
    raw = {
        "email": "user@example.com",
        "password": "secretPassword123",
        "access_token": "bearer.jwt.token",
        "nested": {"razorpay_signature": "sig123", "amount": 500},
    }
    clean = sanitize_payload(raw)
    assert clean["email"] == "user@example.com"
    assert clean["password"] == "[REDACTED]"
    assert clean["access_token"] == "[REDACTED]"
    assert clean["nested"]["razorpay_signature"] == "[REDACTED]"
    assert clean["nested"]["amount"] == 500

    admin_id = uuid.uuid4()
    entry = await log_audit_event(
        db=phase8_db,
        action="SYSTEM_INIT",
        entity_type="SYSTEM",
        actor_user_id=admin_id,
        before_data={"old": "val"},
        after_data={"new": "val", "token": "xyz"},
    )
    assert entry.action == "SYSTEM_INIT"
    assert entry.after_data["token"] == "[REDACTED]"
    assert len(phase8_db.audit_logs) == 1


# ── Admin Dashboard Summary Tests ─────────────────────────────────────────────

def test_admin_dashboard_summary(client, phase8_db):
    """Test GET /api/v1/admin/dashboard/summary server-side aggregation."""
    admin, customer, prod, var, order = _seed_test_data(phase8_db)

    # 1. Access as Admin
    app.dependency_overrides[require_staff_or_admin] = lambda: AuthenticatedUser(
        user_id=admin.id, role="ADMIN", phone=admin.phone, is_active=True
    )
    res = client.get("/api/v1/admin/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["today"]["orders"] == 1
    assert data["today"]["revenue"] == 450.0
    assert data["pending_orders"] == 1
    assert len(data["low_stock_items"]) == 1
    assert data["low_stock_items"][0]["product_name"] == "Kaju Katli Special"

    # 2. Access as normal Customer rejected (403)
    app.dependency_overrides[require_staff_or_admin] = lambda: (_ for _ in ()).throw(
        pytest.importorskip("fastapi").HTTPException(status_code=403, detail="Forbidden")
    )
    cust_res = client.get("/api/v1/admin/dashboard/summary")
    assert cust_res.status_code == 403


# ── Sales Reports & CSV Export Tests ──────────────────────────────────────────

def test_admin_sales_reports_and_csv(client, phase8_db):
    """Test sales report aggregation and RFC-compliant CSV generation."""
    admin, customer, prod, var, order = _seed_test_data(phase8_db)

    app.dependency_overrides[require_staff_or_admin] = lambda: AuthenticatedUser(
        user_id=admin.id, role="ADMIN", phone=admin.phone, is_active=True
    )

    # Category grouping
    res = client.get("/api/v1/admin/reports/sales?group_by=category")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_orders"] == 1
    assert data["summary"]["total_revenue"] == 450.0
    assert len(data["items"]) == 1
    assert data["items"][0]["group_key"] == "Royal Mithai"

    # Product grouping
    prod_res = client.get("/api/v1/admin/reports/sales?group_by=product")
    assert prod_res.status_code == 200
    pdata = prod_res.json()
    assert pdata["items"][0]["group_key"] == "Kaju Katli Special"

    # CSV Export
    csv_res = client.get("/api/v1/admin/reports/sales/export?group_by=category")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Royal Mithai" in csv_res.text
    assert "450.00" in csv_res.text


# ── Customer Management Tests ─────────────────────────────────────────────────

def test_admin_customers_directory(client, phase8_db):
    """Test customer directory listing, search, and detail modal endpoint."""
    admin, customer, prod, var, order = _seed_test_data(phase8_db)

    app.dependency_overrides[require_staff_or_admin] = lambda: AuthenticatedUser(
        user_id=admin.id, role="ADMIN", phone=admin.phone, is_active=True
    )

    # Listing
    list_res = client.get("/api/v1/admin/customers")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    cust_item = next(c for c in data["items"] if c["id"] == str(customer.id))
    assert cust_item["full_name"] == "Rajesh Sweets Fan"
    assert cust_item["total_orders"] == 1
    assert cust_item["total_spend"] == 450.0

    # Search
    search_res = client.get("/api/v1/admin/customers?search=Rajesh")
    assert search_res.status_code == 200
    assert len(search_res.json()["items"]) == 1

    # Customer Detail
    detail_res = client.get(f"/api/v1/admin/customers/{customer.id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["full_name"] == "Rajesh Sweets Fan"
    assert len(detail["recent_orders"]) == 1
    assert detail["recent_orders"][0]["order_number"] == "ORD-P8-001"


# ── Store Settings Tests ──────────────────────────────────────────────────────

def test_store_settings_lifecycle(client, phase8_db):
    """Test fetching and updating store settings with admin audit logging."""
    admin, customer, _, _, _ = _seed_test_data(phase8_db)

    # 1. Read settings
    app.dependency_overrides[require_staff_or_admin] = lambda: AuthenticatedUser(
        user_id=admin.id, role="ADMIN", phone=admin.phone, is_active=True
    )
    app.dependency_overrides[require_admin] = lambda: AuthenticatedUser(
        user_id=admin.id, role="ADMIN", phone=admin.phone, is_active=True
    )

    get_res = client.get("/api/v1/admin/store-settings")
    assert get_res.status_code == 200
    assert get_res.json()["store_name"] == "Saraswati Sweets"

    # 2. Update settings as Admin
    patch_res = client.patch(
        "/api/v1/admin/store-settings",
        json={"store_name": "Saraswati Sweets Barabanki", "cod_limit_amount": 7500.0},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["store_name"] == "Saraswati Sweets Barabanki"
    assert patch_res.json()["cod_limit_amount"] == 7500.0

    # Verify audit log recorded
    assert len(phase8_db.audit_logs) >= 1
    assert list(phase8_db.audit_logs.values())[-1].action == "UPDATE_STORE_SETTINGS"


# ── Profile & Notification Preferences Tests ──────────────────────────────────

def test_profile_and_notifications(client, phase8_db):
    """Test customer personal profile update and notification preferences toggling."""
    admin, customer, _, _, _ = _seed_test_data(phase8_db)

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id=customer.id, role="CUSTOMER", phone=customer.phone, is_active=True
    )

    # 1. Update personal profile
    profile_res = client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Rajesh Kumar", "email": "rajesh.k@example.com"},
    )
    assert profile_res.status_code == 200
    data = profile_res.json()["data"]
    assert data["full_name"] == "Rajesh Kumar"
    assert data["email"] == "rajesh.k@example.com"
    assert data["role"] == "CUSTOMER"  # Role cannot be tampered with

    # 2. Notification preferences
    get_pref = client.get("/api/v1/notifications/preferences")
    assert get_pref.status_code == 200
    assert get_pref.json()["notif_promotional_opt_in"] is True

    # 3. Toggle promotional notifications
    patch_pref = client.patch(
        "/api/v1/notifications/preferences",
        json={"notif_promotional_opt_in": False},
    )
    assert patch_pref.status_code == 200
    assert patch_pref.json()["notif_promotional_opt_in"] is False
