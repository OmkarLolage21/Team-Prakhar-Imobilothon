from fastapi import APIRouter, HTTPException
from app.services.model_service import model_service
from app.services.feature_builder import build_features
from app.schemas.ml import PredictRequest, PredictResponse, PredictByEtaRequest, ModelInfo, AgentsConfig

router = APIRouter(prefix="/ml", tags=["ml"])

# In-memory agents config for prototype
_AGENTS_CONFIG = AgentsConfig()

@router.get("/model/info", response_model=ModelInfo)
async def model_info():
    if not model_service.manifest:
        raise HTTPException(status_code=500, detail="Model not loaded")
    return model_service.manifest  # type: ignore

@router.get("/status")
async def model_status():
    """Lightweight status endpoint for frontends to detect whether model is active.

    Returns:
        {"model_loaded": bool, "disabled_reason": str | None, "model_version": str | None}
    """
    m = model_service.manifest or {}
    version = m.get("model_version")
    disabled_reason = m.get("disabled_reason")
    loaded = version not in (None, "disabled", "unavailable")
    return {"model_loaded": loaded, "disabled_reason": disabled_reason, "model_version": version}

@router.get("/agents/config", response_model=AgentsConfig)
async def get_agents_config():
    return _AGENTS_CONFIG

@router.put("/agents/config", response_model=AgentsConfig)
async def put_agents_config(cfg: AgentsConfig):
    global _AGENTS_CONFIG
    _AGENTS_CONFIG = cfg
    return _AGENTS_CONFIG

@router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not req.rows:
        raise HTTPException(status_code=400, detail="rows array required")
    probs = model_service.predict_probability(req.rows)
    return PredictResponse(probabilities=probs)

@router.get("/predictions")
async def predict_by_query(slot_id: str, eta: str):
    feat = build_features(eta_iso=eta, overrides={"cluster_id": 1})
    probs = model_service.predict_probability([feat])
    return {"slot_id": slot_id, "eta": eta, "p_free": probs[0]}

@router.post("/predictions", response_model=PredictResponse)
async def predict_by_eta(req: PredictByEtaRequest):
    feat = build_features(eta_iso=req.eta, overrides=req.overrides or {})
    probs = model_service.predict_probability([feat])
    return PredictResponse(probabilities=probs)
