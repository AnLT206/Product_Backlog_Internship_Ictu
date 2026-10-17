from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AttendanceRawLog(Base):
    __tablename__ = "attendance_raw_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    device_ip: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    scan_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    scan_type: Mapped[str] = mapped_column(
        Enum(
            "qr",
            "rfid_card",
            "fingerprint",
            "face_id",
            "other",
            name="scan_type_enum",
        ),
        default="qr",
        nullable=False,
    )
    direction: Mapped[str] = mapped_column(
        Enum("in", "out", "unknown", name="scan_direction_enum"),
        default="unknown",
        nullable=False,
    )
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_processed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User | None] = relationship(foreign_keys=[user_id])
