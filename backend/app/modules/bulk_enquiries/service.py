"""
Bulk Order Enquiries Service Layer.
Manages customer wedding/corporate bulk enquiry intake and admin pipeline progression.
Per docs/06-API-SPECIFICATION.md §6.10, §6.17 and docs/03-FEATURE-SPECIFICATION.md §6.5
"""
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError
from app.db.models.operations import BulkOrderEnquiry
from app.modules.bulk_enquiries.schemas import (
    BulkEnquiryCreateRequest,
    BulkEnquiryResponse,
    BulkEnquiryUpdateRequest,
    PaginatedBulkEnquiriesResponse,
)


class BulkEnquiryService:

    @staticmethod
    async def submit_enquiry(
        user_id: uuid.UUID | None,
        payload: BulkEnquiryCreateRequest,
        db: AsyncSession,
    ) -> BulkEnquiryResponse:
        enquiry = BulkOrderEnquiry(
            user_id=user_id,
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            email=payload.email.strip() if payload.email else None,
            enquiry_type=payload.enquiry_type,
            event_date=payload.event_date,
            estimated_quantity=payload.estimated_quantity.strip() if payload.estimated_quantity else None,
            items_of_interest=payload.items_of_interest.strip() if payload.items_of_interest else None,
            message=payload.message.strip() if payload.message else None,
            status="NEW",
        )
        db.add(enquiry)
        await db.commit()
        await db.refresh(enquiry)

        # Send notification to user if logged in
        if user_id:
            try:
                from app.modules.notifications.service import NotificationService
                await NotificationService.dispatch_order_status_notification(
                    user_id=user_id,
                    order_number=f"ENQ-{enquiry.id.hex[:6].upper()}",
                    status_title="Bulk Enquiry Received",
                    status_message="We have received your bulk sweet enquiry. Our team will contact you shortly with custom packaging and special pricing.",
                    db=db,
                )
            except Exception:
                pass

        return BulkEnquiryResponse.model_validate(enquiry)

    @staticmethod
    async def list_enquiries(
        status: str | None,
        enquiry_type: str | None,
        page: int,
        page_size: int,
        db: AsyncSession,
    ) -> PaginatedBulkEnquiriesResponse:
        query = select(BulkOrderEnquiry)
        count_query = select(func.count(BulkOrderEnquiry.id))

        if status:
            query = query.filter(BulkOrderEnquiry.status == status)
            count_query = count_query.filter(BulkOrderEnquiry.status == status)
        if enquiry_type:
            query = query.filter(BulkOrderEnquiry.enquiry_type == enquiry_type)
            count_query = count_query.filter(BulkOrderEnquiry.enquiry_type == enquiry_type)

        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        query = query.order_by(BulkOrderEnquiry.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        res = await db.execute(query)
        enquiries = res.scalars().all()

        items = [BulkEnquiryResponse.model_validate(e) for e in enquiries]

        return PaginatedBulkEnquiriesResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get_enquiry(enquiry_id: uuid.UUID, db: AsyncSession) -> BulkEnquiryResponse:
        res = await db.execute(select(BulkOrderEnquiry).filter(BulkOrderEnquiry.id == enquiry_id))
        enquiry = res.scalar_one_or_none()
        if not enquiry:
            raise NotFoundError(f"Bulk enquiry with ID {enquiry_id} not found.")

        return BulkEnquiryResponse.model_validate(enquiry)

    @staticmethod
    async def update_enquiry(
        enquiry_id: uuid.UUID,
        payload: BulkEnquiryUpdateRequest,
        db: AsyncSession,
    ) -> BulkEnquiryResponse:
        res = await db.execute(select(BulkOrderEnquiry).filter(BulkOrderEnquiry.id == enquiry_id))
        enquiry = res.scalar_one_or_none()
        if not enquiry:
            raise NotFoundError(f"Bulk enquiry with ID {enquiry_id} not found.")

        if payload.status is not None:
            enquiry.status = payload.status
        if payload.admin_notes is not None:
            enquiry.admin_notes = payload.admin_notes.strip() if payload.admin_notes else None

        await db.commit()
        await db.refresh(enquiry)
        return BulkEnquiryResponse.model_validate(enquiry)

    @staticmethod
    async def delete_enquiry(enquiry_id: uuid.UUID, db: AsyncSession) -> None:
        res = await db.execute(select(BulkOrderEnquiry).filter(BulkOrderEnquiry.id == enquiry_id))
        enquiry = res.scalar_one_or_none()
        if not enquiry:
            raise NotFoundError(f"Bulk enquiry with ID {enquiry_id} not found.")

        await db.delete(enquiry)
        await db.commit()
