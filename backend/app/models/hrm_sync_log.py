from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class HrmSyncLog(Base):
    __tablename__ = "hrm_sync_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sync_type: Mapped[str] = mapped_column(String(50), default="cron", nullable=False)  # cron, manual, webhook
    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)  # success, failed, partial, in_progress
    source: Mapped[str] = mapped_column(String(100), default="FastHRM", nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_users: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_users: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mentors_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hr_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    interns_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
