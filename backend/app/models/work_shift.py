from __future__ import annotations

from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.internship_program import InternshipProgram


class WorkShift(Base):
    """Cấu hình ca làm việc / lịch làm việc linh hoạt gắn với nhóm thực tập (SCRUM-172)."""

    __tablename__ = "work_shifts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    program_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_programs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    group_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    shift_type: Mapped[str] = mapped_column(String(20), nullable=False, default="flexible")
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    days_of_week: Mapped[str] = mapped_column(String(50), nullable=False, default="2,3,4,5,6")
    flexible_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    program: Mapped[InternshipProgram | None] = relationship(foreign_keys=[program_id])
