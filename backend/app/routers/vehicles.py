from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

class Vehicle(BaseModel):
    id: str
    plate: str
    make: str
    model: str
    type: str = "car"  # car|bike|van|ev_car (frontend can refine)
    isEV: bool = False
    needsAccessibility: bool = False

class VehicleCreateRequest(BaseModel):
    plate: str
    make: str
    model: str
    type: str = "car"
    isEV: bool = False
    needsAccessibility: bool = False

_vehicles: List[Vehicle] = [
    Vehicle(id=str(uuid.uuid4()), plate="MH12AB1234", make="Maruti", model="Baleno", type="car", isEV=False, needsAccessibility=False),
    Vehicle(id=str(uuid.uuid4()), plate="MH14EV4321", make="Tata", model="Nexon", type="ev_car", isEV=True, needsAccessibility=False),
]

@router.get("/", response_model=List[Vehicle],
    summary="List user vehicles",
    response_description="All vehicles registered to the user",
)
async def list_vehicles():
    """
    Retrieve all vehicles registered to the authenticated user.
    
    ## Vehicle Attributes
    
    - **type**: Vehicle category (car, bike, van, ev_car)
    - **isEV**: Electric vehicle flag (affects slot filtering)
    - **needsAccessibility**: Requires accessible parking
    
    ## Use Cases
    
    - Vehicle selection during booking
    - Profile management
    - EV-compatible offer filtering
    
    ## MVP Note
    
    Returns demo vehicles. Production would filter by authenticated user_id.
    """
    return _vehicles

@router.post("/", response_model=Vehicle, status_code=201,
    summary="Add a new vehicle",
    response_description="Created vehicle record",
)
async def add_vehicle(req: VehicleCreateRequest):
    """
    Register a new vehicle to the user's profile.
    
    ## Required Fields
    
    - **plate**: License plate number (unique identifier)
    - **make**: Manufacturer (e.g., Tata, Maruti)
    - **model**: Model name
    
    ## Optional Fields
    
    - **type**: Defaults to "car" if not specified
    - **isEV**: Set true for electric vehicles
    - **needsAccessibility**: Set true if accessible parking required
    
    ## EV Benefits
    
    EVs automatically:
    - Filter for EV-compatible parking slots
    - Enable charger pairing requests
    - Track carbon savings
    
    ## Validation
    
    Plate uniqueness not enforced in MVP but recommended for production.
    """
    v = Vehicle(id=str(uuid.uuid4()), **req.dict())
    _vehicles.append(v)
    return v

@router.delete("/{vehicle_id}",
    summary="Delete a vehicle",
    response_description="Deletion confirmation",
)
async def delete_vehicle(vehicle_id: str):
    """
    Remove a vehicle from the user's profile.
    
    ## Effects
    
    - Vehicle removed from selection options
    - Active bookings with this vehicle remain valid
    - Historical records preserved
    
    ## Error Cases
    
    Returns 404 if vehicle_id not found.
    """
    global _vehicles
    found = next((x for x in _vehicles if x.id == vehicle_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="vehicle not found")
    _vehicles = [x for x in _vehicles if x.id != vehicle_id]
    return {"ok": True}
