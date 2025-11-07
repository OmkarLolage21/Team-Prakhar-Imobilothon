import asyncio
import datetime as dt
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.models import EventsOutbox


DEFAULT_CADENCE_SEC = 5
BATCH_SIZE = 100


async def outbox_loop(cadence: int = DEFAULT_CADENCE_SEC, batch_size: int = BATCH_SIZE):
    """Background loop that scans events_outbox for pending events and marks them published.

    This simulates a Kafka publisher: in a real deployment, replace the publish() call
    with a producer send and only mark published on success.
    """
    while True:
        try:
            await publish_once(batch_size=batch_size)
        except Exception as e:
            try:
                print("[outbox] loop error", e)
            except Exception:
                pass
        await asyncio.sleep(cadence)


async def publish_once(batch_size: int = BATCH_SIZE, session: Optional[AsyncSession] = None):
    if SessionLocal is None and session is None:
        return
    # Allow caller to pass a session (e.g., admin endpoint); otherwise, create one
    owns_session = session is None
    if owns_session:
        session = SessionLocal()  # type: ignore
    assert session is not None
    try:
        # Fetch a batch of pending events FIFO by creation time
        res = await session.execute(
            select(EventsOutbox)
            .where(EventsOutbox.status == "pending")
            .order_by(EventsOutbox.created_at.asc())
            .limit(batch_size)
        )
        events = res.scalars().all()
        if not events:
            if owns_session:
                await session.close()
            return

        published = 0
        for evt in events:
            try:
                # Simulate publish: replace with real producer send if available
                _simulate_publish(evt)
                await session.execute(
                    update(EventsOutbox)
                    .where(EventsOutbox.event_id == evt.event_id)
                    .values(status="published", published_at=dt.datetime.utcnow())
                )
                published += 1
            except Exception as pub_ex:
                # Mark as error to avoid tight retry loop; can be retried with a repair job
                print("[outbox] publish failed for", evt.event_id, pub_ex)
                await session.execute(
                    update(EventsOutbox)
                    .where(EventsOutbox.event_id == evt.event_id)
                    .values(status="error")
                )
        if published:
            await session.commit()
            print(f"[outbox] published {published} events")
        else:
            await session.commit()
    finally:
        if owns_session:
            await session.close()


def _simulate_publish(evt: EventsOutbox):
    # Keep it simple: console log as a stand-in for Kafka
    try:
        print(f"[outbox] -> {evt.event_type}: {evt.payload}")
    except Exception:
        pass
