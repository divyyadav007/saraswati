"""
Catalogue Service Layer.
Encapsulates business rules for catalogue browsing, search, pricing, and admin mutations.
Per docs/04-ARCHITECTURE.md §3 and docs/06-API-SPECIFICATION.md §6.2, §6.13
"""
import logging
import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError, SaraswatiError
from app.common.pagination import PaginatedResponse, PaginationParams
from app.db.models.catalog import Product
from app.db.session import get_db
from app.modules.catalog.repository import CatalogRepository, slugify
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

logger = logging.getLogger(__name__)


class CatalogService:
    def __init__(self, db: AsyncSession, repository: CatalogRepository | None = None):
        self.repository = repository or CatalogRepository(db)


    # ── Categories ────────────────────────────────────────────────────────────
    async def list_categories(self, include_inactive: bool = False) -> list[CategoryResponse]:
        categories = await self.repository.list_categories(include_inactive=include_inactive)
        return [CategoryResponse.model_validate(c) for c in categories]

    async def get_category_by_slug(self, slug: str) -> CategoryResponse:
        category = await self.repository.get_category_by_slug(slug)
        if not category:
            raise NotFoundError(f"Category with slug '{slug}' not found.")
        return CategoryResponse.model_validate(category)

    async def create_category(self, data: CategoryCreateRequest) -> CategoryResponse:
        slug = data.slug or slugify(data.name)
        existing = await self.repository.get_category_by_slug(slug)
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        cat_dict = data.model_dump()
        cat_dict["slug"] = slug

        category = await self.repository.create_category(**cat_dict)
        return CategoryResponse.model_validate(category)

    async def update_category(self, category_id: uuid.UUID, data: CategoryUpdateRequest) -> CategoryResponse:
        category = await self.repository.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category not found.")

        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data and not update_data.get("slug"):
            # Update slug if explicitly empty
            pass
        elif "slug" in update_data and update_data["slug"]:
            # Check unique slug
            existing = await self.repository.get_category_by_slug(update_data["slug"])
            if existing and existing.id != category_id:
                raise SaraswatiError("A category with this slug already exists.")

        updated = await self.repository.update_category(category, **update_data)
        return CategoryResponse.model_validate(updated)

    async def delete_category(self, category_id: uuid.UUID) -> None:
        category = await self.repository.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category not found.")
        await self.repository.delete_category(category)

    # ── Products ──────────────────────────────────────────────────────────────
    @staticmethod
    def _build_product_list_item(p: Product) -> ProductListItemResponse:
        # Find primary image
        primary_img = next((img.url for img in p.images if img.is_primary), None)
        if not primary_img and p.images:
            primary_img = p.images[0].url

        # Compute price stats from active variants
        active_vars = [v for v in p.variants if v.is_active]
        prices = [float(v.price) for v in active_vars] if active_vars else []
        min_p = min(prices) if prices else None
        max_p = max(prices) if prices else None
        starting_p = min_p

        return ProductListItemResponse(
            id=p.id,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            name=p.name,
            slug=p.slug,
            description=p.description,
            tags=p.tags or [],
            is_active=p.is_active,
            is_featured=p.is_featured,
            primary_image_url=primary_img,
            starting_price=starting_p,
            min_price=min_p,
            max_price=max_p,
            variants=[ProductVariantResponse.model_validate(v) for v in active_vars],
            created_at=p.created_at,
        )

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
        products, total_items = await self.repository.list_products(
            category_slug_or_id=category,
            search_query=q,
            min_price=min_price,
            max_price=max_price,
            tags=tags,
            is_featured=is_featured,
            sort=sort,
            is_active=is_active,
            offset=pagination.offset,
            limit=pagination.limit,
        )

        items = [self._build_product_list_item(p) for p in products]
        return PaginatedResponse.from_items(items, total_items, pagination)

    async def get_product_detail(self, slug: str) -> ProductDetailResponse:
        product = await self.repository.get_product_by_slug(slug, include_inactive=False)
        if not product:
            raise NotFoundError(f"Product with slug '{slug}' not found.")

        # Sort variants by price
        sorted_variants = sorted(
            [v for v in product.variants if v.is_active],
            key=lambda v: (v.weight_grams or 0, float(v.price)),
        )

        # Sort images: primary first, then display_order
        sorted_images = sorted(
            product.images,
            key=lambda img: (not img.is_primary, img.display_order),
        )

        # Rating summary
        avg_rating, total_reviews = await self.repository.get_product_rating_summary(product.id)

        return ProductDetailResponse(
            id=product.id,
            category_id=product.category_id,
            category=CategoryResponse.model_validate(product.category) if product.category else None,
            name=product.name,
            slug=product.slug,
            description=product.description,
            tags=product.tags or [],
            is_active=product.is_active,
            is_featured=product.is_featured,
            variants=[ProductVariantResponse.model_validate(v) for v in sorted_variants],
            images=[ProductImageResponse.model_validate(img) for img in sorted_images],
            rating_summary=ProductRatingSummary(
                average_rating=avg_rating,
                total_reviews=total_reviews,
            ),
            created_at=product.created_at,
            updated_at=product.updated_at,
        )

    async def create_product(self, data: ProductCreateRequest) -> ProductDetailResponse:
        # Check category exists
        cat = await self.repository.get_category_by_id(data.category_id)
        if not cat:
            raise NotFoundError("Category does not exist.")

        slug = data.slug or slugify(data.name)
        existing = await self.repository.get_product_by_slug(slug, include_inactive=True)
        if existing:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        prod_dict = data.model_dump()
        prod_dict["slug"] = slug

        product = await self.repository.create_product(**prod_dict)
        return await self.get_product_detail(product.slug)

    async def update_product(self, product_id: uuid.UUID, data: ProductUpdateRequest) -> ProductDetailResponse:
        product = await self.repository.get_product_by_id(product_id, include_inactive=True)
        if not product:
            raise NotFoundError("Product not found.")

        update_data = data.model_dump(exclude_unset=True)
        if "category_id" in update_data and update_data["category_id"]:
            cat = await self.repository.get_category_by_id(update_data["category_id"])
            if not cat:
                raise NotFoundError("Category does not exist.")

        if "slug" in update_data and update_data["slug"]:
            existing = await self.repository.get_product_by_slug(update_data["slug"], include_inactive=True)
            if existing and existing.id != product_id:
                raise SaraswatiError("A product with this slug already exists.")

        updated = await self.repository.update_product(product, **update_data)
        return await self.get_product_detail(updated.slug)

    async def delete_product(self, product_id: uuid.UUID) -> None:
        product = await self.repository.get_product_by_id(product_id, include_inactive=True)
        if not product:
            raise NotFoundError("Product not found.")
        await self.repository.delete_product(product)

    # ── Variants ──────────────────────────────────────────────────────────────
    async def create_variant(self, product_id: uuid.UUID, data: ProductVariantCreateRequest) -> ProductVariantResponse:
        product = await self.repository.get_product_by_id(product_id, include_inactive=True)
        if not product:
            raise NotFoundError("Product not found.")

        variant = await self.repository.create_variant(product_id, **data.model_dump())
        return ProductVariantResponse.model_validate(variant)

    async def update_variant(self, variant_id: uuid.UUID, data: ProductVariantUpdateRequest) -> ProductVariantResponse:
        variant = await self.repository.get_variant_by_id(variant_id)
        if not variant:
            raise NotFoundError("Variant not found.")

        updated = await self.repository.update_variant(variant, **data.model_dump(exclude_unset=True))
        return ProductVariantResponse.model_validate(updated)

    async def delete_variant(self, variant_id: uuid.UUID) -> None:
        variant = await self.repository.get_variant_by_id(variant_id)
        if not variant:
            raise NotFoundError("Variant not found.")
        await self.repository.delete_variant(variant)

    # ── Images ────────────────────────────────────────────────────────────────
    async def create_image(self, product_id: uuid.UUID, data: ProductImageCreateRequest) -> ProductImageResponse:
        product = await self.repository.get_product_by_id(product_id, include_inactive=True)
        if not product:
            raise NotFoundError("Product not found.")

        image = await self.repository.create_image(product_id, **data.model_dump())
        return ProductImageResponse.model_validate(image)

    async def delete_image(self, image_id: uuid.UUID) -> None:
        image = await self.repository.get_image_by_id(image_id)
        if not image:
            raise NotFoundError("Product image not found.")
        await self.repository.delete_image(image)

    # ── Reviews ───────────────────────────────────────────────────────────────
    async def list_product_reviews(
        self, slug: str, params: PaginationParams | None = None
    ) -> PaginatedResponse[ProductReviewResponse]:
        product = await self.repository.get_product_by_slug(slug, include_inactive=False)
        if not product:
            raise NotFoundError(f"Product with slug '{slug}' not found.")

        pagination = params or PaginationParams()
        rows, total_items = await self.repository.get_published_reviews(
            product_id=product.id,
            offset=pagination.offset,
            limit=pagination.limit,
        )

        items = [
            ProductReviewResponse(
                id=review.id,
                product_id=review.product_id,
                rating=review.rating,
                comment=review.comment,
                user_name=full_name,
                created_at=review.created_at,
            )
            for review, full_name in rows
        ]
        return PaginatedResponse.from_items(items, total_items, pagination)


def get_catalog_service(db: AsyncSession = Depends(get_db)) -> CatalogService:
    """FastAPI dependency yielding an initialized CatalogService."""
    return CatalogService(db)

