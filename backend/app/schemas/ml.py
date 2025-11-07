from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    rows: List[Dict[str, Any]] = Field(default_factory=list, description="Raw feature rows")

class PredictResponse(BaseModel):
    probabilities: List[float]

class PredictByEtaRequest(BaseModel):
    slot_id: str = "S123"
    eta: str
    overrides: Optional[Dict[str, Any]] = None

class ModelInfo(BaseModel):
    model_version: str
    loaded_from: str
    feature_count: int
    feature_names: List[str]
    # Silence 'model_' namespace warning in Pydantic v2
    model_config = {"protected_namespaces": ()}

class AgentsConfig(BaseModel):
    pricing_step: float = 0.1
    price_min_multiplier: float = 0.5
    price_max_multiplier: float = 2.0
    reliability_threshold: float = 0.7
    backups_limit: int = 2
    stale_minutes: int = 60
