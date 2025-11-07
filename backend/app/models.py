from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship, declarative_base
from sqlalchemy import String, Integer, Boolean, Numeric, Text, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
import enum
import datetime as dt

Base = declarative_base()

# Enums mirrored from Supabase schema
class BookingStatus(enum.Enum):
    held = "held"
    confirmed = "confirmed"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class BookingMode(enum.Enum):
    guaranteed = "guaranteed"
    smart_hold = "smart_hold"

class ValidationMethod(enum.Enum):
    qr = "qr"
    nfc = "nfc"
    plate = "plate"

class PaymentStatus(enum.Enum):
    init = "init"
    preauth_ok = "preauth_ok"
    captured = "captured"
    refunded = "refunded"
    cancelled = "cancelled"

class AlertKind(enum.Enum):
    trust = "trust"
    data_quality = "data_quality"
    violation = "violation"
    incentive = "incentive"

class AlertSeverity(enum.Enum):
    info = "info"
    warn = "warn"
    critical = "critical"

class AppUser(Base):
    __tablename__ = "app_users"
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    email: Mapped[str | None] = mapped_column(String, unique=True)
    role: Mapped[str] = mapped_column(String)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)

class Provider(Base):
    __tablename__ = "providers"
    provider_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(String)
    owner_user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("app_users.user_id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)

class Location(Base):
    __tablename__ = "locations"
    location_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    provider_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("providers.provider_id"))
    name: Mapped[str] = mapped_column(String)
    address: Mapped[str | None] = mapped_column(Text)
    entrance_lat: Mapped[float | None] = mapped_column(Numeric)
    entrance_lng: Mapped[float | None] = mapped_column(Numeric)
    timezone: Mapped[str | None] = mapped_column(String, default="UTC")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)

class Slot(Base):
    __tablename__ = "slots"
    slot_id: Mapped[str] = mapped_column(String, primary_key=True)
    location_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("locations.location_id"))
    cluster_id: Mapped[str] = mapped_column(String)
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    is_ev: Mapped[bool] = mapped_column(Boolean, default=False)
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=False)
    base_price: Mapped[float] = mapped_column(Numeric)
    dynamic_price: Mapped[float] = mapped_column(Numeric)

class SlotObservation(Base):
    __tablename__ = "slot_observations"
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.slot_id"), primary_key=True)
    observed_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    status: Mapped[str] = mapped_column(String)

class PredictionBatch(Base):
    __tablename__ = "prediction_batches"
    batch_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    model_version: Mapped[str] = mapped_column(String)
    generated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    horizon_min: Mapped[int] = mapped_column(Integer)
    quality: Mapped[str | None] = mapped_column(String)

class SlotPrediction(Base):
    __tablename__ = "slot_predictions"
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.slot_id"), primary_key=True)
    eta_minute: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    p_free: Mapped[float] = mapped_column(Numeric)
    conf_low: Mapped[float | None] = mapped_column(Numeric)
    conf_high: Mapped[float | None] = mapped_column(Numeric)
    model_version: Mapped[str] = mapped_column(String)
    batch_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("prediction_batches.batch_id"))

class Booking(Base):
    __tablename__ = "bookings"
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("app_users.user_id"))
    slot_id: Mapped[str | None] = mapped_column(ForeignKey("slots.slot_id"))
    cluster_id: Mapped[str] = mapped_column(String)
    eta_minute: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    mode: Mapped[BookingMode] = mapped_column(Enum(BookingMode))
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus))
    p_free_at_hold: Mapped[float | None] = mapped_column(Numeric)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)

class BookingCandidate(Base):
    __tablename__ = "booking_candidate"
    booking_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("bookings.booking_id"), primary_key=True)
    slot_id: Mapped[str] = mapped_column(ForeignKey("slots.slot_id"), primary_key=True)
    role: Mapped[str] = mapped_column(String)
    confidence_at_add: Mapped[float | None] = mapped_column(Numeric)
    hold_expires_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

class Session(Base):
    __tablename__ = "sessions"
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("bookings.booking_id"))
    started_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    validation_method: Mapped[ValidationMethod | None] = mapped_column(Enum(ValidationMethod))
    bay_label: Mapped[str | None] = mapped_column(String)
    grace_ends_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

class Payment(Base):
    __tablename__ = "payments"
    payment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    booking_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("bookings.booking_id"))
    amount_authorized: Mapped[float | None] = mapped_column(Numeric)
    amount_captured: Mapped[float | None] = mapped_column(Numeric)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    alert_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String)
    kind: Mapped[AlertKind] = mapped_column(Enum(AlertKind))
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity))
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
