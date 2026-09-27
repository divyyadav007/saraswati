"""
Admin Bulk Enquiries Router.
Requires staff or admin privileges.
Per docs/06-API-SPECIFICATION.md §6.17
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.auth import AuthenticatedUser, require_staff_or_admin
from app.db.session import get_db
from app.modules.bulk_enquiries.schemas import (
    BulkEnquiryResponse,
    BulkEnquiryUpdateRequest,
    PaginatedBulkEnquiriesResponse,
)
from app.modules.bulk_enquiries.service import BulkEnquiryService

admin_bulk_enquiry_router = APIRouter(prefix="/admin/bulk-enquiries", tags=["Admin — Bulk Enquiries"])


@admin_bulk_enquiry_router.get("", response_model=PaginatedBulkEnquiriesResponse)
async def admin_list_bulk_enquiries(
    status: str | None = Query(default=None),
    enquiry_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await BulkEnquiryService.list_enquiries(
        status=status,
        enquiry_type=enquiry_type,
        page=page,
        page_size=page_size,
        db=db,
    )


@admin_bulk_enquiry_router.get("/{id}", response_model=BulkEnquiryResponse)
async def admin_get_bulk_enquiry(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await BulkEnquiryService.get_enquiry(id, db)


@admin_bulk_enquiry_router.patch("/{id}", response_model=BulkEnquiryResponse)
async def admin_update_bulk_enquiry(
    id: uuid.UUID,
    payload: BulkEnquiryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    return await BulkEnquiryService.update_enquiry(id, payload, db)


@admin_bulk_enquiry_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_bulk_enquiry(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_staff_or_admin),
):
    await BulkEnquiryService.delete_enquiry(id, db)
