"""
Payment Service Layer.
Coordinates Razorpay gateway order generation, signature verification,
webhook handling, idempotency, and admin refunds.
Per docs/09-PAYMENTS.md, docs/04-ARCHITECTURE.md §9, and docs/08-SECURITY.md.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import (
    BusinessRuleViolationError,
    NotFoundError,
    PaymentSignatureInvalidError,
)
from app.db.models.orders import Order, Payment, ProcessedWebhookEvent
from app.modules.payments.gateway import PaymentGateway
from app.modules.payments.razorpay_gateway import RazorpayGateway
from app.modules.payments.schemas import (
    AdminRefundResponse,
    OnlineCheckoutDetails,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, gateway: PaymentGateway | None = None):
        self.gateway = gateway or RazorpayGateway()

    async def initiate_online_payment(
        self,
        order: Order,
        db: AsyncSession,
    ) -> OnlineCheckoutDetails:
        """
        Creates a Razorpay order for an online-payment order and records payment row.
        """
        # Call gateway
        gateway_res = await self.gateway.create_order(
            amount=float(order.total_amount),
            receipt=order.order_number,
            currency="INR",
            notes={"internal_order_id": str(order.id), "user_id": str(order.user_id)},
        )

        # Create or update Payment row
        payment = Payment(
            order_id=order.id,
            razorpay_order_id=gateway_res.gateway_order_id,
            amount=order.total_amount,
            status="CREATED",
            method="ONLINE",
            refunded_amount=0.0,
        )
        db.add(payment)
        await db.commit()

        return OnlineCheckoutDetails(
            order_id=order.id,
            order_number=order.order_number,
            total_amount=float(order.total_amount),
            razorpay_order_id=gateway_res.gateway_order_id,
            razorpay_key_id=gateway_res.key_id,
            currency="INR",
        )

    async def verify_client_payment(
        self,
        payload: PaymentVerifyRequest,
        user_id: uuid.UUID,
        db: AsyncSession,
    ) -> PaymentVerifyResponse:
        """
        Verifies client-provided Razorpay payment signature.
        Idempotent alongside webhook processing.
        """
        # 1. Fetch Order and Payment
        res = await db.execute(
            select(Order)
            .filter(Order.id == payload.order_id, Order.user_id == user_id)
            .options(selectinload(Order.payments))
        )
        order = res.scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")

        # If already placed/paid, return success idempotently
        if order.payment_status == "CAPTURED" or order.status != "PENDING_PAYMENT":
            return PaymentVerifyResponse(
                success=True,
                order_id=order.id,
                order_number=order.order_number,
                status=order.status,
                payment_status=order.payment_status,
                amount=float(order.total_amount),
                message="Payment already verified and confirmed.",
            )

        # 2. Verify Signature
        is_valid = self.gateway.verify_payment_signature(
            gateway_order_id=payload.razorpay_order_id,
            gateway_payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
        )

        # Find or create Payment record
        payment = next((p for p in order.payments if p.razorpay_order_id == payload.razorpay_order_id), None)
        if not payment:
            payment = Payment(
                order_id=order.id,
                razorpay_order_id=payload.razorpay_order_id,
                amount=order.total_amount,
                status="CREATED",
                method="ONLINE",
            )
            db.add(payment)

        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature

        if not is_valid:
            payment.status = "FAILED"
            payment.failure_reason = "Signature verification mismatch"
            order.payment_status = "FAILED"
            await db.commit()
            raise PaymentSignatureInvalidError("Invalid Razorpay payment signature.")

        # 3. Mark Confirmed / Placed
        now_utc = datetime.now(timezone.utc)
        payment.status = "CAPTURED"
        order.status = "PLACED"
        order.payment_status = "CAPTURED"
        order.placed_at = now_utc

        await db.commit()
        return PaymentVerifyResponse(
            success=True,
            order_id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_status=order.payment_status,
            amount=float(order.total_amount),
            message="Payment verified successfully. Your order is confirmed!",
        )

    async def handle_razorpay_webhook(
        self,
        raw_body: bytes,
        signature_header: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Process incoming Razorpay webhook. Source of truth for payments.
        Validates webhook signature, enforces deduplication via processed_webhook_events.
        """
        # 1. Signature Verification
        if not self.gateway.verify_webhook_signature(raw_body, signature_header):
            logger.warning("Razorpay webhook signature verification failed.")
            raise PaymentSignatureInvalidError("Invalid webhook signature.")

        # 2. Parse Payload
        import json
        try:
            event = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            raise BusinessRuleViolationError("Malformed JSON webhook payload.") from e

        event_id = event.get("event_id") or event.get("id") or str(uuid.uuid4())
        event_type = event.get("event")

        # 3. Deduplication check
        dup_res = await db.execute(
            select(ProcessedWebhookEvent).filter(ProcessedWebhookEvent.event_id == event_id)
        )
        if dup_res.scalar_one_or_none():
            logger.info("Webhook event %s already processed; skipping.", event_id)
            return {"status": "ignored", "reason": "duplicate_event"}

        # 4. Handle Event Types
        payload_data = event.get("payload", {})
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        rzp_order_id = payment_entity.get("order_id")
        rzp_payment_id = payment_entity.get("id")

        if event_type == "payment.captured" and rzp_order_id:
            # Find payment/order by razorpay_order_id
            p_res = await db.execute(
                select(Payment).filter(Payment.razorpay_order_id == rzp_order_id)
            )
            payment = p_res.scalar_one_or_none()

            if payment:
                payment.status = "CAPTURED"
                payment.razorpay_payment_id = rzp_payment_id
                payment.raw_webhook_payload = event

                # Update corresponding order
                o_res = await db.execute(
                    select(Order).filter(Order.id == payment.order_id)
                )
                order = o_res.scalar_one_or_none()
                if order and order.status == "PENDING_PAYMENT":
                    order.status = "PLACED"
                    order.payment_status = "CAPTURED"
                    order.placed_at = datetime.now(timezone.utc)

        elif event_type == "payment.failed" and rzp_order_id:
            p_res = await db.execute(
                select(Payment).filter(Payment.razorpay_order_id == rzp_order_id)
            )
            payment = p_res.scalar_one_or_none()
            if payment:
                payment.status = "FAILED"
                payment.failure_reason = payment_entity.get("error_description", "Payment failed")
                payment.raw_webhook_payload = event

        elif event_type == "refund.processed":
            refund_entity = payload_data.get("refund", {}).get("entity", {})
            refund_payment_id = refund_entity.get("payment_id")
            if refund_payment_id:
                p_res = await db.execute(
                    select(Payment).filter(Payment.razorpay_payment_id == refund_payment_id)
                )
                payment = p_res.scalar_one_or_none()
                if payment:
                    refunded_val = float(refund_entity.get("amount", 0)) / 100.0
                    payment.refunded_amount = refunded_val
                    payment.status = "REFUNDED"
                    payment.raw_webhook_payload = event

                    o_res = await db.execute(select(Order).filter(Order.id == payment.order_id))
                    order = o_res.scalar_one_or_none()
                    if order:
                        order.status = "REFUNDED"
                        order.payment_status = "REFUNDED"

        # 5. Record Processed Event
        db.add(ProcessedWebhookEvent(event_id=event_id, event_type=event_type or "unknown"))
        await db.commit()

        return {"status": "processed", "event_id": event_id, "event_type": event_type}

    async def process_admin_refund(
        self,
        order_id: uuid.UUID,
        amount: float | None,
        reason: str,
        db: AsyncSession,
    ) -> AdminRefundResponse:
        """
        Admin-initiated refund. Calls Razorpay Refunds API for the online payment.
        """
        # Fetch order with payments
        res = await db.execute(
            select(Order)
            .filter(Order.id == order_id)
            .options(selectinload(Order.payments))
        )
        order = res.scalar_one_or_none()
        if not order:
            raise NotFoundError("Order not found.")

        if order.payment_method == "COD":
            raise BusinessRuleViolationError("Cash on Delivery orders cannot be refunded via payment gateway.")

        captured_payment = next(
            (p for p in order.payments if p.status == "CAPTURED" and p.razorpay_payment_id),
            None,
        )
        if not captured_payment:
            raise BusinessRuleViolationError("No captured online payment found for this order to refund.")

        refund_amount = amount if amount is not None else float(order.total_amount)
        if refund_amount > float(order.total_amount):
            raise BusinessRuleViolationError("Refund amount cannot exceed total order amount.")

        # Process gateway refund
        rfnd_res = await self.gateway.process_refund(
            gateway_payment_id=captured_payment.razorpay_payment_id,
            amount=refund_amount,
            notes={"order_number": order.order_number, "reason": reason},
        )

        captured_payment.refunded_amount = float(captured_payment.refunded_amount or 0.0) + refund_amount
        captured_payment.status = "REFUNDED"
        order.status = "REFUNDED"
        order.payment_status = "REFUNDED"

        await db.commit()

        return AdminRefundResponse(
            order_id=order.id,
            refund_id=rfnd_res.refund_id,
            refunded_amount=refund_amount,
            order_status=order.status,
            payment_status=order.payment_status,
            message="Refund processed successfully via Razorpay.",
        )
