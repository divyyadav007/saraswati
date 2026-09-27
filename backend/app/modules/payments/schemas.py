"""
Payments Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.8 and docs/09-PAYMENTS.md
"""
import uuid

from pydantic import BaseModel, Field


class PaymentVerifyRequest(BaseModel):
    order_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool
    order_id: uuid.UUID
    order_number: str
    status: str
    payment_status: str
    amount: float
    message: str


class OnlineCheckoutDetails(BaseModel):
    order_id: uuid.UUID
    order_number: str
    total_amount: float
    razorpay_order_id: str
    razorpay_key_id: str
    currency: str = "INR"


class AdminRefundRequest(BaseModel):
    amount: float | None = Field(None, gt=0, description="Leave empty for full refund")
    reason: str = Field(default="Customer requested refund", max_length=255)


class AdminRefundResponse(BaseModel):
    order_id: uuid.UUID
    refund_id: str
    refunded_amount: float
    order_status: str
    payment_status: str
    message: str
