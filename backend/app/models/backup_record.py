from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class BackupRecord(Base):
    __tablename__ = "backup_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, default=0)
    backup_type: Mapped[str] = mapped_column(String(50), default="full")  # full, data_only, schema_only
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="completed")  # completed, in_progress, restoring, failed
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    encryption_algorithm: Mapped[str | None] = mapped_column(String(50), default="AES-256-Fernet", nullable=True)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cloud_storage_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cloud_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    restored_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
