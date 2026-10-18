from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


ConflictStrategy = Literal["update", "merge", "skip"]


class HrmPersonnelItem(BaseModel):
    employee_code: str = Field(..., min_length=2, max_length=50, description="Mã nhân sự / mã TTS bên HRM")
    full_name: str = Field(..., min_length=1, max_length=100, description="Họ và tên nhân sự")
    email: EmailStr = Field(..., description="Email định danh trên hệ thống")
    phone: str | None = Field(None, max_length=20, description="Số điện thoại liên hệ")
    role: Literal["mentor", "hr", "intern", "admin"] = Field("mentor", description="Vai trò nhân sự: mentor, hr, intern")
    department_name: str | None = Field(None, max_length=100, description="Tên phòng ban / bộ phận công tác")
    position: str | None = Field(None, max_length=100, description="Chức danh / vị trí công việc")
    status: Literal["active", "inactive", "pending"] = Field("active", description="Trạng thái tài khoản")
    cccd: str | None = Field(None, max_length=20, description="Số CCCD / CMND")
    dob: date | str | None = Field(None, description="Ngày sinh")
    university: str | None = Field(None, max_length=150, description="Trường Đại học (áp dụng nếu role là intern)")
    major: str | None = Field(None, max_length=150, description="Chuyên ngành đào tạo")


class HrmSyncRequest(BaseModel):
    source: str = Field("FastHRM", description="Nguồn đồng bộ (FastHRM, EnterpriseHRM, BambooHR, ...)")
    api_endpoint: str | None = Field(None, description="Tùy chọn ghi đè URL API HRM bên thứ 3")
    conflict_strategy: ConflictStrategy = Field("update", description="Chiến lược đối soát trùng lặp: update, merge, skip")
    items: list[HrmPersonnelItem] | None = Field(None, description="Danh sách nhân sự đã chuẩn hóa")
    raw_data: list[dict[str, Any]] | None = Field(None, description="Dữ liệu thô từ hệ thống ngoài cần Data Mapping")


class HrmWebhookPayload(BaseModel):
    event: str = Field("personnel.sync", description="Loại sự kiện webhook (personnel.sync, personnel.updated, etc.)")
    source: str = Field("FastHRM", description="Nguồn gửi webhook")
    timestamp: int | str | None = Field(None, description="Timestamp gửi từ HRM bên thứ 3")
    conflict_strategy: ConflictStrategy = Field("update", description="Chiến lược xử lý trùng lặp")
    data: list[HrmPersonnelItem] = Field(..., description="Danh sách nhân sự / mentor cần đồng bộ")


class ReconciliationItemDetail(BaseModel):
    index: int
    employee_code: str
    email: str
    full_name: str
    role: str
    is_existing: bool
    matched_user_id: int | None = None
    matched_by: Literal["email", "cccd", "code", "phone", "none"] = "none"
    conflict_detected: bool = False
    conflict_reason: str | None = None
    action: Literal["create", "update", "merge", "skip", "conflict_flag"] = "create"
    diff_fields: dict[str, Any] | None = None


class ReconciliationSummary(BaseModel):
    total_input: int = 0
    to_create: int = 0
    to_update: int = 0
    to_merge: int = 0
    to_skip: int = 0
    conflicts_count: int = 0
    mentors_count: int = 0
    hr_count: int = 0
    interns_count: int = 0


class HrmReconciliationPreviewRequest(BaseModel):
    conflict_strategy: ConflictStrategy = Field("update", description="Chiến lược đối soát trùng: update, merge, skip")
    items: list[HrmPersonnelItem] | None = Field(None, description="Danh sách đã chuẩn hóa")
    raw_data: list[dict[str, Any]] | None = Field(None, description="Dữ liệu thô từ nguồn ngoài")


class HrmReconciliationPreviewResponse(BaseModel):
    success: bool
    conflict_strategy: ConflictStrategy
    summary: ReconciliationSummary
    details: list[ReconciliationItemDetail]
    mapping_errors: list[dict[str, Any]] = []


class HrmSyncLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sync_type: str
    status: str
    source: str
    total_records: int
    created_users: int
    updated_users: int
    failed_records: int
    mentors_synced: int
    hr_synced: int
    interns_synced: int
    error_message: str | None = None
    details: Any | None = None
    started_at: datetime
    completed_at: datetime | None = None
    created_at: datetime


class HrmSyncActionResponse(BaseModel):
    success: bool
    message: str
    log: HrmSyncLogResponse | None = None
    reconciliation: ReconciliationSummary | None = None


class HrmStatusResponse(BaseModel):
    integration_enabled: bool
    api_endpoint: str
    auto_sync_enabled: bool
    cron_interval_minutes: int
    scheduler_status: str
    last_sync: HrmSyncLogResponse | None = None
    total_synced_mentors: int = 0
    total_synced_users: int = 0
