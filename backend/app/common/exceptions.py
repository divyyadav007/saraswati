"""
Common exceptions for the Saraswati backend.
Business logic raises these; a central exception handler maps them to HTTP responses.
Per docs/21-CODING-CONVENTIONS.md §6 and docs/22-ERROR-HANDLING.md
"""
from typing import Any


class SaraswatiError(Exception):
    """Base exception for all application errors."""

    error_code: str = "INTERNAL_ERROR"
    http_status: int = 500

    def __init__(self, message: str = "An unexpected error occurred.", details: Any = None):
        self.message = message
        self.details = details
        super().__init__(message)


# ── Auth ──────────────────────────────────────────────────────────────────────
class UnauthenticatedError(SaraswatiError):
    error_code = "UNAUTHENTICATED"
    http_status = 401

    def __init__(self, message: str = "Authentication required."):
        super().__init__(message)


class ForbiddenError(SaraswatiError):
    error_code = "FORBIDDEN"
    http_status = 403

    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(message)


class NotFoundError(SaraswatiError):
    error_code = "NOT_FOUND"
    http_status = 404

    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(message)


class ValidationError(SaraswatiError):
    error_code = "VALIDATION_ERROR"
    http_status = 400

    def __init__(self, message: str = "Validation failed.", details: Any = None):
        super().__init__(message, details)


class BusinessRuleViolationError(SaraswatiError):
    error_code = "BUSINESS_RULE_VIOLATION"
    http_status = 400

    def __init__(self, message: str = "Operation cannot be completed.", details: Any = None):
        super().__init__(message, details)


class ConflictError(SaraswatiError):
    error_code = "CONFLICT"
    http_status = 409

    def __init__(self, message: str = "Resource conflict occurred.", details: Any = None):
        super().__init__(message, details)


# ── Catalogue ─────────────────────────────────────────────────────────────────
class VariantOutOfStockError(SaraswatiError):
    error_code = "VARIANT_OUT_OF_STOCK"
    http_status = 409

    def __init__(self, message: str = "This product variant is currently out of stock."):
        super().__init__(message)


# ── Checkout / Delivery ───────────────────────────────────────────────────────
class PincodeNotServiceableError(SaraswatiError):
    error_code = "PINCODE_NOT_SERVICEABLE"
    http_status = 400

    def __init__(self, pincode: str = ""):
        super().__init__(
            f"Delivery is not available to pincode {pincode}." if pincode
            else "Delivery is not available to this pincode."
        )


class SlotFullError(SaraswatiError):
    error_code = "SLOT_FULL"
    http_status = 409

    def __init__(self, message: str = "This delivery slot is no longer available. Please choose another."):
        super().__init__(message)


class SlotCutoffPassedError(SaraswatiError):
    error_code = "SLOT_CUTOFF_PASSED"
    http_status = 409

    def __init__(self, message: str = "The cutoff time for this delivery slot has passed."):
        super().__init__(message)


class DuplicateRequestError(SaraswatiError):
    error_code = "DUPLICATE_REQUEST"
    http_status = 200  # Idempotent replay — return original result

    def __init__(self, message: str = "Duplicate request detected. Returning original result."):
        super().__init__(message)


class CodNotAllowedError(SaraswatiError):
    error_code = "COD_NOT_ALLOWED"
    http_status = 400

    def __init__(self, message: str = "Cash on Delivery is not available for this order."):
        super().__init__(message)


# ── Coupons ───────────────────────────────────────────────────────────────────
class CouponInvalidError(SaraswatiError):
    error_code = "COUPON_INVALID"
    http_status = 400

    def __init__(self, message: str = "This coupon code is invalid or inactive."):
        super().__init__(message)


class CouponExpiredError(SaraswatiError):
    error_code = "COUPON_EXPIRED"
    http_status = 400

    def __init__(self, message: str = "This coupon has expired."):
        super().__init__(message)


class CouponMinOrderNotMetError(SaraswatiError):
    error_code = "COUPON_MIN_ORDER_NOT_MET"
    http_status = 400

    def __init__(self, min_value: float = 0):
        super().__init__(
            f"A minimum order value of ₹{min_value:.0f} is required to use this coupon."
        )


class CouponUsageLimitReachedError(SaraswatiError):
    error_code = "COUPON_USAGE_LIMIT_REACHED"
    http_status = 409

    def __init__(self, message: str = "This coupon's usage limit has been reached."):
        super().__init__(message)


# ── Orders ────────────────────────────────────────────────────────────────────
class InvalidStatusTransitionError(SaraswatiError):
    error_code = "INVALID_STATUS_TRANSITION"
    http_status = 409

    def __init__(self, from_status: str = "", to_status: str = ""):
        msg = (
            f"Cannot transition order from '{from_status}' to '{to_status}'."
            if from_status and to_status
            else "Invalid order status transition."
        )
        super().__init__(msg)


# ── Payments ──────────────────────────────────────────────────────────────────
class PaymentSignatureInvalidError(SaraswatiError):
    error_code = "PAYMENT_SIGNATURE_INVALID"
    http_status = 400

    def __init__(self, message: str = "Payment signature verification failed."):
        super().__init__(message)


class PaymentAlreadyProcessedError(SaraswatiError):
    error_code = "PAYMENT_ALREADY_PROCESSED"
    http_status = 200  # Idempotent no-op

    def __init__(self, message: str = "This payment has already been processed."):
        super().__init__(message)


# ── Rate Limiting ─────────────────────────────────────────────────────────────
class RateLimitedError(SaraswatiError):
    error_code = "RATE_LIMITED"
    http_status = 429

    def __init__(self, message: str = "Too many requests. Please try again later."):
        super().__init__(message)
