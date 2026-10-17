from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field


class AttendanceRawLogCreate(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=50, description="Mã định danh thiết bị quét")
    device_ip: str | None = Field(default=None, max_length=50, description="Địa chỉ IP của thiết bị ngoại vi")
    user_code: str | None = Field(default=None, max_length=50, description="Mã nhân viên / TTS quét từ thẻ hoặc QR")
    user_id: int | None = Field(default=None, description="ID TTS trong hệ thống (tùy chọn)")
    scan_time: datetime | None = Field(default=None, description="Thời điểm quét (mặc định lấy thời điểm hiện tại)")
    scan_type: Literal["qr", "rfid_card", "fingerprint", "face_id", "other"] = Field(
        default="qr", description="Phương thức quét nhận diện"
    )
    direction: Literal["in", "out", "unknown"] = Field(
        default="unknown", description="Chiều quét: in, out hoặc unknown"
    )
    raw_payload: str | None = Field(default=None, description="Dữ liệu thô kèm theo từ máy quét ngoại vi")


class AttendanceRawLogBatchCreate(BaseModel):
    device_id: str | None = Field(default=None, description="Device ID chung cho toàn bộ batch nếu các item không truyền")
    logs: list[AttendanceRawLogCreate] = Field(..., min_length=1, description="Danh sách các bản ghi quét cần nạp")


class AttendanceRawLogResponse(BaseModel):
    id: int
    device_id: str
    device_ip: str | None = None
    user_code: str | None = None
    user_id: int | None = None
    user_full_name: str | None = None
    scan_time: datetime
    scan_type: str
    direction: str
    is_processed: bool
    processed_at: datetime | None = None
    error_note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceRawLogBatchResponse(BaseModel):
    received_count: int
    success_count: int
    failed_count: int
    created_logs: list[AttendanceRawLogResponse]
    message: str


class ProcessRawLogsRequest(BaseModel):
    target_date: date | None = Field(
        default=None,
        description="Ngày cần phân tích log (YYYY-MM-DD). Nếu None, phân tích tất cả các ngày có log chưa xử lý.",
    )
    user_id: int | None = Field(
        default=None,
        description="ID thực tập sinh cần phân tích (tùy chọn).",
    )
    reprocess_all: bool = Field(
        default=False,
        description="Nếu True, phân tích lại kể cả các log đã đánh dấu is_processed=True.",
    )


class ProcessedDayAttendanceDetail(BaseModel):
    user_id: int
    user_code: str | None = None
    full_name: str | None = None
    work_date: date
    raw_scans_count: int
    check_in_at: datetime
    check_out_at: datetime | None = None
    total_hours: float | None = None
    status: str
    action_taken: Literal["created", "updated", "unchanged"]


class ProcessRawLogsResponse(BaseModel):
    processed_logs_count: int
    affected_users_count: int
    attendance_created_count: int
    attendance_updated_count: int
    details: list[ProcessedDayAttendanceDetail]
    message: str
