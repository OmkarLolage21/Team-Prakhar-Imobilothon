from typing import Optional
import uuid
import datetime as dt

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Payment, PaymentStatus, Booking, EventsOutbox, Slot

router = APIRouter(prefix="/payments", tags=["payments"])


class PreauthRequest(BaseModel):
    booking_id: str
    amount_override: Optional[float] = Field(default=None, ge=0)


class PaymentResponse(BaseModel):
    payment_id: str
    booking_id: Optional[str]
    amount_authorized: Optional[float]
    amount_captured: Optional[float]
    status: str
    created_at: str


@router.post("/preauth", response_model=PaymentResponse)
async def preauth(req: PreauthRequest, db: AsyncSession = Depends(get_db)):
    # Validate booking
    b_res = await db.execute(select(Booking).where(Booking.booking_id == req.booking_id))
    booking = b_res.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="booking not found")
    # Ensure no existing payment
    existing_res = await db.execute(select(Payment).where(Payment.booking_id == req.booking_id))
    existing = existing_res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="payment already exists")
    amount = req.amount_override
    if amount is None and booking.slot_id:
        s_res = await db.execute(select(Slot).where(Slot.slot_id == booking.slot_id))
        slot = s_res.scalar_one_or_none()
        if slot:
            amount = float(slot.dynamic_price)
    if amount is None:
        amount = 0.0
    payment = Payment(
        payment_id=str(uuid.uuid4()),
        booking_id=booking.booking_id,
        amount_authorized=amount,
        amount_captured=None,
        status=PaymentStatus.preauth_ok,
    )
    db.add(payment)
    # outbox event
    db.add(EventsOutbox(
        event_id=str(uuid.uuid4()),
        event_type="payment.preauth_ok",
        payload={
            "booking_id": booking.booking_id,
            "payment_id": payment.payment_id,
            "amount_authorized": amount,
            "at": dt.datetime.utcnow().isoformat(),
        },
    ))
    await db.commit()
    return PaymentResponse(
        payment_id=payment.payment_id,
        booking_id=payment.booking_id,
        amount_authorized=float(payment.amount_authorized or 0.0),
        amount_captured=payment.amount_captured if payment.amount_captured is not None else None,
        status=payment.status.value,
        created_at=payment.created_at.isoformat(),
    )


@router.post("/{payment_id}/capture", response_model=PaymentResponse)
async def capture(payment_id: str, db: AsyncSession = Depends(get_db)):
    p_res = await db.execute(select(Payment).where(Payment.payment_id == payment_id))
    payment = p_res.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=404, detail="payment not found")
    if payment.status not in (PaymentStatus.preauth_ok, PaymentStatus.init):
        raise HTTPException(status_code=409, detail="payment not capturable")
    amount = float(payment.amount_authorized or 0.0)
    await db.execute(
        update(Payment)
        .where(Payment.payment_id == payment_id)
        .values(amount_captured=amount, status=PaymentStatus.captured)
    )
    db.add(EventsOutbox(
        event_id=str(uuid.uuid4()),
        event_type="payment.captured",
        payload={
            "payment_id": payment_id,
            "booking_id": payment.booking_id,
            "amount_captured": amount,
            "at": dt.datetime.utcnow().isoformat(),
        },
    ))
    await db.commit()
    # reload
    p2_res = await db.execute(select(Payment).where(Payment.payment_id == payment_id))
    p2 = p2_res.scalar_one()
    return PaymentResponse(
        payment_id=p2.payment_id,
        booking_id=p2.booking_id,
        amount_authorized=float(p2.amount_authorized or 0.0),
        amount_captured=float(p2.amount_captured or 0.0) if p2.amount_captured is not None else None,
        status=p2.status.value,
        created_at=p2.created_at.isoformat(),
    )


@router.post("/{payment_id}/refund", response_model=PaymentResponse)
async def refund(payment_id: str, db: AsyncSession = Depends(get_db)):
    p_res = await db.execute(select(Payment).where(Payment.payment_id == payment_id))
    payment = p_res.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=404, detail="payment not found")
    if payment.status != PaymentStatus.captured:
        raise HTTPException(status_code=409, detail="payment not refundable")
    await db.execute(
        update(Payment)
        .where(Payment.payment_id == payment_id)
        .values(status=PaymentStatus.refunded)
    )
    db.add(EventsOutbox(
        event_id=str(uuid.uuid4()),
        event_type="payment.refunded",
        payload={
            "payment_id": payment_id,
            "booking_id": payment.booking_id,
            "amount_refunded": float(payment.amount_captured or 0.0),
            "at": dt.datetime.utcnow().isoformat(),
        },
    ))
    await db.commit()
    # reload
    p2_res = await db.execute(select(Payment).where(Payment.payment_id == payment_id))
    p2 = p2_res.scalar_one()
    return PaymentResponse(
        payment_id=p2.payment_id,
        booking_id=p2.booking_id,
        amount_authorized=float(p2.amount_authorized or 0.0),
        amount_captured=float(p2.amount_captured or 0.0) if p2.amount_captured is not None else None,
        status=p2.status.value,
        created_at=p2.created_at.isoformat(),
    )
