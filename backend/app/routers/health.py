from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.db import SessionLocal
from app.agents.predictor import PREDICTOR_STATUS

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/db")
async def health_db():
    if SessionLocal is None:
        return {"ok": False, "reason": "db_not_configured"}
    try:
        async with SessionLocal() as db:  # type: ignore
            await db.execute(text("select 1"))
        return {"ok": True}
    except SQLAlchemyError as e:
        return {"ok": False, "error": str(e)}

@router.get("/predictor")
async def health_predictor():
    return {"ok": PREDICTOR_STATUS.get("last_run") is not None, **PREDICTOR_STATUS}
