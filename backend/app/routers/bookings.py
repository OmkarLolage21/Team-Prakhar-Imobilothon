from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel, Field
from app.services.inmemory_store import (
    create_booking, BOOKINGS, BOOKING_CANDIDATES, add_backup_slots, swap_booking_slot,
    SLOTS, nearest_prediction
)
from app.schemas.ml import AgentsConfig  # reuse config defaults for reliability threshold
from sqlalchemy import select, update, func, literal_column
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.models import Booking, BookingCandidate, BookingStatus, BookingMode, Slot, SlotPrediction, EventsOutbox, Payment, PaymentStatus, Location, Session, AppUser

router = APIRouter(prefix="/bookings", tags=["bookings"])

# Reuse an in-memory config; in real system fetch from persisted config
CONFIG = AgentsConfig()

class BookingCreateRequest(BaseModel):
    slot_id: str = Field(..., description="Target parking slot identifier", example="LOT1_S042")
    eta: str = Field(..., description="Expected arrival time (ISO 8601)", example="2025-11-09T14:30:00Z")
    mode: str = Field(..., pattern="^(guaranteed|smart_hold)$", description="Booking mode: guaranteed (confirmed) or smart_hold (with backups)", example="guaranteed")
    window_minutes: int = Field(default=60, ge=5, le=240, description="Prediction time window", example=60)
    add_on_ids: List[str] = Field(default=[], description="Optional service add-on IDs (wash, valet, charging)", example=["a1", "a3"])

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


class BookingLedgerItem(BaseModel):
    id: str
    customer: Optional[str] = None
    email: Optional[str] = None
    lot: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    duration: Optional[str] = None
    amount: Optional[str] = None
    paymentMethod: Optional[str] = None
    status: Optional[str] = None
    paymentStatus: Optional[str] = None


