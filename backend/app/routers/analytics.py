from typing import List, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import datetime as dt

from app.core.db import get_db
from app.models import Payment, PaymentStatus, Session, Slot

router = APIRouter(prefix="/analytics", tags=["analytics"])


class PaymentsSummary(BaseModel):
    total_revenue: float
    paid_count: int
    pending_amount: float
    failed_count: int


@router.get("/payments/summary", response_model=PaymentsSummary)
async def payments_summary(db: AsyncSession = Depends(get_db)):
    # total revenue = sum captured
    total_res = await db.execute(select(func.coalesce(func.sum(Payment.amount_captured), 0)))
    total_revenue = float(total_res.scalar_one() or 0.0)
    paid_res = await db.execute(select(func.count()).where(Payment.status == PaymentStatus.captured))
    paid_count = int(paid_res.scalar_one() or 0)
    pending_res = await db.execute(select(func.coalesce(func.sum(Payment.amount_authorized), 0)).where(Payment.status == PaymentStatus.preauth_ok))
    pending_amount = float(pending_res.scalar_one() or 0.0)
    failed_res = await db.execute(select(func.count()).where(Payment.status == PaymentStatus.cancelled))
    failed_count = int(failed_res.scalar_one() or 0)
    return PaymentsSummary(
        total_revenue=total_revenue,
        paid_count=paid_count,
        pending_amount=pending_amount,
        failed_count=failed_count,
    )


class RevenuePoint(BaseModel):
    date: str
    amount: float


@router.get("/revenue/daily", response_model=List[RevenuePoint])
async def revenue_daily(days: int = 30, db: AsyncSession = Depends(get_db)):
    # group by date on created_at for captured payments
    res = await db.execute(
        select(func.date(Payment.created_at).label("d"), func.coalesce(func.sum(Payment.amount_captured), 0))
        .where(Payment.status == PaymentStatus.captured)
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at).desc())
        .limit(days)
    )
    rows = res.all()
    points = [RevenuePoint(date=str(d), amount=float(a or 0.0)) for d, a in rows]
    # reverse to chronological
    return list(reversed(points))


class OccupancyPoint(BaseModel):
    date: str
    occupancy: float  # percentage 0..100


@router.get("/occupancy/daily", response_model=List[OccupancyPoint])
async def occupancy_daily(days: int = 30, db: AsyncSession = Depends(get_db)):
    # total capacity across all slots
    cap_res = await db.execute(select(func.coalesce(func.sum(Slot.capacity), 0)))
    total_capacity = int(cap_res.scalar_one() or 0)

    if total_capacity <= 0:
        # No capacity defined; return zeros
        today = dt.datetime.utcnow().date()
        start_date = today - dt.timedelta(days=max(days - 1, 0))
        out = []
        d = start_date
        while d <= today:
            out.append(OccupancyPoint(date=str(d), occupancy=0.0))
            d += dt.timedelta(days=1)
        return out

    # Range in UTC
    today = dt.datetime.utcnow().date()
    start_date = today - dt.timedelta(days=max(days - 1, 0))
    start_dt = dt.datetime.combine(start_date, dt.time.min, tzinfo=dt.timezone.utc)
    end_dt = dt.datetime.combine(today + dt.timedelta(days=1), dt.time.min, tzinfo=dt.timezone.utc)

    # Fetch sessions overlapping the range: started before end and (ended_at is null or ended after start)
    sess_res = await db.execute(
        select(Session.session_id, Session.started_at, Session.ended_at)
        .where(Session.started_at != None)
        .where(Session.started_at < end_dt)
        .where((Session.ended_at == None) | (Session.ended_at > start_dt))
    )
    sessions = sess_res.all()

    # Build daily buckets
    out: List[OccupancyPoint] = []
    day_ptr = start_date
    while day_ptr <= today:
        day_start = dt.datetime.combine(day_ptr, dt.time.min, tzinfo=dt.timezone.utc)
        day_end = day_start + dt.timedelta(days=1)
        total_occupied_seconds = 0.0
        now_utc = dt.datetime.now(dt.timezone.utc)
        for _, s_start, s_end in sessions:
            s_start = s_start if s_start.tzinfo else s_start.replace(tzinfo=dt.timezone.utc)
            s_end = (s_end if s_end is not None else now_utc)
            s_end = s_end if s_end.tzinfo else s_end.replace(tzinfo=dt.timezone.utc)
            # Overlap of [s_start, s_end) with [day_start, day_end)
            overlap_start = max(s_start, day_start)
            overlap_end = min(s_end, day_end)
            if overlap_end > overlap_start:
                total_occupied_seconds += (overlap_end - overlap_start).total_seconds()

        denom = total_capacity * 24 * 3600
        occ = 0.0 if denom <= 0 else min(100.0, (total_occupied_seconds / denom) * 100.0)
        out.append(OccupancyPoint(date=str(day_ptr), occupancy=round(occ, 2)))
        day_ptr += dt.timedelta(days=1)

    return out
