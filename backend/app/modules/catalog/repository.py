"""
Catalogue Database Repository.
Handles all database queries for Categories, Products, Variants, Images, and Reviews.
Per docs/04-ARCHITECTURE.md §3 and docs/05-DATABASE-SCHEMA.md §2.4–2.7
"""
import re
import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.auth import Profile
from app.db.models.catalog import Category, Product, ProductImage, ProductVariant
from app.db.models.operations import Review


def slugify(text: str) -> str:
    """Helper to convert names to URL-friendly slugs."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


class CatalogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Categories ────────────────────────────────────────────────────────────
    async def list_categories(self, include_inactive: bool = False) -> list[Category]:
        """Fetch all categories ordered by display_order then name."""
        stmt = select(Category)
        if not include_inactive:
            stmt = stmt.where(Category.is_active.is_(True))
        stmt = stmt.order_by(Category.display_order.asc(), Category.name.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_category_by_id(self, category_id: uuid.UUID) -> Category | None:
        stmt = select(Category).where(Category.id == category_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_category_by_slug(self, slug: str) -> Category | None:
        stmt = select(Category).where(Category.slug == slug)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_category(self, **data) -> Category:
        category = Category(**data)
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update_category(self, category: Category, **data) -> Category:
        for key, value in data.items():
            if value is not None:
                setattr(category, key, value)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category: Category) -> None:
        await self.db.delete(category)
        await self.db.commit()

    # ── Products ──────────────────────────────────────────────────────────────
    async def list_products(
        self,
        category_slug_or_id: str | None = None,
        search_query: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        tags: list[str] | None = None,
        is_featured: bool | None = None,
        sort: str | None = None,
        is_active: bool = True,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Product], int]:
        """
        List products with filtering, search, sorting, and pagination.
        Loads category, variants, and images eagerly.
        """
        stmt = (
            select(Product)
            .options(
                selectinload(Product.category),
                selectinload(Product.variants),
                selectinload(Product.images),
            )
        )
        count_stmt = select(func.count(Product.id.distinct()))

        filters = []

        if is_active:
            filters.append(Product.is_active.is_(True))

        if is_featured is not None:
            filters.append(Product.is_featured.is_(is_featured))

        if category_slug_or_id:
            try:
                cat_uuid = uuid.UUID(category_slug_or_id)
                filters.append(Product.category_id == cat_uuid)
            except ValueError:
                # Filter by category slug via join
                stmt = stmt.join(Product.category)
                count_stmt = count_stmt.join(Product.category)
                filters.append(Category.slug == category_slug_or_id)

        if search_query:
            q_like = f"%{search_query.strip()}%"
            filters.append(
                or_(
                    Product.name.ilike(q_like),
                    Product.description.ilike(q_like),
                )
            )

        if tags:
            for t in tags:
                filters.append(Product.tags.contains([t]))

        if min_price is not None or max_price is not None:
            stmt = stmt.join(Product.variants)
            count_stmt = count_stmt.join(Product.variants)
            if min_price is not None:
                filters.append(ProductVariant.price >= min_price)
            if max_price is not None:
                filters.append(ProductVariant.price <= max_price)

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        # Sorting
        if sort == "price_asc":
            stmt = stmt.outerjoin(ProductVariant).order_by(ProductVariant.price.asc())
        elif sort == "price_desc":
            stmt = stmt.outerjoin(ProductVariant).order_by(ProductVariant.price.desc())
        elif sort == "newest":
            stmt = stmt.order_by(Product.created_at.desc())
        else:
            # Default sort: featured first, then newest
            stmt = stmt.order_by(Product.is_featured.desc(), Product.created_at.desc())

        # Total count
        count_result = await self.db.execute(count_stmt)
        total_items = count_result.scalar_one_or_none() or 0

        # Pagination
        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        products = list(result.scalars().unique().all())

        return products, total_items

    async def get_product_by_id(
        self, product_id: uuid.UUID, include_inactive: bool = False
    ) -> Product | None:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.category),
                selectinload(Product.variants),
                selectinload(Product.images),
            )
        )
        if not include_inactive:
            stmt = stmt.where(Product.is_active.is_(True))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_product_by_slug(
        self, slug: str, include_inactive: bool = False
    ) -> Product | None:
        stmt = (
            select(Product)
            .where(Product.slug == slug)
            .options(
                selectinload(Product.category),
                selectinload(Product.variants),
                selectinload(Product.images),
            )
        )
        if not include_inactive:
            stmt = stmt.where(Product.is_active.is_(True))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_product(self, **data) -> Product:
        product = Product(**data)
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return await self.get_product_by_id(product.id, include_inactive=True)  # type: ignore

    async def update_product(self, product: Product, **data) -> Product:
        for key, value in data.items():
            if value is not None:
                setattr(product, key, value)
        await self.db.commit()
        await self.db.refresh(product)
        return await self.get_product_by_id(product.id, include_inactive=True)  # type: ignore

    async def delete_product(self, product: Product) -> None:
        await self.db.delete(product)
        await self.db.commit()

    # ── Variants ──────────────────────────────────────────────────────────────
    async def create_variant(self, product_id: uuid.UUID, **data) -> ProductVariant:
        variant = ProductVariant(product_id=product_id, **data)
        self.db.add(variant)
        await self.db.commit()
        await self.db.refresh(variant)
        return variant

    async def get_variant_by_id(self, variant_id: uuid.UUID) -> ProductVariant | None:
        stmt = select(ProductVariant).where(ProductVariant.id == variant_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_variant(self, variant: ProductVariant, **data) -> ProductVariant:
        for key, value in data.items():
            if value is not None:
                setattr(variant, key, value)
        await self.db.commit()
        await self.db.refresh(variant)
        return variant

    async def delete_variant(self, variant: ProductVariant) -> None:
        await self.db.delete(variant)
        await self.db.commit()

    # ── Images ────────────────────────────────────────────────────────────────
    async def unset_other_primaries(self, product_id: uuid.UUID, except_image_id: uuid.UUID | None = None) -> None:
        stmt = select(ProductImage).where(ProductImage.product_id == product_id, ProductImage.is_primary.is_(True))
        if except_image_id:
            stmt = stmt.where(ProductImage.id != except_image_id)
        result = await self.db.execute(stmt)
        for img in result.scalars().all():
            img.is_primary = False
        await self.db.commit()

    async def create_image(self, product_id: uuid.UUID, **data) -> ProductImage:
        if data.get("is_primary"):
            await self.unset_other_primaries(product_id)
        image = ProductImage(product_id=product_id, **data)
        self.db.add(image)
        await self.db.commit()
        await self.db.refresh(image)
        return image

    async def get_image_by_id(self, image_id: uuid.UUID) -> ProductImage | None:
        stmt = select(ProductImage).where(ProductImage.id == image_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_image(self, image: ProductImage) -> None:
        await self.db.delete(image)
        await self.db.commit()

    # ── Reviews ───────────────────────────────────────────────────────────────
    async def get_published_reviews(
        self, product_id: uuid.UUID, offset: int = 0, limit: int = 20
    ) -> tuple[list[tuple[Review, str | None]], int]:
        """Fetch published reviews with reviewer name."""
        stmt = (
            select(Review, Profile.full_name)
            .join(Profile, Review.user_id == Profile.id)
            .where(Review.product_id == product_id, Review.is_published.is_(True))
            .order_by(Review.created_at.desc())
        )
        count_stmt = (
            select(func.count(Review.id))
            .where(Review.product_id == product_id, Review.is_published.is_(True))
        )
        count_res = await self.db.execute(count_stmt)
        total_items = count_res.scalar_one_or_none() or 0

        res = await self.db.execute(stmt.offset(offset).limit(limit))
        rows = list(res.all())
        return rows, total_items

    async def get_product_rating_summary(self, product_id: uuid.UUID) -> tuple[float, int]:
        stmt = (
            select(
                func.coalesce(func.avg(Review.rating), 0.0),
                func.count(Review.id),
            )
            .where(Review.product_id == product_id, Review.is_published.is_(True))
        )
        res = await self.db.execute(stmt)
        row = res.one_or_none()
        if not row:
            return 0.0, 0
        avg_rating, total_count = row
        return round(float(avg_rating), 1), int(total_count)
