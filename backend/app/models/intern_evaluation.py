from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class InternEvaluation(Base):
    __tablename__ = "intern_evaluations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mentor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    attendance_score: Mapped[float] = mapped_column(Float, default=9.0)
    tech_score: Mapped[float] = mapped_column(Float, default=9.0)
    report_score: Mapped[float] = mapped_column(Float, default=9.0)
    final_score: Mapped[float] = mapped_column(Float, default=9.0)
    letter_grade: Mapped[str] = mapped_column(String(10), default="A")
    mentor_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="verified")  # draft, verified, synced
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    mentor: Mapped[User | None] = relationship(foreign_keys=[mentor_id])
    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
