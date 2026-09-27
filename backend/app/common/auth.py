"""
Authentication & Authorization Dependencies.
Per docs/04-ARCHITECTURE.md §5 and docs/08-SECURITY.md §1–3.
"""
import logging
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

import jwt
from fastapi import Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ForbiddenError, UnauthenticatedError
from app.config import get_settings
from app.db.models.auth import Profile
from app.db.session import get_db

logger = logging.getLogger(__name__)
settings = get_settings()


class AuthenticatedUser(BaseModel):
    """
    Authenticated user identity extracted from verified JWT and database profile.
    Role is ALWAYS resolved server-side from profiles.role, never trusted from client claims.
    """
    user_id: uuid.UUID
    role: str = "CUSTOMER"
    email: str | None = None
    phone: str | None = None
    full_name: str | None = None
    is_active: bool = True

    model_config = {"frozen": True}


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    """
    Verify and decode a Supabase-issued JWT access token.
    Enforces signature verification and expiration check.
    Per docs/08-SECURITY.md §1.
    """
    if not token or not token.strip():
        raise UnauthenticatedError("Missing authentication token.")

    token = token.strip()

    # Local development bypass for web admin mock token
    if settings.is_development and token in ("mock-admin-token", "dev-admin-token", "admin-token"):
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "admin@saraswatisweets.com",
            "phone": "+919999999999",
            "user_metadata": {"full_name": "Saraswati Store Admin"},
            "role": "ADMIN",
        }
        
    # Local development bypass for customer mock token
    if settings.is_development and token in ("mock-customer-token", "dev-customer-token"):
        return {
            "sub": "00000000-0000-0000-0000-000000000002",
            "email": "customer@test.com",
            "phone": "+919999999999",
            "user_metadata": {"full_name": "Test Customer"},
            "role": "CUSTOMER",
        }

    try:
        # Determine verification strategy based on settings
        jwt_secret = settings.supabase_jwt_secret
        if jwt_secret:
            # Verified with configured HMAC secret
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_signature": True},
            )
        elif settings.is_development:
            # In local development without configured secret, allow decoding with warning
            logger.warning("SUPABASE_JWT_SECRET not configured; decoding token without signature verification in dev mode.")
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False},
            )
        else:
            logger.error("SUPABASE_JWT_SECRET is missing in non-development environment.")
            raise UnauthenticatedError("Authentication service configuration error.")

    except jwt.ExpiredSignatureError as e:
        raise UnauthenticatedError("Authentication token has expired.") from e
    except jwt.PyJWTError as e:
        logger.warning("JWT verification failed: %s", str(e))
        raise UnauthenticatedError("Invalid authentication token.") from e
    except Exception as e:
        logger.error("Unexpected error during JWT verification: %s", str(e))
        raise UnauthenticatedError("Authentication failed.") from e

    # Check expiration claim explicitly if present
    exp = payload.get("exp")
    if exp:
        now_ts = datetime.now(timezone.utc).timestamp()
        if now_ts > exp:
            raise UnauthenticatedError("Authentication token has expired.")

    return payload


def extract_bearer_token(authorization: str | None) -> str:
    """Extract raw bearer token from the Authorization header."""
    if not authorization:
        raise UnauthenticatedError("Missing Authorization header.")

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthenticatedError("Invalid Authorization header format. Expected 'Bearer <token>'.")

    token = parts[1].strip()
    if not token:
        raise UnauthenticatedError("Missing Bearer token.")

    return token


async def get_current_user(
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """
    FastAPI dependency that:
    1. Extracts and verifies the Supabase Bearer JWT.
    2. Resolves the user's role and status server-side from public.profiles.
    3. Enforces that deactivated accounts cannot access any authenticated endpoint.
    4. Attaches user context to request.state for structured access logging.
    """
    token = extract_bearer_token(authorization)
    payload = verify_supabase_jwt(token)

    sub = payload.get("sub") or payload.get("user_id")
    if not sub:
        raise UnauthenticatedError("Token missing subject identifier.")

    try:
        user_uuid = uuid.UUID(str(sub))
    except (ValueError, TypeError) as e:
        raise UnauthenticatedError("Invalid user identity in token.") from e


    # Extract user metadata/claims from JWT payload as fallback
    token_email = payload.get("email")
    token_phone = payload.get("phone")
    user_metadata = payload.get("user_metadata", {}) or {}
    token_full_name = user_metadata.get("full_name")

    # Authoritative server-side profile and role lookup
    if settings.is_development and str(user_uuid) == "00000000-0000-0000-0000-000000000001":
        user = AuthenticatedUser(
            user_id=user_uuid,
            role="ADMIN",
            email=token_email or "admin@saraswatisweets.com",
            phone=token_phone or "+919999999999",
            full_name=token_full_name or "Saraswati Store Admin",
            is_active=True,
        )
        request.state.user_id = str(user.user_id)
        request.state.user_role = user.role
        return user

    if settings.is_development and str(user_uuid) == "00000000-0000-0000-0000-000000000002":
        user = AuthenticatedUser(
            user_id=user_uuid,
            role="CUSTOMER",
            email=token_email or "customer@test.com",
            phone=token_phone or "+919999999999",
            full_name=token_full_name or "Test Customer",
            is_active=True,
        )
        request.state.user_id = str(user.user_id)
        request.state.user_role = user.role
        return user

    role = "CUSTOMER"
    is_active = True
    full_name = token_full_name
    email = token_email
    phone = token_phone

    try:
        stmt = select(Profile).where(Profile.id == user_uuid)
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile is not None:
            if not profile.is_active:
                raise ForbiddenError("User account has been deactivated.")

            role = profile.role or "CUSTOMER"
            is_active = profile.is_active
            full_name = profile.full_name or full_name
            email = profile.email or email
            phone = profile.phone or phone
    except ForbiddenError:
        raise
    except Exception as e:
        # If DB query fails, log error; in non-dev don't mask error, but don't crash without logging
        logger.error("Error looking up profile for user %s: %s", user_uuid, str(e))
        # Re-raise unless it's a specific handled case
        raise

    user = AuthenticatedUser(
        user_id=user_uuid,
        role=role,
        email=email,
        phone=phone,
        full_name=full_name,
        is_active=is_active,
    )

    # Attach to request.state for RequestLoggingMiddleware
    request.state.user_id = str(user.user_id)
    request.state.user_role = user.role

    return user


async def get_optional_current_user(
    request: Request,
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser | None:
    """
    FastAPI dependency for public endpoints that accept an optional user token.
    If no Authorization header is present, returns None.
    If an Authorization header is present, validates it and returns AuthenticatedUser.
    """
    if not authorization:
        return None

    return await get_current_user(request=request, authorization=authorization, db=db)


def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory that restricts endpoint access to specified roles.
    Raises ForbiddenError (HTTP 403) if the authenticated user's role is not authorized.
    Per docs/08-SECURITY.md §2.
    """
    roles_set = set(allowed_roles)

    async def role_checker(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role not in roles_set:
            logger.warning(
                "Access denied for user %s: has role '%s', required one of %s",
                current_user.user_id,
                current_user.role,
                list(roles_set),
            )
            raise ForbiddenError(f"Action requires one of the following roles: {', '.join(allowed_roles)}")
        return current_user

    return role_checker


# ── Common Role Dependencies ──────────────────────────────────────────────────
require_admin = require_role("ADMIN")
require_staff_or_admin = require_role("STAFF", "ADMIN")
require_customer = require_role("CUSTOMER", "STAFF", "ADMIN")
require_delivery = require_role("DELIVERY", "ADMIN")
