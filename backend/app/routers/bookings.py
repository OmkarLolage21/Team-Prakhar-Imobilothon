from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.services.inmemory_store import (
    create_booking, BOOKINGS, BOOKING_CANDIDATES, add_backup_slots, swap_booking_slot,
    SLOTS, nearest_prediction
)
from app.schemas.ml import AgentsConfig  # reuse config defaults for reliability threshold
from sqlalchemy import select, update, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.models import Booking, BookingCandidate, BookingStatus, BookingMode, Slot, SlotPrediction

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Reuse an in-memory config; in real system fetch from persisted config
CONFIG = AgentsConfig()

class BookingCreateRequest(BaseModel):
    slot_id: str
    eta: str  # ISO
    mode: str = Field(pattern="^(guaranteed|smart_hold)$")

class BookingResponse(BaseModel):
    booking_id: str
    slot_id: str
    eta_minute: str
    mode: str
    status: str
    p_free_at_hold: Optional[float]
    backups: List[Dict[str, Any]] = []

class SwapRequest(BaseModel):
    new_slot_id: str

@router.post("/", response_model=BookingResponse)
async def create(req: BookingCreateRequest, db: AsyncSession = Depends(get_db)):
    # Validate slot exists (DB first, fallback memory)
    cluster_id: Optional[str] = None
    try:
        res = await db.execute(select(Slot.cluster_id).where(Slot.slot_id == req.slot_id))
        cluster_id = res.scalar_one_or_none()
    except SQLAlchemyError:
        cluster_id = None
    if cluster_id is None:
        # fallback to memory
        slot_ids = [s["slot_id"] for s in SLOTS]
        if req.slot_id not in slot_ids:
            raise HTTPException(status_code=404, detail="slot not found")
        cluster_id = next((s["cluster_id"] for s in SLOTS if s["slot_id"] == req.slot_id), None)

    # compute p_free using DB predictions (nearest by time)
    from datetime import datetime
    eta_dt = datetime.fromisoformat(req.eta.replace("Z", "+00:00"))
    # nearest for primary slot
    pr_res = await db.execute(
        select(SlotPrediction.p_free)
        .where(SlotPrediction.slot_id == req.slot_id)
        .order_by(func.abs(func.extract('epoch', SlotPrediction.eta_minute - eta_dt)))
        .limit(1)
    )
    p_row = pr_res.scalar_one_or_none()
    p = float(p_row) if p_row is not None else None

    # Try DB persistence
    try:
        import uuid, datetime as dt
        booking_id = str(uuid.uuid4())
        status = BookingStatus.held if req.mode == "smart_hold" else BookingStatus.confirmed
        mode_enum = BookingMode.smart_hold if req.mode == "smart_hold" else BookingMode.guaranteed
        eta_dt = dt.datetime.fromisoformat(req.eta.replace("Z", "+00:00"))
        b = Booking(
            booking_id=booking_id,
            user_id=None,
            slot_id=req.slot_id,
            cluster_id=cluster_id or "",
            eta_minute=eta_dt,
            mode=mode_enum,
            status=status,
            p_free_at_hold=p,
        )
        db.add(b)
        # primary candidate
        db.add(BookingCandidate(
            booking_id=booking_id,
            slot_id=req.slot_id,
            role="primary",
            confidence_at_add=p,
            hold_expires_at=None,
        ))
        backups: List[Dict[str, Any]] = []
        if req.mode == "smart_hold" and p is not None and p < CONFIG.reliability_threshold and cluster_id:
            # choose alternatives in same cluster from DB and rank by nearest prediction probability
            res_slots = await db.execute(
                select(Slot.slot_id).where(Slot.cluster_id == cluster_id, Slot.slot_id != req.slot_id).limit(50)
            )
            alt_ids = [sid for (sid,) in res_slots.all()]
            candidates: List[Dict[str, Any]] = []
            for sid in alt_ids:
                pr_alt = await db.execute(
                    select(SlotPrediction.p_free)
                    .where(SlotPrediction.slot_id == sid)
                    .order_by(func.abs(func.extract('epoch', SlotPrediction.eta_minute - eta_dt)))
                    .limit(1)
                )
                p_alt = pr_alt.scalar_one_or_none()
                if p_alt is not None:
                    candidates.append({"slot_id": sid, "confidence": float(p_alt)})
            candidates.sort(key=lambda x: -x["confidence"])
            backups = candidates[: CONFIG.backups_limit]
            for cand in backups:
                db.add(BookingCandidate(
                    booking_id=booking_id,
                    slot_id=cand["slot_id"],
                    role="backup",
                    confidence_at_add=cand.get("confidence"),
                    hold_expires_at=None,
                ))
        await db.commit()
        return BookingResponse(
            booking_id=booking_id,
            slot_id=req.slot_id,
            eta_minute=req.eta,
            mode=req.mode,
            status=status.value,
            p_free_at_hold=p,
            backups=backups,
        )
    except SQLAlchemyError as e:
        await db.rollback()
        # Fallback to memory path
        booking = create_booking(slot_id=req.slot_id, eta_iso=req.eta, mode=req.mode, p_free_at_hold=p)
        backups: List[Dict[str, Any]] = []
        if req.mode == "smart_hold" and p is not None and p < CONFIG.reliability_threshold:
            cluster = booking["cluster_id"]
            candidates = []
            for s in SLOTS:
                if s["slot_id"] == req.slot_id:
                    continue
                if s["cluster_id"] != cluster:
                    continue
                p_alt = nearest_prediction(s["slot_id"], req.eta)
                if p_alt is not None:
                    candidates.append({"slot_id": s["slot_id"], "confidence": p_alt})
            candidates.sort(key=lambda x: -x["confidence"])
            backups = candidates[: CONFIG.backups_limit]
            if backups:
                add_backup_slots(booking["booking_id"], backups)
        return BookingResponse(
            booking_id=booking["booking_id"],
            slot_id=booking["slot_id"],
            eta_minute=booking["eta_minute"],
            mode=booking["mode"],
            status=booking["status"],
            p_free_at_hold=booking["p_free_at_hold"],
            backups=BOOKING_CANDIDATES.get(booking["booking_id"], []),
        )

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, db: AsyncSession = Depends(get_db)):
    # Try DB first
    try:
        res = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
        b = res.scalar_one_or_none()
        if b:
            # load candidates
            cres = await db.execute(select(BookingCandidate).where(BookingCandidate.booking_id == booking_id))
            cands = cres.scalars().all()
            backups = [
                {"slot_id": c.slot_id, "role": c.role, "confidence": float(c.confidence_at_add) if c.confidence_at_add is not None else None}
                for c in cands if c.role == "backup"
            ]
            return BookingResponse(
                booking_id=b.booking_id,
                slot_id=b.slot_id or "",
                eta_minute=b.eta_minute.isoformat(),
                mode=b.mode.value,
                status=b.status.value,
                p_free_at_hold=float(b.p_free_at_hold) if b.p_free_at_hold is not None else None,
                backups=backups,
            )
    except SQLAlchemyError:
        pass
    # Fallback to in-memory
    b = BOOKINGS.get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="booking not found")
    return BookingResponse(
        booking_id=b["booking_id"],
        slot_id=b["slot_id"],
        eta_minute=b["eta_minute"],
        mode=b["mode"],
        status=b["status"],
        p_free_at_hold=b["p_free_at_hold"],
        backups=BOOKING_CANDIDATES.get(booking_id, []),
    )

