"""
Razorpay Payment Gateway Adapter Implementation.
Connects with Razorpay API in test/production modes,
computes and verifies HMAC-SHA256 signatures, and provides mock dev fallbacks.
Per docs/09-PAYMENTS.md and docs/08-SECURITY.md.
"""
import hashlib
import hmac
import logging
import uuid

import httpx

from app.config import get_settings
from app.modules.payments.gateway import (
    GatewayOrderResult,
    GatewayRefundResult,
    PaymentGateway,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class RazorpayGateway(PaymentGateway):
    def __init__(
        self,
        key_id: str | None = None,
        key_secret: str | None = None,
        webhook_secret: str | None = None,
    ):
        self.key_id = key_id or settings.razorpay_key_id or "rzp_test_mock_key_id"
        self.key_secret = key_secret or settings.razorpay_key_secret or "mock_key_secret_32_chars_long!"
        self.webhook_secret = webhook_secret or settings.razorpay_webhook_secret or "mock_webhook_secret_32_chars!"
        self.api_base_url = "https://api.razorpay.com/v1"

    async def create_order(
        self,
        amount: float,
        receipt: str,
        currency: str = "INR",
        notes: dict[str, str] | None = None,
    ) -> GatewayOrderResult:
        """
        Creates a Razorpay order. Amount in INR is converted to paise (integer).
        If credentials are test/unconfigured in development, generates mock order response.
        """
        amount_paise = int(round(amount * 100))

        # Check if real configured keys exist
        if settings.razorpay_key_id and settings.razorpay_key_secret and not settings.razorpay_key_id.startswith("rzp_test_mock"):
            auth = (settings.razorpay_key_id, settings.razorpay_key_secret)
            payload = {
                "amount": amount_paise,
                "currency": currency,
                "receipt": receipt,
                "notes": notes or {},
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.api_base_url}/orders",
                    json=payload,
                    auth=auth,
                )
                if res.status_code != 200:
                    logger.error("Razorpay order creation failed: %s", res.text)
                    raise RuntimeError(f"Razorpay order creation failed: {res.text}")
                data = res.json()
                return GatewayOrderResult(
                    gateway_order_id=data["id"],
                    amount=amount,
                    currency=currency,
                    key_id=self.key_id,
                    raw_response=data,
                )
        else:
            # Local Development / Mock Mode
            mock_order_id = f"order_{uuid.uuid4().hex[:14]}"
            logger.info("Generated mock Razorpay order: %s for amount ₹%s", mock_order_id, amount)
            return GatewayOrderResult(
                gateway_order_id=mock_order_id,
                amount=amount,
                currency=currency,
                key_id=self.key_id,
                raw_response={"id": mock_order_id, "amount": amount_paise, "currency": currency},
            )

    def verify_payment_signature(
        self,
        gateway_order_id: str,
        gateway_payment_id: str,
        signature: str,
    ) -> bool:
        """
        Constant-time HMAC-SHA256 signature verification over (order_id + '|' + payment_id).
        """
        message = f"{gateway_order_id}|{gateway_payment_id}".encode()
        expected = hmac.new(
            self.key_secret.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()

        # In dev mode, if test signature matches either HMAC or mock format, allow
        if hmac.compare_digest(expected, signature):
            return True
        if settings.is_development and signature == f"mock_sig_{gateway_payment_id}":
            return True
        return False

    def verify_webhook_signature(
        self,
        raw_body: bytes,
        signature_header: str,
    ) -> bool:
        """
        Verifies Razorpay webhook X-Razorpay-Signature using webhook secret over raw request bytes.
        """
        if not signature_header:
            return False

        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        if hmac.compare_digest(expected, signature_header):
            return True
        if settings.is_development and signature_header.startswith("mock_webhook_sig"):
            return True
        return False

    async def process_refund(
        self,
        gateway_payment_id: str,
        amount: float | None = None,
        notes: dict[str, str] | None = None,
    ) -> GatewayRefundResult:
        """
        Initiates refund via Razorpay Refunds API.
        """
        amount_paise = int(round(amount * 100)) if amount is not None else None

        if settings.razorpay_key_id and settings.razorpay_key_secret and not settings.razorpay_key_id.startswith("rzp_test_mock"):
            auth = (settings.razorpay_key_id, settings.razorpay_key_secret)
            payload: dict = {"notes": notes or {}}
            if amount_paise:
                payload["amount"] = amount_paise

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.api_base_url}/payments/{gateway_payment_id}/refund",
                    json=payload,
                    auth=auth,
                )
                if res.status_code != 200:
                    raise RuntimeError(f"Razorpay refund failed: {res.text}")
                data = res.json()
                return GatewayRefundResult(
                    refund_id=data["id"],
                    gateway_payment_id=gateway_payment_id,
                    amount=float(data["amount"]) / 100.0,
                    status=data["status"],
                    raw_response=data,
                )
        else:
            mock_refund_id = f"rfnd_{uuid.uuid4().hex[:14]}"
            return GatewayRefundResult(
                refund_id=mock_refund_id,
                gateway_payment_id=gateway_payment_id,
                amount=amount or 0.0,
                status="processed",
                raw_response={"id": mock_refund_id, "status": "processed"},
            )
