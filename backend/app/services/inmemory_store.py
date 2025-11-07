import uuid
from typing import Dict, List, Any
from datetime import datetime, timezone

# In-memory prototype stores (replace with DB later)
SLOTS: List[Dict[str, Any]] = [
    {"slot_id": "S101", "cluster_id": "C_A1", "base_price": 35.0, "dynamic_price": 35.0, "distance_m": 140, "ev": False, "accessible": True},
    {"slot_id": "S102", "cluster_id": "C_A1", "base_price": 28.0, "dynamic_price": 28.0, "distance_m": 220, "ev": False, "accessible": False},
    {"slot_id": "S201", "cluster_id": "C_B2", "base_price": 40.0, "dynamic_price": 40.0, "distance_m": 320, "ev": False, "accessible": False},
]

PREDICTIONS: Dict[str, Dict[str, float]] = {}  # slot_id -> {eta_iso: p_free}
BOOKINGS: Dict[str, Dict[str, Any]] = {}  # booking_id -> booking data
BOOKING_CANDIDATES: Dict[str, List[Dict[str, Any]]] = {}  # booking_id -> [{slot_id, role, confidence}]


def nearest_prediction(slot_id: str, eta_iso: str) -> float | None:
    mp = PREDICTIONS.get(slot_id) or {}
    if not mp:
        return None
    # direct hit
    if eta_iso in mp:
        return mp[eta_iso]
    # pick closest future else closest past
    target_dt = datetime.fromisoformat(eta_iso.replace("Z", "+00:00"))
    candidates = [(datetime.fromisoformat(k), v) for k, v in mp.items()]
    candidates.sort(key=lambda kv: abs((kv[0] - target_dt).total_seconds()))
    return candidates[0][1] if candidates else None


def create_booking(slot_id: str, eta_iso: str, mode: str, p_free_at_hold: float | None) -> Dict[str, Any]:
    booking_id = str(uuid.uuid4())
    booking = {
        "booking_id": booking_id,
        "slot_id": slot_id,
        "cluster_id": next((s["cluster_id"] for s in SLOTS if s["slot_id"] == slot_id), ""),
        "eta_minute": eta_iso,
        "mode": mode,
        "status": "held" if mode == "smart_hold" else "confirmed",
        "p_free_at_hold": p_free_at_hold,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    BOOKINGS[booking_id] = booking
    BOOKING_CANDIDATES[booking_id] = [
        {"slot_id": slot_id, "role": "primary", "confidence": p_free_at_hold or 0.0}
    ]
    return booking


def add_backup_slots(booking_id: str, backups: List[Dict[str, Any]]):
    existing = BOOKING_CANDIDATES.get(booking_id, [])
    for b in backups:
        existing.append({"slot_id": b["slot_id"], "role": "backup", "confidence": b.get("confidence", 0.0)})
    BOOKING_CANDIDATES[booking_id] = existing


def swap_booking_slot(booking_id: str, new_slot_id: str) -> Dict[str, Any]:
    booking = BOOKINGS[booking_id]
    booking["slot_id"] = new_slot_id
    booking["status"] = "confirmed"  # after swap confirm
    BOOKINGS[booking_id] = booking
    return booking
