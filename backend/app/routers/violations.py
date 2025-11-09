from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import datetime as dt

router = APIRouter(prefix="/violations", tags=["violations"])

class Violation(BaseModel):
    id: str
    session_id: str
    kind: str  # overstay|misuse|invalid_validation
    severity: str  # info|warn|critical
    detected_at: str
    recommended_action: str | None = None

class ViolationStats(BaseModel):
    active: int
    today: int
    overstay: int
    misuse: int

@router.get("/active", response_model=List[Violation])
async def active():
    now = dt.datetime.utcnow().isoformat()
    return [
        Violation(id="v1", session_id="sess-demo-1", kind="overstay", severity="warn", detected_at=now, recommended_action="Offer grace extension"),
        Violation(id="v2", session_id="sess-demo-2", kind="misuse", severity="critical", detected_at=now, recommended_action="Dispatch staff check"),
    ]

@router.get("/stats", response_model=ViolationStats)
async def stats():
    return ViolationStats(active=2, today=5, overstay=3, misuse=2)
