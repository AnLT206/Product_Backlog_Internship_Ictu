from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Allowance(Base):
    """Bảng quản lý phụ cấp chi tiết của thực tập sinh (SCRUM-174)."""

    __tablename__ = "allowances"
    __table_args__ = (
        UniqueConstraint("intern_id", "period", name="uq_intern_allowance_period"),
        CheckConstraint("base_amount >= 0", name="chk_allowance_base_amount"),
        CheckConstraint("actual_work_days >= 0", name="chk_allowance_actual_work_days"),
        CheckConstraint("total_amount >= 0", name="chk_allowance_total_amount"),
        Index("idx_allowances_intern_period", "intern_id", "period"),
        Index("idx_allowances_period", "period"),
        Index("idx_allowances_payment_status", "payment_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_allowances_intern"),
        nullable=False,
    )
    period: Mapped[str] = mapped_column(CHAR(7), nullable=False)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    actual_work_days: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=Decimal("0.0"))
    bonus: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    payment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="unpaid")
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", name="fk_allowances_creator"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    intern: Mapped[User] = relationship(foreign_keys=[intern_id])
    creator: Mapped[User | None] = relationship(foreign_keys=[created_by])
