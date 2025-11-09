from typing import Optional
import uuid
import datetime as dt

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import (
    Session as SessionModel,
    Booking,
    BookingStatus,
    ValidationMethod,
    Payment,
    PaymentStatus,
    Slot,
    EventsOutbox,
)


router = APIRouter(prefix="/sessions", tags=["sessions"])


class StartRequest(BaseModel):
    booking_id: str
    validation_method: Optional[str] = Field(default=None, pattern="^(qr|nfc|plate)$")
    bay_label: Optional[str] = None
    grace_minutes: int = Field(default=15, ge=0, le=240)


class SessionResponse(BaseModel):
    session_id: str
    booking_id: Optional[str]
    started_at: Optional[str]
    ended_at: Optional[str]
    validation_method: Optional[str]
    bay_label: Optional[str]
    grace_ends_at: Optional[str]


@router.get("/live", response_model=list[SessionResponse])
async def live(limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Return active (not ended) sessions for provider UI."""
    res = await db.execute(
        select(SessionModel)
        .where(SessionModel.ended_at.is_(None))
        .order_by(SessionModel.started_at.desc())
        .limit(limit)
    )
    rows = res.scalars().all()
    return [
        SessionResponse(
            session_id=s.session_id,
            booking_id=s.booking_id,
            started_at=s.started_at.isoformat() if s.started_at else None,
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
            validation_method=s.validation_method.value if s.validation_method else None,
            bay_label=s.bay_label,
            grace_ends_at=s.grace_ends_at.isoformat() if s.grace_ends_at else None,
        )
        for s in rows
    ]


@router.post("/start", response_model=SessionResponse)
async def start(req: StartRequest, db: AsyncSession = Depends(get_db)):
    # Validate booking exists
    res = await db.execute(select(Booking).where(Booking.booking_id == req.booking_id))
    b = res.scalar_one_or_none()
    if b is None:
        raise HTTPException(status_code=404, detail="booking not found")
    # Booking must be held or confirmed to start; transition to active
    if b.status not in (BookingStatus.held, BookingStatus.confirmed, BookingStatus.active):
        raise HTTPException(status_code=409, detail="booking not in startable state")
    now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
    grace_ends = now + dt.timedelta(minutes=req.grace_minutes)
    sess = SessionModel(
        session_id=str(uuid.uuid4()),
        booking_id=b.booking_id,
        started_at=now,
        ended_at=None,
        validation_method=ValidationMethod(req.validation_method) if req.validation_method else None,
        bay_label=req.bay_label,
        grace_ends_at=grace_ends,
    )
    db.add(sess)
    await db.execute(
        update(Booking)
        .where(Booking.booking_id == b.booking_id)
        .values(status=BookingStatus.active)
    )
    await db.commit()
    return SessionResponse(
        session_id=sess.session_id,
        booking_id=sess.booking_id,
        started_at=sess.started_at.isoformat() if sess.started_at else None,
        ended_at=None,
        validation_method=sess.validation_method.value if sess.validation_method else None,
        bay_label=sess.bay_label,
        grace_ends_at=sess.grace_ends_at.isoformat() if sess.grace_ends_at else None,
    )


class ValidateRequest(BaseModel):
    validation_method: str = Field(pattern="^(qr|nfc|plate)$")
    bay_label: Optional[str] = None


@router.post("/{session_id}/validate", response_model=SessionResponse)
async def validate(session_id: str, req: ValidateRequest, db: AsyncSession = Depends(get_db)):
    # Update validation on the session
    res = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess = res.scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="session not found")
    await db.execute(
        update(SessionModel)
        .where(SessionModel.session_id == session_id)
        .values(validation_method=ValidationMethod(req.validation_method), bay_label=req.bay_label)
    )

    # Emit session.validated event and simulate preauth creation if missing
    booking_id = sess.booking_id
    if booking_id:
        # Ensure a payment exists; if not, create a preauth based on current slot dynamic price
        pay_res = await db.execute(select(Payment).where(Payment.booking_id == booking_id))
        payment = pay_res.scalar_one_or_none()
        if payment is None:
            # Find slot price
            b_res = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
            b = b_res.scalar_one_or_none()
            amount = None
            if b and b.slot_id:
                s_res = await db.execute(select(Slot).where(Slot.slot_id == b.slot_id))
                s = s_res.scalar_one_or_none()
                if s:
                    amount = float(s.dynamic_price)
            payment = Payment(
                payment_id=str(uuid.uuid4()),
                booking_id=booking_id,
                amount_authorized=amount if amount is not None else 0.0,
                amount_captured=None,
                status=PaymentStatus.preauth_ok,
            )
            db.add(payment)
            # outbox payment.preauth_ok
            db.add(EventsOutbox(
                event_id=str(uuid.uuid4()),
                event_type="payment.preauth_ok",
                payload={
                    "booking_id": booking_id,
                    "payment_id": payment.payment_id,
                    "amount_authorized": float(payment.amount_authorized or 0.0),
                    "at": dt.datetime.utcnow().isoformat(),
                },
            ))
        # session.validated event
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="session.validated",
            payload={
                "session_id": session_id,
                "booking_id": booking_id,
                "method": req.validation_method,
                "bay_label": req.bay_label,
                "at": dt.datetime.utcnow().isoformat(),
            },
        ))

    await db.commit()
    # reload
    res2 = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess2 = res2.scalar_one()
    return SessionResponse(
        session_id=sess2.session_id,
        booking_id=sess2.booking_id,
        started_at=sess2.started_at.isoformat() if sess2.started_at else None,
        ended_at=sess2.ended_at.isoformat() if sess2.ended_at else None,
        validation_method=sess2.validation_method.value if sess2.validation_method else None,
        bay_label=sess2.bay_label,
        grace_ends_at=sess2.grace_ends_at.isoformat() if sess2.grace_ends_at else None,
    )


class ExtendRequest(BaseModel):
    minutes: Optional[int] = Field(default=None, ge=1, le=720)
    grace_until: Optional[str] = None  # ISO


@router.post("/{session_id}/extend", response_model=SessionResponse)
async def extend(session_id: str, req: ExtendRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess = res.scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="session not found")
    if req.minutes is None and not req.grace_until:
        raise HTTPException(status_code=400, detail="provide minutes or grace_until")
    if req.minutes is not None:
        base = sess.grace_ends_at or dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
        new_grace = base + dt.timedelta(minutes=req.minutes)
    else:
        new_grace = dt.datetime.fromisoformat(req.grace_until.replace("Z", "+00:00"))  # type: ignore
    await db.execute(
        update(SessionModel)
        .where(SessionModel.session_id == session_id)
        .values(grace_ends_at=new_grace)
    )
    await db.commit()
    # reload
    res2 = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess2 = res2.scalar_one()
    return SessionResponse(
        session_id=sess2.session_id,
        booking_id=sess2.booking_id,
        started_at=sess2.started_at.isoformat() if sess2.started_at else None,
        ended_at=sess2.ended_at.isoformat() if sess2.ended_at else None,
        validation_method=sess2.validation_method.value if sess2.validation_method else None,
        bay_label=sess2.bay_label,
        grace_ends_at=sess2.grace_ends_at.isoformat() if sess2.grace_ends_at else None,
    )


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end(session_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess = res.scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=404, detail="session not found")
    now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
    await db.execute(
        update(SessionModel)
        .where(SessionModel.session_id == session_id)
        .values(ended_at=now)
    )
    # Try to complete booking as well
    if sess.booking_id:
        await db.execute(
            update(Booking)
            .where(Booking.booking_id == sess.booking_id)
            .values(status=BookingStatus.completed)
        )
        # Simulate capture on end: capture current slot dynamic price
        b_res = await db.execute(select(Booking).where(Booking.booking_id == sess.booking_id))
        b = b_res.scalar_one_or_none()
        final_amount = 0.0
        if b and b.slot_id:
            s_res = await db.execute(select(Slot).where(Slot.slot_id == b.slot_id))
            s = s_res.scalar_one_or_none()
            if s:
                final_amount = float(s.dynamic_price)
        # ensure a payment exists
        p_res = await db.execute(select(Payment).where(Payment.booking_id == sess.booking_id))
        payment = p_res.scalar_one_or_none()
        if payment is None:
            payment = Payment(
                payment_id=str(uuid.uuid4()),
                booking_id=sess.booking_id,
                amount_authorized=final_amount,
                amount_captured=final_amount,
                status=PaymentStatus.captured,
            )
            db.add(payment)
        else:
            await db.execute(
                update(Payment)
                .where(Payment.payment_id == payment.payment_id)
                .values(amount_captured=final_amount, status=PaymentStatus.captured)
            )
        # outbox payment.captured
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="payment.captured",
            payload={
                "booking_id": sess.booking_id,
                "payment_id": payment.payment_id,
                "amount_captured": final_amount,
                "at": dt.datetime.utcnow().isoformat(),
            },
        ))
    await db.commit()
    # reload
    res2 = await db.execute(select(SessionModel).where(SessionModel.session_id == session_id))
    sess2 = res2.scalar_one()
    return SessionResponse(
        session_id=sess2.session_id,
        booking_id=sess2.booking_id,
        started_at=sess2.started_at.isoformat() if sess2.started_at else None,
        ended_at=sess2.ended_at.isoformat() if sess2.ended_at else None,
        validation_method=sess2.validation_method.value if sess2.validation_method else None,
        bay_label=sess2.bay_label,
        grace_ends_at=sess2.grace_ends_at.isoformat() if sess2.grace_ends_at else None,
    )
