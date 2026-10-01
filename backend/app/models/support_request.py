from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SupportRequest(Base):
    """Model yêu cầu hỗ trợ từ Thực tập sinh gửi HR / Admin (Task 5)."""

    __tablename__ = "support_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), default="other", nullable=False, index=True
    )
    document_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    response_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    responder_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    responder: Mapped[User | None] = relationship(foreign_keys=[responder_id])
