from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.internship_program import InternshipProgram
    from app.models.user import User


class ProgramMember(Base):
    __tablename__ = "program_members"
    __table_args__ = (
        UniqueConstraint("program_id", "intern_user_id", name="uq_program_intern"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("internship_programs.id", ondelete="CASCADE"), nullable=False
    )
    intern_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mentor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped[InternshipProgram] = relationship()
    intern: Mapped[User] = relationship(foreign_keys=[intern_user_id])
    mentor: Mapped[User | None] = relationship(foreign_keys=[mentor_user_id])
