from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core.db import SessionLocal
from app.models import (
    Slot,
    EventsOutbox,
    SlotPrediction,
    Booking,
    BookingCandidate,
    BookingStatus,
    BookingMode,
    Session as SessionModel,
    Payment,
    PaymentStatus,
    Alert,
    AlertKind,
    AlertSeverity,
)
from app.services.inmemory_store import SLOTS as MEM_SLOTS

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/seed/slots")
async def seed_slots():
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with SessionLocal() as db:  # type: ignore
        # insert if not exists
        existing = set()
        res = await db.execute(select(Slot.slot_id))
        existing = {r[0] for r in res.all()}
        to_add = []
        for s in MEM_SLOTS:
            if s["slot_id"] in existing:
                continue
            to_add.append(Slot(
                slot_id=s["slot_id"],
                location_id=None,
                cluster_id=s["cluster_id"],
                capacity=1,
                is_ev=bool(s.get("ev", False)),
                is_accessible=bool(s.get("accessible", False)),
                base_price=float(s["base_price"]),
                dynamic_price=float(s["dynamic_price"]),
            ))
        if to_add:
            db.add_all(to_add)
            await db.commit()
        return {"inserted": len(to_add), "existing": len(existing)}

@router.post("/db/indexes")
async def create_indexes():
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with SessionLocal() as db:  # type: ignore
        # Create index to speed up nearest prediction lookups
        ddl = text("""
        CREATE INDEX IF NOT EXISTS idx_slot_predictions_slot_eta
        ON slot_predictions (slot_id, eta_minute);
        """)
        await db.execute(ddl)
        await db.commit()
        return {"created": ["idx_slot_predictions_slot_eta"]}

@router.get("/outbox/events")
async def list_outbox(limit: int = 50):
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with SessionLocal() as db:  # type: ignore
        from sqlalchemy import select
        res = await db.execute(
            select(EventsOutbox).order_by(EventsOutbox.created_at.desc()).limit(limit)
        )
        events = res.scalars().all()
        return [
            {
                "event_id": e.event_id,
                "event_type": e.event_type,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
                "published_at": e.published_at.isoformat() if e.published_at else None,
            }
            for e in events
        ]

