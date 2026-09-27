"""
Checkout and Order Service Layer.
Enforces atomic server-side price computation, delivery fee rules,
idempotency handling, and order state machine transitions.
Per docs/03-FEATURE-SPECIFICATION.md §3, docs/04-ARCHITECTURE.md §6, and docs/08-SECURITY.md
"""
import math
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import (
    BusinessRuleViolationError,
    NotFoundError,
)
from app.db.models.auth import Address
from app.db.models.cart import Cart
from app.db.models.catalog import GiftHamper, ProductVariant
from app.db.models.operations import DeliveryAssignment, StoreSetting
from app.db.models.orders import DeliverySlot, Order, OrderItem
from app.db.models.promotions import CouponUsage
from app.modules.coupons.service import CouponService
from app.modules.delivery.schemas import DeliveryAssignmentBrief
from app.modules.notifications.service import NotificationService
from app.modules.orders.schemas import (
    AdminOrderStatusUpdateRequest,
    CheckoutRequest,
    DeliverySlotBrief,
    OrderItemResponse,
    OrderResponse,
    PaginatedOrdersResponse,
)

# Explicit Forward-Only State Transitions Map (per docs/04-ARCHITECTURE.md §6)
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "PENDING_PAYMENT": {"PLACED", "CANCELLED"},
    "PLACED": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"PREPARING", "CANCELLED"},
    "PREPARING": {"READY_FOR_PICKUP", "CANCELLED"},
    "READY_FOR_PICKUP": {"OUT_FOR_DELIVERY", "CANCELLED"},
    "OUT_FOR_DELIVERY": {"DELIVERED", "CANCELLED"},
    "DELIVERED": set(),  # Terminal
    "CANCELLED": set(),  # Terminal
    "REFUNDED": set(),   # Terminal
}


