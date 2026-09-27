"""
Payments API Router.
Per docs/06-API-SPECIFICATION.md §6.8 and docs/09-PAYMENTS.md
"""
import uuid

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user, require_admin
from app.db.session import get_db
from app.modules.payments.schemas import (
    AdminRefundRequest,
    AdminRefundResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.modules.payments.service import PaymentService

payment_router = APIRouter(prefix="/payments", tags=["Payments"])
admin_payment_router = APIRouter(prefix="/admin/orders", tags=["Admin — Payments & Refunds"])

_service = PaymentService()


@payment_router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(
    payload: PaymentVerifyRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify client-side Razorpay payment signature after successful checkout widget flow.
    Idempotent alongside webhook handling.
    """
    return await _service.verify_client_payment(
        payload=payload,
        user_id=current_user.user_id,
        db=db,
    )


@payment_router.post("/webhook/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay Webhook receiver (Source of Truth).
    No user auth — protected solely via raw body HMAC-SHA256 signature verification.
    """
    raw_body = await request.body()
    return await _service.handle_razorpay_webhook(
        raw_body=raw_body,
        signature_header=signature or "",
        db=db,
    )


@admin_payment_router.post("/{order_id}/refund", response_model=AdminRefundResponse)
async def process_order_refund(
    order_id: uuid.UUID,
    payload: AdminRefundRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-initiated refund via Razorpay for an online payment.
    Requires ADMIN role.
    """
    return await _service.process_admin_refund(
        order_id=order_id,
        amount=payload.amount,
        reason=payload.reason,
        db=db,
    )
