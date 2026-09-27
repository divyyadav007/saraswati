"""
Auth API Router.
Per docs/06-API-SPECIFICATION.md §6.1
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import (
    AuthenticatedUser,
    get_current_user,
    require_admin,
    require_customer,
    require_delivery,
    require_staff_or_admin,
)
from app.common.response import success_response
from app.db.session import get_db
from app.modules.auth.schemas import (
    SyncProfileRequest,
    UpdateProfileRequest,
    UserProfileResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(tags=["Auth"])


@router.post(
    "/sync-profile",
    summary="Synchronize user profile",
    description="Idempotent endpoint called after login to create or update profile from verified Supabase identity.",
)
async def sync_profile(
    payload: SyncProfileRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync profile attributes for the authenticated user."""
    service = AuthService(db)
    profile = await service.sync_profile(
        user_id=current_user.user_id,
        data=payload,
        fallback_phone=current_user.phone,
        fallback_email=current_user.email,
    )
    profile_data = UserProfileResponse.model_validate(profile).model_dump(mode="json")
    return success_response(profile_data)


@router.get(
    "/me",
    summary="Get current user profile",
    description="Returns current authenticated user's profile and resolved role.",
)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve profile and role information for currently authenticated user."""
    service = AuthService(db)
    profile = await service.get_user_profile(current_user.user_id)
    profile_data = UserProfileResponse.model_validate(profile).model_dump(mode="json")
    return success_response(profile_data)


@router.patch(
    "/me",
    summary="Update current user profile",
    description="Updates allowed profile attributes (name, email) for authenticated user.",
)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile attributes for currently authenticated user."""
    service = AuthService(db)
    profile = await service.update_user_profile(current_user.user_id, payload)
    profile_data = UserProfileResponse.model_validate(profile).model_dump(mode="json")
    return success_response(profile_data)


# ── RBAC Verification Endpoints ───────────────────────────────────────────────



@router.get(
    "/verify-role/customer",
    summary="Verify CUSTOMER role access",
    description="Accessible by CUSTOMER, STAFF, or ADMIN roles.",
)
async def verify_customer(
    current_user: AuthenticatedUser = Depends(require_customer),
):
    return success_response({
        "message": "Customer access granted",
        "user_id": str(current_user.user_id),
        "role": current_user.role,
    })


@router.get(
    "/verify-role/staff",
    summary="Verify STAFF role access",
    description="Accessible by STAFF or ADMIN roles only.",
)
async def verify_staff(
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return success_response({
        "message": "Staff access granted",
        "user_id": str(current_user.user_id),
        "role": current_user.role,
    })


@router.get(
    "/verify-role/admin",
    summary="Verify ADMIN role access",
    description="Accessible by ADMIN role only.",
)
async def verify_admin(
    current_user: AuthenticatedUser = Depends(require_admin),
):
    return success_response({
        "message": "Admin access granted",
        "user_id": str(current_user.user_id),
        "role": current_user.role,
    })


@router.get(
    "/verify-role/delivery",
    summary="Verify DELIVERY role access",
    description="Accessible by DELIVERY or ADMIN roles.",
)
async def verify_delivery(
    current_user: AuthenticatedUser = Depends(require_delivery),
):
    return success_response({
        "message": "Delivery access granted",
        "user_id": str(current_user.user_id),
        "role": current_user.role,
    })