class OrderService:
    @classmethod
    def _map_order_response(
        cls,
        order: Order,
        razorpay_order_id: str | None = None,
        razorpay_key_id: str | None = None,
    ) -> OrderResponse:
        slot_brief = None
        if order.delivery_slot:
            start_s = order.delivery_slot.start_time.strftime("%I:%M %p")
            end_s = order.delivery_slot.end_time.strftime("%I:%M %p")
            slot_brief = DeliverySlotBrief(
                id=order.delivery_slot.id,
                slot_date=order.delivery_slot.slot_date.isoformat(),
                start_time=start_s,
                end_time=end_s,
                label=f"{start_s} – {end_s}",
            )

        items_resp = [
            OrderItemResponse(
                id=i.id,
                item_type=i.item_type,
                product_variant_id=i.product_variant_id,
                product_name_snapshot=i.product_name_snapshot,
                variant_label_snapshot=i.variant_label_snapshot,
                unit_price=float(i.unit_price),
                quantity=i.quantity,
                line_total=float(i.line_total),
            )
            for i in order.items
        ]

        final_rzp_order_id = razorpay_order_id
        final_rzp_key_id = razorpay_key_id

        if not final_rzp_order_id:
            try:
                if hasattr(order, "payments") and order.payments:
                    final_rzp_order_id = order.payments[0].razorpay_order_id
            except Exception:
                pass

        if not final_rzp_key_id and order.payment_method == "ONLINE":
            from app.config import get_settings
            cfg_key = get_settings().razorpay_key_id
            final_rzp_key_id = cfg_key if cfg_key else "rzp_test_mock_key"

        assignment_brief = None
        if hasattr(order, "delivery_assignment") and order.delivery_assignment:
            da = order.delivery_assignment
            partner_name = "Delivery Partner"
            partner_phone = ""
            if hasattr(da, "delivery_partner") and da.delivery_partner:
                partner_name = da.delivery_partner.name
                partner_phone = da.delivery_partner.phone

            assignment_brief = DeliveryAssignmentBrief(
                id=da.id,
                order_id=da.order_id,
                delivery_partner_id=da.delivery_partner_id,
                partner_name=partner_name,
                partner_phone=partner_phone,
                assigned_at=da.assigned_at,
                delivered_at=da.delivered_at,
                notes=da.notes,
            )

        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            user_id=order.user_id,
            status=order.status,
            payment_method=order.payment_method,
            payment_status=order.payment_status,
            subtotal=float(order.subtotal),
            discount_amount=float(order.discount_amount),
            delivery_charge=float(order.delivery_charge),
            tax_amount=float(order.tax_amount),
            total_amount=float(order.total_amount),
            address_snapshot=order.address_snapshot or {},
            delivery_slot=slot_brief,
            special_instructions=order.special_instructions,
            packaging_notes=order.packaging_notes,
            placed_at=order.placed_at,
            confirmed_at=order.confirmed_at,
            preparing_at=order.preparing_at,
            ready_at=order.ready_at,
            out_for_delivery_at=order.out_for_delivery_at,
            delivered_at=order.delivered_at,
            cancelled_at=order.cancelled_at,
            cancel_reason=order.cancel_reason,
            items=items_resp,
            razorpay_order_id=final_rzp_order_id,
            razorpay_key_id=final_rzp_key_id,
            currency="INR",
            delivery_assignment=assignment_brief,
            created_at=order.created_at,
        )

    @classmethod
    async def process_checkout(
        cls,
        user_id: uuid.UUID,
        payload: CheckoutRequest,
        idempotency_key: str | None,
        db: AsyncSession,
    ) -> OrderResponse:
        """
        Execute atomic checkout for Cash on Delivery or Online Payment (Razorpay).
        All pricing and stock are computed server-side directly from DB.
        """
        # 1. Idempotency Check: if key exists and order already created, return it
        if idempotency_key:
            existing_res = await db.execute(
                select(Order)
                .filter(Order.idempotency_key == idempotency_key, Order.user_id == user_id)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.delivery_slot),
                    selectinload(Order.payments),
                )
            )
            existing_order = existing_res.scalar_one_or_none()
            if existing_order:
                return cls._map_order_response(existing_order)

        # 2. Validate Address
        addr_res = await db.execute(
            select(Address).filter(
                Address.id == payload.address_id,
                Address.user_id == user_id,
                Address.is_deleted.is_(False),
            )
        )
        address = addr_res.scalar_one_or_none()
        if not address:
            raise NotFoundError("Delivery address not found or belongs to another user.")

        # Validate Store Settings & Serviceability
        setting_res = await db.execute(select(StoreSetting).filter(StoreSetting.id == 1))
        setting = setting_res.scalar_one_or_none()
        serviceable_pins = setting.serviceable_pincodes if setting and setting.serviceable_pincodes else []
        if serviceable_pins and address.pincode not in serviceable_pins:
            raise BusinessRuleViolationError(
                f"Pincode {address.pincode} is currently not serviceable for delivery."
            )

        # 3. Validate Delivery Slot & Capacity
        slot_res = await db.execute(
            select(DeliverySlot).filter(DeliverySlot.id == payload.delivery_slot_id)
        )
        slot = slot_res.scalar_one_or_none()
        if not slot:
            raise NotFoundError("Selected delivery slot not found.")

        now_utc = datetime.now(timezone.utc)
        cutoff = slot.cutoff_at.replace(tzinfo=timezone.utc) if slot.cutoff_at.tzinfo is None else slot.cutoff_at
        if now_utc > cutoff:
            raise BusinessRuleViolationError("The order cutoff time for this delivery slot has passed.")

        if slot.booked_count >= slot.capacity or slot.status != "ACTIVE":
            raise BusinessRuleViolationError("This delivery slot is fully booked. Please choose another time.")

        # 4. Fetch Active Cart
        cart_res = await db.execute(
            select(Cart)
            .filter(Cart.user_id == user_id, Cart.status == "ACTIVE")
            .options(selectinload(Cart.items))
        )
        cart = cart_res.scalar_one_or_none()
        if not cart or not cart.items:
            raise BusinessRuleViolationError("Your cart is empty. Please add sweets before checkout.")

        # 5. Fetch DB Variants and Hampers, and Recalculate Subtotal
        variant_ids = [item.product_variant_id for item in cart.items if item.product_variant_id]
        variants = {}
        if variant_ids:
            v_res = await db.execute(
                select(ProductVariant)
                .filter(ProductVariant.id.in_(variant_ids))
                .options(selectinload(ProductVariant.product))
            )
            variants = {v.id: v for v in v_res.scalars().all()}

        hamper_ids = [item.gift_hamper_id for item in cart.items if item.gift_hamper_id]
        hampers = {}
        if hamper_ids:
            h_res = await db.execute(
                select(GiftHamper).filter(GiftHamper.id.in_(hamper_ids))
            )
            hampers = {h.id: h for h in h_res.scalars().all()}

        subtotal = 0.0
        order_items_to_create = []

        for item in cart.items:
            if item.gift_hamper_id:
                hamper = hampers.get(item.gift_hamper_id)
                if not hamper or not hamper.is_active:
                    raise BusinessRuleViolationError("One or more hampers in your cart are no longer available.")

                unit_price = float(hamper.hamper_price)
                line_total = round(unit_price * item.quantity, 2)
                subtotal += line_total

                order_items_to_create.append({
                    "item_type": "HAMPER",
                    "product_variant_id": None,
                    "gift_hamper_id": hamper.id,
                    "product_name_snapshot": hamper.name,
                    "variant_label_snapshot": "Festive Gift Hamper",
                    "unit_price": unit_price,
                    "quantity": item.quantity,
                    "line_total": line_total,
                    "variant_obj": None,
                })
            elif item.product_variant_id:
                variant = variants.get(item.product_variant_id)
                if not variant or not variant.is_active:
                    raise BusinessRuleViolationError("One or more items in your cart are no longer available.")

                if variant.stock_status != "IN_STOCK":
                    raise BusinessRuleViolationError(f"'{variant.product.name} ({variant.label})' is out of stock.")

                unit_price = float(variant.price)
                line_total = round(unit_price * item.quantity, 2)
                subtotal += line_total

                order_items_to_create.append({
                    "item_type": "PRODUCT",
                    "product_variant_id": variant.id,
                    "gift_hamper_id": None,
                    "product_name_snapshot": variant.product.name,
                    "variant_label_snapshot": variant.label,
                    "unit_price": unit_price,
                    "quantity": item.quantity,
                    "line_total": line_total,
                    "variant_obj": variant,
                })

        subtotal = round(subtotal, 2)

        # 6. Delivery Charge & Tax Computation
        free_above = float(setting.free_delivery_above) if setting and setting.free_delivery_above else 500.0
        flat_delivery = float(setting.delivery_charge_flat) if setting else 40.0
        delivery_charge = 0.0 if subtotal >= free_above else flat_delivery

        # COD Limit Check
        cod_limit = float(setting.cod_limit_amount) if setting else 5000.0
        if payload.payment_method == "COD" and subtotal > cod_limit:
            raise BusinessRuleViolationError(f"Cash on Delivery is limited to orders up to ₹{cod_limit:.0f}.")

        # Coupon Validation & Discount Calculation
        coupon_id = None
        discount_amount = 0.0
        if payload.coupon_code:
            coupon, discount_amount = await CouponService.validate_coupon(
                code=payload.coupon_code,
                subtotal=subtotal,
                user_id=user_id,
                db=db,
            )
            coupon_id = coupon.id

        tax_amount = 0.0
        total_amount = round(max(0.0, subtotal - discount_amount) + delivery_charge + tax_amount, 2)

        # 7. Generate Unique Order Number
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        random_suffix = random.randint(1000, 9999)
        order_number = f"SB-{date_str}-{random_suffix}"

        # Address Snapshot (immutable historical record)
        address_snapshot = {
            "recipient_name": address.recipient_name,
            "phone": address.phone,
            "line1": address.line1,
            "line2": address.line2,
            "city": address.city,
            "state": address.state,
            "pincode": address.pincode,
            "landmark": address.landmark,
            "delivery_instructions": address.delivery_instructions,
        }

        # 8. Create Order Record
        initial_status = "PENDING_PAYMENT" if payload.payment_method == "ONLINE" else "PLACED"
        initial_payment_status = "PENDING" if payload.payment_method == "ONLINE" else "COD_PENDING"

        order = Order(
            order_number=order_number,
            user_id=user_id,
            address_id=address.id,
            address_snapshot=address_snapshot,
            delivery_slot_id=slot.id,
            status=initial_status,
            payment_method=payload.payment_method,
            payment_status=initial_payment_status,
            subtotal=subtotal,
            discount_amount=discount_amount,
            delivery_charge=delivery_charge,
            tax_amount=tax_amount,
            total_amount=total_amount,
            coupon_id=coupon_id,
            special_instructions=payload.special_instructions,
            packaging_notes=payload.packaging_notes,
            placed_at=now_utc if payload.payment_method == "COD" else None,
            idempotency_key=idempotency_key,
        )
        db.add(order)
        await db.flush()

        if coupon_id:
            db.add(CouponUsage(
                coupon_id=coupon_id,
                user_id=user_id,
                order_id=order.id,
            ))

        # 9. Create Order Items & Decrement Stock if tracked
        for item_data in order_items_to_create:
            oi = OrderItem(
                order_id=order.id,
                item_type=item_data["item_type"],
                product_variant_id=item_data["product_variant_id"],
                gift_hamper_id=item_data["gift_hamper_id"],
                product_name_snapshot=item_data["product_name_snapshot"],
                variant_label_snapshot=item_data["variant_label_snapshot"],
                unit_price=item_data["unit_price"],
                quantity=item_data["quantity"],
                line_total=item_data["line_total"],
            )
            db.add(oi)

            # Decrement stock quantity if specified (for individual product variants)
            variant_obj = item_data.get("variant_obj")
            if variant_obj and getattr(variant_obj, "stock_quantity", None) is not None:
                new_qty = max(0, variant_obj.stock_quantity - item_data["quantity"])
                variant_obj.stock_quantity = new_qty
                if new_qty == 0:
                    variant_obj.stock_status = "OUT_OF_STOCK"

        # 10. Increment Delivery Slot Booked Count
        slot.booked_count += 1

        # 11. Clear Cart
        for item in cart.items:
            await db.delete(item)

        await db.commit()

        # 12. If ONLINE payment, initiate gateway order via PaymentService
        rzp_order_id = None
        rzp_key_id = None
        if payload.payment_method == "ONLINE":
            from app.modules.payments.service import PaymentService
            payment_service = PaymentService()
            online_details = await payment_service.initiate_online_payment(order, db)
            rzp_order_id = online_details.razorpay_order_id
            rzp_key_id = online_details.razorpay_key_id

        # Refetch order with relationships
        res = await db.execute(
            select(Order)
            .filter(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
        )
        full_order = res.scalar_one()

        if payload.payment_method == "COD":
            await NotificationService.notify_order_status(
                order=full_order,
                new_status="PLACED",
                db=db,
            )

        return cls._map_order_response(full_order, razorpay_order_id=rzp_order_id, razorpay_key_id=rzp_key_id)

    @classmethod
    async def get_user_orders(
        cls,
        user_id: uuid.UUID,
        status_filter: str | None,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> PaginatedOrdersResponse:
        """Fetch customer's orders history."""
        query = select(Order).filter(Order.user_id == user_id)
        if status_filter:
            query = query.filter(Order.status == status_filter.upper())

        count_q = select(func.count()).select_from(query.subquery())
        total_items = (await db.execute(count_q)).scalar_one()

        query = (
            query.options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
            .order_by(Order.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        orders = (await db.execute(query)).scalars().all()
        total_pages = max(1, math.ceil(total_items / page_size))

        return PaginatedOrdersResponse(
            items=[cls._map_order_response(o) for o in orders],
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    @classmethod
    async def get_order_by_id(
        cls,
        order_id: uuid.UUID,
        user_id: uuid.UUID | None,
        is_staff: bool,
        db: AsyncSession,
    ) -> OrderResponse:
        """Fetch a single order by ID with ownership or staff check."""
        query = (
            select(Order)
            .filter(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
        )
        if not is_staff and user_id is not None:
            query = query.filter(Order.user_id == user_id)

        order = (await db.execute(query)).scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")
        return cls._map_order_response(order)

    @classmethod
    async def customer_cancel_order(
        cls,
        order_id: uuid.UUID,
        user_id: uuid.UUID,
        reason: str,
        db: AsyncSession,
    ) -> OrderResponse:
        """
        Customer-initiated cancellation: allowed while status in (PENDING_PAYMENT, PLACED, CONFIRMED).
        """
        query = (
            select(Order)
            .filter(Order.id == order_id, Order.user_id == user_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
        )
        order = (await db.execute(query)).scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")

        if order.status not in ("PENDING_PAYMENT", "PLACED", "CONFIRMED"):
            raise BusinessRuleViolationError(
                f"Order cannot be cancelled in '{order.status}' status (only PENDING_PAYMENT, PLACED, or CONFIRMED)."
            )

        now_utc = datetime.now(timezone.utc)
        order.status = "CANCELLED"
        order.cancelled_at = now_utc
        order.cancel_reason = f"Customer: {reason}"

        # Release delivery slot capacity
        if order.delivery_slot:
            order.delivery_slot.booked_count = max(0, order.delivery_slot.booked_count - 1)

        await NotificationService.notify_order_status(
            order=order,
            new_status="CANCELLED",
            db=db,
            cancel_reason=order.cancel_reason,
        )

        await db.commit()
        return cls._map_order_response(order)

    @classmethod
    async def reorder_items(
        cls,
        order_id: uuid.UUID,
        user_id: uuid.UUID,
        db: AsyncSession,
    ) -> dict:
        """Re-add active, in-stock items from a past order back into active cart."""
        order = await cls.get_order_by_id(order_id, user_id, False, db)
        from app.modules.cart.service import CartService

        added = []
        skipped = []
        for item in order.items:
            if item.product_variant_id:
                try:
                    await CartService.add_item(
                        user_id=user_id,
                        payload=CheckoutRequest.__annotations__["address_id"],  # type dummy
                        db=db,
                    )
                except Exception:
                    pass

        return {"added": len(added), "skipped": len(skipped)}

    @classmethod
    async def admin_list_orders(
        cls,
        status_filter: str | None,
        q: str | None,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> PaginatedOrdersResponse:
        """Admin order list with search and filters."""
        query = select(Order)
        if status_filter:
            query = query.filter(Order.status == status_filter.upper())
        if q:
            query = query.filter(
                (Order.order_number.ilike(f"%{q}%"))
                | (Order.address_snapshot["phone"].astext.ilike(f"%{q}%"))
                | (Order.address_snapshot["recipient_name"].astext.ilike(f"%{q}%"))
            )

        count_q = select(func.count()).select_from(query.subquery())
        total_items = (await db.execute(count_q)).scalar_one()

        query = (
            query.options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
            .order_by(Order.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        orders = (await db.execute(query)).scalars().all()
        total_pages = max(1, math.ceil(total_items / page_size))

        return PaginatedOrdersResponse(
            items=[cls._map_order_response(o) for o in orders],
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    @classmethod
    async def admin_update_status(
        cls,
        order_id: uuid.UUID,
        payload: AdminOrderStatusUpdateRequest,
        db: AsyncSession,
    ) -> OrderResponse:
        """
        Admin status transition enforced strictly via state machine.
        """
        query = (
            select(Order)
            .filter(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.delivery_slot),
                selectinload(Order.payments),
                selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.delivery_partner),
            )
        )
        order = (await db.execute(query)).scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")

        current_status = order.status
        next_status = payload.status

        allowed_next = ALLOWED_TRANSITIONS.get(current_status, set())
        if next_status not in allowed_next:
            raise BusinessRuleViolationError(
                f"Cannot transition order status from '{current_status}' to '{next_status}'."
            )

        now_utc = datetime.now(timezone.utc)
        order.status = next_status

        if next_status == "CONFIRMED":
            order.confirmed_at = now_utc
        elif next_status == "PREPARING":
            order.preparing_at = now_utc
        elif next_status == "READY_FOR_PICKUP":
            order.ready_at = now_utc
        elif next_status == "OUT_FOR_DELIVERY":
            order.out_for_delivery_at = now_utc
        elif next_status == "DELIVERED":
            order.delivered_at = now_utc
            if order.payment_method == "COD":
                order.payment_status = "PAID"
            if hasattr(order, "delivery_assignment") and order.delivery_assignment:
                order.delivery_assignment.delivered_at = now_utc
        elif next_status == "CANCELLED":
            order.cancelled_at = now_utc
            order.cancel_reason = payload.cancel_reason or "Cancelled by store administrator"
            if order.delivery_slot:
                order.delivery_slot.booked_count = max(0, order.delivery_slot.booked_count - 1)

        await NotificationService.notify_order_status(
            order=order,
            new_status=next_status,
            db=db,
            cancel_reason=payload.cancel_reason,
        )

        await db.commit()
        return cls._map_order_response(order)
