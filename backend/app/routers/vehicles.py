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

@router.get("/", response_model=List[Vehicle])
async def list_vehicles():
    return _vehicles

@router.post("/", response_model=Vehicle, status_code=201)
async def add_vehicle(req: VehicleCreateRequest):
    v = Vehicle(id=str(uuid.uuid4()), **req.dict())
    _vehicles.append(v)
    return v

@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    global _vehicles
    found = next((x for x in _vehicles if x.id == vehicle_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="vehicle not found")
    _vehicles = [x for x in _vehicles if x.id != vehicle_id]
    return {"ok": True}
