import asyncio
import sys

# Set Windows event loop policy BEFORE importing modules that touch psycopg engine
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore[attr-defined]
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.services.model_service import model_service
from app.routers import ml, auth, offers, bookings, admin, health, sessions, payments
from app.routers import profile, vehicles, navigation, carbon, services, violations
from app.routers import inventory as inventory_router
from app.routers import analytics as analytics_router
from app.agents.predictor import predictor_loop
from app.agents.pricing_agent import pricing_loop
from app.agents.outbox_publisher import outbox_loop
from app.agents.incentives_agent import incentives_loop

settings = get_settings()

app = FastAPI(title=settings.api_name, version=settings.api_version)

# CORS: allow local provider web app & wildcard for dev if env var not set
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
extra_origin = getattr(settings, "frontend_origin", None)
if extra_origin and extra_origin not in allowed_origins:
    allowed_origins.append(extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-request-id"],
    max_age=600,
)

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
app.include_router(inventory_router.router)
app.include_router(analytics_router.router)
app.include_router(admin.router)
app.include_router(health.router)
app.include_router(profile.router)
app.include_router(vehicles.router)
app.include_router(navigation.router)
app.include_router(carbon.router)
app.include_router(services.router)
app.include_router(violations.router)

@app.get("/")
async def root():
    return {"name": settings.api_name, "version": settings.api_version}
