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

@router.get("/session/{session_id}", response_model=CarbonSession)
async def carbon_for_session(session_id: str):
	grams = random.uniform(120.0, 540.0)
	score = max(0.0, 100.0 - (grams / 6.0))  # simplistic inverse mapping
	recs = [
		"Consider EV parking spots for reduced idling",
		"Arrive closer to ETA to minimize circling",
		"Use smart hold mode on low confidence offers",
	]
	return CarbonSession(session_id=session_id, grams_co2=round(grams, 2), efficiency_score=round(score, 1), recommendations=recs)

@router.get("/dashboard", response_model=CarbonDashboard)
async def carbon_dashboard():
	sessions = 42
	total = 42 * 320.5
	avg = total / sessions
	tip = "Enable EV pairing to cut idle emissions" if random.random() < 0.5 else "Use accessibility routes to avoid detours"
	return CarbonDashboard(total_sessions=sessions, total_co2_grams=round(total, 1), avg_per_session=round(avg, 1), top_reducer_tip=tip)

