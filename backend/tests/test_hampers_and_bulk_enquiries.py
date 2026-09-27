"""
Phase 7 Test Suite — Sweets-Specific Features: Gift Hampers & Bulk Order Enquiries.
Per docs/19-DEVELOPMENT-ROADMAP.md §Phase 7, docs/06-API-SPECIFICATION.md §6.10, §6.11, §6.17,
and docs/03-FEATURE-SPECIFICATION.md §6.2, §6.5.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.db.models.auth import Profile
from app.db.models.cart import CartItem
from app.db.models.catalog import (
    GiftHamper,
    GiftHamperImage,
    GiftHamperItem,
    Product,
    ProductVariant,
)
from app.db.models.operations import BulkOrderEnquiry
from app.db.session import get_db
from app.main import app
from tests.test_coupons_and_reviews import InMemoryPromotionsDb
from tests.test_delivery_and_notifications import _setup_cart_and_slot


class InMemoryHampersAndBulkDb(InMemoryPromotionsDb):
    """Extended test database supporting Gift Hampers, Hamper Items/Images, and Bulk Order Enquiries."""

    def __init__(self):
        super().__init__()
        self.gift_hampers: dict[uuid.UUID, GiftHamper] = {}
        self.gift_hamper_items: dict[uuid.UUID, GiftHamperItem] = {}
        self.gift_hamper_images: dict[uuid.UUID, GiftHamperImage] = {}
        self.bulk_enquiries: dict[uuid.UUID, BulkOrderEnquiry] = {}

    def add(self, instance):
        if isinstance(instance, GiftHamper):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            if not hasattr(instance, "items") or instance.items is None:
                instance.items = []
            if not hasattr(instance, "images") or instance.images is None:
                instance.images = []
            self.gift_hampers[instance.id] = instance
        elif isinstance(instance, GiftHamperItem):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.gift_hamper_items[instance.id] = instance
            hamper = self.gift_hampers.get(instance.gift_hamper_id)
            if hamper and instance not in hamper.items:
                hamper.items.append(instance)
        elif isinstance(instance, GiftHamperImage):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.gift_hamper_images[instance.id] = instance
            hamper = self.gift_hampers.get(instance.gift_hamper_id)
            if hamper and instance not in hamper.images:
                hamper.images.append(instance)
        elif isinstance(instance, BulkOrderEnquiry):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            self.bulk_enquiries[instance.id] = instance
        elif isinstance(instance, CartItem):
            if getattr(instance, "gift_hamper_id", None):
                instance.gift_hamper = self.gift_hampers.get(instance.gift_hamper_id)
            super().add(instance)
        else:
            super().add(instance)

    async def delete(self, instance):
        if isinstance(instance, GiftHamper) and instance.id in self.gift_hampers:
            del self.gift_hampers[instance.id]
        elif isinstance(instance, GiftHamperItem) and instance.id in self.gift_hamper_items:
            hamper = self.gift_hampers.get(instance.gift_hamper_id)
            if hamper and instance in hamper.items:
                hamper.items.remove(instance)
            del self.gift_hamper_items[instance.id]
        elif isinstance(instance, GiftHamperImage) and instance.id in self.gift_hamper_images:
            hamper = self.gift_hampers.get(instance.gift_hamper_id)
            if hamper and instance in hamper.images:
                hamper.images.remove(instance)
            del self.gift_hamper_images[instance.id]
        elif isinstance(instance, BulkOrderEnquiry) and instance.id in self.bulk_enquiries:
            del self.bulk_enquiries[instance.id]
        else:
            await super().delete(instance)

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # Gift Hampers count
        if "count(gift_hampers.id)" in stmt_str:
            matched = list(self.gift_hampers.values())
            if "is_active = true" in stmt_str.lower() or "is_active is true" in stmt_str.lower():
                matched = [h for h in matched if h.is_active is True]
            class CountRes:
                def scalar(self): return len(matched)
            return CountRes()

        # Gift Hamper Items
        if "gift_hamper_items" in stmt_str:
            matched_ghi = list(self.gift_hamper_items.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID):
                        matched_ghi = [i for i in matched_ghi if i.gift_hamper_id == val or i.id == val]
            except Exception:
                pass
            class GHIResult:
                def __init__(self, items): self._items = items
                def scalar_one_or_none(self): return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items): self.items = items
                        def all(self): return self.items
                    return Scalars(self._items)
            return GHIResult(matched_ghi)

        # Gift Hamper Images
        if "gift_hamper_images" in stmt_str:
            matched_images = list(self.gift_hamper_images.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID):
                        matched_images = [img for img in matched_images if img.gift_hamper_id == val or img.id == val]
            except Exception:
                pass
            class GHIImgResult:
                def __init__(self, items): self._items = items
                def scalar_one_or_none(self): return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items): self.items = items
                        def all(self): return self.items
                    return Scalars(self._items)
            return GHIImgResult(matched_images)

        # Gift Hampers
        if "gift_hampers" in stmt_str:
            matched_gh = list(self.gift_hampers.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.gift_hampers:
                        matched_gh = [self.gift_hampers[val]]
                    elif isinstance(val, str):
                        for h in self.gift_hampers.values():
                            if h.slug == val:
                                matched_gh = [h]
            except Exception:
                pass
            if "is_active = true" in stmt_str.lower() or "is_active is true" in stmt_str.lower():
                matched_gh = [h for h in matched_gh if h.is_active is True]

            for h in matched_gh:
                for it in h.items:
                    if getattr(it, "product_id", None) and it.product_id in self.products:
                        it.product = self.products[it.product_id]
                    if getattr(it, "product_variant_id", None) and it.product_variant_id in self.variants:
                        it.variant = self.variants[it.product_variant_id]

            class GHResult:
                def __init__(self, items): self._items = items
                def scalar_one_or_none(self): return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items): self.items = items
                        def all(self): return self.items
                    return Scalars(self._items)
            return GHResult(matched_gh)

        # Bulk Order Enquiries count
        if "count(bulk_order_enquiries.id)" in stmt_str:
            matched_b = list(self.bulk_enquiries.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, str) and val in ("NEW", "CONTACTED", "QUOTED", "WON", "LOST"):
                        matched_b = [b for b in matched_b if b.status == val]
            except Exception:
                pass
            class CountResB:
                def scalar(self): return len(matched_b)
            return CountResB()

        # Bulk Order Enquiries
        if "bulk_order_enquiries" in stmt_str:
            matched_b = list(self.bulk_enquiries.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.bulk_enquiries:
                        matched_b = [self.bulk_enquiries[val]]
                    elif isinstance(val, str) and val in ("NEW", "CONTACTED", "QUOTED", "WON", "LOST"):
                        matched_b = [b for b in matched_b if b.status == val]
            except Exception:
                pass
            class BEResult:
                def __init__(self, items): self._items = items
                def scalar_one_or_none(self): return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items): self.items = items
                        def all(self): return self.items
                    return Scalars(self._items)
            return BEResult(matched_b)

        return await super().execute(stmt, *args, **kwargs)


@pytest.fixture
def hampers_db():
    db = InMemoryHampersAndBulkDb()
    yield db


@pytest.fixture
def client(hampers_db):
    app.dependency_overrides[get_db] = lambda: hampers_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _create_test_profiles(db: InMemoryHampersAndBulkDb):
    admin_id = uuid.uuid4()
    staff_id = uuid.uuid4()
    customer_id = uuid.uuid4()

    admin_profile = Profile(
        id=admin_id,
        phone="+919876543210",
        full_name="Admin Boss",
        role="ADMIN",
        is_active=True,
    )
    staff_profile = Profile(
        id=staff_id,
        phone="+919876543211",
        full_name="Staff Operator",
        role="STAFF",
        is_active=True,
    )
    customer_profile = Profile(
        id=customer_id,
        phone="+919876543212",
        full_name="Sweet Lover",
        role="CUSTOMER",
        is_active=True,
    )

    db.add(admin_profile)
    db.add(staff_profile)
    db.add(customer_profile)
    return admin_profile, staff_profile, customer_profile


def _make_auth_header(user_id: uuid.UUID) -> dict[str, str]:
    import time

    import jwt

    from tests.conftest import TEST_JWT_SECRET
    payload = {
        "sub": str(user_id),
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time() + 3600),
        "aud": "authenticated",
    }
    token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}



# ── Tests ─────────────────────────────────────────────────────────────────────

def test_admin_create_hamper_and_items(client, hampers_db):
    """Staff/Admin can create a festive hamper, constituent items, and primary image; customer gets 403."""
    admin, staff, customer = _create_test_profiles(hampers_db)

    # 1. Non-staff attempts creation -> 403
    hamper_data = {
        "name": "Royal Diwali Sweet Box",
        "description": "Grand festive assortment of premium dry fruit sweets and mithai.",
        "hamper_price": 1499.00,
        "is_active": True,
    }
    cust_res = client.post(
        "/api/v1/admin/gift-hampers",
        json=hamper_data,
        headers=_make_auth_header(customer.id),
    )
    assert cust_res.status_code == 403

    # 2. Staff creates hamper -> 201
    create_res = client.post(
        "/api/v1/admin/gift-hampers",
        json=hamper_data,
        headers=_make_auth_header(staff.id),
    )
    assert create_res.status_code == 201
    created_hamper = create_res.json()
    assert created_hamper["name"] == "Royal Diwali Sweet Box"
    assert created_hamper["slug"] == "royal-diwali-sweet-box"
    assert created_hamper["hamper_price"] == 1499.00
    hamper_id = created_hamper["id"]

    # 3. Add sweet constituent items to the hamper
    prod = Product(
        id=uuid.uuid4(),
        name="Kaju Katli Special",
        slug="kaju-katli-special",
        is_active=True,
    )
    var = ProductVariant(
        id=uuid.uuid4(),
        product_id=prod.id,
        sku="KK-500G",
        label="500g Box",
        price=450.00,
        stock_quantity=100,
        stock_status="IN_STOCK",
        is_active=True,
    )
    hampers_db.add(prod)
    hampers_db.add(var)

    item_data = {
        "product_id": str(prod.id),
        "product_variant_id": str(var.id),
        "quantity": 1,
    }
    item_res = client.post(
        f"/api/v1/admin/gift-hampers/{hamper_id}/items",
        json=item_data,
        headers=_make_auth_header(staff.id),
    )
    assert item_res.status_code == 201
    updated_hamper = item_res.json()
    assert any(it["product_id"] == str(prod.id) for it in updated_hamper["items"])

    # 4. Add image to hamper
    img_data = {
        "url": "https://example.com/hampers/diwali-box.jpg",
        "storage_path": "hampers/diwali.jpg",
        "is_primary": True,
        "display_order": 0,
    }
    img_res = client.post(
        f"/api/v1/admin/gift-hampers/{hamper_id}/images",
        json=img_data,
        headers=_make_auth_header(staff.id),
    )
    assert img_res.status_code == 201
    updated_hamper_img = img_res.json()
    assert any(img["url"] == img_data["url"] for img in updated_hamper_img["images"])



def test_public_list_and_detail_gift_hampers(client, hampers_db):
    """Public customer can browse active festive hampers and view detailed constituent composition."""
    prod = Product(
        id=uuid.uuid4(),
        name="Desi Ghee Motichoor Ladoo",
        slug="desi-ghee-motichoor-ladoo",
        is_active=True,
    )
    var = ProductVariant(
        id=uuid.uuid4(),
        product_id=prod.id,
        sku="ML-400G",
        label="400g Box",
        price=280.00,
        stock_quantity=50,
        stock_status="IN_STOCK",
        is_active=True,
    )
    hampers_db.add(prod)
    hampers_db.add(var)

    hamper = GiftHamper(
        id=uuid.uuid4(),
        name="Uphaar Premium Hamper",
        slug="uphaar-premium-hamper",
        description="Celebration box with motichoor ladoo and pistachios.",
        hamper_price=899.00,
        is_active=True,
    )
    hampers_db.add(hamper)

    # Seed constituent item
    item = GiftHamperItem(
        id=uuid.uuid4(),
        gift_hamper_id=hamper.id,
        product_id=prod.id,
        product_variant_id=var.id,
        quantity=1,
    )
    hampers_db.add(item)

    # Seed image
    img = GiftHamperImage(
        id=uuid.uuid4(),
        gift_hamper_id=hamper.id,
        url="https://example.com/hampers/uphaar.jpg",
        storage_path="hampers/uphaar.jpg",
        is_primary=True,
        display_order=0,
    )
    hampers_db.add(img)

    # Inactive hamper (should not appear in public listing)
    inactive_hamper = GiftHamper(
        id=uuid.uuid4(),
        name="Secret Experimental Hamper",
        slug="secret-experimental-hamper",
        hamper_price=999.00,
        is_active=False,
    )
    hampers_db.add(inactive_hamper)

    # 1. List active hampers
    res = client.get("/api/v1/gift-hampers")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "uphaar-premium-hamper"
    assert data["items"][0]["primary_image_url"] == "https://example.com/hampers/uphaar.jpg"

    # 2. Get detail by slug ("What's inside" composition)
    detail_res = client.get("/api/v1/gift-hampers/uphaar-premium-hamper")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["name"] == "Uphaar Premium Hamper"
    assert detail["hamper_price"] == 899.00
    assert len(detail["items"]) == 1
    assert detail["items"][0]["product_id"] == str(prod.id)
    assert len(detail["images"]) == 1


def test_add_hamper_to_cart_and_checkout(client, hampers_db):
    """
    Test Phase Gate:
    1. A gift hamper can be added to cart with item_type='HAMPER'.
    2. Cart subtotal is accurately computed from hamper price.
    3. User completes checkout with packaging notes and special instructions.
    4. Order item records item_type='HAMPER' and gift_hamper_id.
    """
    admin, staff, customer = _create_test_profiles(hampers_db)
    user_id = customer.id
    addr, slot = _setup_cart_and_slot(hampers_db, user_id)

    # Create active hamper
    hamper = GiftHamper(
        id=uuid.uuid4(),
        name="Festive Delight Hamper",
        slug="festive-delight-hamper",
        hamper_price=1200.00,
        is_active=True,
    )
    hampers_db.add(hamper)

    # 1. Add hamper to cart
    cart_res = client.post(
        "/api/v1/cart/items",
        json={"gift_hamper_id": str(hamper.id), "quantity": 2},
        headers=_make_auth_header(user_id),
    )
    assert cart_res.status_code == 201
    cart_data = cart_res.json()
    # 2 * 1200 = 2400
    assert cart_data["subtotal"] >= 2400.00
    hamper_cart_item = next(i for i in cart_data["items"] if i.get("gift_hamper_id") == str(hamper.id))
    assert hamper_cart_item["item_type"] == "HAMPER"
    assert hamper_cart_item["product_name"] == "Festive Delight Hamper"
    assert hamper_cart_item["unit_price"] == 1200.00
    assert hamper_cart_item["line_total"] == 2400.00

    # 2. Checkout with special instructions and festive packaging notes
    checkout_payload = {
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "ONLINE",
        "special_instructions": "Please ring bell and leave with security guard if not home.",
        "packaging_notes": "Festive red ribbon packaging with golden gift tag.",
    }

    order_res = client.post(
        "/api/v1/checkout",
        json=checkout_payload,
        headers=_make_auth_header(user_id),
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["status"] == "PENDING_PAYMENT"
    assert order_data["subtotal"] >= 2400.00

    # Verify order item records item_type='HAMPER' and gift_hamper_id
    order_id = uuid.UUID(order_data["id"])
    created_order = hampers_db.orders[order_id]
    assert created_order.special_instructions == "Please ring bell and leave with security guard if not home."
    assert created_order.packaging_notes == "Festive red ribbon packaging with golden gift tag."

    hamper_order_items = [
        item for item in hampers_db.order_items.values()
        if item.order_id == order_id and item.gift_hamper_id == hamper.id
    ]
    assert len(hamper_order_items) == 1
    assert hamper_order_items[0].item_type == "HAMPER"
    assert hamper_order_items[0].unit_price == 1200.00
    assert hamper_order_items[0].quantity == 2


def test_public_and_authenticated_bulk_enquiries(client, hampers_db):
    """
    Test Phase Gate:
    1. A bulk-order enquiry can be submitted by a guest customer and appears with status NEW.
    2. An authenticated user submitting bulk-order enquiry automatically attaches user_id.
    """
    admin, staff, customer = _create_test_profiles(hampers_db)

    # 1. Guest enquiry submission
    guest_payload = {
        "name": "Amit Sharma",
        "email": "amit.sharma@corptech.com",
        "phone": "+919988776655",
        "enquiry_type": "CORPORATE",
        "event_date": str(date.today() + timedelta(days=20)),
        "estimated_quantity": "250 boxes",
        "items_of_interest": "Kaju Katli, Besan Ladoo, and Dry Fruit Chikki 500g boxes.",
        "message": "Looking for custom branded corporate boxes with logo printed.",
    }

    guest_res = client.post("/api/v1/bulk-enquiries", json=guest_payload)
    assert guest_res.status_code == 201
    guest_enquiry = guest_res.json()
    assert guest_enquiry["name"] == "Amit Sharma"
    assert guest_enquiry["status"] == "NEW"
    assert guest_enquiry["enquiry_type"] == "CORPORATE"
    assert guest_enquiry["estimated_quantity"] == "250 boxes"
    assert guest_enquiry["user_id"] is None

    # 2. Authenticated customer enquiry submission
    auth_payload = {
        "name": customer.full_name,
        "email": "sweetlover@example.com",
        "phone": customer.phone,
        "enquiry_type": "WEDDING",
        "event_date": str(date.today() + timedelta(days=45)),
        "estimated_quantity": "500 guests",
        "items_of_interest": "Special Motichoor, Kaju Pista Roll, and Badam Halwa.",
        "message": "Need premium brass tin packaging.",
    }
    auth_res = client.post(
        "/api/v1/bulk-enquiries",
        json=auth_payload,
        headers=_make_auth_header(customer.id),
    )
    assert auth_res.status_code == 201
    auth_enquiry = auth_res.json()
    assert auth_enquiry["user_id"] == str(customer.id)
    assert auth_enquiry["status"] == "NEW"


def test_admin_bulk_enquiry_pipeline_and_status_progression(client, hampers_db):
    """
    Test Phase Gate:
    Bulk-order enquiry appears in admin with status management working:
    NEW -> CONTACTED -> QUOTED -> WON.
    """
    admin, staff, customer = _create_test_profiles(hampers_db)

    # Seed an enquiry
    enquiry = BulkOrderEnquiry(
        id=uuid.uuid4(),
        name="Pooja Verma",
        phone="+919876543299",
        email="pooja.verma@example.com",
        enquiry_type="WEDDING",
        items_of_interest="Gulab Jamun & Rasgulla catering for 300 guests.",
        status="NEW",
    )
    hampers_db.add(enquiry)

    # 1. Non-staff attempts listing -> 403
    cust_res = client.get("/api/v1/admin/bulk-enquiries", headers=_make_auth_header(customer.id))
    assert cust_res.status_code == 403

    # 2. Staff lists enquiries
    staff_res = client.get("/api/v1/admin/bulk-enquiries", headers=_make_auth_header(staff.id))
    assert staff_res.status_code == 200
    list_data = staff_res.json()
    assert list_data["total"] == 1
    assert list_data["items"][0]["name"] == "Pooja Verma"
    assert list_data["items"][0]["status"] == "NEW"

    # 3. Staff updates status to CONTACTED with notes
    enquiry_id = enquiry.id
    update_res1 = client.patch(
        f"/api/v1/admin/bulk-enquiries/{enquiry_id}",
        json={"status": "CONTACTED", "admin_notes": "Spoke to customer on phone. Sent wedding sweets brochure."},
        headers=_make_auth_header(staff.id),
    )
    assert update_res1.status_code == 200
    assert update_res1.json()["status"] == "CONTACTED"
    assert "brochure" in update_res1.json()["admin_notes"]

    # 4. Staff updates status to QUOTED with quotation details
    update_res2 = client.patch(
        f"/api/v1/admin/bulk-enquiries/{enquiry_id}",
        json={"status": "QUOTED", "admin_notes": "Quote sent: Rs 45,000 for 300 boxes."},
        headers=_make_auth_header(staff.id),
    )
    assert update_res2.status_code == 200
    assert update_res2.json()["status"] == "QUOTED"

    # 5. Staff updates status to WON
    update_res3 = client.patch(
        f"/api/v1/admin/bulk-enquiries/{enquiry_id}",
        json={"status": "WON", "admin_notes": "Advance payment received. Order scheduled."},
        headers=_make_auth_header(staff.id),
    )
    assert update_res3.status_code == 200
    assert update_res3.json()["status"] == "WON"
