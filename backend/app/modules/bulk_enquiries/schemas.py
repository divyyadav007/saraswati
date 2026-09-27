"""
Bulk Order Enquiries Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.10, §6.17 and docs/03-FEATURE-SPECIFICATION.md §6.5
"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class BulkEnquiryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: str | None = Field(None, max_length=255)
    enquiry_type: str = Field(default="BULK", pattern=r"^(BULK|CORPORATE|WEDDING|OTHER)$")
    event_date: date | None = None
    estimated_quantity: str | None = Field(None, max_length=100)
    items_of_interest: str | None = Field(None, max_length=500)
    message: str | None = Field(None, max_length=2000)


class BulkEnquiryUpdateRequest(BaseModel):
    status: str | None = Field(None, pattern=r"^(NEW|CONTACTED|QUOTED|WON|LOST)$")
    admin_notes: str | None = Field(None, max_length=2000)


class BulkEnquiryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    name: str
    phone: str
    email: str | None = None
    enquiry_type: str
    event_date: date | None = None
    estimated_quantity: str | None = None
    items_of_interest: str | None = None
    message: str | None = None
    status: str
    admin_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBulkEnquiriesResponse(BaseModel):
    items: list[BulkEnquiryResponse]
    total: int
    page: int
    page_size: int
