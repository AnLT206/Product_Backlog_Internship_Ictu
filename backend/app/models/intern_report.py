from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class InternReport(Base):
    __tablename__ = "intern_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mentor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    week_title: Mapped[str] = mapped_column(String(255), nullable=False)
    period: Mapped[str | None] = mapped_column(String(100), nullable=True)
    submitted_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tasks_done: Mapped[str | None] = mapped_column(Text, nullable=True)
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    self_assessment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mentor_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, reviewed, rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    mentor: Mapped[User | None] = relationship(foreign_keys=[mentor_id])
    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
