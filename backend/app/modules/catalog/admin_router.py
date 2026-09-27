"""
Admin Catalogue API Router.
Endpoints for Category, Product, Variant, and Image management.
Per docs/06-API-SPECIFICATION.md §6.13 and docs/08-SECURITY.md §3
"""
import uuid

from fastapi import APIRouter, Depends

from app.common.audit import log_audit_event
from app.common.auth import (
    AuthenticatedUser,
    require_admin,
    require_staff_or_admin,
)
from app.common.response import success_response
from app.modules.catalog.schemas import (
    CategoryCreateRequest,
    CategoryUpdateRequest,
    ProductCreateRequest,
    ProductImageCreateRequest,
    ProductUpdateRequest,
    ProductVariantCreateRequest,
    ProductVariantUpdateRequest,
)
from app.modules.catalog.service import CatalogService, get_catalog_service

admin_catalog_router = APIRouter(prefix="/admin", tags=["Admin Catalogue"])


# ── Categories (Admin only) ───────────────────────────────────────────────────
@admin_catalog_router.post(
    "/categories",
    summary="Create category (Admin only)",
    description="Creates a new product category.",
)
async def create_category(
    payload: CategoryCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    category = await service.create_category(payload)
    db = getattr(getattr(service, "repository", None), "db", None)
    if db is not None:
        await log_audit_event(
            db=db,
            action="CREATE_CATEGORY",
            entity_type="CATEGORY",
            actor_user_id=current_user.user_id,
            entity_id=category.id,
            after_data=category.model_dump(mode="json"),
        )
    return success_response(category.model_dump(mode="json"), status_code=201)


@admin_catalog_router.patch(
    "/categories/{category_id}",
    summary="Update category (Admin only)",
    description="Updates existing category fields.",
)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    category = await service.update_category(category_id, payload)
    db = getattr(getattr(service, "repository", None), "db", None)
    if db is not None:
        await log_audit_event(
            db=db,
            action="UPDATE_CATEGORY",
            entity_type="CATEGORY",
            actor_user_id=current_user.user_id,
            entity_id=category_id,
            after_data=category.model_dump(mode="json"),
        )
    return success_response(category.model_dump(mode="json"))


@admin_catalog_router.delete(
    "/categories/{category_id}",
    summary="Delete category (Admin only)",
    description="Deletes category if no dependent active products exist.",
)
async def delete_category(
    category_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    await service.delete_category(category_id)
    db = getattr(getattr(service, "repository", None), "db", None)
    if db is not None:
        await log_audit_event(
            db=db,
            action="DELETE_CATEGORY",
            entity_type="CATEGORY",
            actor_user_id=current_user.user_id,
            entity_id=category_id,
        )
    return success_response({"message": "Category deleted successfully"})


# ── Products (Admin / Staff) ──────────────────────────────────────────────────
@admin_catalog_router.post(
    "/products",
    summary="Create product (Staff/Admin)",
    description="Creates a new product belonging to a category.",
)
async def create_product(
    payload: ProductCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    product = await service.create_product(payload)
    db = getattr(getattr(service, "repository", None), "db", None)
    if db is not None:
        await log_audit_event(
            db=db,
            action="CREATE_PRODUCT",
            entity_type="PRODUCT",
            actor_user_id=current_user.user_id,
            entity_id=product.id,
            after_data=product.model_dump(mode="json"),
        )
    return success_response(product.model_dump(mode="json"), status_code=201)


@admin_catalog_router.patch(
    "/products/{product_id}",
    summary="Update product (Staff/Admin)",
    description="Updates existing product attributes.",
)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    product = await service.update_product(product_id, payload)
    db = getattr(getattr(service, "repository", None), "db", None)
    if db is not None:
        await log_audit_event(
            db=db,
            action="UPDATE_PRODUCT",
            entity_type="PRODUCT",
            actor_user_id=current_user.user_id,
            entity_id=product_id,
            after_data=product.model_dump(mode="json"),
        )
    return success_response(product.model_dump(mode="json"))


@admin_catalog_router.delete(
    "/products/{product_id}",
    summary="Delete product (Admin only)",
    description="Deletes a product.",
)
async def delete_product(
    product_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    await service.delete_product(product_id)
    return success_response({"message": "Product deleted successfully"})


# ── Variants (Admin / Staff) ──────────────────────────────────────────────────
@admin_catalog_router.post(
    "/products/{product_id}/variants",
    summary="Add product variant (Staff/Admin)",
    description="Creates a weight/size variant for a product.",
)
async def create_variant(
    product_id: uuid.UUID,
    payload: ProductVariantCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    variant = await service.create_variant(product_id, payload)
    return success_response(variant.model_dump(mode="json"), status_code=201)


@admin_catalog_router.patch(
    "/variants/{variant_id}",
    summary="Update product variant (Staff/Admin)",
    description="Updates price, stock status, or weight of a variant.",
)
async def update_variant(
    variant_id: uuid.UUID,
    payload: ProductVariantUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    variant = await service.update_variant(variant_id, payload)
    return success_response(variant.model_dump(mode="json"))


@admin_catalog_router.delete(
    "/variants/{variant_id}",
    summary="Delete product variant (Admin only)",
    description="Deletes a product variant.",
)
async def delete_variant(
    variant_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    await service.delete_variant(variant_id)
    return success_response({"message": "Variant deleted successfully"})


# ── Images (Admin / Staff) ────────────────────────────────────────────────────
@admin_catalog_router.post(
    "/products/{product_id}/images",
    summary="Add product image (Staff/Admin)",
    description="Attaches an image record to a product.",
)
async def create_image(
    product_id: uuid.UUID,
    payload: ProductImageCreateRequest,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    image = await service.create_image(product_id, payload)
    return success_response(image.model_dump(mode="json"), status_code=201)


@admin_catalog_router.delete(
    "/product-images/{image_id}",
    summary="Delete product image (Staff/Admin)",
    description="Removes an image record from a product.",
)
async def delete_image(
    image_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
    service: CatalogService = Depends(get_catalog_service),
):
    await service.delete_image(image_id)
    return success_response({"message": "Product image deleted successfully"})
