# Predictive Parking Marketplace Backend (Prototype)

## Stack

- FastAPI for HTTP API & ML inference
- XGBoost model loaded from `backend/model/xgb_model_reduced.pkl`
- Simple in-memory configs and mock data (no DB yet)

## Quick Start (Windows PowerShell)

```powershell
# (Optional) create & activate virtual environment if not already in myenv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt

# Run FastAPI (auto reload for dev)
uvicorn app.main:app --reload --port 8000
```

## Endpoints (Initial)

- `GET /` root info
- `GET /ml/model/info` model manifest
- `POST /ml/predict` raw batch prediction (body: {"rows": [...]})
- `GET /ml/predictions?slot_id=S123&eta=2025-11-07T09:30:00Z` single prediction building features
- `POST /ml/predictions` same via JSON body with overrides
- `GET /ml/agents/config` / `PUT /ml/agents/config`
- `POST /auth/login` -> JWT (demo user: demo@user.com / demo)
- `GET /offers/search?lat=..&lng=..&eta=ISO8601` returns mock ranked offers

## Example Predict Request

```json
POST /ml/predict
{
  "rows": [
    {
      "past_1h_occ": 0.8, "dynamic_price": 50, "past_3h_occ": 0.7, "capacity": 100,
      "past_6h_occ": 0.6, "base_price": 40, "cluster_id": 3, "traffic_index": 55,
      "weather_precip": 0.2, "month": 11, "forecast_precip_next1h": 0.3,
      "dayofweek": 2, "hour": 17, "weather_temp": 30, "forecast_temp_next1h": 29,
      "is_holiday": 0, "event_flag": 1, "is_weekend": 0
    }
  ]
}
```

## Next Steps (Roadmap)

Phase 1 (Data Core):

1. Apply Supabase SQL (Lean Core 12 tables + events_outbox). Add DATABASE_URL to `.env` and restart API.
2. Implement SQLAlchemy models + CRUD for `slots`, `slot_observations`, `slot_predictions`.
3. Replace mock offers with DB-driven query (join predictions for requested ETA window).

Phase 2 (Predictor & Reliability Agents): 4. Background Predictor task: every 30 min build features & insert horizon rows into `slot_predictions`. 5. Reliability check: when booking created (smart_hold) evaluate prediction; enqueue backups in `booking_candidate`. 6. Publish Kafka events via outbox inserts (`enqueue_event`).

Phase 3 (Booking & Sessions): 7. Implement booking endpoints (`POST /book`, `GET /bookings/{id}`, swap backups). 8. Session lifecycle endpoints (`/validate`, `/sessions/{id}/extend`, `/sessions/{id}/end`).

Phase 4 (Dynamic Pricing & Incentives): 9. Pricing agent adjusts `slots.dynamic_price` bounded by min/max multipliers; record `pricing_changes`. 10. Incentive agent proposes time-shift / cluster-shift offers stored in `incentives`.

Phase 5 (Data Quality & Trust): 11. Populate `slot_health` & `provider_reliability_score`; emit alerts.

Phase 6 (Feature Packs): 12. Indoor navigation, EV pairing, services/add-ons, carbon savings.

Cross-Cutting:

- Add Kafka consumer/producer (e.g., aiokafka) using `kafka_bootstrap_servers`.
- Introduce caching layer (Redis) for hot predictions/offers.
- Add metrics (Prometheus) & structured logging.

---

Prototype authored automatically; refine as needed.
