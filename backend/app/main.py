import asyncio
from fastapi import FastAPI
from app.core.config import get_settings
from app.services.model_service import model_service
from app.routers import ml, auth, offers, bookings, admin, health, sessions, payments
from app.agents.predictor import predictor_loop
from app.agents.pricing_agent import pricing_loop
from app.agents.outbox_publisher import outbox_loop
from app.agents.incentives_agent import incentives_loop

settings = get_settings()

app = FastAPI(title=settings.api_name, version=settings.api_version)

# Load model at startup
@app.on_event("startup")
async def _startup():
    model_service.load()
    # start predictor loop in background (in-memory cache) until DB is ready
    asyncio.create_task(predictor_loop())
    # start pricing agent loop (DB-driven)
    asyncio.create_task(pricing_loop())
    # start outbox publisher loop
    asyncio.create_task(outbox_loop())
    # start incentives agent loop
    asyncio.create_task(incentives_loop())

app.include_router(ml.router)
app.include_router(auth.router)
app.include_router(offers.router)
app.include_router(bookings.router)
app.include_router(sessions.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(health.router)

@app.get("/")
async def root():
    return {"name": settings.api_name, "version": settings.api_version}
