from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class LeaveRequest(Base):
    """Đơn xin nghỉ phép của thực tập sinh."""

    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    request_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    intern_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intern_name: Mapped[str | None] = mapped_column(String(100), default="TTS", nullable=True)
    intern_code: Mapped[str | None] = mapped_column(String(50), default="TTS0001", nullable=True)
    intern_email: Mapped[str | None] = mapped_column(String(150), default="intern@ictu.edu.vn", nullable=True)
    leave_type: Mapped[str | None] = mapped_column(String(100), default="Nghỉ việc cá nhân", nullable=True)
    start_date: Mapped[Any] = mapped_column(String(50), nullable=False)
    end_date: Mapped[Any] = mapped_column(String(50), nullable=False)
    session: Mapped[str | None] = mapped_column(String(150), default="Cả ngày (08:15 - 17:30)", nullable=True)
    duration: Mapped[str | None] = mapped_column(String(50), default="1.0 ngày", nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_date: Mapped[str | None] = mapped_column(String(50), default="07/10/2026", nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    status_label: Mapped[str | None] = mapped_column(String(50), default="Chờ duyệt", nullable=True)
    approver: Mapped[str | None] = mapped_column(String(100), default="Chờ duyệt", nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, server_default=func.now(), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=True
    )

    user: Mapped[User | None] = relationship(foreign_keys=[user_id])
