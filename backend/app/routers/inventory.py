from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Location, Slot, Session as SessionModel, Booking

router = APIRouter(prefix="/inventory", tags=["inventory"])


class LotItem(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    capacity: int
    occupancy: int
    amenities: List[str] = []

class LotDetail(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    capacity: int
    occupancy: int
    amenities: List[str] = []
    slots: List[Dict[str, Any]] = []  # [{slot_id, is_ev, is_accessible, occupied}]

class LotCreateRequest(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    totalSpaces: int
    handicapSpaces: Optional[int] = 0
    evChargers: Optional[int] = 0
    amenities: List[str] = []

class LotCreateResponse(BaseModel):
    id: str
    created_slots: int
    message: str

# Ephemeral metadata store (amenities, counts) - in production would be persisted
LOT_META: Dict[str, Dict[str, Any]] = {}


@router.get("/lots", response_model=List[LotItem])
async def list_lots(db: AsyncSession = Depends(get_db)):
    loc_res = await db.execute(select(Location))
    locations = loc_res.scalars().all()
    items: List[LotItem] = []
    for loc in locations:
        cap_res = await db.execute(select(func.count()).select_from(Slot).where(Slot.location_id == loc.location_id))
        capacity = int(cap_res.scalar_one() or 0)
        # Active sessions (ended_at is NULL) for slots at this location
        occ_res = await db.execute(
            select(func.count())
            .select_from(SessionModel)
            .join(Booking, Booking.booking_id == SessionModel.booking_id)
            .join(Slot, Slot.slot_id == Booking.slot_id)
            .where(Slot.location_id == loc.location_id, SessionModel.ended_at.is_(None))
        )
        occupancy = int(occ_res.scalar_one() or 0)
        meta = LOT_META.get(loc.location_id, {})
        items.append(LotItem(
            id=loc.location_id,
            name=loc.name,
            location=loc.address,
            capacity=capacity,
            occupancy=occupancy,
            amenities=meta.get("amenities", []),
        ))
    return items

@router.get("/lots/{location_id}", response_model=LotDetail)
async def get_lot(location_id: str, db: AsyncSession = Depends(get_db)):
    loc_res = await db.execute(select(Location).where(Location.location_id == location_id))
    loc = loc_res.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="lot not found")
    cap_res = await db.execute(select(func.count()).select_from(Slot).where(Slot.location_id == location_id))
    capacity = int(cap_res.scalar_one() or 0)
    active_res = await db.execute(
        select(Booking.slot_id)
        .join(SessionModel, SessionModel.booking_id == Booking.booking_id)
        .join(Slot, Slot.slot_id == Booking.slot_id)
        .where(Slot.location_id == location_id, SessionModel.ended_at.is_(None))
    )
    occupied_slot_ids = {row[0] for row in active_res.all()}
    occ = len(occupied_slot_ids)
    slots_res = await db.execute(select(Slot).where(Slot.location_id == location_id))
    slots = slots_res.scalars().all()
    slot_payload = [
        {
            "slot_id": s.slot_id,
            "is_ev": bool(s.is_ev),
            "is_accessible": bool(s.is_accessible),
            "occupied": s.slot_id in occupied_slot_ids,
            "dynamic_price": float(s.dynamic_price),
        }
        for s in slots
    ]
    meta = LOT_META.get(location_id, {})
    return LotDetail(
        id=loc.location_id,
        name=loc.name,
        location=loc.address,
        capacity=capacity,
        occupancy=occ,
        amenities=meta.get("amenities", []),
        slots=slot_payload,
    )

@router.post("/lots", response_model=LotCreateResponse, status_code=201)
async def create_lot(req: LotCreateRequest, db: AsyncSession = Depends(get_db)):
    # Create Location
    import uuid, datetime as dt
    loc_id = str(uuid.uuid4())
    loc = Location(
        location_id=loc_id,
        provider_id=None,  # In a full system, derive provider from auth context
        name=req.name,
        address=req.address,
        entrance_lat=req.latitude,
        entrance_lng=req.longitude,
        timezone="UTC",
    )
    db.add(loc)
    # Create slots (simple numbering)
    total = req.totalSpaces
    handicap = max(0, req.handicapSpaces or 0)
    ev_count = max(0, req.evChargers or 0)
    slots_created = 0
    for i in range(total):
        slot_id = f"{loc_id}_S{i+1:03d}"
        is_accessible = i < handicap
        is_ev = (i - handicap) < ev_count if i >= handicap else False
        base_price = 20.0
        dyn = base_price
        s = Slot(
            slot_id=slot_id,
            location_id=loc_id,
            cluster_id=f"Cluster_{loc_id[:8]}",
            capacity=1,
            is_ev=is_ev,
            is_accessible=is_accessible,
            base_price=base_price,
            dynamic_price=dyn,
        )
        db.add(s)
        slots_created += 1
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    # Store meta
    LOT_META[loc_id] = {"amenities": req.amenities}
    return LotCreateResponse(id=loc_id, created_slots=slots_created, message="lot created")


class SlotItem(BaseModel):
    slot_id: str
    location_id: Optional[str]
    cluster_id: str
    base_price: float
    dynamic_price: float
    is_ev: bool
    is_accessible: bool


@router.get("/slots", response_model=List[SlotItem])
async def list_slots(location_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Slot)
    if location_id:
        q = q.where(Slot.location_id == location_id)
    res = await db.execute(q)
    slots = res.scalars().all()
    return [
        SlotItem(
            slot_id=s.slot_id,
            location_id=s.location_id,
            cluster_id=s.cluster_id,
            base_price=float(s.base_price),
            dynamic_price=float(s.dynamic_price),
            is_ev=bool(s.is_ev),
            is_accessible=bool(s.is_accessible),
        ) for s in slots
    ]
