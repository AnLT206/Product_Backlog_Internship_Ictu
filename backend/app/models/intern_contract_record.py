from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class InternContractRecord(Base):
    __tablename__ = "intern_contract_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contract_code: Mapped[str] = mapped_column(String(50), nullable=False)
    doc_type: Mapped[str] = mapped_column(
        String(255), default="Thỏa thuận thực tập 3 bên & NDA"
    )
    signed_intern: Mapped[bool] = mapped_column(Boolean, default=True)
    signed_company: Mapped[bool] = mapped_column(Boolean, default=True)
    signed_ictu: Mapped[bool] = mapped_column(Boolean, default=False)
    cert: Mapped[str | None] = mapped_column(String(100), default="ICTU-CA Verified")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # completed, pending, draft
    status_label: Mapped[str | None] = mapped_column(
        String(100), default="Chờ xác nhận từ Trường"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
