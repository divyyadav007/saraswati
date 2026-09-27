"""
Cart Service Layer.
Encapsulates cart retrieval, item pricing directly from DB, and guest cart merging.
Per docs/03-FEATURE-SPECIFICATION.md §2 and docs/08-SECURITY.md
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import BusinessRuleViolationError, NotFoundError
from app.db.models.cart import Cart, CartItem
from app.db.models.catalog import GiftHamper, Product, ProductVariant
from app.db.models.operations import StoreSetting
from app.modules.cart.schemas import (
    CartItemAddRequest,
    CartItemResponse,
    CartItemUpdateRequest,
    CartMergeRequest,
    CartResponse,
)


class CartService:
    @staticmethod
    async def get_or_create_cart(user_id: uuid.UUID, db: AsyncSession) -> Cart:
        """Fetch the user's active cart or create one if none exists."""
        res = await db.execute(
            select(Cart)
            .filter(Cart.user_id == user_id, Cart.status == "ACTIVE")
            .options(
                selectinload(Cart.items)
            )
        )
        cart = res.scalar_one_or_none()
        if not cart:
            cart = Cart(user_id=user_id, status="ACTIVE")
            db.add(cart)
            await db.commit()
            await db.refresh(cart)
            # Fetch with items loaded
            res = await db.execute(
                select(Cart)
                .filter(Cart.id == cart.id)
                .options(selectinload(Cart.items))
            )
            cart = res.scalar_one()
        return cart

    @classmethod
    async def get_cart_view(cls, user_id: uuid.UUID, db: AsyncSession) -> CartResponse:
        """
        Get the fully re-evaluated cart view.
        Prices are ALWAYS freshly read from product_variants.
        """
        cart = await cls.get_or_create_cart(user_id, db)

        # Get store settings for delivery threshold
        setting_res = await db.execute(select(StoreSetting).filter(StoreSetting.id == 1))
        setting = setting_res.scalar_one_or_none()
        free_above = float(setting.free_delivery_above) if setting and setting.free_delivery_above else 500.0
        flat_delivery = float(setting.delivery_charge_flat) if setting else 40.0

        item_responses: list[CartItemResponse] = []
        subtotal = 0.0
        has_oos = False

        # Load variants and products for all variant items
        variant_ids = [item.product_variant_id for item in cart.items if item.product_variant_id]
        variants_by_id: dict[uuid.UUID, ProductVariant] = {}
        if variant_ids:
            v_res = await db.execute(
                select(ProductVariant)
                .filter(ProductVariant.id.in_(variant_ids))
                .options(
                    selectinload(ProductVariant.product).selectinload(Product.images)
                )
            )
            for v in v_res.scalars().all():
                variants_by_id[v.id] = v

        # Load hampers for all hamper items
        hamper_ids = [item.gift_hamper_id for item in cart.items if item.gift_hamper_id]
        hampers_by_id: dict[uuid.UUID, GiftHamper] = {}
        if hamper_ids:
            h_res = await db.execute(
                select(GiftHamper)
                .filter(GiftHamper.id.in_(hamper_ids))
                .options(selectinload(GiftHamper.images))
            )
            for h in h_res.scalars().all():
                hampers_by_id[h.id] = h

        for item in cart.items:
            # 1. Hamper Item
            if item.gift_hamper_id:
                hamper = hampers_by_id.get(item.gift_hamper_id)
                if not hamper:
                    continue

                unit_price = float(hamper.hamper_price)
                line_total = round(unit_price * item.quantity, 2)
                subtotal += line_total
                is_available = hamper.is_active
                if not is_available:
                    has_oos = True

                primary_img = None
                if hasattr(hamper, "images") and hamper.images:
                    p = next((img.url for img in hamper.images if img.is_primary), None)
                    primary_img = p if p else hamper.images[0].url

                item_responses.append(
                    CartItemResponse(
                        id=item.id,
                        item_type="HAMPER",
                        product_id=None,
                        product_variant_id=None,
                        gift_hamper_id=hamper.id,
                        product_name=hamper.name,
                        product_slug=hamper.slug,
                        variant_label="Festive Hamper",
                        weight_grams=None,
                        unit_price=unit_price,
                        mrp=None,
                        quantity=item.quantity,
                        line_total=line_total,
                        image_url=primary_img,
                        stock_status="IN_STOCK" if hamper.is_active else "OUT_OF_STOCK",
                        is_available=is_available,
                    )
                )
                continue

            # 2. Variant Item
            if not item.product_variant_id:
                continue

            variant = variants_by_id.get(item.product_variant_id)
            if not variant:
                # Variant no longer exists, skip
                continue

            product = variant.product
            unit_price = float(variant.price)
            line_total = round(unit_price * item.quantity, 2)
            subtotal += line_total

            is_available = variant.is_active and variant.stock_status == "IN_STOCK"
            if not is_available:
                has_oos = True

            # Find primary image
            primary_img = next((img.url for img in product.images if img.is_primary), None)
            if not primary_img and product.images:
                primary_img = product.images[0].url

            item_responses.append(
                CartItemResponse(
                    id=item.id,
                    item_type="PRODUCT",
                    product_id=product.id,
                    product_variant_id=variant.id,
                    gift_hamper_id=None,
                    product_name=product.name,
                    product_slug=product.slug,
                    variant_label=variant.label,
                    weight_grams=variant.weight_grams,
                    unit_price=unit_price,
                    mrp=float(variant.mrp) if variant.mrp else None,
                    quantity=item.quantity,
                    line_total=line_total,
                    image_url=primary_img,
                    stock_status=variant.stock_status if variant.is_active else "OUT_OF_STOCK",
                    is_available=is_available,
                )
            )

        subtotal = round(subtotal, 2)
        delivery_charge = 0.0 if (subtotal >= free_above and subtotal > 0) else (flat_delivery if subtotal > 0 else 0.0)
        remaining_for_free = max(0.0, round(free_above - subtotal, 2)) if subtotal < free_above else 0.0
        estimated_total = round(subtotal + delivery_charge, 2)

        return CartResponse(
            id=cart.id,
            user_id=cart.user_id,
            items=item_responses,
            items_count=sum(i.quantity for i in item_responses),
            subtotal=subtotal,
            delivery_charge=delivery_charge,
            free_delivery_above=free_above,
            free_delivery_remaining=remaining_for_free,
            estimated_total=estimated_total,
            has_out_of_stock_items=has_oos,
        )

    @classmethod
    async def add_item(
        cls,
        user_id: uuid.UUID,
        payload: CartItemAddRequest,
        db: AsyncSession,
    ) -> CartResponse:
        """Add a variant or hamper to the active cart or increment its quantity."""
        if not payload.product_variant_id and not payload.gift_hamper_id:
            raise BusinessRuleViolationError("Must specify either product_variant_id or gift_hamper_id.")
        if payload.product_variant_id and payload.gift_hamper_id:
            raise BusinessRuleViolationError("Cannot specify both product_variant_id and gift_hamper_id.")

        cart = await cls.get_or_create_cart(user_id, db)

        if payload.gift_hamper_id:
            h_res = await db.execute(
                select(GiftHamper).filter(
                    GiftHamper.id == payload.gift_hamper_id,
                    GiftHamper.is_active.is_(True),
                )
            )
            hamper = h_res.scalar_one_or_none()
            if not hamper:
                raise NotFoundError("Gift hamper not found or inactive.")

            existing_item = next(
                (i for i in cart.items if i.gift_hamper_id == payload.gift_hamper_id),
                None,
            )
            if existing_item:
                existing_item.quantity += payload.quantity
                if existing_item.quantity > 50:
                    existing_item.quantity = 50
            else:
                new_item = CartItem(
                    cart_id=cart.id,
                    gift_hamper_id=payload.gift_hamper_id,
                    quantity=payload.quantity,
                    added_price_snapshot=hamper.hamper_price,
                )
                db.add(new_item)
        else:
            # Validate variant exists and is in stock
            v_res = await db.execute(
                select(ProductVariant).filter(
                    ProductVariant.id == payload.product_variant_id,
                    ProductVariant.is_active.is_(True),
                )
            )
            variant = v_res.scalar_one_or_none()
            if not variant:
                raise NotFoundError("Product variant not found or inactive.")

            if variant.stock_status != "IN_STOCK":
                raise BusinessRuleViolationError("Selected item is currently out of stock.")

            # Check if item already in cart
            existing_item = next(
                (i for i in cart.items if i.product_variant_id == payload.product_variant_id),
                None,
            )

            if existing_item:
                existing_item.quantity += payload.quantity
                if existing_item.quantity > 50:
                    existing_item.quantity = 50
            else:
                new_item = CartItem(
                    cart_id=cart.id,
                    product_variant_id=payload.product_variant_id,
                    quantity=payload.quantity,
                    added_price_snapshot=variant.price,
                )
                db.add(new_item)

        await db.commit()
        return await cls.get_cart_view(user_id, db)

    @classmethod
    async def update_item_quantity(
        cls,
        user_id: uuid.UUID,
        item_id: uuid.UUID,
        payload: CartItemUpdateRequest,
        db: AsyncSession,
    ) -> CartResponse:
        """Update an item's quantity or delete if 0."""
        cart = await cls.get_or_create_cart(user_id, db)
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise NotFoundError("Cart item not found.")

        if payload.quantity <= 0:
            await db.delete(item)
        else:
            item.quantity = payload.quantity

        await db.commit()
        return await cls.get_cart_view(user_id, db)

    @classmethod
    async def remove_item(
        cls,
        user_id: uuid.UUID,
        item_id: uuid.UUID,
        db: AsyncSession,
    ) -> CartResponse:
        """Remove an item from the cart."""
        cart = await cls.get_or_create_cart(user_id, db)
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise NotFoundError("Cart item not found.")

        await db.delete(item)
        await db.commit()
        return await cls.get_cart_view(user_id, db)

    @classmethod
    async def merge_guest_cart(
        cls,
        user_id: uuid.UUID,
        payload: CartMergeRequest,
        db: AsyncSession,
    ) -> CartResponse:
        """
        Merge guest localStorage cart items into the server cart upon login.
        Sums quantities up to 50 per item.
        """
        if not payload.items:
            return await cls.get_cart_view(user_id, db)

        cart = await cls.get_or_create_cart(user_id, db)
        existing_variants_map = {i.product_variant_id: i for i in cart.items if i.product_variant_id}
        existing_hampers_map = {i.gift_hamper_id: i for i in cart.items if i.gift_hamper_id}

        variant_ids = [item.product_variant_id for item in payload.items if item.product_variant_id]
        hamper_ids = [item.gift_hamper_id for item in payload.items if item.gift_hamper_id]

        valid_variants = {}
        if variant_ids:
            v_res = await db.execute(
                select(ProductVariant).filter(
                    ProductVariant.id.in_(variant_ids),
                    ProductVariant.is_active.is_(True),
                )
            )
            valid_variants = {v.id: v for v in v_res.scalars().all()}

        valid_hampers = {}
        if hamper_ids:
            h_res = await db.execute(
                select(GiftHamper).filter(
                    GiftHamper.id.in_(hamper_ids),
                    GiftHamper.is_active.is_(True),
                )
            )
            valid_hampers = {h.id: h for h in h_res.scalars().all()}

        for guest_item in payload.items:
            if guest_item.gift_hamper_id:
                hamper = valid_hampers.get(guest_item.gift_hamper_id)
                if not hamper:
                    continue
                existing = existing_hampers_map.get(guest_item.gift_hamper_id)
                if existing:
                    existing.quantity = min(50, existing.quantity + guest_item.quantity)
                else:
                    new_item = CartItem(
                        cart_id=cart.id,
                        gift_hamper_id=hamper.id,
                        quantity=min(50, guest_item.quantity),
                        added_price_snapshot=hamper.hamper_price,
                    )
                    db.add(new_item)
            elif guest_item.product_variant_id:
                variant = valid_variants.get(guest_item.product_variant_id)
                if not variant or variant.stock_status != "IN_STOCK":
                    continue

                existing = existing_variants_map.get(guest_item.product_variant_id)
                if existing:
                    existing.quantity = min(50, existing.quantity + guest_item.quantity)
                else:
                    new_item = CartItem(
                        cart_id=cart.id,
                        product_variant_id=variant.id,
                        quantity=min(50, guest_item.quantity),
                        added_price_snapshot=variant.price,
                    )
                    db.add(new_item)

        await db.commit()
        return await cls.get_cart_view(user_id, db)
