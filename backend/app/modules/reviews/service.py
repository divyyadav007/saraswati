"""
Reviews Service Layer.
Gated on delivered purchase, enforces unique per (user, product, order),
and manages admin moderation queue.
Per docs/06-API-SPECIFICATION.md §6.11, §6.18 and docs/05-DATABASE-SCHEMA.md §2.21
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import (
    BusinessRuleViolationError,
    ConflictError,
    NotFoundError,
)
from app.db.models.auth import Profile
from app.db.models.catalog import Product, ProductVariant
from app.db.models.operations import Review
from app.db.models.orders import Order, OrderItem
from app.modules.reviews.schemas import (
    ProductReviewsSummaryResponse,
    ReviewCreateRequest,
    ReviewResponse,
)


class ReviewService:

    @staticmethod
    async def submit_review(
        user_id: uuid.UUID,
        payload: ReviewCreateRequest,
        db: AsyncSession,
    ) -> ReviewResponse:
        """
        Customer submits a product review.
        Enforces:
        1. Order must exist and belong to the user.
        2. Order status must be DELIVERED.
        3. Product must have been part of the order.
        4. Customer can only review each product once per order.
        5. Initial status is is_published = False (gated on admin approval).
        """
        # 1. Fetch Order and verify ownership & delivery status
        order_res = await db.execute(
            select(Order)
            .filter(Order.id == payload.order_id, Order.user_id == user_id)
            .options(
                selectinload(Order.items).selectinload(OrderItem.variant_rel if hasattr(OrderItem, "variant_rel") else OrderItem.order)
            )
        )
        order = order_res.scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found or does not belong to you.")

        if order.status != "DELIVERED":
            raise BusinessRuleViolationError(
                "Reviews can only be submitted after your order has been successfully delivered."
            )

        # 2. Resolve and verify that this product was part of the order
        target_product_id = payload.product_id
        items_res = await db.execute(
            select(OrderItem).filter(OrderItem.order_id == order.id)
        )
        items = items_res.scalars().all()

        variant_ids = [i.product_variant_id for i in items if i.product_variant_id]
        if not target_product_id and payload.product_variant_id:
            if payload.product_variant_id not in variant_ids:
                raise BusinessRuleViolationError("This item was not purchased in the specified order.")
            v_lookup = await db.execute(
                select(ProductVariant).filter(ProductVariant.id == payload.product_variant_id)
            )
            v_obj = v_lookup.scalar_one_or_none()
            if v_obj:
                target_product_id = v_obj.product_id

        if not target_product_id:
            raise BusinessRuleViolationError("Product identifier is required to submit a review.")

        product_found = False
        if variant_ids:
            v_res = await db.execute(
                select(ProductVariant).filter(
                    ProductVariant.id.in_(variant_ids),
                    ProductVariant.product_id == target_product_id,
                )
            )
            matched_vars = v_res.scalars().all()
            if any(v.product_id == target_product_id for v in matched_vars):
                product_found = True

        if not product_found:
            raise BusinessRuleViolationError("This product was not purchased in the specified order.")

        # 3. Check for existing review
        existing = await db.execute(
            select(Review).filter(
                Review.user_id == user_id,
                Review.product_id == target_product_id,
                Review.order_id == payload.order_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError("You have already reviewed this product for this order.")

        # 4. Create review with is_published = False
        review = Review(
            product_id=target_product_id,
            user_id=user_id,
            order_id=payload.order_id,
            rating=payload.rating,
            comment=payload.comment.strip() if payload.comment else None,
            is_published=False,
        )
        db.add(review)
        await db.commit()
        await db.refresh(review)

        return await ReviewService._map_review_response(review, db)

    @staticmethod
    async def list_product_reviews(
        product_id: uuid.UUID,
        db: AsyncSession,
    ) -> ProductReviewsSummaryResponse:
        """
        Public endpoint: returns published reviews for a given product and rating averages.
        """
        query = (
            select(Review)
            .filter(Review.product_id == product_id, Review.is_published.is_(True))
            .order_by(Review.created_at.desc())
        )
        res = await db.execute(query)
        reviews = res.scalars().all()

        if not reviews:
            return ProductReviewsSummaryResponse(
                average_rating=0.0,
                total_reviews=0,
                reviews=[],
            )

        total_rating = sum(r.rating for r in reviews)
        avg = round(total_rating / len(reviews), 1)

        mapped_reviews = [await ReviewService._map_review_response(r, db) for r in reviews]
        return ProductReviewsSummaryResponse(
            average_rating=avg,
            total_reviews=len(reviews),
            reviews=mapped_reviews,
        )

    @staticmethod
    async def admin_list_reviews(
        is_published: bool | None,
        product_id: uuid.UUID | None,
        db: AsyncSession,
    ) -> list[ReviewResponse]:
        query = select(Review).order_by(Review.created_at.desc())
        if is_published is not None:
            query = query.filter(Review.is_published == is_published)
        if product_id is not None:
            query = query.filter(Review.product_id == product_id)

        res = await db.execute(query)
        reviews = res.scalars().all()
        return [await ReviewService._map_review_response(r, db) for r in reviews]

    @staticmethod
    async def moderate_review(
        review_id: uuid.UUID,
        is_published: bool,
        db: AsyncSession,
    ) -> ReviewResponse:
        res = await db.execute(select(Review).filter(Review.id == review_id))
        review = res.scalar_one_or_none()
        if not review:
            raise NotFoundError(f"Review with ID {review_id} not found.")

        review.is_published = is_published
        await db.commit()
        await db.refresh(review)
        return await ReviewService._map_review_response(review, db)

    @staticmethod
    async def delete_review(review_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(Review).filter(Review.id == review_id))
        review = res.scalar_one_or_none()
        if not review:
            raise NotFoundError(f"Review with ID {review_id} not found.")
        await db.delete(review)
        await db.commit()

    @staticmethod
    async def _map_review_response(review: Review, db: AsyncSession) -> ReviewResponse:
        u_res = await db.execute(select(Profile.full_name).filter(Profile.id == review.user_id))
        user_val = u_res.scalar_one_or_none()
        if hasattr(user_val, "full_name"):
            user_name = user_val.full_name or "Customer"
        elif isinstance(user_val, str):
            user_name = user_val
        else:
            user_name = "Customer"

        p_res = await db.execute(select(Product.name).filter(Product.id == review.product_id))
        prod_val = p_res.scalar_one_or_none()
        if hasattr(prod_val, "name"):
            product_name = prod_val.name
        elif isinstance(prod_val, str):
            product_name = prod_val
        else:
            product_name = None

        return ReviewResponse(
            id=review.id,
            product_id=review.product_id,
            product_name=product_name,
            user_id=review.user_id,
            user_name=user_name,
            order_id=review.order_id,
            rating=review.rating,
            comment=review.comment,
            is_published=review.is_published,
            created_at=review.created_at,
        )
