"""
Gift Hampers Service Layer.
Manages hamper catalog, constituent sweets composition ("What's inside"), and admin CRUD.
Per docs/06-API-SPECIFICATION.md §6.11, §6.17 and docs/03-FEATURE-SPECIFICATION.md §6.2
"""
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ConflictError, NotFoundError
from app.db.models.catalog import (
    GiftHamper,
    GiftHamperImage,
    GiftHamperItem,
    Product,
    ProductVariant,
)
from app.modules.catalog.repository import slugify
from app.modules.gift_hampers.schemas import (
    GiftHamperCreateRequest,
    GiftHamperDetailResponse,
    GiftHamperImageCreateRequest,
    GiftHamperImageResponse,
    GiftHamperItemCreateRequest,
    GiftHamperItemResponse,
    GiftHamperResponse,
    GiftHamperUpdateRequest,
    PaginatedGiftHampersResponse,
)


class GiftHamperService:

    @staticmethod
    def _get_primary_image_url(hamper: GiftHamper) -> str | None:
        if not hasattr(hamper, "images") or not hamper.images:
            return None
        primary = next((img for img in hamper.images if img.is_primary), None)
        return primary.url if primary else hamper.images[0].url

    @staticmethod
    async def _map_detail(hamper: GiftHamper, db: AsyncSession) -> GiftHamperDetailResponse:
        # Map images
        images_resp = [
            GiftHamperImageResponse(
                id=img.id,
                url=img.url,
                storage_path=img.storage_path,
                is_primary=img.is_primary,
                display_order=img.display_order,
            )
            for img in sorted(hamper.images or [], key=lambda x: x.display_order)
        ]

        # Map items with product / variant snapshots
        items_resp = []
        for item in hamper.items or []:
            prod_name = None
            if hasattr(item, "product") and item.product:
                prod_name = item.product.name
            else:
                p_res = await db.execute(select(Product.name).filter(Product.id == item.product_id))
                p_val = p_res.scalar_one_or_none()
                prod_name = p_val.name if hasattr(p_val, "name") else (p_val if isinstance(p_val, str) else None)

            var_label = None
            if hasattr(item, "variant") and item.variant:
                var_label = item.variant.label
            else:
                v_res = await db.execute(select(ProductVariant.label).filter(ProductVariant.id == item.product_variant_id))
                v_val = v_res.scalar_one_or_none()
                var_label = v_val.label if hasattr(v_val, "label") else (v_val if isinstance(v_val, str) else None)

            items_resp.append(
                GiftHamperItemResponse(
                    id=item.id,
                    gift_hamper_id=item.gift_hamper_id,
                    product_id=item.product_id,
                    product_name=prod_name,
                    product_variant_id=item.product_variant_id,
                    variant_label=var_label,
                    quantity=item.quantity,
                )
            )

        primary_url = GiftHamperService._get_primary_image_url(hamper)

        return GiftHamperDetailResponse(
            id=hamper.id,
            name=hamper.name,
            slug=hamper.slug,
            description=hamper.description,
            hamper_price=float(hamper.hamper_price),
            is_active=hamper.is_active,
            primary_image_url=primary_url,
            created_at=hamper.created_at,
            images=images_resp,
            items=items_resp,
        )

    @staticmethod
    async def list_hampers(
        is_active: bool | None,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> PaginatedGiftHampersResponse:
        query = select(GiftHamper).options(selectinload(GiftHamper.images))
        count_query = select(func.count(GiftHamper.id))

        if is_active is not None:
            query = query.filter(GiftHamper.is_active.is_(is_active))
            count_query = count_query.filter(GiftHamper.is_active.is_(is_active))

        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        query = query.order_by(GiftHamper.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(query)
        hampers = res.scalars().all()

        items = [
            GiftHamperResponse(
                id=h.id,
                name=h.name,
                slug=h.slug,
                description=h.description,
                hamper_price=float(h.hamper_price),
                is_active=h.is_active,
                primary_image_url=GiftHamperService._get_primary_image_url(h),
                created_at=h.created_at,
            )
            for h in hampers
        ]

        return PaginatedGiftHampersResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_hamper_by_slug(slug: str, db: AsyncSession) -> GiftHamperDetailResponse:
        query = (
            select(GiftHamper)
            .filter(GiftHamper.slug == slug)
            .options(
                selectinload(GiftHamper.images),
                selectinload(GiftHamper.items).selectinload(GiftHamperItem.product),
                selectinload(GiftHamper.items).selectinload(GiftHamperItem.variant),
            )
        )
        res = await db.execute(query)
        hamper = res.scalar_one_or_none()
        if not hamper:
            raise NotFoundError(f"Gift hamper with slug '{slug}' not found.")

        return await GiftHamperService._map_detail(hamper, db)

    @staticmethod
    async def get_hamper_by_id(hamper_id: uuid.UUID, db: AsyncSession) -> GiftHamperDetailResponse:
        query = (
            select(GiftHamper)
            .filter(GiftHamper.id == hamper_id)
            .options(
                selectinload(GiftHamper.images),
                selectinload(GiftHamper.items).selectinload(GiftHamperItem.product),
                selectinload(GiftHamper.items).selectinload(GiftHamperItem.variant),
            )
        )
        res = await db.execute(query)
        hamper = res.scalar_one_or_none()
        if not hamper:
            raise NotFoundError(f"Gift hamper with ID {hamper_id} not found.")

        return await GiftHamperService._map_detail(hamper, db)

    @staticmethod
    async def create_hamper(payload: GiftHamperCreateRequest, db: AsyncSession) -> GiftHamperDetailResponse:
        slug = payload.slug or slugify(payload.name)
        # Check slug uniqueness
        existing = await db.execute(select(GiftHamper).filter(GiftHamper.slug == slug))
        if existing.scalar_one_or_none():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        hamper = GiftHamper(
            name=payload.name.strip(),
            slug=slug,
            description=payload.description.strip() if payload.description else None,
            hamper_price=payload.hamper_price,
            is_active=payload.is_active,
        )
        db.add(hamper)
        await db.flush()

        # Add initial images if provided
        for img_req in payload.images:
            db.add(
                GiftHamperImage(
                    gift_hamper_id=hamper.id,
                    url=img_req.url,
                    storage_path=img_req.storage_path,
                    is_primary=img_req.is_primary,
                    display_order=img_req.display_order,
                )
            )

        # Add initial items if provided
        for item_req in payload.items:
            db.add(
                GiftHamperItem(
                    gift_hamper_id=hamper.id,
                    product_id=item_req.product_id,
                    product_variant_id=item_req.product_variant_id,
                    quantity=item_req.quantity,
                )
            )

        await db.commit()
        return await GiftHamperService.get_hamper_by_id(hamper.id, db)

    @staticmethod
    async def update_hamper(
        hamper_id: uuid.UUID,
        payload: GiftHamperUpdateRequest,
        db: AsyncSession,
    ) -> GiftHamperDetailResponse:
        res = await db.execute(select(GiftHamper).filter(GiftHamper.id == hamper_id))
        hamper = res.scalar_one_or_none()
        if not hamper:
            raise NotFoundError(f"Gift hamper with ID {hamper_id} not found.")

        if payload.name is not None:
            hamper.name = payload.name.strip()
        if payload.slug is not None:
            new_slug = payload.slug.strip()
            if new_slug != hamper.slug:
                chk = await db.execute(select(GiftHamper).filter(GiftHamper.slug == new_slug, GiftHamper.id != hamper_id))
                if chk.scalar_one_or_none():
                    raise ConflictError(f"Slug '{new_slug}' is already taken.")
                hamper.slug = new_slug
        if payload.description is not None:
            hamper.description = payload.description.strip() if payload.description else None
        if payload.hamper_price is not None:
            hamper.hamper_price = payload.hamper_price
        if payload.is_active is not None:
            hamper.is_active = payload.is_active

        await db.commit()
        return await GiftHamperService.get_hamper_by_id(hamper.id, db)

    @staticmethod
    async def delete_hamper(hamper_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(GiftHamper).filter(GiftHamper.id == hamper_id))
        hamper = res.scalar_one_or_none()
        if not hamper:
            raise NotFoundError(f"Gift hamper with ID {hamper_id} not found.")

        await db.delete(hamper)
        await db.commit()

    @staticmethod
    async def add_hamper_item(
        hamper_id: uuid.UUID,
        payload: GiftHamperItemCreateRequest,
        db: AsyncSession,
    ) -> GiftHamperDetailResponse:
        # Check hamper exists
        res = await db.execute(select(GiftHamper).filter(GiftHamper.id == hamper_id))
        if not res.scalar_one_or_none():
            raise NotFoundError(f"Gift hamper with ID {hamper_id} not found.")

        item = GiftHamperItem(
            gift_hamper_id=hamper_id,
            product_id=payload.product_id,
            product_variant_id=payload.product_variant_id,
            quantity=payload.quantity,
        )
        db.add(item)
        await db.commit()
        return await GiftHamperService.get_hamper_by_id(hamper_id, db)

    @staticmethod
    async def delete_hamper_item(
        hamper_id: uuid.UUID,
        item_id: uuid.UUID,
        db: AsyncSession,
    ) -> None:
        res = await db.execute(
            select(GiftHamperItem).filter(
                GiftHamperItem.id == item_id,
                GiftHamperItem.gift_hamper_id == hamper_id,
            )
        )
        item = res.scalar_one_or_none()
        if not item:
            raise NotFoundError("Hamper item not found.")

        await db.delete(item)
        await db.commit()

    @staticmethod
    async def add_hamper_image(
        hamper_id: uuid.UUID,
        payload: GiftHamperImageCreateRequest,
        db: AsyncSession,
    ) -> GiftHamperDetailResponse:
        res = await db.execute(select(GiftHamper).filter(GiftHamper.id == hamper_id))
        if not res.scalar_one_or_none():
            raise NotFoundError(f"Gift hamper with ID {hamper_id} not found.")

        if payload.is_primary:
            # Demote any existing primary images
            existing_imgs = await db.execute(
                select(GiftHamperImage).filter(GiftHamperImage.gift_hamper_id == hamper_id)
            )
            for img in existing_imgs.scalars().all():
                img.is_primary = False

        image = GiftHamperImage(
            gift_hamper_id=hamper_id,
            url=payload.url,
            storage_path=payload.storage_path,
            is_primary=payload.is_primary,
            display_order=payload.display_order,
        )
        db.add(image)
        await db.commit()
        return await GiftHamperService.get_hamper_by_id(hamper_id, db)

    @staticmethod
    async def delete_hamper_image(
        hamper_id: uuid.UUID,
        image_id: uuid.UUID,
        db: AsyncSession,
    ) -> None:
        res = await db.execute(
            select(GiftHamperImage).filter(
                GiftHamperImage.id == image_id,
                GiftHamperImage.gift_hamper_id == hamper_id,
            )
        )
        image = res.scalar_one_or_none()
        if not image:
            raise NotFoundError("Hamper image not found.")

        await db.delete(image)
        await db.commit()
