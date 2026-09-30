from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class BackupItemResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_size: int
    file_size_formatted: str
    backup_type: str
    note: str | None = None
    status: str
    created_by_name: str | None = None
    created_at: datetime
    restored_at: datetime | None = None


class BackupCreateRequest(BaseModel):
    backup_type: str = Field(default="full", description="'full' | 'data_only' | 'schema_only'")
    note: str | None = Field(default=None, max_length=500)


class BackupScheduleConfig(BaseModel):
    auto_backup_enabled: bool = True
    frequency: str = "daily"  # daily, weekly, monthly
    time_of_day: str = "02:00"
    retention_days: int = 30
    last_auto_backup: datetime | None = None
    next_scheduled_run: str | None = "Hôm nay, 02:00 AM"


class BackupOverviewResponse(BaseModel):
    items: list[BackupItemResponse]
    total_backups: int
    total_size_bytes: int
    total_size_formatted: str
    last_backup_at: datetime | None = None
    schedule: BackupScheduleConfig
