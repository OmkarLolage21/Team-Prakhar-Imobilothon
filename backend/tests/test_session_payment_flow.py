import datetime as dt
import uuid
from fastapi.testclient import TestClient

from app.main import app

# NOTE: These tests assume a configured DATABASE_URL and seeded slots.
# Run /admin/seed/slots first if slots table is empty.
# They exercise booking -> session -> validation -> end -> payment capture.

client = TestClient(app)

ISO = lambda d: d.replace(tzinfo=dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def _future_eta(minutes=30):
    return ISO(dt.datetime.utcnow() + dt.timedelta(minutes=minutes))


def test_booking_session_payment_flow():
    # 1. Create booking (guaranteed for simplicity)
    eta = _future_eta(30)
    booking_resp = client.post('/bookings/', json={
        'slot_id': 'S1',
        'eta': eta,
        'mode': 'guaranteed',
        'window_minutes': 60
    })
    assert booking_resp.status_code == 200, booking_resp.text
    booking = booking_resp.json()
    booking_id = booking['booking_id']

    # 2. Start session
    start_resp = client.post('/sessions/start', json={
        'booking_id': booking_id,
        'validation_method': None,
        'grace_minutes': 10
    })
    assert start_resp.status_code == 200, start_resp.text
    session_id = start_resp.json()['session_id']

    # 3. Validate session (QR)
    validate_resp = client.post(f'/sessions/{session_id}/validate', json={
        'validation_method': 'qr',
        'bay_label': 'A-1'
    })
    assert validate_resp.status_code == 200, validate_resp.text

    # 4. End session (auto capture payment)
    end_resp = client.post(f'/sessions/{session_id}/end')
    assert end_resp.status_code == 200, end_resp.text

    # 5. List outbox events to ensure payment.captured emitted
    events_resp = client.get('/admin/outbox/events?limit=25')
    assert events_resp.status_code == 200
    events = events_resp.json()
    types = [e['event_type'] for e in events]
    assert 'payment.captured' in types
    assert 'session.validated' in types
    assert 'booking.created' in types  # booking event earlier

