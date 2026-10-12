from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class MentorIntern(Base):
    """Bảng trung gian Mentor_Interns lưu quan hệ phân công hướng dẫn giữa Mentor và Thực tập sinh (US-30)."""

    __tablename__ = "mentor_interns"
    __table_args__ = (
        UniqueConstraint("mentor_id", "intern_id", name="uq_mentor_intern"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mentor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    mentor: Mapped[User] = relationship(foreign_keys=[mentor_id])
    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
