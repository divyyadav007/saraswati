"""
HTTP Middlewares for Request Tracking and Structured Logging.
Per docs/23-OBSERVABILITY.md §1 and docs/08-SECURITY.md §8, §14.
"""
import logging
import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("saraswati.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates or propagates X-Request-Id,
    measures request execution duration, and emits structured log lines.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate unique correlation ID
        request_id = request.headers.get("X-Request-Id")
        if not request_id:
            request_id = str(uuid.uuid4())

        request.state.request_id = request_id

        start_time = time.perf_counter()
        response: Response

        try:
            response = await call_next(request)
        except Exception:
            # Exception will be captured by global exception handler, re-raise here
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "Request error: %s %s",
                request.method,
                request.url.path,
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "status_code": 500,
                },
            )
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Retrieve authenticated user info if attached during request processing
        user_id = getattr(request.state, "user_id", None)
        role = getattr(request.state, "user_role", None)

        # Log request lifecycle
        logger.info(
            "%s %s %d (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_id": str(user_id) if user_id else None,
                "role": role,
            },
        )

        response.headers["X-Request-Id"] = request_id
        return response
