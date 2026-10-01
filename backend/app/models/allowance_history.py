from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CHAR, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AllowanceHistory(Base):
    __tablename__ = "allowance_history"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_allowance_history_amount"),
        Index("idx_allowance_history_intern_period", "intern_id", "period"),
        Index("idx_allowance_history_period", "period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_allowance_history_intern"),
        nullable=False,
    )
    period: Mapped[str] = mapped_column(CHAR(7), nullable=False)
    allowance_type: Mapped[str] = mapped_column(
        String(30), default="other", nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", name="fk_allowance_history_created_by"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
    creator: Mapped[User | None] = relationship(foreign_keys=[created_by])
