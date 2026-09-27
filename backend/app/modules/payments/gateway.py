"""
Payment Gateway Abstract Interface and Data Structures.
Per docs/04-ARCHITECTURE.md §9 and docs/09-PAYMENTS.md §11.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class GatewayOrderResult:
    gateway_order_id: str
    amount: float
    currency: str
    key_id: str
    raw_response: dict[str, Any] | None = None


@dataclass
class GatewayVerifyResult:
    is_valid: bool
    gateway_order_id: str
    gateway_payment_id: str
    error_message: str | None = None


@dataclass
class GatewayRefundResult:
    refund_id: str
    gateway_payment_id: str
    amount: float
    status: str
    raw_response: dict[str, Any] | None = None


class PaymentGateway(ABC):
    """Abstract interface for third-party payment providers (Razorpay, etc.)."""

    @abstractmethod
    async def create_order(
        self,
        amount: float,
        receipt: str,
        currency: str = "INR",
        notes: dict[str, str] | None = None,
    ) -> GatewayOrderResult:
        """Create a payment gateway order (amount in rupees, internally converted)."""
        pass

    @abstractmethod
    def verify_payment_signature(
        self,
        gateway_order_id: str,
        gateway_payment_id: str,
        signature: str,
    ) -> bool:
        """Verify client-returned HMAC SHA-256 signature."""
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        raw_body: bytes,
        signature_header: str,
    ) -> bool:
        """Verify webhook signature against raw request body."""
        pass

    @abstractmethod
    async def process_refund(
        self,
        gateway_payment_id: str,
        amount: float | None = None,
        notes: dict[str, str] | None = None,
    ) -> GatewayRefundResult:
        """Initiate full or partial refund with the gateway."""
        pass
