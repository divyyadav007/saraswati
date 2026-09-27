"""
Delivery Slots Schemas and API Router.
Per docs/06-API-SPECIFICATION.md §6.5 and docs/14-DELIVERY-SYSTEM.md
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.orders import DeliverySlot
from app.db.session import get_db

delivery_slot_router = APIRouter(prefix="/delivery-slots", tags=["Delivery Slots"])


class DeliverySlotResponse(BaseModel):
    id: uuid.UUID
    slot_date: date
    start_time: str
    end_time: str
    label: str
    capacity: int
    booked_count: int
    is_available: bool
    status: str

    model_config = {"from_attributes": True}


# Pre-defined daily time windows for Barabanki sweetshop deliveries
STANDARD_SLOTS = [
    {
        "start_time": time(10, 0),
        "end_time": time(13, 0),
        "label": "Morning (10:00 AM – 1:00 PM)",
        "capacity": 25,
        "cutoff_hours_before": 1,
    },
    {
        "start_time": time(14, 0),
        "end_time": time(17, 0),
        "label": "Afternoon (2:00 PM – 5:00 PM)",
        "capacity": 25,
        "cutoff_hours_before": 1,
    },
    {
        "start_time": time(17, 30),
        "end_time": time(20, 30),
        "label": "Evening (5:30 PM – 8:30 PM)",
        "capacity": 35,
        "cutoff_hours_before": 1,
    },
]


async def ensure_slots_for_date(target_date: date, db: AsyncSession) -> list[DeliverySlot]:
    """
    Ensure delivery slots exist in DB for target_date.
    Auto-generates if not yet created.
    """
    res = await db.execute(
        select(DeliverySlot).filter(DeliverySlot.slot_date == target_date).order_by(DeliverySlot.start_time.asc())
    )
    existing = res.scalars().all()
    if existing:
        return list(existing)

    created_slots = []
    for s_def in STANDARD_SLOTS:
        # Cutoff: e.g. 1 hour before start time on the same date (in UTC)
        slot_dt = datetime.combine(target_date, s_def["start_time"]).replace(tzinfo=timezone.utc)
        cutoff_dt = slot_dt - timedelta(hours=s_def["cutoff_hours_before"])

        new_slot = DeliverySlot(
            id=uuid.uuid4(),
            slot_date=target_date,
            start_time=s_def["start_time"],
            end_time=s_def["end_time"],
            capacity=s_def["capacity"],
            booked_count=0,
            cutoff_at=cutoff_dt,
            status="ACTIVE",
        )
        db.add(new_slot)
        created_slots.append(new_slot)

    await db.commit()
    for s in created_slots:
        await db.refresh(s)
    return created_slots


@delivery_slot_router.get("", response_model=list[DeliverySlotResponse])
async def get_delivery_slots(
    date_param: date | None = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get available delivery slots for a given date (defaults to today).
    Filters out slots where cutoff time has passed or capacity is full.
    """
    today_utc = datetime.now(timezone.utc).date()
    target_date = date_param if date_param is not None else today_utc

    slots = await ensure_slots_for_date(target_date, db)
    now_utc = datetime.now(timezone.utc)

    response_items = []
    for slot in slots:
        # Check cutoff and capacity
        cutoff = slot.cutoff_at
        if cutoff.tzinfo is None:
            cutoff = cutoff.replace(tzinfo=timezone.utc)

        is_past_cutoff = (target_date == today_utc) and (now_utc > cutoff)
        is_full = slot.booked_count >= slot.capacity
        is_available = (not is_past_cutoff) and (not is_full) and (slot.status == "ACTIVE")

        start_str = slot.start_time.strftime("%I:%M %p")
        end_str = slot.end_time.strftime("%I:%M %p")

        window_name = "Morning" if slot.start_time.hour < 12 else ("Afternoon" if slot.start_time.hour < 17 else "Evening")
        response_items.append(
            DeliverySlotResponse(
                id=slot.id,
                slot_date=slot.slot_date,
                start_time=start_str,
                end_time=end_str,
                label=f"{window_name} ({start_str} – {end_str})",
                capacity=slot.capacity,
                booked_count=slot.booked_count,
                is_available=is_available,
                status=slot.status,
            )
        )

    return response_items
