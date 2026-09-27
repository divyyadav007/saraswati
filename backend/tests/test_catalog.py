"""
Phase 2B Test Suite — Catalogue Public APIs and Admin Catalogue Management.
Per docs/04-ARCHITECTURE.md, docs/06-API-SPECIFICATION.md §6.2, §6.13, and docs/08-SECURITY.md §2–3.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.common.exceptions import NotFoundError
from app.common.pagination import PaginatedResponse, PaginationParams
from app.db.models.auth import Profile
from app.main import app
from app.modules.catalog.repository import slugify
from app.modules.catalog.schemas import (
    CategoryCreateRequest,
    CategoryResponse,
    CategoryUpdateRequest,
    ProductCreateRequest,
    ProductDetailResponse,
    ProductImageCreateRequest,
    ProductImageResponse,
    ProductListItemResponse,
    ProductRatingSummary,
    ProductReviewResponse,
    ProductUpdateRequest,
    ProductVariantCreateRequest,
    ProductVariantResponse,
    ProductVariantUpdateRequest,
)
from app.modules.catalog.service import get_catalog_service
from tests.conftest import InMemoryAuthDb


class FakeCatalogService:
    """In-memory implementation of CatalogService for API route tests."""

    def __init__(self):
        self.categories: dict[uuid.UUID, CategoryResponse] = {}
        self.products: dict[uuid.UUID, ProductDetailResponse] = {}
        self.reviews: list[ProductReviewResponse] = []
        self._seed_default_data()

    def _seed_default_data(self):
        cat_id = uuid.uuid4()
        cat = CategoryResponse(
            id=cat_id,
            name="Traditional Sweets",
            slug="traditional-sweets",
            description="Classic ghee-based Indian sweets",
            image_url="https://example.com/cat.jpg",
            parent_id=None,
            display_order=1,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        self.categories[cat_id] = cat

        prod_id = uuid.uuid4()
        variant_id = uuid.uuid4()
        img_id = uuid.uuid4()

        variant = ProductVariantResponse(
            id=variant_id,
            product_id=prod_id,
            label="500g Box",
            weight_grams=500,
            price=350.0,
            mrp=400.0,
            sku="GULAB-500",
            stock_status="IN_STOCK",
            stock_quantity=50,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

        image = ProductImageResponse(
            id=img_id,
            product_id=prod_id,
            url="https://example.com/gulab-jamun.jpg",
            storage_path="products/gulab.jpg",
            is_primary=True,
            display_order=1,
            created_at=datetime.now(timezone.utc),
        )

        prod = ProductDetailResponse(
            id=prod_id,
            category_id=cat_id,
            category=cat,
            name="Gulab Jamun",
            slug="gulab-jamun",
            description="Soft melt-in-mouth milk solids dumplings soaked in rose syrup",
            tags=["ghee", "classic", "popular"],
            is_active=True,
            is_featured=True,
            variants=[variant],
            images=[image],
            rating_summary=ProductRatingSummary(average_rating=4.8, total_reviews=12),
            created_at=datetime.now(timezone.utc),
        )
        self.products[prod_id] = prod

    async def list_categories(self, include_inactive: bool = False) -> list[CategoryResponse]:
        cats = list(self.categories.values())
        if not include_inactive:
            cats = [c for c in cats if c.is_active]
        return sorted(cats, key=lambda c: (c.display_order, c.name))

    async def get_category_by_slug(self, slug: str) -> CategoryResponse:
        for c in self.categories.values():
            if c.slug == slug:
                return c
        raise NotFoundError(f"Category '{slug}' not found.")

    async def create_category(self, data: CategoryCreateRequest) -> CategoryResponse:
        cat_id = uuid.uuid4()
        slug = data.slug or slugify(data.name)
        cat = CategoryResponse(
            id=cat_id,
            name=data.name,
            slug=slug,
            description=data.description,
            image_url=data.image_url,
            parent_id=data.parent_id,
            display_order=data.display_order,
            is_active=data.is_active,
            created_at=datetime.now(timezone.utc),
        )
        self.categories[cat_id] = cat
        return cat

    async def update_category(self, category_id: uuid.UUID, data: CategoryUpdateRequest) -> CategoryResponse:
        if category_id not in self.categories:
            raise NotFoundError("Category not found.")
        existing = self.categories[category_id]
        updated = existing.model_copy(update=data.model_dump(exclude_unset=True))
        self.categories[category_id] = updated
        return updated

    async def delete_category(self, category_id: uuid.UUID) -> None:
        if category_id not in self.categories:
            raise NotFoundError("Category not found.")
        del self.categories[category_id]

    async def list_products(
        self,
        category: str | None = None,
        q: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        tags: list[str] | None = None,
        is_featured: bool | None = None,
        sort: str | None = None,
        is_active: bool = True,
        params: PaginationParams | None = None,
    ) -> PaginatedResponse[ProductListItemResponse]:
        pagination = params or PaginationParams()
        prods = list(self.products.values())
        if is_active:
            prods = [p for p in prods if p.is_active]
        if is_featured is not None:
            prods = [p for p in prods if p.is_featured == is_featured]
        if q:
            prods = [p for p in prods if q.lower() in p.name.lower() or (p.description and q.lower() in p.description.lower())]

        items = [
            ProductListItemResponse(
                id=p.id,
                category_id=p.category_id,
                category_name=p.category.name if p.category else None,
                name=p.name,
                slug=p.slug,
                description=p.description,
                tags=p.tags,
                is_active=p.is_active,
                is_featured=p.is_featured,
                primary_image_url=p.images[0].url if p.images else None,
                starting_price=p.variants[0].price if p.variants else None,
                min_price=p.variants[0].price if p.variants else None,
                max_price=p.variants[0].price if p.variants else None,
                variants=p.variants,
                created_at=p.created_at,
            )
            for p in prods
        ]
        return PaginatedResponse.from_items(items, len(items), pagination)

    async def get_product_detail(self, slug: str) -> ProductDetailResponse:
        for p in self.products.values():
            if p.slug == slug:
                return p
        raise NotFoundError(f"Product '{slug}' not found.")

    async def create_product(self, data: ProductCreateRequest) -> ProductDetailResponse:
        prod_id = uuid.uuid4()
        slug = data.slug or slugify(data.name)
        cat = self.categories.get(data.category_id)
        prod = ProductDetailResponse(
            id=prod_id,
            category_id=data.category_id,
            category=cat,
            name=data.name,
            slug=slug,
            description=data.description,
            tags=data.tags,
            is_active=data.is_active,
            is_featured=data.is_featured,
            variants=[],
            images=[],
            rating_summary=ProductRatingSummary(),
            created_at=datetime.now(timezone.utc),
        )
        self.products[prod_id] = prod
        return prod

    async def update_product(self, product_id: uuid.UUID, data: ProductUpdateRequest) -> ProductDetailResponse:
        if product_id not in self.products:
            raise NotFoundError("Product not found.")
        existing = self.products[product_id]
        updated = existing.model_copy(update=data.model_dump(exclude_unset=True))
        self.products[product_id] = updated
        return updated

    async def delete_product(self, product_id: uuid.UUID) -> None:
        if product_id not in self.products:
            raise NotFoundError("Product not found.")
        del self.products[product_id]

    async def create_variant(self, product_id: uuid.UUID, data: ProductVariantCreateRequest) -> ProductVariantResponse:
        if product_id not in self.products:
            raise NotFoundError("Product not found.")
        v_id = uuid.uuid4()
        variant = ProductVariantResponse(
            id=v_id,
            product_id=product_id,
            **data.model_dump(),
            created_at=datetime.now(timezone.utc),
        )
        self.products[product_id].variants.append(variant)
        return variant

    async def update_variant(self, variant_id: uuid.UUID, data: ProductVariantUpdateRequest) -> ProductVariantResponse:
        for p in self.products.values():
            for i, v in enumerate(p.variants):
                if v.id == variant_id:
                    updated = v.model_copy(update=data.model_dump(exclude_unset=True))
                    p.variants[i] = updated
                    return updated
        raise NotFoundError("Variant not found.")

    async def delete_variant(self, variant_id: uuid.UUID) -> None:
        for p in self.products.values():
            for i, v in enumerate(p.variants):
                if v.id == variant_id:
                    p.variants.pop(i)
                    return
        raise NotFoundError("Variant not found.")

    async def create_image(self, product_id: uuid.UUID, data: ProductImageCreateRequest) -> ProductImageResponse:
        if product_id not in self.products:
            raise NotFoundError("Product not found.")
        img_id = uuid.uuid4()
        image = ProductImageResponse(
            id=img_id,
            product_id=product_id,
            **data.model_dump(),
            created_at=datetime.now(timezone.utc),
        )
        self.products[product_id].images.append(image)
        return image

    async def delete_image(self, image_id: uuid.UUID) -> None:
        for p in self.products.values():
            for i, img in enumerate(p.images):
                if img.id == image_id:
                    p.images.pop(i)
                    return
        raise NotFoundError("Image not found.")

    async def list_product_reviews(self, slug: str, params: PaginationParams | None = None) -> PaginatedResponse[ProductReviewResponse]:
        pagination = params or PaginationParams()
        return PaginatedResponse.from_items(self.reviews, len(self.reviews), pagination)


@pytest.fixture
def fake_catalog_service():
    service = FakeCatalogService()
    app.dependency_overrides[get_catalog_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_catalog_service, None)


# ── Public Category Tests ─────────────────────────────────────────────────────
def test_list_categories_public(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 1
    assert data[0]["slug"] == "traditional-sweets"


def test_list_categories_inactive_forbidden_for_public(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/categories?include_inactive=true")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_list_categories_inactive_allowed_for_staff(client: TestClient, mock_db: InMemoryAuthDb, make_token, fake_catalog_service):
    staff_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=staff_id, role="STAFF", is_active=True))
    token = make_token(user_id=staff_id)

    res = client.get(
        "/api/v1/categories?include_inactive=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200


def test_get_category_by_slug(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/categories/traditional-sweets")
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Traditional Sweets"


def test_get_category_not_found(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/categories/non-existent-category")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


# ── Public Product Tests ──────────────────────────────────────────────────────
def test_list_products_public(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/products")
    assert res.status_code == 200
    body = res.json()["data"]
    assert "items" in body
    assert body["total_items"] >= 1
    assert body["page"] == 1
    assert body["items"][0]["slug"] == "gulab-jamun"
    assert body["items"][0]["starting_price"] == 350.0


def test_list_products_with_search_query(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/products?q=gulab")
    assert res.status_code == 200
    body = res.json()["data"]
    assert len(body["items"]) >= 1

    res_empty = client.get("/api/v1/products?q=nonexistentproductname")
    assert res_empty.status_code == 200
    assert len(res_empty.json()["data"]["items"]) == 0


def test_get_product_detail_success(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/products/gulab-jamun")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["name"] == "Gulab Jamun"
    assert len(data["variants"]) >= 1
    assert data["variants"][0]["label"] == "500g Box"
    assert len(data["images"]) >= 1
    assert data["rating_summary"]["average_rating"] == 4.8


def test_get_product_detail_not_found(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/products/non-existent-slug")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_list_product_reviews(client: TestClient, fake_catalog_service):
    res = client.get("/api/v1/products/gulab-jamun/reviews")
    assert res.status_code == 200
    body = res.json()["data"]
    assert "items" in body
    assert "total_pages" in body


# ── Admin Category Management Tests ───────────────────────────────────────────
def test_admin_create_category_unauthorized(client: TestClient, fake_catalog_service):
    # Missing token
    res = client.post("/api/v1/admin/categories", json={"name": "Dry Fruit Sweets"})
    assert res.status_code == 401


def test_admin_create_category_forbidden_for_staff(client: TestClient, mock_db: InMemoryAuthDb, make_token, fake_catalog_service):
    staff_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=staff_id, role="STAFF", is_active=True))
    token = make_token(user_id=staff_id)

    res = client.post(
        "/api/v1/admin/categories",
        json={"name": "Dry Fruit Sweets"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_admin_create_and_delete_category(client: TestClient, mock_db: InMemoryAuthDb, make_token, fake_catalog_service):
    admin_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))
    token = make_token(user_id=admin_id)

    # 1. Create
    res = client.post(
        "/api/v1/admin/categories",
        json={"name": "Bengali Sweets", "description": "Authentic chhena delicacies"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    created = res.json()["data"]
    assert created["name"] == "Bengali Sweets"
    assert created["slug"] == "bengali-sweets"
    cat_id = created["id"]

    # 2. Update
    patch_res = client.patch(
        f"/api/v1/admin/categories/{cat_id}",
        json={"description": "Updated Bengali delicacies"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["description"] == "Updated Bengali delicacies"

    # 3. Delete
    del_res = client.delete(
        f"/api/v1/admin/categories/{cat_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200


# ── Admin Product Management Tests ────────────────────────────────────────────
def test_admin_product_staff_can_create_but_not_delete(client: TestClient, mock_db: InMemoryAuthDb, make_token, fake_catalog_service):
    staff_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=staff_id, role="STAFF", is_active=True))
    token_staff = make_token(user_id=staff_id)

    cat_id = list(fake_catalog_service.categories.keys())[0]

    # Staff can create product
    create_res = client.post(
        "/api/v1/admin/products",
        json={
            "category_id": str(cat_id),
            "name": "Kaju Katli",
            "description": "Diamond-shaped cashew fudge with silver foil",
            "tags": ["cashew", "premium"],
        },
        headers={"Authorization": f"Bearer {token_staff}"},
    )
    assert create_res.status_code == 201
    prod_id = create_res.json()["data"]["id"]

    # Staff CANNOT delete product (Admin only)
    del_forbidden = client.delete(
        f"/api/v1/admin/products/{prod_id}",
        headers={"Authorization": f"Bearer {token_staff}"},
    )
    assert del_forbidden.status_code == 403

    # Admin CAN delete product
    admin_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=admin_id, role="ADMIN", is_active=True))
    token_admin = make_token(user_id=admin_id)

    del_ok = client.delete(
        f"/api/v1/admin/products/{prod_id}",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert del_ok.status_code == 200


# ── Admin Variant and Image Tests ─────────────────────────────────────────────
def test_admin_variant_and_image_management(client: TestClient, mock_db: InMemoryAuthDb, make_token, fake_catalog_service):
    staff_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=staff_id, role="STAFF", is_active=True))
    token = make_token(user_id=staff_id)

    prod_id = list(fake_catalog_service.products.keys())[0]

    # 1. Add Variant
    v_res = client.post(
        f"/api/v1/admin/products/{prod_id}/variants",
        json={
            "label": "1kg Festive Box",
            "weight_grams": 1000,
            "price": 680.0,
            "mrp": 750.0,
            "stock_status": "IN_STOCK",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert v_res.status_code == 201
    variant_id = v_res.json()["data"]["id"]

    # 2. Update Variant
    v_patch = client.patch(
        f"/api/v1/admin/variants/{variant_id}",
        json={"price": 650.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert v_patch.status_code == 200
    assert v_patch.json()["data"]["price"] == 650.0

    # 3. Add Image
    img_res = client.post(
        f"/api/v1/admin/products/{prod_id}/images",
        json={
            "url": "https://example.com/gulab-1kg.jpg",
            "storage_path": "products/gulab-1kg.jpg",
            "is_primary": False,
            "display_order": 2,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert img_res.status_code == 201
    img_id = img_res.json()["data"]["id"]

    # 4. Delete Image
    del_img = client.delete(
        f"/api/v1/admin/product-images/{img_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_img.status_code == 200


# ── Slug Utility Unit Test ────────────────────────────────────────────────────
def test_slugify_helper():
    assert slugify("Kaju Katli Special!") == "kaju-katli-special"
    assert slugify("Rasgulla (12 Pcs) - Classic") == "rasgulla-12-pcs-classic"
    assert slugify("   Ghee   Laddoo   ") == "ghee-laddoo"
