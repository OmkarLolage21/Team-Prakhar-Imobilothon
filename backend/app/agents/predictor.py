import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.feature_builder import build_features
from app.services.model_service import model_service
from app.services.inmemory_store import SLOTS as MEM_SLOTS
from app.core.db import SessionLocal
from app.models import Slot, SlotPrediction

# Expose simple status for health endpoint
PREDICTOR_STATUS: dict = {"last_run": None, "rows": 0, "slots": 0}

# In-memory store (prototype fallback until DB ready)
PREDICTIONS: Dict[str, Dict[str, float]] = {}

async def predictor_loop(cadence_sec: int = 1200, horizon_min: int = 60, step_min: int = 15):
    """Periodically compute predictions for all slots for the next horizon and cache in memory.
    cadence_sec: how often to run (default 20 min)
    horizon_min: prediction horizon in minutes
    step_min: granularity in minutes
    """
    await asyncio.sleep(1)  # small delay to let app fully start
    while True:
        try:
            await run_once(horizon_min=horizon_min, step_min=step_min)
        except Exception as e:
            # log later; for now print
            print("[predictor_loop] error:", e)
        await asyncio.sleep(cadence_sec)

async def run_once(horizon_min: int = 60, step_min: int = 15):
    now = datetime.now(timezone.utc)
    etas = [now + timedelta(minutes=m) for m in range(step_min, horizon_min + 1, step_min)]

    # 1) Determine slots source: DB if available and non-empty, else in-memory
    slots: List[Dict[str, Any]] = []
    if SessionLocal is not None:
        try:
            async with SessionLocal() as db:  # type: ignore
                res = await db.execute(select(Slot).limit(100))
                db_slots = res.scalars().all()
                if db_slots:
                    for s in db_slots:
                        slots.append({
                            "slot_id": s.slot_id,
                            "cluster_id": s.cluster_id,
                            "base_price": float(s.base_price),
                            "dynamic_price": float(s.dynamic_price),
                        })
        except Exception as e:
            print("[predictor] DB slot fetch failed, falling back to memory:", e)
    if not slots:
        slots = [
            {"slot_id": s["slot_id"], "cluster_id": s["cluster_id"], "base_price": s["base_price"], "dynamic_price": s["dynamic_price"]}
            for s in MEM_SLOTS
        ]

    # 2) Build feature rows
    rows: List[Dict[str, Any]] = []
    meta: List[Dict[str, Any]] = []
    for slot in slots:
        for eta in etas:
            overrides = {
                "cluster_id": 1 if slot["cluster_id"] == "C_A1" else 2,
                "base_price": slot["base_price"],
                "dynamic_price": slot["dynamic_price"],
            }
            feat = build_features(eta_iso=eta.isoformat(), overrides=overrides)
            rows.append(feat)
            meta.append({"slot_id": slot["slot_id"], "eta": eta})
    if not rows:
        return

    # 3) Predict
    probs = model_service.predict_probability(rows)

    # 4) Update in-memory cache
    for m, p in zip(meta, probs):
        slot = m["slot_id"]
        eta: datetime = m["eta"]
        PREDICTIONS.setdefault(slot, {})[eta.isoformat()] = float(p)

    # Prune old etas
    for slot_id, mp in list(PREDICTIONS.items()):
        to_del = [k for k in mp.keys() if k < now.isoformat()]
        for k in to_del:
            del mp[k]

    # Update status
    PREDICTOR_STATUS.update({
        "last_run": now.isoformat(),
        "rows": len(probs),
        "slots": len(slots),
    })

    # 5) Persist to DB if configured
    if SessionLocal is not None:
        try:
            async with SessionLocal() as db:  # type: ignore
                # Ensure slots exist first to avoid FK violations
                await _upsert_slots(db, slots)
                await _upsert_predictions(db, meta, probs)
                await db.commit()
        except Exception as e:
            print("[predictor] DB upsert failed:", e)

async def _upsert_slots(db: AsyncSession, slots: List[Dict[str, Any]]):
    if not slots:
        return
    ids = [s["slot_id"] for s in slots]
    # Find which slots already exist
    res = await db.execute(select(Slot.slot_id).where(Slot.slot_id.in_(ids)))
    existing = {r[0] for r in res.all()}
    to_create = [s for s in slots if s["slot_id"] not in existing]
    if not to_create:
        return
    values = []
    for s in to_create:
        values.append({
            "slot_id": s["slot_id"],
            "location_id": None,
            "cluster_id": s.get("cluster_id", "C_A1"),
            "capacity": 1,
            "is_ev": False,
            "is_accessible": False,
            "base_price": float(s.get("base_price", 30.0)),
            "dynamic_price": float(s.get("dynamic_price", s.get("base_price", 30.0))),
        })
    stmt = pg_insert(Slot).values(values).on_conflict_do_nothing(index_elements=[Slot.slot_id])
    await db.execute(stmt)

async def _upsert_predictions(db: AsyncSession, meta: List[Dict[str, Any]], probs: List[float]):
    if not meta:
        return
    model_version = (model_service.manifest or {}).get("model_version", "v1")
    values = []
    for m, p in zip(meta, probs):
        values.append({
            "slot_id": m["slot_id"],
            "eta_minute": m["eta"],  # datetime with tz
            "p_free": float(p),
            "conf_low": None,
            "conf_high": None,
            "model_version": model_version,
        })
    stmt = pg_insert(SlotPrediction).values(values)
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
