"""
Rate limiting module using slowapi.
Per docs/08-SECURITY.md §6 and docs/20-AI-CODING-RULES.md.
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.common.response import error_response


def rate_limit_key_func(request: Request) -> str:
    """
    Generate rate limit key based on client IP or user authentication header.
    Falls back to remote address if user is unauthenticated.
    """
    # Check for forwarded client IP if behind proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


# Create global limiter with sensible default
limiter = Limiter(key_func=rate_limit_key_func, default_limits=["300/minute"])


async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Standardized HTTP 429 response obeying Saraswati error envelope specification.
    Per docs/22-ERROR-HANDLING.md §3.
    """
    return error_response(
        code="RATE_LIMITED",
        message="Too many requests. Please slow down and try again in a few moments.",
        status_code=429,
        details={"limit": str(exc.detail)},
    )