@router.post("/seed/demo")
async def seed_demo(horizon_minutes: int = 120, step: int = 15):
    """Populate database with synthetic demo data across core tables.
    - Ensures slots exist (reuses in-memory list)
    - Inserts a rolling window of slot_predictions
    - Creates a few bookings (guaranteed + smart_hold with backups)
    - Starts + validates + ends one session (captured payment via existing logic)
    - Adds alerts & outbox events for variety
    """
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    import uuid, datetime as dt, random
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    async with SessionLocal() as db:  # type: ignore
        # 1. Slots
        res = await db.execute(select(Slot.slot_id))
        existing = {r[0] for r in res.all()}
        new_slots = []
        for s in MEM_SLOTS:
            if s["slot_id"] not in existing:
                new_slots.append(Slot(
                    slot_id=s["slot_id"],
                    location_id=None,
                    cluster_id=s["cluster_id"],
                    capacity=1,
                    is_ev=bool(s.get("ev", False)),
                    is_accessible=bool(s.get("accessible", False)),
                    base_price=float(s["base_price"]),
                    dynamic_price=float(s["dynamic_price"]),
                ))
        if new_slots:
            db.add_all(new_slots)
            await db.flush()

        # 2. Predictions horizon
        now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
        etas = [now + dt.timedelta(minutes=m) for m in range(step, horizon_minutes + 1, step)]
        slot_ids_res = await db.execute(select(Slot.slot_id).limit(50))
        slot_ids = [r[0] for r in slot_ids_res.all()]
        pred_rows = []
        for sid in slot_ids:
            base = random.random()*0.5 + 0.25  # 0.25 - 0.75
            for eta in etas:
                jitter = random.uniform(-0.15, 0.15)
                p = min(max(base + jitter, 0.01), 0.99)
                pred_rows.append({
                    "slot_id": sid,
                    "eta_minute": eta,
                    "p_free": p,
                    "conf_low": max(p - 0.1, 0.0),
                    "conf_high": min(p + 0.1, 1.0),
                    "model_version": "demo-v1",
                })
        if pred_rows:
            stmt = pg_insert(SlotPrediction).values(pred_rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=[SlotPrediction.slot_id, SlotPrediction.eta_minute],
                set_={
                    "p_free": stmt.excluded.p_free,
                    "conf_low": stmt.excluded.conf_low,
                    "conf_high": stmt.excluded.conf_high,
                    "model_version": stmt.excluded.model_version,
                },
            )
            await db.execute(stmt)

        # 3. Bookings (1 guaranteed, 1 smart_hold)
        booking_rows = []
        backup_rows = []
        if slot_ids:
            # guaranteed
            b1_id = str(uuid.uuid4())
            booking_rows.append(Booking(
                booking_id=b1_id,
                user_id=None,
                slot_id=slot_ids[0],
                cluster_id="C_A1",
                eta_minute=now + dt.timedelta(minutes=45),
                mode=BookingMode.guaranteed,
                status=BookingStatus.confirmed,
                p_free_at_hold=0.8,
            ))
            # smart_hold with backups
            if len(slot_ids) >= 3:
                b2_id = str(uuid.uuid4())
                booking_rows.append(Booking(
                    booking_id=b2_id,
                    user_id=None,
                    slot_id=slot_ids[1],
                    cluster_id="C_A1",
                    eta_minute=now + dt.timedelta(minutes=50),
                    mode=BookingMode.smart_hold,
                    status=BookingStatus.held,
                    p_free_at_hold=0.25,
                ))
                backup_rows.append(BookingCandidate(
                    booking_id=b2_id,
                    slot_id=slot_ids[2],
                    role="backup",
                    confidence_at_add=0.55,
                    hold_expires_at=None,
                ))
        if booking_rows:
            db.add_all(booking_rows)
        if backup_rows:
            db.add_all(backup_rows)

        # 4. Session + payment simulation for guaranteed booking
        if booking_rows:
            sess_booking = booking_rows[0]
            session_id = str(uuid.uuid4())
            session = SessionModel(
                session_id=session_id,
                booking_id=sess_booking.booking_id,
                started_at=now - dt.timedelta(minutes=10),
                ended_at=now - dt.timedelta(minutes=5),
                validation_method=None,
                bay_label="A-1",
                grace_ends_at=now + dt.timedelta(minutes=20),
            )
            db.add(session)
            payment = Payment(
                payment_id=str(uuid.uuid4()),
                booking_id=sess_booking.booking_id,
                amount_authorized=35.0,
                amount_captured=35.0,
                status=PaymentStatus.captured,
            )
            db.add(payment)

        # 5. Alerts
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            entity_type="booking",
            entity_id=booking_rows[1].booking_id if len(booking_rows) > 1 else booking_rows[0].booking_id,
            kind=AlertKind.incentive,
            severity=AlertSeverity.warn,
            message="Low confidence smart hold demo alert",
        ) if booking_rows else None
        if alert:
            db.add(alert)

        # 6. Seed a couple of outbox events for visibility
        if booking_rows:
            db.add_all([
                EventsOutbox(event_id=str(uuid.uuid4()), event_type="booking.created", payload={"booking_id": booking_rows[0].booking_id}),
                EventsOutbox(event_id=str(uuid.uuid4()), event_type="pricing.adjusted", payload={"slot_id": slot_ids[0] if slot_ids else "S1", "new_price": 42.0}),
            ])

        await db.commit()
        return {
            "slots": len(new_slots) if new_slots else 0,
            "predictions": len(pred_rows),
            "bookings": len(booking_rows),
            "backups": len(backup_rows),
            "alerts": 1 if alert else 0,
            "outbox_seeded": 2 if booking_rows else 0,
        }

# Convenience trailing-slash variant (some clients may auto-append slash)
@router.post("/seed/demo/")
async def seed_demo_slash(horizon_minutes: int = 120, step: int = 15):
    return await seed_demo(horizon_minutes=horizon_minutes, step=step)

@router.get("/debug/admin_routes")
async def debug_admin_routes():
    return [r.path for r in router.routes]


@router.post("/db/patch")
async def patch_db():
    """Apply minimal DDL to align DB schema with current models (idempotent).
    - Ensure events_outbox exists and has required columns.
    - Create prediction index if missing.
    """
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with SessionLocal() as db:  # type: ignore
        ddl = text(
            """
            CREATE TABLE IF NOT EXISTS events_outbox (
                event_id UUID PRIMARY KEY,
                event_type VARCHAR,
                payload JSONB,
                status VARCHAR DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT now(),
                published_at TIMESTAMPTZ
            );
            ALTER TABLE events_outbox ADD COLUMN IF NOT EXISTS event_type VARCHAR;
            ALTER TABLE events_outbox ADD COLUMN IF NOT EXISTS payload JSONB;
            ALTER TABLE events_outbox ADD COLUMN IF NOT EXISTS status VARCHAR;
            ALTER TABLE events_outbox ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
            ALTER TABLE events_outbox ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
            CREATE INDEX IF NOT EXISTS idx_slot_predictions_slot_eta
            ON slot_predictions (slot_id, eta_minute);
            """
        )
        await db.execute(ddl)
        await db.commit()
        return {"patched": ["events_outbox columns", "idx_slot_predictions_slot_eta"]}


