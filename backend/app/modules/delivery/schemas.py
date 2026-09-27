"""
Delivery Partners and Delivery Assignments Schemas.
Per docs/06-API-SPECIFICATION.md §6.14, §6.18 and docs/14-DELIVERY-SYSTEM.md
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DeliveryPartnerCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,13}$")
    is_active: bool = True


class DeliveryPartnerUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,13}$")
    is_active: bool | None = None


class DeliveryPartnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    is_active: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AssignDeliveryRequest(BaseModel):
    delivery_partner_id: uuid.UUID
    notes: str | None = Field(None, max_length=500)


class DeliveryAssignmentBrief(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    delivery_partner_id: uuid.UUID
    partner_name: str
    partner_phone: str
    assigned_at: datetime
    delivered_at: datetime | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}
