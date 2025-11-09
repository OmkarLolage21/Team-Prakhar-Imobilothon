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

@router.get("/addons", response_model=List[AddOn],
	summary="List available service add-ons",
	response_description="Marketplace of ancillary services",
)
async def list_addons():
	"""
	Retrieve available service add-ons for booking enhancement.
	
	## Add-on Categories
	
	- **care**: Vehicle cleaning and maintenance services
	- **ev**: Electric vehicle charging options
	- **experience**: Premium services (valet, concierge)
	
	## Integration
	
	Add-on IDs can be included in booking creation via `add_on_ids` field.
	Prices are added to total booking cost.
	
	## Example Add-ons
	
	- Basic Wash (₹150)
	- Premium Wash (₹400)
	- Fast Charge 30m (₹250)
	- Valet Assist (₹200)
	"""
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

@router.post("/ev_pair", response_model=EVPairingResponse,
	summary="Request EV charger pairing",
	response_description="Predicted charger assignment with schedule",
)
async def ev_pair(req: EVPairingRequest):
	"""
	Pair an electric vehicle booking with an available charger.
	
	## Algorithm (MVP Stub)
	
	Returns synthetic pairing with:
	- Nearest available charger to parking slot
	- Estimated kWh delivery based on request
	- Time estimate (assumes ~3 min per kWh for Level 2)
	- Confidence score for charger availability
	
	## Production Enhancement
	
	Full implementation would:
	- Query real charger availability from facility IoT
	- Consider charger type (Level 2 vs DC Fast)
	- Schedule based on grid load and pricing
	- Reserve charger alongside parking slot
	
	## Confidence Interpretation
	
	- **>0.8**: Charger highly likely to be available
	- **0.6-0.8**: Moderate confidence, backup suggested
	- **<0.6**: High contention, consider alternative time
	"""
	# Stub: In real system we'd look up chargers near slot and compute schedule
	# For now return synthetic pairing with modest confidence
	return EVPairingResponse(
		slot_id=req.booking_slot_id,
		charger_id="charger-demo-1",
		est_kwh=min(req.desired_kwh, 15.0),
		est_time_min=int(min(req.desired_kwh, 15.0) * 3),
		confidence=0.74,
	)

