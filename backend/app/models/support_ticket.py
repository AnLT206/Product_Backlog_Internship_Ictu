from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_code: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(100), default="TTS (TTS0001)")
    category: Mapped[str] = mapped_column(String(100), default="cert_internship")
    category_label: Mapped[str] = mapped_column(String(150), default="Giấy chứng nhận thực tập")
    target_approver: Mapped[str] = mapped_column(String(50), default="hr")
    priority: Mapped[str] = mapped_column(String(50), default="normal")
    priority_label: Mapped[str] = mapped_column(String(50), default="Bình thường")
    status: Mapped[str] = mapped_column(String(50), default="pending")
    status_label: Mapped[str] = mapped_column(String(50), default="Chờ HR duyệt")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    copies: Mapped[int] = mapped_column(Integer, default=1)
    delivery_method: Mapped[str] = mapped_column(String(150), default="Cả bản cứng & scan PDF")
    attached_file_name: Mapped[str | None] = mapped_column(String(255), default="")
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[str | None] = mapped_column(String(50), default="2026-10-07 10:00")
    completed_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

