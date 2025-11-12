import os
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from app.core.config import get_settings

_settings = get_settings()

class ModelService:
    def __init__(self):
        self.model: Optional[Any] = None
        self.feature_names: List[str] = []
        self.manifest: Dict[str, Any] = {}

    def load(self):
        # Decide if model should be disabled (e.g., Vercel production free tier)
        vercel_env = os.getenv("VERCEL_ENV")
        disable_env = os.getenv("DISABLE_MODEL", "").lower() in ("1", "true", "yes")
        if _settings.disable_model or disable_env or vercel_env == "production":
            self.model = None
            self.feature_names = []
            self.manifest = {
                "model_version": "disabled",
                "loaded_from": None,
                "feature_count": 0,
                "feature_names": [],
                "disabled_reason": "Model disabled in production (free tier)"
            }
            return

        # Lazy import xgboost only when needed to avoid import error on slim images
        try:
            from xgboost import XGBClassifier  # type: ignore
        except Exception as e:
            self.model = None
            self.feature_names = []
            self.manifest = {
                "model_version": "unavailable",
                "loaded_from": None,
                "feature_count": 0,
                "feature_names": [],
                "disabled_reason": f"Model library unavailable: {e.__class__.__name__}"
            }
            return

        path = Path(_settings.model_path)
        if not path.exists():
            # fallback relative path if run from backend root
            alt = Path("model/xgb_model_reduced.pkl")
            path = alt if alt.exists() else path
        with open(path, "rb") as f:
            self.model = pickle.load(f)
        try:
            self.feature_names = self.model.get_booster().feature_names  # type: ignore
        except Exception:
            # if wrapper lacks get_booster, derive from training attributes
            self.feature_names = getattr(self.model, "feature_names_in_", [])  # type: ignore
        self.manifest = {
            "model_version": "v1",  # could be extracted from filename or metadata
            "loaded_from": str(path),
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names,
        }

    def predict_probability(self, rows: List[Dict[str, Any]]) -> List[float]:
        if self.model is None:
            raise RuntimeError("Model disabled or not loaded")
        df = pd.DataFrame(rows)
        # Order columns as training order
        if self.feature_names:
            missing = [c for c in self.feature_names if c not in df.columns]
            if missing:
                raise ValueError(f"Missing features: {missing}")
            df = df[self.feature_names]
        probs = self.model.predict_proba(df)[:, 1]  # type: ignore
        return probs.tolist()

model_service = ModelService()