@router.post("/demo/flow")
@router.post("/demo/flow/")
@router.get("/demo/flow")
@router.get("/demo/flow/")
async def demo_flow():
    """Run a full demo flow end-to-end in one call:
    - Ensure at least one slot exists (seed from memory if needed)
    - Create a guaranteed booking 30 minutes from now
    - Start a session, validate (preauth), then end (capture)
    - Return booking/session ids and recent related outbox events
    """
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    import uuid, datetime as dt
    from sqlalchemy import update
    async with SessionLocal() as db:  # type: ignore
        # 1) Ensure a slot exists
        res_slot = await db.execute(select(Slot).limit(1))
        slot = res_slot.scalar_one_or_none()
        created_slots = 0
        if slot is None:
            to_add = []
            for s in MEM_SLOTS[:3]:
                to_add.append(Slot(
                    slot_id=s["slot_id"],
                    location_id=None,
                    cluster_id=s["cluster_id"],
                    capacity=1,
                    is_ev=bool(s.get("ev", False)),
                    is_accessible=bool(s.get("accessible", False)),
                    base_price=float(s["base_price"]),
                    dynamic_price=float(s["dynamic_price"]),
                ))
            if to_add:
                db.add_all(to_add)
                await db.flush()
                created_slots = len(to_add)
            res_slot = await db.execute(select(Slot).limit(1))
            slot = res_slot.scalar_one_or_none()
        if slot is None:
            raise HTTPException(status_code=500, detail="No slots available to run demo flow")

        # 2) Create a booking 30 min from now
        now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
        eta_dt = now + dt.timedelta(minutes=30)
        booking_id = str(uuid.uuid4())
        booking = Booking(
            booking_id=booking_id,
            user_id=None,
            slot_id=slot.slot_id,
            cluster_id=slot.cluster_id or "",
            eta_minute=eta_dt,
            mode=BookingMode.guaranteed,
            status=BookingStatus.confirmed,
            p_free_at_hold=None,
        )
        db.add(booking)
        db.add(BookingCandidate(
            booking_id=booking_id,
            slot_id=slot.slot_id,
            role="primary",
            confidence_at_add=None,
            hold_expires_at=None,
        ))
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="booking.created",
            payload={
                "booking_id": booking_id,
                "slot_id": slot.slot_id,
                "eta_minute": eta_dt.isoformat(),
                "mode": "guaranteed",
                "status": BookingStatus.confirmed.value,
                "created_at": now.isoformat(),
            },
        ))
        await db.flush()

        # 3) Start a session
        session_id = str(uuid.uuid4())
        sess = SessionModel(
            session_id=session_id,
            booking_id=booking_id,
            started_at=now,
            ended_at=None,
            validation_method=None,
            bay_label="A-1",
            grace_ends_at=now + dt.timedelta(minutes=15),
        )
        db.add(sess)
        # Mark booking active (use ORM update to respect UUID typing)
        await db.execute(
            update(Booking).where(Booking.booking_id == booking_id).values(status=BookingStatus.active)
        )

        # 4) Validate (simulate QR) and preauth
        amount = float(slot.dynamic_price or 0.0)
        payment_id = str(uuid.uuid4())
        pay = Payment(
            payment_id=payment_id,
            booking_id=booking_id,
            amount_authorized=amount,
            amount_captured=None,
            status=PaymentStatus.preauth_ok,
        )
        db.add(pay)
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="payment.preauth_ok",
            payload={
                "booking_id": booking_id,
                "payment_id": payment_id,
                "amount_authorized": amount,
                "at": dt.datetime.utcnow().isoformat(),
            },
        ))
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="session.validated",
            payload={
                "session_id": session_id,
                "booking_id": booking_id,
                "method": "qr",
                "bay_label": "A-1",
                "at": dt.datetime.utcnow().isoformat(),
            },
        ))

        # 5) End session and capture
        end_time = now + dt.timedelta(minutes=5)
        await db.execute(
            update(SessionModel).where(SessionModel.session_id == session_id).values(ended_at=end_time)
        )
        await db.execute(
            update(Booking).where(Booking.booking_id == booking_id).values(status=BookingStatus.completed)
        )
        await db.execute(
            update(Payment).where(Payment.payment_id == payment_id).values(amount_captured=amount, status=PaymentStatus.captured)
        )
        db.add(EventsOutbox(
            event_id=str(uuid.uuid4()),
            event_type="payment.captured",
            payload={
                "booking_id": booking_id,
                "payment_id": payment_id,
                "amount_captured": amount,
                "at": dt.datetime.utcnow().isoformat(),
            },
        ))

        await db.commit()

        # Return a concise summary and recent events
        ev_res = await db.execute(
            select(EventsOutbox).order_by(EventsOutbox.created_at.desc()).limit(10)
        )
        evs = ev_res.scalars().all()
        return {
            "created_slots": created_slots,
            "booking_id": booking_id,
            "session_id": session_id,
            "slot_id": slot.slot_id,
            "events": [
                {
                    "event_type": e.event_type,
                    "status": e.status,
                    "created_at": e.created_at.isoformat(),
                    "published_at": e.published_at.isoformat() if e.published_at else None,
                }
                for e in evs
            ],
        }
