from typing import List
from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from app.core.db import get_db, SessionLocal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Slot, SlotPrediction

router = APIRouter(prefix="/offers", tags=["offers"])

class Offer(BaseModel):
    slot_id: str
    cluster_id: str
    distance_m: int
    eta_minute: str
    p_free: float
    price: float
    mode_options: List[str] = ["guaranteed", "smart_hold"]
    ev: bool = False
    accessible: bool = False

@router.get("/search", response_model=List[Offer])
async def search_offers(
    lat: float = Query(...),
    lng: float = Query(...),
    eta: str = Query(...),
    window_minutes: int = Query(60, ge=5, le=240),
    db: AsyncSession = Depends(get_db),
):
    """Return offers using bounded nearest prediction (±60m) and dual before/after queries.
    Hardened logic:
      1. Bounds time window to avoid very old/far predictions.
      2. Gets at most one prediction before and one after requested eta, chooses closest.
      3. Skips slot if no prediction within window.
    """
    from datetime import datetime, timedelta
    eta_dt = datetime.fromisoformat(eta.replace("Z", "+00:00"))
    window = timedelta(minutes=window_minutes)
    lower = eta_dt - window
    upper = eta_dt + window

    # Fetch candidate slots (limit for demo)
    res = await db.execute(select(Slot).limit(50))
    slots = res.scalars().all()
    offers: List[Offer] = []

    for s in slots:
        # prediction before
        before_q = await db.execute(
            select(SlotPrediction)
            .where(SlotPrediction.slot_id == s.slot_id, SlotPrediction.eta_minute <= eta_dt, SlotPrediction.eta_minute >= lower)
            .order_by(SlotPrediction.eta_minute.desc())
            .limit(1)
        )
        before = before_q.scalar_one_or_none()
        # prediction after
        after_q = await db.execute(
            select(SlotPrediction)
            .where(SlotPrediction.slot_id == s.slot_id, SlotPrediction.eta_minute >= eta_dt, SlotPrediction.eta_minute <= upper)
            .order_by(SlotPrediction.eta_minute.asc())
            .limit(1)
        )
        after = after_q.scalar_one_or_none()
        chosen = None
        if before and after:
            # choose closer by absolute time delta
            if abs((before.eta_minute - eta_dt).total_seconds()) <= abs((after.eta_minute - eta_dt).total_seconds()):
                chosen = before
            else:
                chosen = after
        else:
            chosen = before or after
        if not chosen:
            continue  # no prediction in window
        offers.append(Offer(
            slot_id=s.slot_id,
            cluster_id=s.cluster_id,
            distance_m=200,
            eta_minute=eta,
            p_free=float(chosen.p_free),
            price=float(s.dynamic_price),
            ev=bool(s.is_ev),
            accessible=bool(s.is_accessible),
        ))
    offers.sort(key=lambda o: (-o.p_free, o.price, o.distance_m))
    return offers
