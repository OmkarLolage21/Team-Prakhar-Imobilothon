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

@router.get("/active", response_model=List[Violation],
    summary="Get active violations",
    response_description="Current violations requiring attention",
)
async def active():
    """
    Retrieve active parking violations detected by monitoring agents.
    
    ## Violation Types
    
    - **overstay**: Session exceeded grace period
    - **misuse**: Unauthorized use of slot (e.g., non-EV in EV bay)
    - **invalid_validation**: Session started without proper validation
    
    ## Severity Levels
    
    - **info**: Informational, no immediate action
    - **warn**: Grace period expiring, proactive outreach
    - **critical**: Requires staff intervention
    
    ## Recommended Actions
    
    System suggests next steps like:
    - Offering extension to overstay driver
    - Dispatching security for misuse
    - Sending automated notification
    
    ## MVP Note
    
    Returns synthetic demo violations. Production uses real-time monitoring.
    """
    now = dt.datetime.utcnow().isoformat()
    return [
        Violation(id="v1", session_id="sess-demo-1", kind="overstay", severity="warn", detected_at=now, recommended_action="Offer grace extension"),
        Violation(id="v2", session_id="sess-demo-2", kind="misuse", severity="critical", detected_at=now, recommended_action="Dispatch staff check"),
    ]

@router.get("/stats", response_model=ViolationStats,
    summary="Get violation statistics",
    response_description="Aggregated violation counts",
)
async def stats():
    """
    Retrieve summary statistics for parking violations.
    
    Provides counts for:
    - **active**: Currently unresolved violations
    - **today**: Total violations detected in last 24 hours
    - **overstay**: Breakdown of overstay incidents
    - **misuse**: Breakdown of misuse incidents
    
    Useful for:
    - Dashboard KPI cards
    - Trend analysis
    - Staff allocation planning
    """
    return ViolationStats(active=2, today=5, overstay=3, misuse=2)
