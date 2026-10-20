from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.internship_group import (
        InternProfileDepartment,
        InternProfileGroup,
        InternshipGroup,
    )
    from app.models.user import User


class InternProfile(Base):
    __tablename__ = "intern_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    mentor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", name="intern_profile_status"),
        default="pending",
        nullable=False,
    )
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(
        Enum("male", "female", "other", name="gender_enum"),
        default="other",
        nullable=True,
    )
    university: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    major: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    academic_year: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    gpa: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar: Mapped[str | None] = mapped_column(Text(length=16777215), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(foreign_keys=[user_id], back_populates="intern_profile")
    mentor: Mapped[User | None] = relationship(foreign_keys=[mentor_id], back_populates="mentored_intern_profiles")

    # Quan hệ n-n với nhóm thực tập (Internship_Groups)
    groups: Mapped[list[InternshipGroup]] = relationship(
        secondary="intern_profile_groups",
        back_populates="intern_profiles",
        overlaps="group_memberships,intern_profile,group",
    )
    group_memberships: Mapped[list[InternProfileGroup]] = relationship(
        back_populates="intern_profile",
        cascade="all, delete-orphan",
        overlaps="groups,intern_profiles",
    )

    # Quan hệ n-n với phòng ban (Departments)
    departments: Mapped[list[Department]] = relationship(
        secondary="intern_profile_departments",
        back_populates="intern_profiles",
        overlaps="department_memberships,intern_profile,department",
    )
    department_memberships: Mapped[list[InternProfileDepartment]] = relationship(
        back_populates="intern_profile",
        cascade="all, delete-orphan",
        overlaps="departments,intern_profiles",
    )


