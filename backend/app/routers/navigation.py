from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/navigation", tags=["navigation"])

class NavNode(BaseModel):
	id: str
	lat: float
	lng: float
	level: Optional[str] = None  # e.g., B2, B1, G, L1

class NavStep(BaseModel):
	instruction: str
	distance_m: int
	level: Optional[str] = None

class NavPath(BaseModel):
	origin: NavNode
	destination: NavNode
	nodes: List[NavNode]
	steps: List[NavStep]

@router.get("/path", response_model=NavPath,
	summary="Get indoor navigation path",
	response_description="Step-by-step navigation from origin to parking bay",
)
async def get_path(
	origin_lat: float = Query(..., description="Starting latitude", example=18.5204),
	origin_lng: float = Query(..., description="Starting longitude", example=73.8567),
	slot_id: str = Query(..., description="Target parking slot", example="LOT1_S042"),
	entrance_lat: float | None = Query(None, description="Optional entrance latitude"),
	entrance_lng: float | None = Query(None, description="Optional entrance longitude"),
):
	"""
	Generate indoor navigation path for the last 200 meters to parking bay.
	
	Returns a multi-level path with:
	- Ground level approach to entrance
	- Ramp descent through levels (B1, B2, etc.)
	- Final approach to assigned bay
	
	## Path Structure
	
	- **nodes**: Geographic waypoints with level information
	- **steps**: Turn-by-turn instructions with distances
	
	## MVP Note
	
	Currently returns synthetic paths. Production version will query
	actual indoor mapping graph per parking facility.
	"""
	# Simple synthetic path: origin -> entrance -> ramp -> bay
	origin = NavNode(id="origin", lat=origin_lat, lng=origin_lng, level="G")
	if entrance_lat is not None and entrance_lng is not None:
		entrance = NavNode(id="entrance", lat=entrance_lat, lng=entrance_lng, level="G")
	else:
		# Assume entrance ~50m east
		entrance = NavNode(id="entrance", lat=origin_lat, lng=origin_lng + 0.0005, level="G")
	ramp = NavNode(id="ramp", lat=entrance.lat - 0.0002, lng=entrance.lng + 0.0001, level="B1")
	bay = NavNode(id=f"bay:{slot_id}", lat=ramp.lat - 0.0001, lng=ramp.lng + 0.00005, level="B2")
	nodes = [origin, entrance, ramp, bay]
	steps = [
		NavStep(instruction="Drive to entrance", distance_m=60, level="G"),
		NavStep(instruction="Descend ramp to B1", distance_m=40, level="B1"),
		NavStep(instruction=f"Proceed to bay for slot {slot_id}", distance_m=30, level="B2"),
	]
	return NavPath(origin=origin, destination=bay, nodes=nodes, steps=steps)

class LocateRequest(BaseModel):
	session_id: str
	current_lat: float
	current_lng: float
	bay_label: str | None = None

@router.post("/locate", response_model=NavPath,
	summary="Locate parked car (panic mode)",
	response_description="Navigation path from current position to parked vehicle",
)
async def locate(req: LocateRequest):
	"""
	Generate path from user's current position to their parked vehicle.
	
	## Use Case: Panic Mode / Car Locator
	
	When a driver can't remember where they parked:
	1. Provide current GPS coordinates
	2. Session bay_label is used to determine vehicle location
	3. Returns step-by-step path through parking structure
	
	## Path Generation
	
	Synthesizes realistic multi-level path based on bay label.
	Production version would use actual vehicle location from session record.
	
	Ideal for:
	- Large multi-level parking facilities
	- Unfamiliar parking structures
	- Low-visibility conditions
	"""
	origin = NavNode(id="origin", lat=req.current_lat, lng=req.current_lng, level="G")
	# Fake destination based on label hash for visual variation
	import hashlib
	seed = int(hashlib.sha256((req.bay_label or "B2-A1").encode()).hexdigest(), 16) % 1000
	dlat = (seed % 10) * 0.00001
	dlng = ((seed // 10) % 10) * 0.00001
	ramp = NavNode(id="ramp", lat=req.current_lat - 0.0002, lng=req.current_lng + 0.0001, level="B1")
	dest = NavNode(id=f"bay:{req.bay_label or 'B2-A1'}", lat=ramp.lat - dlat, lng=ramp.lng + dlng, level="B2")
	steps = [
		NavStep(instruction="Proceed to internal ramp", distance_m=50, level="G"),
		NavStep(instruction="Descend to B1", distance_m=40, level="B1"),
		NavStep(instruction=f"Follow aisle to bay {req.bay_label or 'B2-A1'}", distance_m=30, level="B2"),
	]
	return NavPath(origin=origin, destination=dest, nodes=[origin, ramp, dest], steps=steps)

