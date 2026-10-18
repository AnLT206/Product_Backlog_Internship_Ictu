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
    is_encrypted: bool = False
    encryption_algorithm: str | None = None
    checksum_sha256: str | None = None
    cloud_storage_url: str | None = None
    cloud_uploaded_at: datetime | None = None
    created_by_name: str | None = None
    created_at: datetime
    restored_at: datetime | None = None


class BackupCreateRequest(BaseModel):
    backup_type: str = Field(default="full", description="'full' | 'data_only' | 'schema_only'")
    note: str | None = Field(default=None, max_length=500)
    encrypt: bool = Field(default=True, description="Mã hóa tệp sao lưu bằng thuật toán AES/Fernet")
    upload_cloud: bool = Field(default=True, description="Tải bản sao lưu mã hóa lên Cloud Storage")


class BackupScheduleConfig(BaseModel):
    auto_backup_enabled: bool = True
    frequency: str = "daily"  # daily, weekly, monthly
    time_of_day: str = "02:00"
    retention_days: int = 30
    cloud_sync_enabled: bool = True
    cloud_provider: str = "s3"  # s3, gcs, local_cloud
    cloud_bucket: str = "ictu-internship-backups"
    last_auto_backup: datetime | None = None
    next_scheduled_run: str | None = "Hôm nay, 02:00 AM"


class CloudStorageStatusResponse(BaseModel):
    connected: bool
    provider: str
    bucket: str
    region: str
    endpoint: str
    total_cloud_objects: int
    total_cloud_bytes: int
    total_cloud_formatted: str
    retention_days: int
    latest_cloud_backup: str | None = None
    encryption_standard: str = "AES-256 (GCM / Fernet authenticated)"


class BackupOverviewResponse(BaseModel):
    items: list[BackupItemResponse]
    total_backups: int
    total_size_bytes: int
    total_size_formatted: str
    last_backup_at: datetime | None = None
    schedule: BackupScheduleConfig
    cloud_status: CloudStorageStatusResponse | None = None


class BackupRestoreRequest(BaseModel):
    backup_id: int | None = None
    file_path: str | None = None
    decrypt: bool = True


class SafeRestoreRequest(BaseModel):
    admin_password: str = Field(..., min_length=4, description="Mật khẩu Super Admin để xác thực lại danh tính an toàn")
    confirmation_phrase: str = Field(default="CONFIRM_RESTORE", description="Cụm từ xác nhận thao tác, ví dụ: 'CONFIRM_RESTORE'")
    create_safety_snapshot: bool = Field(default=True, description="Tự động snapshot sao lưu CSDL hiện tại trước khi phục hồi để có thể hoàn tác")
    verify_checksum: bool = Field(default=True, description="Kiểm tra đối chiếu mã băm SHA-256 tính toàn vẹn của tệp trước khi nạp")


class SafeRestoreResponse(BaseModel):
    success: bool
    message: str
    backup_id: int
    filename: str
    safety_snapshot_filename: str | None = None
    checksum_verified: bool = True
    restored_at: datetime
    execution_time_seconds: float


class BackupVerifyResponse(BaseModel):
    backup_id: int
    filename: str
    is_valid: bool
    file_exists: bool
    checksum_matched: bool
    expected_checksum: str | None = None
    actual_checksum: str | None = None
    can_decrypt: bool
    file_size_formatted: str
    message: str
