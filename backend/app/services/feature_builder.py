from datetime import datetime
from typing import Dict, Any, Optional

DEFAULTS = {
    "past_1h_occ": 0.5,
    "past_3h_occ": 0.5,
    "past_6h_occ": 0.5,
    "capacity": 100,
    "base_price": 40.0,
    "dynamic_price": 40.0,
    "cluster_id": 1,
    "traffic_index": 50.0,
    "weather_precip": 0.0,
    "forecast_precip_next1h": 0.0,
    "weather_temp": 25.0,
    "forecast_temp_next1h": 25.0,
    "is_holiday": 0,
    "event_flag": 0,
}

FEATURE_ORDER = [
    'past_1h_occ','dynamic_price','past_3h_occ','capacity','past_6h_occ','base_price',
    'cluster_id','traffic_index','weather_precip','month','forecast_precip_next1h','dayofweek',
    'hour','weather_temp','forecast_temp_next1h','is_holiday','event_flag','is_weekend'
]


def build_features(eta_iso: str, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Return a complete feature dict using defaults + time-derived fields + overrides.
    eta_iso: ISO8601 string
    overrides: any supplied values to override defaults
    """
    overrides = overrides or {}
    dt_obj = datetime.fromisoformat(eta_iso.replace("Z", "+00:00"))
    base = DEFAULTS.copy()
    # Time-derived
    base["month"] = dt_obj.month
    base["dayofweek"] = dt_obj.weekday()
    base["hour"] = dt_obj.hour
    base["is_weekend"] = 1 if base["dayofweek"] in (5, 6) else 0
    # Merge overrides
    base.update(overrides)
    # Ensure dynamic_price defaults to base_price if missing
    if "dynamic_price" not in overrides:
        base["dynamic_price"] = base.get("base_price", 40.0)
    # Order is handled by model service; we just ensure all keys exist
    # Fill any missing required at the end
    for k in FEATURE_ORDER:
        if k not in base:
            base[k] = 0
    return base
