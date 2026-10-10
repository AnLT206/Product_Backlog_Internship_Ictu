"""Schemas cho quản lý chấm công check-in / check-out (Tasks 3, 4)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

AttendanceStatus = Literal["present", "late", "half_day", "absent", "early_leave"]


class AttendanceCheckInRequest(BaseModel):
    """Body thực tập sinh check-in."""

    note: str | None = Field(default=None, max_length=255, description="Ghi chú khi check-in (tùy chọn)")
    timestamp: str | datetime | None = Field(default=None, description="Thời gian check-in")
    lat: float | None = Field(default=None, description="Tọa độ vĩ độ GPS")
    long: float | None = Field(default=None, description="Tọa độ kinh độ GPS")


class AttendanceCheckOutRequest(BaseModel):
    """Body thực tập sinh check-out."""

    note: str | None = Field(default=None, max_length=255, description="Ghi chú khi check-out (tùy chọn)")
    timestamp: str | datetime | None = Field(default=None, description="Thời gian check-out")


class AttendanceResponse(BaseModel):
    """Thông tin một lượt chấm công trong ngày."""

    id: int
    user_id: int
    user_code: str | None = None
    full_name: str | None = None
    email: str | None = None
    work_date: date
    check_in_at: datetime
    check_out_at: datetime | None = None
    total_hours: float | None = None
    status: str
    note: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AttendanceListResponse(BaseModel):
    """Danh sách các bản ghi chấm công."""

    items: list[AttendanceResponse]
    total: int


class AttendanceTodayStatusResponse(BaseModel):
    """Trạng thái chấm công của ngày hôm nay."""

    work_date: date
    checked_in: bool
    checked_out: bool
    record: AttendanceResponse | None = None
