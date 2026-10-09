from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class InternAttendance(Base):
    __tablename__ = "intern_attendances"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    month: Mapped[str] = mapped_column(String(20), default="09/2026")
    standard_days: Mapped[int] = mapped_column(Integer, default=22)
    actual_days: Mapped[int] = mapped_column(Integer, default=22)
    late_days: Mapped[int] = mapped_column(Integer, default=0)
    leave_days: Mapped[int] = mapped_column(Integer, default=0)
    allowance: Mapped[int] = mapped_column(Integer, default=3660000)
    base_allowance: Mapped[int] = mapped_column(Integer, default=2500000)
    lunch_allowance: Mapped[int] = mapped_column(Integer, default=660000)
    bonus_amount: Mapped[int] = mapped_column(Integer, default=500000)
    bonus_reason: Mapped[str | None] = mapped_column(
        String(255), default="Thưởng hoàn thành xuất sắc nhiệm vụ Sprint & chuyên cần 100%"
    )
    deduction_amount: Mapped[int] = mapped_column(Integer, default=0)
    deduction_reason: Mapped[str | None] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    status_label: Mapped[str | None] = mapped_column(String(50), default="Chờ duyệt phụ cấp")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