@router.get("/recent", response_model=List[BookingLedgerItem],
    summary="Get recent bookings ledger",
    response_description="Recent bookings with user, location, payment, and session details",
)
async def recent(
    limit: int = Query(50, ge=1, le=500, description="Maximum number of bookings to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve recent bookings with comprehensive join data.
    
    Returns enriched booking records including:
    - Customer email and derived display name
    - Parking lot name and location
    - Payment amounts and status
    - Session duration and timestamps
    
    Optimized with a single SQL query to avoid N+1 problems.
    """
    try:
        # Build a LEFT JOIN query to avoid N+1 lookups
        q = (
            select(
                Booking.booking_id,
                Booking.slot_id,
                Booking.cluster_id,
                Booking.eta_minute,
                Booking.status,
                Booking.created_at,
                AppUser.email.label("user_email"),
                Location.name.label("lot_name"),
                Payment.amount_captured,
                Payment.amount_authorized,
                Payment.status.label("pay_status"),
                Session.started_at.label("sess_started"),
                Session.ended_at.label("sess_ended"),
            )
            .select_from(Booking)
            .outerjoin(AppUser, AppUser.user_id == Booking.user_id)
            .outerjoin(Slot, Slot.slot_id == Booking.slot_id)
            .outerjoin(Location, Location.location_id == Slot.location_id)
            .outerjoin(Payment, Payment.booking_id == Booking.booking_id)
            .outerjoin(Session, Session.booking_id == Booking.booking_id)
            .order_by(Booking.created_at.desc())
            .limit(limit)
        )
        res = await db.execute(q)
        rows = res.all()
        items: List[BookingLedgerItem] = []
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for r in rows:
            (booking_id, slot_id, cluster_id, eta_minute, status, created_at, user_email, lot_name,
             amount_captured, amount_authorized, pay_status, sess_started, sess_ended) = r
            # Amount resolution
            amount_val = None
            if amount_captured is not None:
                amount_val = float(amount_captured)
            elif amount_authorized is not None:
                amount_val = float(amount_authorized)
            # Payment status mapping
            payment_status_ui = None
            if pay_status is not None:
                if pay_status == PaymentStatus.captured:
                    payment_status_ui = "paid"
                elif pay_status == PaymentStatus.preauth_ok:
                    payment_status_ui = "pending"
                elif pay_status in (PaymentStatus.cancelled, PaymentStatus.refunded):
                    payment_status_ui = "failed" if pay_status == PaymentStatus.cancelled else "paid"
            # Duration: if session started
            duration_str = None
            if sess_started is not None:
                end_ref = sess_ended or now
                delta = end_ref - sess_started
                mins = int(delta.total_seconds() // 60)
                if mins >= 60:
                    hours = mins // 60
                    rem = mins % 60
                    duration_str = f"{hours}h {rem}m" if rem else f"{hours}h"
                else:
                    duration_str = f"{mins}m"
            # Customer display (local part of email)
            customer_name = None
            if user_email:
                customer_name = user_email.split("@")[0]
            items.append(BookingLedgerItem(
                id=booking_id,
                customer=customer_name,
                email=user_email,
                lot=lot_name or cluster_id,
                startDate=eta_minute.isoformat() if eta_minute else None,
                endDate=sess_ended.isoformat() if sess_ended else None,
                duration=duration_str,
                amount=(f"${amount_val:.2f}" if amount_val is not None else None),
                paymentMethod=("Card" if amount_val is not None else None),
                status=status.value if status else None,
                paymentStatus=payment_status_ui,
            ))
        return items
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=BookingResponse,
    summary="Create a new parking booking",
    response_description="Created booking with confirmation details",
    status_code=201,
)
async def create(req: BookingCreateRequest, db: AsyncSession = Depends(get_db)):
    # Validate/resolve slot (DB first). Demo-friendly: if provided id is actually a cluster_id or location_id,
    # resolve it to a real slot to avoid 404s when UI sends pseudo IDs.
    target_slot_id: str = req.slot_id
    cluster_id: Optional[str] = None
    try:
        res = await db.execute(select(Slot.cluster_id).where(Slot.slot_id == target_slot_id))
        cluster_id = res.scalar_one_or_none()
        if cluster_id is None:
            res2 = await db.execute(
                select(Slot.slot_id, Slot.cluster_id)
                .where((Slot.cluster_id == target_slot_id) | (Slot.location_id == target_slot_id))
                .limit(1)
            )
            row = res2.first()
            if row is not None:
                target_slot_id = row[0]
                cluster_id = row[1]
    except SQLAlchemyError:
        cluster_id = None
    if cluster_id is None:
        # fallback to memory
        slot_ids = [s["slot_id"] for s in SLOTS]
        if target_slot_id in slot_ids:
            cluster_id = next((s["cluster_id"] for s in SLOTS if s["slot_id"] == target_slot_id), None)
        else:
            # try treat as cluster id in memory
            cluster_match = next((s for s in SLOTS if s["cluster_id"] == target_slot_id), None)
            if cluster_match is not None:
                target_slot_id = cluster_match["slot_id"]
                cluster_id = cluster_match["cluster_id"]
            else:
                raise HTTPException(status_code=404, detail="slot not found")

    # compute p_free using DB predictions (nearest by time)
    from datetime import datetime, timedelta
    eta_dt = datetime.fromisoformat(req.eta.replace("Z", "+00:00"))
    window = timedelta(minutes=req.window_minutes)
    lower = eta_dt - window
    upper = eta_dt + window
    # nearest for primary slot using dual before/after within window
    before_q = await db.execute(
        select(SlotPrediction)
        .where(SlotPrediction.slot_id == target_slot_id, SlotPrediction.eta_minute <= eta_dt, SlotPrediction.eta_minute >= lower)
        .order_by(SlotPrediction.eta_minute.desc())
        .limit(1)
    )
    before = before_q.scalar_one_or_none()
    after_q = await db.execute(
        select(SlotPrediction)
        .where(SlotPrediction.slot_id == target_slot_id, SlotPrediction.eta_minute >= eta_dt, SlotPrediction.eta_minute <= upper)
        .order_by(SlotPrediction.eta_minute.asc())
        .limit(1)
    )
    after = after_q.scalar_one_or_none()
    chosen = before or after
    if before and after:
        chosen = before if abs((before.eta_minute - eta_dt).total_seconds()) <= abs((after.eta_minute - eta_dt).total_seconds()) else after
    p = float(chosen.p_free) if chosen is not None else None

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
            slot_id=target_slot_id,
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
            slot_id=target_slot_id,
            role="primary",
            confidence_at_add=p,
            hold_expires_at=None,
        ))
        backups: List[Dict[str, Any]] = []
        if req.mode == "smart_hold" and p is not None and p < CONFIG.reliability_threshold and cluster_id:
            # choose alternatives in same cluster from DB and rank by nearest prediction probability
            res_slots = await db.execute(
                select(Slot.slot_id).where(Slot.cluster_id == cluster_id, Slot.slot_id != target_slot_id).limit(50)
            )
            alt_ids = [sid for (sid,) in res_slots.all()]
            candidates: List[Dict[str, Any]] = []
            for sid in alt_ids:
                bq = await db.execute(
                    select(SlotPrediction)
                    .where(SlotPrediction.slot_id == sid, SlotPrediction.eta_minute <= eta_dt, SlotPrediction.eta_minute >= lower)
                    .order_by(SlotPrediction.eta_minute.desc())
                    .limit(1)
                )
                aq = await db.execute(
                    select(SlotPrediction)
                    .where(SlotPrediction.slot_id == sid, SlotPrediction.eta_minute >= eta_dt, SlotPrediction.eta_minute <= upper)
                    .order_by(SlotPrediction.eta_minute.asc())
                    .limit(1)
                )
                bpred = bq.scalar_one_or_none()
                apred = aq.scalar_one_or_none()
                pick = bpred or apred
                if bpred and apred:
                    pick = bpred if abs((bpred.eta_minute - eta_dt).total_seconds()) <= abs((apred.eta_minute - eta_dt).total_seconds()) else apred
                if pick is not None:
                    candidates.append({"slot_id": sid, "confidence": float(pick.p_free)})
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
        # Outbox event for booking.created (include backups with confidence)
        evt_payload = {
            "booking_id": booking_id,
            "slot_id": target_slot_id,
            "eta_minute": req.eta,
            "mode": req.mode,
            "status": status.value,
            "p_free_at_hold": p,
            "backups": backups,
            "add_on_ids": req.add_on_ids,
            "created_at": dt.datetime.utcnow().isoformat(),
        }
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="booking.created",
            payload=evt_payload,
        ))
        await db.commit()
        return BookingResponse(
            booking_id=booking_id,
            slot_id=target_slot_id,
            eta_minute=req.eta,
            mode=req.mode,
            status=status.value,
            p_free_at_hold=p,
            backups=backups,
        )
    except SQLAlchemyError as e:
        await db.rollback()
        # Fallback to memory path
        booking = create_booking(slot_id=target_slot_id, eta_iso=req.eta, mode=req.mode, p_free_at_hold=p)
        backups: List[Dict[str, Any]] = []
        if req.mode == "smart_hold" and p is not None and p < CONFIG.reliability_threshold:
            cluster = booking["cluster_id"]
            candidates = []
            for s in SLOTS:
                if s["slot_id"] == target_slot_id:
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

@router.get("/{booking_id}", response_model=BookingResponse,
    summary="Get booking by ID",
    response_description="Booking details with backup slots",
)
async def get_booking(
    booking_id: str = Path(..., description="Booking identifier", example="b123e4567-e89b-12d3-a456-426614174000"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a single booking by its unique identifier.
    
    Returns the primary slot assignment plus any backup slots configured for smart_hold bookings.
    """
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

@router.post("/{booking_id}/swap", response_model=BookingResponse,
    summary="Swap booking to a different slot",
    response_description="Updated booking with new slot assignment",
)
async def swap(
    booking_id: str = Path(..., description="Booking identifier"),
    req: SwapRequest = ...,
    db: AsyncSession = Depends(get_db)
):
    """
    Swap an existing booking to a different parking slot.
    
    Typically used when:
    - A backup slot needs to be activated
    - User requests a different location
    - Original slot becomes unavailable
    
    Emits a `booking.swapped` event to the outbox for downstream processing.
    """
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
        old_slot_id = b.slot_id or ""
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
        # Outbox event booking.swapped
        import uuid, datetime as dt
        swap_evt = EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="booking.swapped",
            payload={
                "booking_id": b2.booking_id,
                "old_slot_id": old_slot_id,
                "new_slot_id": b2.slot_id,
                "status": b2.status.value,
                "mode": b2.mode.value,
                "eta_minute": b2.eta_minute.isoformat(),
                "p_free_at_hold": float(b2.p_free_at_hold) if b2.p_free_at_hold is not None else None,
                "backups": backups,
                "swapped_at": dt.datetime.utcnow().isoformat(),
            },
        )
        db.add(swap_evt)
        await db.commit()
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
