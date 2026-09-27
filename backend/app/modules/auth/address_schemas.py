"""
Addresses Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.4 and docs/05-DATABASE-SCHEMA.md §2.3
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AddressBase(BaseModel):
    label: str | None = Field(default="Home", description="Home, Work, Other")
    recipient_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=10, max_length=15, description="10-digit Indian mobile number")
    line1: str = Field(..., min_length=3, max_length=255)
    line2: str | None = Field(None, max_length=255)
    city: str = Field(default="Barabanki", max_length=100)
    state: str = Field(default="Uttar Pradesh", max_length=100)
    pincode: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    landmark: str | None = Field(None, max_length=150)
    delivery_instructions: str | None = Field(None, max_length=500)
    is_default: bool = Field(default=False)


class AddressCreateRequest(AddressBase):
    pass


class AddressUpdateRequest(BaseModel):
    label: str | None = None
    recipient_name: str | None = None
    phone: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = Field(None, min_length=6, max_length=6, pattern=r"^\d{6}$")
    landmark: str | None = None
    delivery_instructions: str | None = None
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    label: str | None = None
    recipient_name: str
    phone: str
    line1: str
    line2: str | None = None
    city: str
    state: str
    pincode: str
    landmark: str | None = None
    delivery_instructions: str | None = None
    is_default: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ServiceabilityResponse(BaseModel):
    pincode: str
    is_serviceable: bool
    city: str
    state: str
    delivery_charge: float
    free_delivery_above: float | None = None
    estimated_delivery: str
