"""
Catalogue Public API Router.
Per docs/06-API-SPECIFICATION.md §6.2
"""

from fastapi import APIRouter, Depends, Query

from app.common.auth import AuthenticatedUser, get_optional_current_user
from app.common.exceptions import ForbiddenError
from app.common.pagination import PaginationParams
from app.common.response import success_response
from app.modules.catalog.service import CatalogService, get_catalog_service

router = APIRouter(tags=["Catalogue"])


# ── Categories ────────────────────────────────────────────────────────────────
@router.get(
    "/categories",
    summary="List active categories",
    description="Returns categories ordered by display_order. Pass include_inactive=true with staff/admin token to view inactive categories.",
)
async def list_categories(
    include_inactive: bool = Query(False, description="Include inactive categories (staff/admin only)"),
    current_user: AuthenticatedUser | None = Depends(get_optional_current_user),
    service: CatalogService = Depends(get_catalog_service),
):
    if include_inactive:
        if not current_user or current_user.role not in ("STAFF", "ADMIN"):
            raise ForbiddenError("Viewing inactive categories requires STAFF or ADMIN role.")

    categories = await service.list_categories(include_inactive=include_inactive)
    return success_response([c.model_dump(mode="json") for c in categories])


@router.get(
    "/categories/{slug}",
    summary="Get category by slug",
    description="Returns public category details by unique slug.",
)
async def get_category(
    slug: str,
    service: CatalogService = Depends(get_catalog_service),
):
    category = await service.get_category_by_slug(slug)
    return success_response(category.model_dump(mode="json"))



# ── Products ──────────────────────────────────────────────────────────────────
@router.get(
    "/products",
    summary="List products with filtering, search, and pagination",
    description="Returns paginated product list items matching search/filter criteria.",
)
async def list_products(
    category: str | None = Query(None, description="Category slug or UUID filter"),
    q: str | None = Query(None, description="Search term across name and description"),
    min_price: float | None = Query(None, ge=0, description="Minimum variant price filter"),
    max_price: float | None = Query(None, ge=0, description="Maximum variant price filter"),
    tags: str | None = Query(None, description="Comma-separated tags filter"),
    is_featured: bool | None = Query(None, description="Filter featured products only"),
    sort: str | None = Query(
        None,
        pattern=r"^(price_asc|price_desc|newest|display_order)$",
        description="Sort order: price_asc, price_desc, newest",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: CatalogService = Depends(get_catalog_service),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    pagination = PaginationParams(page=page, page_size=page_size)

    result = await service.list_products(
        category=category,
        q=q,
        min_price=min_price,
        max_price=max_price,
        tags=tag_list,
        is_featured=is_featured,
        sort=sort,
        is_active=True,
        params=pagination,
    )
    return success_response(result.model_dump(mode="json"))


@router.get(
    "/products/{slug}",
    summary="Get full product detail",
    description="Returns product details with all active variants, sorted images, and rating summary.",
)
async def get_product(
    slug: str,
    service: CatalogService = Depends(get_catalog_service),
):
    product = await service.get_product_detail(slug)
    return success_response(product.model_dump(mode="json"))


@router.get(
    "/products/{slug}/reviews",
    summary="List published product reviews",
    description="Returns paginated published reviews for a product.",
)
async def list_product_reviews(
    slug: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: CatalogService = Depends(get_catalog_service),
):
    pagination = PaginationParams(page=page, page_size=page_size)
    reviews = await service.list_product_reviews(slug, params=pagination)
    return success_response(reviews.model_dump(mode="json"))

