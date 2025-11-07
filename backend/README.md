# Predictive Parking Marketplace Backend (Prototype)

## Stack

- FastAPI for HTTP API & ML inference
- XGBoost model loaded from `backend/model/xgb_model_reduced.pkl`
- Async SQLAlchemy + Postgres (Supabase) for persistence
- Background agents: predictor (horizon insertion), pricing, incentives, outbox publisher
- Outbox pattern simulating Kafka events (`events_outbox` table)

## Quick Start (Windows PowerShell)

```powershell
# (Optional) create & activate virtual environment if not already in myenv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt

# Run FastAPI (auto reload for dev)
uvicorn app.main:app --reload --port 8000
```

## Key Endpoints (Current)

- Root & Health: `GET /`, `GET /health/db`, `GET /health/predictor`
- ML: `GET /ml/model/info`, `POST /ml/predict`, `GET /ml/predictions`, `GET/PUT /ml/agents/config`
- Offers: `GET /offers/search?lat=&lng=&eta=&window_minutes=` (DB-driven, nearest prediction window)
- Bookings: `POST /bookings` (smart_hold or guaranteed, emits `booking.created`), `GET /bookings/{id}`, `POST /bookings/{id}/swap` (emits `booking.swapped`)
- Sessions: `POST /sessions/start`, `POST /sessions/{id}/validate` (emits `session.validated` + preauth), `POST /sessions/{id}/extend`, `POST /sessions/{id}/end` (auto capture payment)
- Payments: `POST /payments/preauth`, `POST /payments/{id}/capture`, `POST /payments/{id}/refund` (events: `payment.preauth_ok`, `payment.captured`, `payment.refunded`)
- Admin: `POST /admin/seed/slots`, `POST /admin/db/indexes`

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

## Event Simulation Flow

1. Create booking (smart_hold lowers confidence triggers backups if `p_free < threshold`).
2. Start session -> booking status becomes active.
3. Validate session (QR/NFC/plate) -> emits `session.validated`; auto preauth payment if none.
4. End session -> booking completed; payment captured using current `dynamic_price` -> emits `payment.captured`.
5. Refund (optional) -> emits `payment.refunded`.

Outbox worker picks up pending events and marks them published; console logs for visibility.

## Next Steps (Roadmap)

Phase 1 (Data Core):

1. Apply Supabase SQL (Lean Core 12 tables + events_outbox). Add DATABASE_URL to `.env` and restart API.
2. Implement SQLAlchemy models + CRUD for `slots`, `slot_observations`, `slot_predictions`.
3. Replace mock offers with DB-driven query (join predictions for requested ETA window).

Phase 2 (Predictor & Reliability Agents): 4. Background Predictor task: every 30 min build features & insert horizon rows into `slot_predictions`. 5. Reliability check: when booking created (smart_hold) evaluate prediction; enqueue backups in `booking_candidate`. 6. Publish events via outbox inserts.

Phase 3 (Booking & Sessions): 7. Implement booking endpoints (`POST /book`, `GET /bookings/{id}`, swap backups). 8. Session lifecycle endpoints (`/validate`, `/sessions/{id}/extend`, `/sessions/{id}/end`).

Phase 4 (Dynamic Pricing & Incentives): 9. Pricing agent adjusts `slots.dynamic_price` based on p_free. 10. Incentive agent emits alerts for low-confidence smart_hold bookings.

Phase 5 (Data Quality & Trust): 11. Populate `slot_health` & `provider_reliability_score`; emit alerts.

Phase 6 (Feature Packs): 12. Indoor navigation, EV pairing, services/add-ons, carbon savings.

Cross-Cutting (Future):

- Replace simulated outbox with real Kafka (aiokafka) and mark events published only on broker ack.
- Introduce caching layer (Redis) for hot predictions/offers.
- Add metrics (Prometheus) & structured JSON logging.
- More granular feature flags & config persistence.

---

Prototype authored automatically; refine as needed. See Event Simulation Flow for full lifecycle.
