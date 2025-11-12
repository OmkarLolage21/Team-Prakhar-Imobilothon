"""
Seed script to populate the database with sample parking data.

Usage:
    python seed_data.py            # full dataset (larger, slower)
    python seed_data.py --lite     # small fast dataset for demos

Windows + psycopg async note:
    We enforce WindowsSelectorEventLoopPolicy to avoid Proactor incompatibility.
"""
import asyncio
import sys
import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import select, text, delete

# Ensure correct event loop on Windows for psycopg async
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore[attr-defined]
    except Exception:
        pass

from app.core.db import SessionLocal
from app.models import (
    AppUser, Provider, Location, Slot,
    Booking, BookingStatus, BookingMode,
    Session, ValidationMethod,
    Payment, PaymentStatus,
    SlotPrediction, PredictionBatch
)

async def seed_all(lite: bool = False):
    if SessionLocal is None:
        print("❌ Database not configured. Check your .env file.")
        sys.exit(1)

    async with SessionLocal() as db:
        # 0. Clear transactional tables
        print("🧹 Clearing existing transactional data (payments, sessions, bookings)...")
        try:
            await db.execute(text("TRUNCATE payments, sessions, bookings RESTART IDENTITY CASCADE"))
            await db.commit()
            print("✓ Truncated transactional tables")
        except Exception:
            await db.execute(delete(Payment))
            await db.execute(delete(Session))
            await db.execute(delete(Booking))
            await db.commit()
            print("✓ Deleted transactional rows")

        # 1. Determine infrastructure existence
        existing_locs = await db.execute(select(Location))
        if existing_locs.scalars().first():
            print("⚠️  Locations already exist. Keeping existing slots + locations; only regenerating transactions.")
            keep_existing = True
        else:
            print("✓ No existing infrastructure. Creating from scratch...")
            keep_existing = False

        mode_label = "LITE" if lite else "FULL"
        print(f"🌱 Seeding database with {mode_label} sample data...")

        # 2. Users
        existing_users = await db.execute(select(AppUser))
        users_list = existing_users.scalars().all()
        if len(users_list) < 4:
            print("Creating users...")
            provider_user_id = str(uuid4())
            base_users = [
                ("john.doe@example.com", "driver"),
                ("jane.smith@example.com", "driver"),
                ("mike.wilson@example.com", "driver"),
                ("sarah.jones@example.com", "driver"),
            ]
            users = [
                AppUser(user_id=str(uuid4()), email=email, role=role) for email, role in base_users
            ] + [
                AppUser(user_id=provider_user_id, email="admin@puneparking.com", role="provider_admin")
            ]
            db.add_all(users)
            await db.commit()
            print("✓ Created users (drivers + provider admin)")
        else:
            users = users_list
            # Pick a provider admin or fall back to first user
            provider_admin = next((u for u in users if u.role == "provider_admin"), users[0])
            provider_user_id = provider_admin.user_id
            print(f"✓ Using existing {len(users)} users")

        # 3. Provider
        provider_obj = (await db.execute(select(Provider))).scalars().first()
        if not provider_obj:
            provider_id = str(uuid4())
            provider = Provider(
                provider_id=provider_id,
                name="Pune Parking Solutions",
                owner_user_id=provider_user_id,
            )
            db.add(provider)
            await db.commit()
            print("✓ Created provider")
        else:
            provider_id = provider_obj.provider_id
            print("✓ Using existing provider")

        # 4. Locations
        if not keep_existing:
            zones_full = [
                ("MG Road Parking", "MG Road, Camp Area, Pune 411001", 18.5204, 73.8567),
                ("FC Road Plaza", "Fergusson College Road, Pune 411004", 18.5362, 73.8258),
                ("Koregaon Park Tower", "North Main Road, Koregaon Park, Pune 411001", 18.5362, 73.8958),
                ("Hinjewadi IT Hub", "Phase 1, Hinjewadi, Pune 411057", 18.5912, 73.7389),
                ("Shivajinagar Central", "JM Road, Shivajinagar, Pune 411005", 18.5304, 73.8567),
            ]
            zones = zones_full[:3] if lite else zones_full
            locations = []
            for idx, (zone_name, address, lat, lng) in enumerate(zones):
                loc = Location(
                    location_id=str(uuid4()),
                    provider_id=provider_id,
                    name=zone_name,
                    address=address,
                    entrance_lat=lat,
                    entrance_lng=lng,
                    timezone="Asia/Kolkata",
                )
                locations.append(loc)
                db.add(loc)
            await db.commit()
            print(f"✓ Created {len(locations)} locations")
        else:
            locations = (await db.execute(select(Location))).scalars().all()
            print(f"✓ Using existing {len(locations)} locations")

        # 5. Slots
        if not keep_existing:
            slots = []
            slot_count = 0
            capacities_full = [200, 150, 180, 250, 175]
            capacities_lite = [30, 30, 30]
            capacities = capacities_lite if lite else capacities_full[: len(locations)]
            for idx, loc in enumerate(locations):
                zone_cluster_id = f"Zone_{idx}"
                num_slots = capacities[idx]
                base_price = 20.0
                for i in range(num_slots):
                    slot_id = f"{zone_cluster_id}_S{i+1:03d}"
                    dynamic_multiplier = 1.25 if i % 10 < 3 else (1.15 if i % 10 < 6 else 1.0)
                    slot = Slot(
                        slot_id=slot_id,
                        location_id=loc.location_id,
                        cluster_id=zone_cluster_id,
                        capacity=1,
                        is_ev=(i % 8 == 0),
                        is_accessible=(i % 15 == 0),
                        base_price=base_price,
                        dynamic_price=round(base_price * dynamic_multiplier, 2),
                    )
                    slots.append(slot)
                    db.add(slot)
                    slot_count += 1
            await db.commit()
            print(f"✓ Created {slot_count} slots across {len(locations)} locations")
        else:
            slots = (await db.execute(select(Slot))).scalars().all()
            slot_count = len(slots)
            print(f"✓ Using existing {slot_count} slots")

        # 6. Bookings / Sessions / Payments
        bookings: list[Booking] = []
        sessions: list[Session] = []
        payments: list[Payment] = []
        now_utc = datetime.now(timezone.utc)
        users_cycle = [u.user_id for u in users if u.role == "driver"] or [u.user_id for u in users]
        day_window = 7 if lite else 30
        for day_offset in range(day_window):
            day_start = now_utc - timedelta(days=day_offset)
            is_weekend = day_start.weekday() >= 5
            if lite:
                bookings_per_day = random.randint(5, 8) if not is_weekend else random.randint(3, 5)
            else:
                bookings_per_day = random.randint(8, 15) if not is_weekend else random.randint(4, 8)

            for _ in range(bookings_per_day):
                slot = random.choice(slots)
                user_id = random.choice(users_cycle)
                hour_weights = [2, 1, 1, 1, 2, 5, 8, 10, 10, 8, 6, 5, 4, 4, 5, 6, 8, 10, 9, 7, 4, 3, 2, 2]
                hour = random.choices(range(24), weights=hour_weights)[0]
                minute = random.randint(0, 59)
                booking_time = day_start.replace(hour=hour, minute=minute, second=0, microsecond=0)

                if day_offset == 0:
                    status = random.choices(
                        [BookingStatus.active, BookingStatus.confirmed, BookingStatus.completed],
                        weights=[50, 30, 20],
                    )[0]
                elif day_offset <= 7:
                    status = random.choices(
                        [BookingStatus.completed, BookingStatus.confirmed, BookingStatus.cancelled],
                        weights=[70, 20, 10],
                    )[0]
                else:
                    status = random.choices(
                        [BookingStatus.completed, BookingStatus.cancelled],
                        weights=[85, 15],
                    )[0]

                mode = random.choices([BookingMode.guaranteed, BookingMode.smart_hold], weights=[80, 20])[0]
                booking = Booking(
                    booking_id=str(uuid4()),
                    user_id=user_id,
                    slot_id=slot.slot_id,
                    cluster_id=slot.cluster_id,
                    eta_minute=booking_time + timedelta(minutes=random.randint(15, 60)),
                    mode=mode,
                    status=status,
                    p_free_at_hold=round(random.uniform(0.65, 0.95), 2),
                    created_at=booking_time,
                )
                bookings.append(booking)
                db.add(booking)

                if status in [BookingStatus.active, BookingStatus.confirmed, BookingStatus.completed]:
                    started = booking_time + timedelta(minutes=random.randint(15, 60))
                    duration_hours = random.choices([1, 2, 3, 4], weights=[20, 50, 20, 10])[0]
                    if status == BookingStatus.completed:
                        ended = started + timedelta(hours=duration_hours, minutes=random.randint(0, 30))
                    elif status == BookingStatus.active and day_offset == 0:
                        ended = None
                    else:
                        ended = started + timedelta(hours=duration_hours, minutes=random.randint(0, 30))
                    session = Session(
                        session_id=str(uuid4()),
                        booking_id=booking.booking_id,
                        started_at=started,
                        ended_at=ended,
                        validation_method=random.choice([ValidationMethod.qr, ValidationMethod.nfc, ValidationMethod.plate]),
                        bay_label=slot.slot_id,
                        grace_ends_at=started + timedelta(minutes=15),
                    )
                    sessions.append(session)
                    db.add(session)

                base_hours = random.uniform(1.5, 3.5)
                amount = round(float(slot.dynamic_price) * base_hours, 2)
                if status == BookingStatus.cancelled:
                    pay_status = PaymentStatus.cancelled
                    amt_captured = 0.0
                    amt_authorized = amount
                elif status == BookingStatus.completed:
                    pay_status = PaymentStatus.captured
                    amt_captured = amount
                    amt_authorized = amount
                elif status == BookingStatus.active:
                    pay_status = PaymentStatus.preauth_ok
                    amt_captured = 0.0
                    amt_authorized = amount
                else:  # confirmed
                    if random.random() < 0.3:
                        pay_status = PaymentStatus.captured
                        amt_captured = amount
                        amt_authorized = amount
                    else:
                        pay_status = PaymentStatus.preauth_ok
                        amt_captured = 0.0
                        amt_authorized = amount
                payment = Payment(
                    payment_id=str(uuid4()),
                    booking_id=booking.booking_id,
                    amount_authorized=amt_authorized,
                    amount_captured=amt_captured,
                    status=pay_status,
                    created_at=booking_time,
                )
                payments.append(payment)
                db.add(payment)

        await db.commit()
        print(f"✓ Created {len(bookings)} bookings")
        print(f"✓ Created {len(sessions)} sessions")
        print(f"✓ Created {len(payments)} payments")

        # 7. Predictive data (seed simple probabilities for demo UX)
        print("\n🔮 Seeding predictive availability (demo) ...")
        horizon_min = 120 if not lite else 60
        step_min = 15
        etas = [now_utc + timedelta(minutes=m) for m in range(step_min, horizon_min + 1, step_min)]
        # Create a batch record
        batch = PredictionBatch(batch_id=str(uuid4()), model_version="demo_seed", generated_at=now_utc, horizon_min=horizon_min, quality="seeded")
        db.add(batch)
        await db.commit()

        values = []
        for slot in slots:
            # Use price to shape probability (cheaper → higher p_free) with light randomness
            base_price = float(slot.base_price)
            dyn_price = float(slot.dynamic_price)
            price_factor = max(0.8, min(1.2, dyn_price / max(1.0, base_price)))
            for eta in etas:
                # Base around 0.7 with variation from price and time-of-day
                tod = eta.hour
                peak = 1.0 if 9 <= tod <= 12 or 17 <= tod <= 20 else 0.0
                noise = (random.random() - 0.5) * 0.1
                p = 0.75 - 0.15 * peak - 0.1 * (price_factor - 1.0) + noise
                p = max(0.1, min(0.95, p))
                values.append({
                    "slot_id": slot.slot_id,
                    "eta_minute": eta,
                    "p_free": p,
                    "conf_low": max(0.05, p - 0.05),
                    "conf_high": min(0.99, p + 0.05),
                    "model_version": "demo_seed",
                    "batch_id": batch.batch_id,
                })
        # Bulk insert with ON CONFLICT upsert behavior
        if values:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(SlotPrediction).values(values)
            stmt = stmt.on_conflict_do_update(
                index_elements=[SlotPrediction.slot_id, SlotPrediction.eta_minute],
                set_={
                    "p_free": stmt.excluded.p_free,
                    "conf_low": stmt.excluded.conf_low,
                    "conf_high": stmt.excluded.conf_high,
                    "model_version": stmt.excluded.model_version,
                    "batch_id": stmt.excluded.batch_id,
                },
            )
            await db.execute(stmt)
            await db.commit()
            print(f"✓ Seeded {len(values)} slot_predictions across {len(slots)} slots and {len(etas)} time steps")

        print("\n✅ Database seeded successfully!")
        print("\n📊 Summary:")
        print(f"  • Users: {len(users)}")
        print("  • Providers: 1")
        print(f"  • Locations: {len(locations)}")
        print(f"  • Slots: {slot_count}")
        print(f"  • Bookings: {len(bookings)}")
        print(f"  • Sessions: {len(sessions)}")
        print(f"  • Payments: {len(payments)}")
        print("\n💡 Tip: Restart backend server to pick up new data!")
        print("   Frontend should now show dynamic inventory, bookings, sessions, analytics.")

def _parse_args(argv: list[str]) -> bool:
    return "--lite" in argv or "-l" in argv

if __name__ == "__main__":
    lite = _parse_args(sys.argv[1:])
    try:
        asyncio.run(seed_all(lite=lite))
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
