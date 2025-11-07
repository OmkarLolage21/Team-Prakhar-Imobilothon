import asyncio
import datetime as dt
import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import SessionLocal
from app.models import Slot, SlotPrediction, EventsOutbox

DEFAULT_CADENCE_SEC = 120
WINDOW_MINUTES = 30

async def pricing_loop(cadence: int = DEFAULT_CADENCE_SEC):
    while True:
        try:
            await run_once()
        except Exception as e:
            print("[pricing] loop error", e)
        await asyncio.sleep(cadence)

async def run_once():
    if SessionLocal is None:
        return
    async with SessionLocal() as db:  # type: ignore
        # fetch slots
        res = await db.execute(select(Slot))
        slots = res.scalars().all()
        now = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
        horizon = now + dt.timedelta(minutes=WINDOW_MINUTES)
        changed = 0
        for s in slots:
            # nearest upcoming prediction within window
            pred_q = await db.execute(
                select(SlotPrediction)
                .where(SlotPrediction.slot_id == s.slot_id, SlotPrediction.eta_minute >= now, SlotPrediction.eta_minute <= horizon)
                .order_by(SlotPrediction.eta_minute.asc())
                .limit(1)
            )
            pred = pred_q.scalar_one_or_none()
            if not pred:
                continue
            p_free = float(pred.p_free)
            base_price = float(s.base_price)
            # simple pricing rule: lower availability (low p_free) => increase price up to +40%; high availability => discount up to -20%
            if p_free < 0.3:
                factor = 1.0 + (0.4 * (0.3 - p_free) / 0.3)  # scale up
            elif p_free > 0.7:
                factor = 1.0 - (0.2 * (p_free - 0.7) / 0.3)  # scale down
            else:
                factor = 1.0
            new_price = round(base_price * factor, 2)
            if abs(new_price - float(s.dynamic_price)) >= 0.01:
                await db.execute(
                    update(Slot)
                    .where(Slot.slot_id == s.slot_id)
                    .values(dynamic_price=new_price)
                )
                # outbox event
                evt = EventsOutbox(
                    event_id=str(uuid.uuid4()),
                    event_type="pricing.adjusted",
                    payload={
                        "slot_id": s.slot_id,
                        "old_price": float(s.dynamic_price),
                        "new_price": new_price,
                        "p_free": p_free,
                        "at": dt.datetime.utcnow().isoformat(),
                    },
                )
                db.add(evt)
                changed += 1
        if changed:
            await db.commit()
            print(f"[pricing] adjusted {changed} slot prices")
