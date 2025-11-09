from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import random

router = APIRouter(prefix="/carbon", tags=["carbon"])

class CarbonSession(BaseModel):
	session_id: str
	grams_co2: float
	efficiency_score: float  # 0-100
	recommendations: list[str]

class CarbonDashboard(BaseModel):
	total_sessions: int
	total_co2_grams: float
	avg_per_session: float
	top_reducer_tip: Optional[str]

@router.get("/session/{session_id}", response_model=CarbonSession,
	summary="Get carbon footprint for session",
	response_description="CO2 emissions and efficiency score",
)
async def carbon_for_session(session_id: str):
	"""
	Calculate carbon footprint for a parking session.
	
	## Metrics
	
	- **grams_co2**: Estimated CO2 emissions from driving, idling, and searching
	- **efficiency_score**: 0-100 rating (higher is better)
	- **recommendations**: Actionable tips to reduce future emissions
	
	## Calculation Factors
	
	- Distance traveled to parking
	- Time spent circling/searching
	- Idling time
	- EV vs ICE vehicle type
	
	## Recommendations
	
	System suggests improvements like:
	- Using EV slots to reduce idle emissions
	- Arriving closer to predicted ETA
	- Choosing smart_hold for uncertain availability
	
	## MVP Note
	
	Currently returns synthetic data. Production would integrate:
	- Actual GPS tracking data
	- Vehicle type from user profile
	- Real-time traffic conditions
	"""
	grams = random.uniform(120.0, 540.0)
	score = max(0.0, 100.0 - (grams / 6.0))  # simplistic inverse mapping
	recs = [
		"Consider EV parking spots for reduced idling",
		"Arrive closer to ETA to minimize circling",
		"Use smart hold mode on low confidence offers",
	]
	return CarbonSession(session_id=session_id, grams_co2=round(grams, 2), efficiency_score=round(score, 1), recommendations=recs)

@router.get("/dashboard", response_model=CarbonDashboard,
	summary="Get carbon dashboard summary",
	response_description="Aggregated carbon metrics across all sessions",
)
async def carbon_dashboard():
	"""
	Retrieve aggregated carbon footprint statistics.
	
	## Dashboard Metrics
	
	- **total_sessions**: Count of sessions analyzed
	- **total_co2_grams**: Cumulative CO2 emissions
	- **avg_per_session**: Mean emissions per parking event
	- **top_reducer_tip**: Highest-impact reduction recommendation
	
	## Use Cases
	
	- Sustainability reporting
	- User carbon awareness campaigns
	- Facility green certification data
	- Comparative benchmarking
	
	## Future Enhancements
	
	- Time-series trends
	- Per-facility breakdown
	- User leaderboards
	- Carbon offset integration
	"""
	sessions = 42
	total = 42 * 320.5
	avg = total / sessions
	tip = "Enable EV pairing to cut idle emissions" if random.random() < 0.5 else "Use accessibility routes to avoid detours"
	return CarbonDashboard(total_sessions=sessions, total_co2_grams=round(total, 1), avg_per_session=round(avg, 1), top_reducer_tip=tip)

