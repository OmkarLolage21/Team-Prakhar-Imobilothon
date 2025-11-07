from typing import List
from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from app.core.db import get_db, SessionLocal
from sqlalchemy import select, func
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
async def search_offers(lat: float = Query(...), lng: float = Query(...), eta: str = Query(...), db: AsyncSession = Depends(get_db)):
    # DB-first: fetch slots and nearest prediction per slot for requested eta. No in-memory fallback.
    offers: List[Offer] = []
    # Fetch a handful of slots for demo (geo filtering can be added later)
    res = await db.execute(select(Slot).limit(20))
    slots = res.scalars().all()
    from datetime import datetime
    eta_dt = datetime.fromisoformat(eta.replace("Z", "+00:00"))

    for s in slots:
        # nearest prediction by absolute time diff
        diff = func.abs(func.extract('epoch', SlotPrediction.eta_minute - eta_dt))
        pr_res = await db.execute(
            select(SlotPrediction.p_free)
            .where(SlotPrediction.slot_id == s.slot_id)
            .order_by(diff)
            .limit(1)
        )
        p = pr_res.scalar_one_or_none()
        if p is None:
            continue  # skip slots without predictions
        offers.append(Offer(
            slot_id=s.slot_id,
            cluster_id=s.cluster_id,
            distance_m=200,  # placeholder until geo
            eta_minute=eta,
            p_free=float(p),
            price=float(s.dynamic_price),
            ev=bool(s.is_ev),
            accessible=bool(s.is_accessible),
        ))
    offers.sort(key=lambda o: (-o.p_free, o.price, o.distance_m))
    return offers
