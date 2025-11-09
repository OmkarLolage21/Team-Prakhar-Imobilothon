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

app = FastAPI(
    title=settings.api_name,
    version=settings.api_version,
    description="""
# Team Prakhar IMobilothon Smart Parking Platform

A comprehensive parking management system with AI-powered availability prediction, dynamic pricing, 
and real-time session management.

## Key Features

* 🎯 **Smart Booking** - ML-powered availability predictions with confidence scoring
* ⚡ **Dynamic Pricing** - Real-time price optimization based on demand
* 🚗 **Session Management** - Complete parking lifecycle from booking to payment
* 🔋 **EV Support** - Electric vehicle charging pairing and scheduling
* 📍 **Indoor Navigation** - Last-200m guidance to parking bay
* 📊 **Analytics** - Revenue, occupancy, and carbon footprint tracking
* 🚨 **Violation Detection** - Automated overstay and misuse monitoring

## Authentication

Currently uses demo mode.

## Rate Limiting

Not implemented in MVP.
    """,
    openapi_tags=[
        {
            "name": "offers",
            "description": "Search and discover available parking slots with ML-powered confidence scores",
        },
        {
            "name": "bookings",
            "description": "Create, retrieve, and swap parking reservations with backup slot management",
        },
        {
            "name": "sessions",
            "description": "Manage active parking sessions from validation to completion",
        },
        {
            "name": "simulate payments",
            "description": "Handle pre-authorization, capture, and refunds for parking charges",
        },
        {
            "name": "inventory",
            "description": "Manage parking lots, slots, and real-time occupancy data",
        },
        {
            "name": "analytics",
            "description": "Revenue reports, occupancy trends, and business intelligence",
        },
        {
            "name": "profile",
            "description": "User profile management and preferences",
        },
        {
            "name": "vehicles",
            "description": "Manage user vehicles with EV and accessibility attributes",
        },
        {
            "name": "navigation",
            "description": "Indoor navigation paths and car locator services",
        },
        {
            "name": "services",
            "description": "Add-ons marketplace and EV charger pairing",
        },
        {
            "name": "violations",
            "description": "Overstay detection, misuse alerts, and violation statistics",
        },
        {
            "name": "carbon",
            "description": "Carbon footprint tracking and efficiency scoring",
        },
        {
            "name": "health",
            "description": "System health checks for database and ML agents",
        },
        {
            "name": "ml",
            "description": "Machine learning model management and predictions",
        },
        {
            "name": "auth",
            "description": "Authentication and authorization (demo mode)",
        },
        {
            "name": "admin",
            "description": "Administrative operations and system configuration",
        },
    ],
)

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
