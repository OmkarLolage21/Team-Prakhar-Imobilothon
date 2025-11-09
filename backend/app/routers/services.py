from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/services", tags=["services"])

class AddOn(BaseModel):
	id: str
	code: str
	name: str
	description: Optional[str] = None
	price_inr: int
	category: str
	recommended: bool = False

ADDONS: List[AddOn] = [
	AddOn(id="a1", code="wash_basic", name="Basic Wash", description="Exterior rinse", price_inr=150, category="care", recommended=True),
	AddOn(id="a2", code="wash_premium", name="Premium Wash", description="Full exterior + interior", price_inr=400, category="care"),
	AddOn(id="a3", code="ev_fast", name="Fast Charge 30m", description="30 minute DC fast charge", price_inr=250, category="ev", recommended=True),
	AddOn(id="a4", code="valet", name="Valet Assist", description="Staff parks vehicle", price_inr=200, category="experience"),
]

@router.get("/addons", response_model=List[AddOn])
async def list_addons():
	return ADDONS

class EVPairingRequest(BaseModel):
	booking_slot_id: str
	desired_kwh: float = 10.0
	eta: str

class EVPairingResponse(BaseModel):
	slot_id: str
	charger_id: str
	est_kwh: float
	est_time_min: int
	confidence: float

@router.post("/ev_pair", response_model=EVPairingResponse)
async def ev_pair(req: EVPairingRequest):
	# Stub: In real system we'd look up chargers near slot and compute schedule
	# For now return synthetic pairing with modest confidence
	return EVPairingResponse(
		slot_id=req.booking_slot_id,
		charger_id="charger-demo-1",
		est_kwh=min(req.desired_kwh, 15.0),
		est_time_min=int(min(req.desired_kwh, 15.0) * 3),
		confidence=0.74,
	)

