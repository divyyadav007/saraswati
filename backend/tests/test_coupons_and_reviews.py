"""
Phase 6 Test Suite — Coupons, Offers, Banners, and Reviews.
Per docs/19-DEVELOPMENT-ROADMAP.md §Phase 6, docs/06-API-SPECIFICATION.md §6.6, §6.10, §6.11, §6.18,
and docs/05-DATABASE-SCHEMA.md §2.15–2.18, §2.21.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.db.models.auth import Profile
from app.db.models.cart import CartItem
from app.db.models.catalog import Product, ProductVariant
from app.db.models.operations import Review
from app.db.models.orders import Order, OrderItem
from app.db.models.promotions import Banner, Coupon, CouponUsage, Offer
from app.db.session import get_db
from app.main import app
from tests.test_delivery_and_notifications import (
    InMemoryDeliveryDb,
    _setup_cart_and_slot,
)


class InMemoryPromotionsDb(InMemoryDeliveryDb):
    """Extended test database supporting coupons, usage tracking, banners, offers, and reviews."""

    def __init__(self):
        super().__init__()
        self.coupons: dict[uuid.UUID, Coupon] = {}
        self.coupon_usage: dict[uuid.UUID, CouponUsage] = {}
        self.offers: dict[uuid.UUID, Offer] = {}
        self.banners: dict[uuid.UUID, Banner] = {}
        self.reviews: dict[uuid.UUID, Review] = {}
        self.products: dict[uuid.UUID, Product] = {}

    def add(self, instance):
        if isinstance(instance, Coupon):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            self.coupons[instance.id] = instance
        elif isinstance(instance, CouponUsage):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "used_at", None):
                instance.used_at = datetime.now(timezone.utc)
            self.coupon_usage[instance.id] = instance
        elif isinstance(instance, Offer):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            self.offers[instance.id] = instance
        elif isinstance(instance, Banner):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            self.banners[instance.id] = instance
        elif isinstance(instance, Review):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            if not getattr(instance, "created_at", None):
                instance.created_at = datetime.now(timezone.utc)
            if not getattr(instance, "updated_at", None):
                instance.updated_at = datetime.now(timezone.utc)
            self.reviews[instance.id] = instance
        elif isinstance(instance, Product):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.products[instance.id] = instance
        elif isinstance(instance, ProductVariant):
            if not getattr(instance, "id", None):
                instance.id = uuid.uuid4()
            self.variants[instance.id] = instance
        else:
            super().add(instance)

    async def delete(self, instance):
        if isinstance(instance, Banner) and instance.id in self.banners:
            del self.banners[instance.id]
        elif isinstance(instance, Offer) and instance.id in self.offers:
            del self.offers[instance.id]
        elif isinstance(instance, Review) and instance.id in self.reviews:
            del self.reviews[instance.id]
        elif isinstance(instance, Coupon) and instance.id in self.coupons:
            del self.coupons[instance.id]
        else:
            await super().delete(instance)

    async def execute(self, stmt, *args, **kwargs):
        stmt_str = str(stmt)

        # Coupon Usage count queries
        if "count(coupon_usage.id)" in stmt_str:
            matched_usages = list(self.coupon_usage.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID):
                        if any(u.coupon_id == val for u in self.coupon_usage.values()):
                            matched_usages = [u for u in matched_usages if u.coupon_id == val]
                        if any(u.user_id == val for u in self.coupon_usage.values()):
                            matched_usages = [u for u in matched_usages if u.user_id == val]
            except Exception:
                pass

            count_val = len(matched_usages)

            class CountResult:
                def scalar(self):
                    return count_val

            return CountResult()

        # Order Items
        if "order_items" in stmt_str:
            matched_oi = list(self.order_items.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID):
                        matched_oi = [i for i in matched_oi if i.order_id == val or i.id == val]
            except Exception:
                pass

            class OrderItemResult:
                def __init__(self, items):
                    self._items = items
                def scalars(self):
                    class Scalars:
                        def __init__(self, items): self.items = items
                        def all(self): return self.items
                    return Scalars(self._items)

            return OrderItemResult(matched_oi)

        # Coupons
        if "coupons" in stmt_str:
            matched = []
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.coupons:
                        matched.append(self.coupons[val])
                    elif isinstance(val, str):
                        for c in self.coupons.values():
                            if c.code.upper() == val.upper():
                                matched.append(c)
            except Exception:
                pass

            if not matched and "where" not in stmt_str.lower():
                matched = list(self.coupons.values())

            class CouponResult:
                def __init__(self, items):
                    self._items = items
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items):
                            self._items = items
                        def all(self):
                            return self._items
                    return Scalars(self._items)

            return CouponResult(matched)

        # Banners
        if "banners" in stmt_str:
            matched_b = list(self.banners.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.banners:
                        matched_b = [self.banners[val]]
            except Exception:
                pass

            class BannerResult:
                def __init__(self, items):
                    self._items = items
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items):
                            self._items = items
                        def all(self):
                            return self._items
                    return Scalars(self._items)

            return BannerResult(matched_b)

        # Offers
        if "offers" in stmt_str:
            matched_o = list(self.offers.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.offers:
                        matched_o = [self.offers[val]]
            except Exception:
                pass

            class OfferResult:
                def __init__(self, items):
                    self._items = items
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items):
                            self._items = items
                        def all(self):
                            return self._items
                    return Scalars(self._items)

            return OfferResult(matched_o)

        # Reviews
        if "reviews" in stmt_str:
            matched_r = list(self.reviews.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.reviews:
                        matched_r = [self.reviews[val]]
                if "product_id_1" in params:
                    pid = params["product_id_1"]
                    matched_r = [r for r in matched_r if r.product_id == pid]
                if "user_id_1" in params:
                    uid = params["user_id_1"]
                    matched_r = [r for r in matched_r if r.user_id == uid]
                if "order_id_1" in params:
                    oid = params["order_id_1"]
                    matched_r = [r for r in matched_r if r.order_id == oid]
                if "is_published_1" in params:
                    pub = params["is_published_1"]
                    matched_r = [r for r in matched_r if r.is_published == pub]
            except Exception:
                pass

            if "is_published = true" in stmt_str.lower() or "is_published is true" in stmt_str.lower():
                matched_r = [r for r in matched_r if r.is_published is True]

            class ReviewResult:
                def __init__(self, items):
                    self._items = items
                def scalar_one_or_none(self):
                    return self._items[0] if self._items else None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items):
                            self._items = items
                        def all(self):
                            return self._items
                    return Scalars(self._items)

            return ReviewResult(matched_r)

        # Products
        if "products" in stmt_str:
            matched_p = list(self.products.values())
            try:
                params = stmt.compile().params
                for val in params.values():
                    if isinstance(val, uuid.UUID) and val in self.products:
                        matched_p = [self.products[val]]
            except Exception:
                pass

            class ProdResult:
                def __init__(self, items):
                    self._items = items
                def scalar_one_or_none(self):
                    if self._items:
                        item = self._items[0]
                        if "products.name" in stmt_str:
                            return item.name
                        return item
                    return None
                def scalars(self):
                    class Scalars:
                        def __init__(self, items):
                            self._items = items
                        def all(self):
                            return self._items
                    return Scalars(self._items)

            return ProdResult(matched_p)

        return await super().execute(stmt, *args, **kwargs)


@pytest.fixture
def promo_db() -> InMemoryPromotionsDb:
    return InMemoryPromotionsDb()


@pytest.fixture
def client(promo_db: InMemoryPromotionsDb):
    async def override_get_db():
        yield promo_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_coupon_validation_and_crud(client: TestClient, promo_db: InMemoryPromotionsDb, make_token):
    admin_id = uuid.uuid4()
    cust_id = uuid.uuid4()
    promo_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))
    promo_db.add_profile(Profile(id=cust_id, role="CUSTOMER", is_active=True))

    admin_headers = {"Authorization": f"Bearer {make_token(user_id=admin_id, role='ADMIN')}"}
    cust_headers = {"Authorization": f"Bearer {make_token(user_id=cust_id, role='CUSTOMER')}"}

    # 1. Admin creates a Percentage coupon
    valid_from = datetime.now(timezone.utc) - timedelta(days=1)
    valid_until = datetime.now(timezone.utc) + timedelta(days=30)
    res = client.post(
        "/api/v1/admin/coupons",
        json={
            "code": "diwali20",
            "type": "PERCENTAGE",
            "value": 20,
            "min_order_value": 300,
            "max_discount_amount": 100,
            "usage_limit_total": 50,
            "usage_limit_per_user": 2,
            "valid_from": valid_from.isoformat(),
            "valid_until": valid_until.isoformat(),
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert res.status_code == 201
    c_data = res.json()
    assert c_data["code"] == "DIWALI20"
    assert c_data["value"] == 20.0

    # 2. Customer validates coupon with cart_total below min order value
    v_res = client.post(
        "/api/v1/coupons/validate",
        json={"code": "DIWALI20", "cart_total": 200},
        headers=cust_headers,
    )
    assert v_res.status_code == 200
    assert v_res.json()["is_valid"] is False
    assert "Minimum cart subtotal" in v_res.json()["message"]

    # 3. Customer validates coupon with cart_total 400 (20% of 400 = 80)
    v_res2 = client.post(
        "/api/v1/coupons/validate",
        json={"code": "DIWALI20", "cart_total": 400},
        headers=cust_headers,
    )
    assert v_res2.status_code == 200
    assert v_res2.json()["is_valid"] is True
    assert v_res2.json()["discount_amount"] == 80.0

    # 4. Customer validates coupon with cart_total 1000 (20% = 200, but capped at 100)
    v_res3 = client.post(
        "/api/v1/coupons/validate",
        json={"code": "DIWALI20", "cart_total": 1000},
        headers=cust_headers,
    )
    assert v_res3.status_code == 200
    assert v_res3.json()["is_valid"] is True
    assert v_res3.json()["discount_amount"] == 100.0

    # 5. Non-admin is forbidden from admin coupons endpoint
    res_forbidden = client.get("/api/v1/admin/coupons", headers=cust_headers)
    assert res_forbidden.status_code == 403


def test_checkout_with_coupon_and_limits(client: TestClient, promo_db: InMemoryPromotionsDb, make_token):
    user_id = uuid.uuid4()
    addr, slot = _setup_cart_and_slot(promo_db, user_id)
    cust_headers = {"Authorization": f"Bearer {make_token(user_id=user_id, role='CUSTOMER')}"}

    # Create a FLAT discount coupon with usage_limit_per_user = 1
    coupon = Coupon(
        id=uuid.uuid4(),
        code="FLAT50",
        type="FLAT",
        value=50.0,
        min_order_value=200.0,
        usage_limit_total=10,
        usage_limit_per_user=1,
        valid_from=datetime.now(timezone.utc) - timedelta(days=1),
        valid_until=datetime.now(timezone.utc) + timedelta(days=5),
        is_active=True,
    )
    promo_db.add(coupon)

    # Checkout with coupon FLAT50
    checkout_payload = {
        "address_id": str(addr.id),
        "delivery_slot_id": str(slot.id),
        "payment_method": "COD",
        "coupon_code": "FLAT50",
    }

    res = client.post("/api/v1/checkout", json=checkout_payload, headers=cust_headers)
    assert res.status_code == 201
    order_data = res.json()
    assert order_data["discount_amount"] == 50.0
    assert order_data["total_amount"] == order_data["subtotal"] - 50.0 + order_data["delivery_charge"]

    # Verify coupon_usage was recorded in db
    assert len(promo_db.coupon_usage) == 1

    # Second checkout attempt by same user with same coupon -> should fail on per-user limit!
    cart = list(promo_db.carts.values())[0]
    cart.status = "ACTIVE"
    v1 = list(promo_db.variants.values())[0]
    ci2 = CartItem(id=uuid.uuid4(), cart_id=cart.id, product_variant_id=v1.id, quantity=1)
    promo_db.add(ci2)
    cart.items = [ci2]

    res_fail = client.post("/api/v1/checkout", json=checkout_payload, headers=cust_headers)
    assert res_fail.status_code == 400
    assert "maximum allowed times" in str(res_fail.json()).lower()


def test_offers_and_banners_flow(client: TestClient, promo_db: InMemoryPromotionsDb, make_token):
    staff_id = uuid.uuid4()
    promo_db.add_profile(Profile(id=staff_id, role="STAFF", is_active=True))
    staff_headers = {"Authorization": f"Bearer {make_token(user_id=staff_id, role='STAFF')}"}

    # 1. Staff creates banner
    b_res = client.post(
        "/api/v1/admin/banners",
        json={
            "title": "Diwali Grand Sweets Mela",
            "image_url": "https://example.com/banner.jpg",
            "link_type": "CATEGORY",
            "link_value": "ladoo",
            "display_order": 1,
            "is_active": True,
        },
        headers=staff_headers,
    )
    assert b_res.status_code == 201
    banner_id = b_res.json()["id"]

    # 2. Staff creates offer
    o_res = client.post(
        "/api/v1/admin/offers",
        json={
            "title": "Buy 2kg Get 10% Off",
            "description": "Valid on Motichoor & Besan laddu",
            "display_order": 1,
            "is_active": True,
        },
        headers=staff_headers,
    )
    assert o_res.status_code == 201

    # 3. Public lists active banners and offers
    public_banners = client.get("/api/v1/banners")
    assert public_banners.status_code == 200
    assert len(public_banners.json()) >= 1
    assert public_banners.json()[0]["title"] == "Diwali Grand Sweets Mela"

    public_offers = client.get("/api/v1/offers")
    assert public_offers.status_code == 200
    assert len(public_offers.json()) >= 1

    # 4. Staff deletes banner
    del_res = client.delete(f"/api/v1/admin/banners/{banner_id}", headers=staff_headers)
    assert del_res.status_code == 204


def test_reviews_gating_and_moderation(client: TestClient, promo_db: InMemoryPromotionsDb, make_token):
    user_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    promo_db.add_profile(Profile(id=user_id, role="CUSTOMER", is_active=True))
    promo_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))

    cust_headers = {"Authorization": f"Bearer {make_token(user_id=user_id, role='CUSTOMER')}"}
    admin_headers = {"Authorization": f"Bearer {make_token(user_id=admin_id, role='ADMIN')}"}

    # Setup Product & Order
    prod_id = uuid.uuid4()
    prod = Product(id=prod_id, category_id=uuid.uuid4(), name="Gulab Jamun", slug="gulab-jamun", is_active=True)
    promo_db.add(prod)

    var_id = uuid.uuid4()
    var = ProductVariant(id=var_id, product_id=prod_id, label="500g", price=250.0, stock_status="IN_STOCK", is_active=True)
    promo_db.add(var)

    order_id = uuid.uuid4()
    order = Order(
        id=order_id,
        order_number="SB-20260927-REV1",
        user_id=user_id,
        address_snapshot={},
        status="CONFIRMED",  # Not yet DELIVERED!
        payment_method="COD",
        payment_status="COD_PENDING",
        subtotal=250.0,
        total_amount=250.0,
    )
    promo_db.add(order)

    oi = OrderItem(
        id=uuid.uuid4(),
        order_id=order_id,
        item_type="PRODUCT",
        product_variant_id=var_id,
        product_name_snapshot="Gulab Jamun",
        unit_price=250.0,
        quantity=1,
        line_total=250.0,
    )
    promo_db.add(oi)

    # 1. Customer tries to review while order is CONFIRMED (not yet DELIVERED) -> rejected!
    rev_payload = {
        "product_id": str(prod_id),
        "order_id": str(order_id),
        "rating": 5,
        "comment": "Melt in mouth goodness!",
    }
    res_premature = client.post("/api/v1/reviews", json=rev_payload, headers=cust_headers)
    assert res_premature.status_code == 400
    assert "delivered" in str(res_premature.json()).lower()

    # 2. Advance order status to DELIVERED
    order.status = "DELIVERED"
    order.delivered_at = datetime.now(timezone.utc)

    # 3. Customer submits review -> succeeds!
    res_submit = client.post("/api/v1/reviews", json=rev_payload, headers=cust_headers)
    assert res_submit.status_code == 201
    rev_data = res_submit.json()
    assert rev_data["rating"] == 5
    assert rev_data["is_published"] is False  # Awaiting moderation!
    review_id = rev_data["id"]

    # 4. Public product reviews -> should NOT be visible yet
    pub_res = client.get(f"/api/v1/reviews/product/{prod_id}")
    assert pub_res.status_code == 200
    assert pub_res.json()["total_reviews"] == 0

    # 5. Admin lists moderation queue
    admin_list = client.get("/api/v1/admin/reviews", headers=admin_headers)
    assert admin_list.status_code == 200
    assert len(admin_list.json()) >= 1

    # 6. Admin approves review (moderation: is_published = True)
    mod_res = client.patch(
        f"/api/v1/admin/reviews/{review_id}/moderation",
        json={"is_published": True},
        headers=admin_headers,
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["is_published"] is True

    # 7. Public reviews endpoint now shows the approved review!
    pub_res2 = client.get(f"/api/v1/reviews/product/{prod_id}")
    assert pub_res2.status_code == 200
    assert pub_res2.json()["total_reviews"] == 1
    assert pub_res2.json()["average_rating"] == 5.0
    assert pub_res2.json()["reviews"][0]["comment"] == "Melt in mouth goodness!"

    # 8. Customer attempts duplicate review for same order & product -> rejected!
    res_dup = client.post("/api/v1/reviews", json=rev_payload, headers=cust_headers)
    assert res_dup.status_code == 409
    assert "already reviewed" in res_dup.json()["error"]["message"].lower()
