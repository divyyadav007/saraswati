"""
Saraswati Backend — FastAPI Application Entry Point.
Modular monolith backend for Saraswati Sweetshop.
Per docs/04-ARCHITECTURE.md and docs/08-SECURITY.md
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.common.logging import setup_logging
from app.common.middleware import RequestLoggingMiddleware
from app.common.rate_limit import custom_rate_limit_exceeded_handler, limiter
from app.common.response import register_exception_handlers
from app.config import get_settings
from app.db.session import async_session_maker
from app.modules.admin.customers_router import admin_customers_router
from app.modules.analytics.router import admin_analytics_router
from app.modules.auth.address_router import address_router
from app.modules.auth.router import router as auth_router
from app.modules.bulk_enquiries.admin_router import admin_bulk_enquiry_router
from app.modules.bulk_enquiries.router import bulk_enquiry_router
from app.modules.cart.router import cart_router
from app.modules.catalog.admin_router import admin_catalog_router
from app.modules.catalog.router import router as catalog_router
from app.modules.coupons.admin_router import admin_coupon_router
from app.modules.coupons.router import coupon_router
from app.modules.delivery.admin_router import admin_delivery_router
from app.modules.delivery.router import delivery_slot_router
from app.modules.gift_hampers.admin_router import admin_gift_hamper_router
from app.modules.gift_hampers.router import gift_hamper_router
from app.modules.notifications.router import notification_router
from app.modules.offers_banners.admin_router import admin_offers_banners_router
from app.modules.offers_banners.router import offers_banners_router
from app.modules.orders.admin_router import admin_orders_router
from app.modules.orders.router import checkout_router, orders_router
from app.modules.payments.router import admin_payment_router, payment_router
from app.modules.reviews.admin_router import admin_review_router
from app.modules.reviews.router import review_router
from app.modules.store_settings.router import admin_store_settings_router

settings = get_settings()

# ── Structured Logging ────────────────────────────────────────────────────────
setup_logging(settings.log_level)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(
        "Starting Saraswati backend",
        extra={"environment": settings.environment},
    )
    yield
    logger.info("Shutting down Saraswati backend")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Saraswati API",
    description="Backend API for Saraswati Sweetshop — online ordering platform.",
    version="0.1.0",
    # Disable interactive docs in production per docs/08-SECURITY.md §3
    docs_url="/api/v1/docs" if not settings.is_production else None,
    redoc_url="/api/v1/redoc" if not settings.is_production else None,
    openapi_url="/api/v1/openapi.json" if not settings.is_production else None,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# ── Global Exception Handlers ─────────────────────────────────────────────────
register_exception_handlers(app)

# ── Middlewares (order matters: outer wraps inner) ────────────────────────────
# 1. Request correlation ID & JSON access logging
app.add_middleware(RequestLoggingMiddleware)

# 2. CORS: explicit origin allowlist per docs/08-SECURITY.md §8
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"],
    expose_headers=["X-Request-Id"],
)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get(
    "/healthz",
    tags=["System"],
    summary="Health check",
    response_description="Service health status",
)
@app.get(
    "/health",
    tags=["System"],
    summary="Health check (alias)",
    response_description="Service health status",
    include_in_schema=False,
)
async def health_check():
    """
    Lightweight health and readiness check endpoint.
    Verifies service process is running and checks database connectivity.
    Per docs/23-OBSERVABILITY.md §6.
    """
    db_status = "unconfigured"
    if settings.database_url:
        try:
            async def _check_db():
                async with async_session_maker() as session:
                    await session.execute(text("SELECT 1"))

            await asyncio.wait_for(_check_db(), timeout=2.0)
            db_status = "connected"
        except Exception as e:
            logger.warning("Database health check ping failed: %s", str(e))
            db_status = "disconnected"

    return {
        "status": "ok",
        "environment": settings.environment,
        "database": db_status,
        "version": app.version,
    }


# ── API v1 Router Registration ────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(address_router, prefix="/api/v1")
app.include_router(delivery_slot_router, prefix="/api/v1")
app.include_router(cart_router, prefix="/api/v1")
app.include_router(checkout_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(admin_orders_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
app.include_router(admin_catalog_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(admin_payment_router, prefix="/api/v1")
app.include_router(admin_delivery_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")
app.include_router(coupon_router, prefix="/api/v1")
app.include_router(admin_coupon_router, prefix="/api/v1")
app.include_router(offers_banners_router, prefix="/api/v1")
app.include_router(admin_offers_banners_router, prefix="/api/v1")
app.include_router(review_router, prefix="/api/v1")
app.include_router(admin_review_router, prefix="/api/v1")
app.include_router(gift_hamper_router, prefix="/api/v1")
app.include_router(admin_gift_hamper_router, prefix="/api/v1")
app.include_router(bulk_enquiry_router, prefix="/api/v1")
app.include_router(admin_bulk_enquiry_router, prefix="/api/v1")
app.include_router(admin_analytics_router, prefix="/api/v1")
app.include_router(admin_customers_router, prefix="/api/v1")
app.include_router(admin_store_settings_router, prefix="/api/v1")
