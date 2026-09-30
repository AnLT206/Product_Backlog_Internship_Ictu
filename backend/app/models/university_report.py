from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UniversityReport(Base):
    __tablename__ = "university_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    submit_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_students: Mapped[int] = mapped_column(Integer, default=15)
    signer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cert: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent, pending
    status_label: Mapped[str | None] = mapped_column(String(100), default="Đã chuyển gửi")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