@router.post("/{booking_id}/swap", response_model=BookingResponse)
async def swap(booking_id: str, req: SwapRequest, db: AsyncSession = Depends(get_db)):
    # Try DB path
    try:
        # validate slot
        res_slot = await db.execute(select(Slot.slot_id).where(Slot.slot_id == req.new_slot_id))
        if res_slot.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="slot not found")
        res_b = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
        b = res_b.scalar_one_or_none()
        if b is None:
            raise HTTPException(status_code=404, detail="booking not found")
        await db.execute(
            update(Booking)
            .where(Booking.booking_id == booking_id)
            .values(slot_id=req.new_slot_id, status=BookingStatus.confirmed)
        )
        await db.commit()
        # reload
        res_b2 = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
        b2 = res_b2.scalar_one()
        # candidates
        cres = await db.execute(select(BookingCandidate).where(BookingCandidate.booking_id == booking_id))
        cands = cres.scalars().all()
        backups = [
            {"slot_id": c.slot_id, "role": c.role, "confidence": float(c.confidence_at_add) if c.confidence_at_add is not None else None}
            for c in cands if c.role == "backup"
        ]
        return BookingResponse(
            booking_id=b2.booking_id,
            slot_id=b2.slot_id or "",
            eta_minute=b2.eta_minute.isoformat(),
            mode=b2.mode.value,
            status=b2.status.value,
            p_free_at_hold=float(b2.p_free_at_hold) if b2.p_free_at_hold is not None else None,
            backups=backups,
        )
    except SQLAlchemyError:
        # Fallback to memory
        if req.new_slot_id not in [s["slot_id"] for s in SLOTS]:
            raise HTTPException(status_code=404, detail="slot not found")
        if booking_id not in BOOKINGS:
            raise HTTPException(status_code=404, detail="booking not found")
        booking = swap_booking_slot(booking_id, req.new_slot_id)
        return BookingResponse(
            booking_id=booking["booking_id"],
            slot_id=booking["slot_id"],
            eta_minute=booking["eta_minute"],
            mode=booking["mode"],
            status=booking["status"],
            p_free_at_hold=booking["p_free_at_hold"],
            backups=BOOKING_CANDIDATES.get(booking_id, []),
        )
