"""
Public Bulk Enquiries Router.
Per docs/06-API-SPECIFICATION.md §6.10
"""
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, get_optional_current_user
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.modules.bulk_enquiries.schemas import (
    BulkEnquiryCreateRequest,
    BulkEnquiryResponse,
)
from app.modules.bulk_enquiries.service import BulkEnquiryService

bulk_enquiry_router = APIRouter(prefix="/bulk-enquiries", tags=["Bulk Enquiries"])


@bulk_enquiry_router.post("", response_model=BulkEnquiryResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def submit_bulk_enquiry(
    request: Request,
    payload: BulkEnquiryCreateRequest,
    current_user: AuthenticatedUser | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Public customer endpoint to submit a wedding or corporate bulk sweet enquiry.
    Authentication is optional.
    """
    user_id = current_user.user_id if current_user else None
    return await BulkEnquiryService.submit_enquiry(user_id=user_id, payload=payload, db=db)

