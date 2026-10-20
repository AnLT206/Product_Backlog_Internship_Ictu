from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class MentorIntern(Base):
    """Bảng trung gian Mentor_Interns lưu quan hệ phân công hướng dẫn giữa Mentor và Thực tập sinh (1-N & N-N theo Khối/Lớp/Khóa/Ban)."""

    __tablename__ = "mentor_interns"
    __table_args__ = (
        UniqueConstraint("mentor_id", "intern_id", "role_type", name="uq_mentor_intern_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mentor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_type: Mapped[str] = mapped_column(
        Enum("primary", "technical", "co_mentor", "advisor", name="mentor_role_type"),
        default="primary",
        nullable=False,
    )
    dimension_type: Mapped[str] = mapped_column(
        Enum("direct", "major", "class", "intake", "department", name="mentor_dimension_type"),
        default="direct",
        nullable=False,
        index=True,
    )
    dimension_value: Mapped[str | None] = mapped_column(String(150), nullable=True)
    assigned_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    mentor: Mapped[User] = relationship(foreign_keys=[mentor_id])
    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
    assigned_by: Mapped[User | None] = relationship(foreign_keys=[assigned_by_id])
