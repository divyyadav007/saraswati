"""
Customer Addresses API Router.
Per docs/06-API-SPECIFICATION.md §6.4
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_current_user
from app.common.exceptions import NotFoundError
from app.db.models.auth import Address
from app.db.models.operations import StoreSetting
from app.db.session import get_db
from app.modules.auth.address_schemas import (
    AddressCreateRequest,
    AddressResponse,
    AddressUpdateRequest,
    ServiceabilityResponse,
)

address_router = APIRouter(prefix="/addresses", tags=["Addresses"])

# Default Barabanki Serviceable Pincodes (Urban & Semi-Urban)
DEFAULT_SERVICEABLE_PINCODES = {
    "225001",  # Barabanki Head Post Office
    "225002",  # Satrikh
    "225003",  # Rasauli
    "225122",  # Deva Sharif
    "225301",  # Haidergarh
    "225302",  # Zaidpur
    "225305",  # Ram Sanehi Ghat
    "225409",  # Fatehpur Barabanki
}


@address_router.get("/check-serviceability", response_model=ServiceabilityResponse)
async def check_serviceability(
    pincode: str = Query(..., min_length=6, max_length=6, pattern=r"^\d{6}$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if delivery is available for a given pincode.
    Publicly accessible endpoint for quick user feedback before checkout.
    """
    settings_res = await db.execute(select(StoreSetting).filter(StoreSetting.id == 1))
    setting = settings_res.scalar_one_or_none()

    serviceable_pins = (
        set(setting.serviceable_pincodes)
        if setting and setting.serviceable_pincodes
        else DEFAULT_SERVICEABLE_PINCODES
    )
    delivery_charge = float(setting.delivery_charge_flat) if setting else 40.0
    free_above = float(setting.free_delivery_above) if setting and setting.free_delivery_above else 500.0

    is_serviceable = pincode in serviceable_pins
    return ServiceabilityResponse(
        pincode=pincode,
        is_serviceable=is_serviceable,
        city="Barabanki",
        state="Uttar Pradesh",
        delivery_charge=delivery_charge,
        free_delivery_above=free_above,
        estimated_delivery="Same-day delivery (within 3–4 hours)" if is_serviceable else "Not serviceable yet",
    )


@address_router.get("", response_model=list[AddressResponse])
async def list_addresses(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all non-deleted addresses for the current user."""
    query = (
        select(Address)
        .filter(
            Address.user_id == current_user.user_id,
            Address.is_deleted.is_(False),
        )
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    result = await db.execute(query)
    addresses = result.scalars().all()
    return addresses


@address_router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new address for the current user."""
    # Check if this is the user's first address, make default if so
    count_res = await db.execute(
        select(Address).filter(Address.user_id == current_user.user_id, Address.is_deleted.is_(False))
    )
    existing = count_res.scalars().all()
    is_first = len(existing) == 0
    make_default = payload.is_default or is_first

    if make_default and existing:
        # Reset other default addresses
        await db.execute(
            update(Address)
            .filter(Address.user_id == current_user.user_id)
            .values(is_default=False)
        )

    new_address = Address(
        user_id=current_user.user_id,
        label=payload.label or "Home",
        recipient_name=payload.recipient_name,
        phone=payload.phone,
        line1=payload.line1,
        line2=payload.line2,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        landmark=payload.landmark,
        delivery_instructions=payload.delivery_instructions,
        is_default=make_default,
    )
    db.add(new_address)
    await db.commit()
    await db.refresh(new_address)
    return new_address


@address_router.patch("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: uuid.UUID,
    payload: AddressUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing address."""
    addr_res = await db.execute(
        select(Address).filter(
            Address.id == address_id,
            Address.user_id == current_user.user_id,
            Address.is_deleted.is_(False),
        )
    )
    address = addr_res.scalar_one_or_none()
    if not address:
        raise NotFoundError("Address not found.")

    update_data = payload.model_dump(exclude_unset=True)
    if "is_default" in update_data and update_data["is_default"]:
        await db.execute(
            update(Address)
            .filter(Address.user_id == current_user.user_id)
            .values(is_default=False)
        )

    for field, val in update_data.items():
        setattr(address, field, val)

    await db.commit()
    await db.refresh(address)
    return address


@address_router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete an address."""
    addr_res = await db.execute(
        select(Address).filter(
            Address.id == address_id,
            Address.user_id == current_user.user_id,
            Address.is_deleted.is_(False),
        )
    )
    address = addr_res.scalar_one_or_none()
    if not address:
        raise NotFoundError("Address not found.")

    address.is_deleted = True
    await db.commit()
    return None


@address_router.post("/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    address_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set address as default."""
    addr_res = await db.execute(
        select(Address).filter(
            Address.id == address_id,
            Address.user_id == current_user.user_id,
            Address.is_deleted.is_(False),
        )
    )
    address = addr_res.scalar_one_or_none()
    if not address:
        raise NotFoundError("Address not found.")

    await db.execute(
        update(Address)
        .filter(Address.user_id == current_user.user_id)
        .values(is_default=False)
    )
    address.is_default = True
    await db.commit()
    await db.refresh(address)
    return address
