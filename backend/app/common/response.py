"""
Standard response/error envelope helpers.
Per docs/06-API-SPECIFICATION.md §4 and docs/22-ERROR-HANDLING.md
"""
from typing import Any

from fastapi import Request
from fastapi.responses import ORJSONResponse

from app.common.exceptions import SaraswatiError


def error_response(
    code: str,
    message: str,
    details: Any = None,
    status_code: int = 400,
) -> ORJSONResponse:
    """Construct a standard error response envelope."""
    return ORJSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
            }
        },
    )


def success_response(data: Any, status_code: int = 200) -> ORJSONResponse:
    """Construct a standard success response envelope."""
    return ORJSONResponse(status_code=status_code, content={"data": data})


# ── Global Exception Handlers ─────────────────────────────────────────────────
async def saraswati_exception_handler(request: Request, exc: SaraswatiError) -> ORJSONResponse:
    """
    Central handler for all SaraswatiError subclasses.
    Maps typed business exceptions to the standard error envelope.
    Per docs/21-CODING-CONVENTIONS.md §6.
    """
    return error_response(
        code=exc.error_code,
        message=exc.message,
        details=exc.details,
        status_code=exc.http_status,
    )


async def validation_exception_handler(request: Request, exc: Any) -> ORJSONResponse:
    """
    Handler for FastAPI/Pydantic RequestValidationError.
    Formats field-level validation errors into standard envelope.
    Per docs/22-ERROR-HANDLING.md §2.
    """
    errors_list = []
    for err in exc.errors():
        field_path = [str(item) for item in err.get("loc", []) if item != "body"]
        field_name = ".".join(field_path) if field_path else "body"
        errors_list.append(
            {
                "field": field_name,
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type", "value_error"),
            }
        )
    return error_response(
        code="VALIDATION_ERROR",
        message="Request validation failed.",
        details=errors_list,
        status_code=422,
    )


async def http_exception_handler(request: Request, exc: Any) -> ORJSONResponse:
    """
    Handler for Starlette/FastAPI HTTPException.
    Translates HTTP status codes into corresponding standard error codes.
    """
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHENTICATED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }
    code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    message = str(exc.detail) if exc.detail else "An error occurred."
    return error_response(
        code=code,
        message=message,
        status_code=exc.status_code,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
    """
    Catch-all for unhandled exceptions.
    NEVER exposes internal details — only a stable error code.
    Per docs/08-SECURITY.md §15 and docs/22-ERROR-HANDLING.md §3.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=exc,
    )
    return error_response(
        code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again.",
        details=str(exc),
        status_code=500,
    )


def register_exception_handlers(app: Any) -> None:
    """Register all standard error envelope exception handlers onto the FastAPI app."""
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    app.add_exception_handler(SaraswatiError, saraswati_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

