import asyncio
import datetime as dt
import uuid

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models import Booking, BookingMode, BookingStatus, Alert, AlertKind, AlertSeverity
from app.schemas.ml import AgentsConfig


DEFAULT_CADENCE_SEC = 60
DEDUP_WINDOW_MIN = 60  # avoid duplicate alerts within an hour per booking

_cfg = AgentsConfig()


async def incentives_loop(cadence: int = DEFAULT_CADENCE_SEC):
    while True:
        try:
            await run_once()
        except Exception as e:
            try:
                print("[incentives] loop error", e)
            except Exception:
                pass
        await asyncio.sleep(cadence)


async def run_once():
    if SessionLocal is None:
        return
    async with SessionLocal() as db:  # type: ignore
        now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
        dedup_after = now - dt.timedelta(minutes=DEDUP_WINDOW_MIN)
        # Find smart_hold bookings on hold with low confidence
        res = await db.execute(
            select(Booking)
            .where(
                Booking.mode == BookingMode.smart_hold,
                Booking.status == BookingStatus.held,
                Booking.p_free_at_hold.isnot(None),
            )
        )
        bookings = res.scalars().all()
        created = 0
        for b in bookings:
            try:
                p = float(b.p_free_at_hold) if b.p_free_at_hold is not None else None
            except Exception:
                p = None
            if p is None or p >= _cfg.reliability_threshold:
                continue
            # Dedup: is there a recent unresolved incentive alert for this booking?
            existing_q = await db.execute(
                select(Alert).where(
                    Alert.entity_type == "booking",
                    Alert.entity_id == b.booking_id,
                    Alert.kind == AlertKind.incentive,
                    Alert.created_at >= dedup_after,
                ).limit(1)
            )
            existing = existing_q.scalar_one_or_none()
            if existing:
                continue
            alert = Alert(
                alert_id=str(uuid.uuid4()),
                entity_type="booking",
                entity_id=b.booking_id,
                kind=AlertKind.incentive,
                severity=AlertSeverity.warn,
                message=f"Low confidence smart hold (p_free={p:.2f}); consider incentive",
            )
            db.add(alert)
            created += 1
        if created:
            await db.commit()
            print(f"[incentives] created {created} alerts")
