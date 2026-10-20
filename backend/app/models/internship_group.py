from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.intern_profile import InternProfile
    from app.models.internship_program import InternshipProgram
    from app.models.user import User


class InternshipGroup(Base):
    """Bảng nhóm thực tập theo phòng ban và chương trình thực tập."""

    __tablename__ = "internship_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    program_id: Mapped[int | None] = mapped_column(
        ForeignKey("internship_programs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    leader_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    max_members: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", "closed", name="internship_group_status_enum"),
        default="active",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    department: Mapped[Department | None] = relationship(back_populates="internship_groups")
    program: Mapped[InternshipProgram | None] = relationship()
    leader: Mapped[User | None] = relationship(foreign_keys=[leader_user_id])

    # N-N relationship với InternProfile qua intern_profile_groups
    intern_profiles: Mapped[list[InternProfile]] = relationship(
        secondary="intern_profile_groups",
        back_populates="groups",
        overlaps="memberships,intern_profile,group",
    )
    memberships: Mapped[list[InternProfileGroup]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        overlaps="intern_profiles,groups",
    )


class InternProfileGroup(Base):
    """Bảng trung gian lưu quan hệ n-n giữa Intern_Profiles và Internship_Groups."""

    __tablename__ = "intern_profile_groups"
    __table_args__ = (
        UniqueConstraint("intern_profile_id", "group_id", name="uq_intern_profile_group"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_profile_id: Mapped[int] = mapped_column(
        ForeignKey("intern_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[int] = mapped_column(
        ForeignKey("internship_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "transferred", "left", name="intern_profile_group_status_enum"),
        default="active",
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    intern_profile: Mapped[InternProfile] = relationship(
        back_populates="group_memberships",
        overlaps="groups,intern_profiles,memberships",
    )
    group: Mapped[InternshipGroup] = relationship(
        back_populates="memberships",
        overlaps="groups,intern_profiles,memberships",
    )
    assigner: Mapped[User | None] = relationship(foreign_keys=[assigned_by])


class InternProfileDepartment(Base):
    """Bảng trung gian lưu quan hệ n-n giữa Intern_Profiles và Departments."""

    __tablename__ = "intern_profile_departments"
    __table_args__ = (
        UniqueConstraint("intern_profile_id", "department_id", name="uq_intern_profile_department"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    intern_profile_id: Mapped[int] = mapped_column(
        ForeignKey("intern_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    intern_profile: Mapped[InternProfile] = relationship(
        back_populates="department_memberships",
        overlaps="departments,intern_profiles,department_intern_memberships",
    )
    department: Mapped[Department] = relationship(
        back_populates="department_intern_memberships",
        overlaps="departments,intern_profiles,department_intern_memberships",
    )
    assigner: Mapped[User | None] = relationship(foreign_keys=[assigned_by])
