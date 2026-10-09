from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_code: Mapped[str] = mapped_column(String(50), nullable=False)
    intern_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intern_name: Mapped[str] = mapped_column(String(100), default="TTS")
    intern_code: Mapped[str] = mapped_column(String(50), default="TTS0001")
    intern_email: Mapped[str] = mapped_column(String(150), default="intern@ictu.edu.vn")
    leave_type: Mapped[str] = mapped_column(String(100), default="Nghỉ việc cá nhân")
    start_date: Mapped[str] = mapped_column(String(50), nullable=False)
    end_date: Mapped[str] = mapped_column(String(50), nullable=False)
    session: Mapped[str] = mapped_column(String(150), default="Cả ngày (08:15 - 17:30)")
    duration: Mapped[str] = mapped_column(String(50), default="1.0 ngày")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_date: Mapped[str] = mapped_column(String(50), default="07/10/2026")
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, approved, rejected
    status_label: Mapped[str] = mapped_column(String(50), default="Chờ duyệt")
    approver: Mapped[str] = mapped_column(String(100), default="Chờ duyệt")
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

