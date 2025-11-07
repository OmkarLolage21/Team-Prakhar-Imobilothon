from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import SessionLocal
from app.models import Slot
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
