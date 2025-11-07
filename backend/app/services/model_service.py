import pickle
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd
from xgboost import XGBClassifier
from app.core.config import get_settings

_settings = get_settings()

class ModelService:
    def __init__(self):
        self.model: XGBClassifier | None = None
        self.feature_names: List[str] = []
        self.manifest: Dict[str, Any] = {}

    def load(self):
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
            raise RuntimeError("Model not loaded")
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
