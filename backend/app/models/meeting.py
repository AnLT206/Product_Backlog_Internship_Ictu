from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Meeting(Base):
    """Lịch họp nội bộ với thực tập sinh (SCRUM-179)."""

    __tablename__ = "meetings"
    __table_args__ = (
        Index("idx_meetings_host_id", "host_id"),
        Index("idx_meetings_start_time", "start_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    meeting_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    host_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", name="fk_meetings_host"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    host: Mapped[User] = relationship(foreign_keys=[host_id])
    attendees: Mapped[list[MeetingAttendee]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class MeetingAttendee(Base):
    """Danh sách người tham dự lịch họp và trạng thái gửi email thông báo (SCRUM-179)."""

    __tablename__ = "meeting_attendees"
    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendee"),
        Index("idx_ma_meeting_id", "meeting_id"),
        Index("idx_ma_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE", name="fk_ma_meeting"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", name="fk_ma_user"),
        nullable=False,
    )
    is_notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    meeting: Mapped[Meeting] = relationship(back_populates="attendees")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
