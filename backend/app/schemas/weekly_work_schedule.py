from __future__ import annotations

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

WeeklyScheduleRole = Literal["intern", "mentor"]
WeeklyScheduleStatus = Literal["scheduled", "completed", "cancelled"]


class WeeklyWorkScheduleCreate(BaseModel):
    user_id: int = Field(..., description="ID của người dùng (TTS hoặc Mentor)")
    role: WeeklyScheduleRole = Field(..., description="Vai trò: intern hoặc mentor")
    session_date: date = Field(..., description="Ngày làm việc của phiên (YYYY-MM-DD)")
    shift_name: str = Field(..., min_length=1, max_length=100, description="Tên ca/phiên (VD: Ca Sáng, Ca Chiều)")
    start_time: time = Field(..., description="Giờ bắt đầu (HH:MM:SS)")
    end_time: time = Field(..., description="Giờ kết thúc (HH:MM:SS)")
    location: str | None = Field(default="P.302 – Trung tâm Phần mềm & AI ICTU", max_length=255, description="Địa điểm làm việc")
    notes: str | None = Field(default=None, description="Ghi chú công việc/nội dung phiên")
    status: WeeklyScheduleStatus = Field(default="scheduled", description="Trạng thái phiên làm việc")


class WeeklyWorkScheduleUpdate(BaseModel):
    user_id: int | None = None
    role: WeeklyScheduleRole | None = None
    session_date: date | None = None
    shift_name: str | None = Field(default=None, min_length=1, max_length=100)
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    status: WeeklyScheduleStatus | None = None


class WeeklyWorkScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str | None = None
    user_code: str | None = None
    role: str
    session_date: date
    shift_name: str
    start_time: time
    end_time: time
    location: str | None = None
    notes: str | None = None
    status: str
    created_by_id: int | None = None
    created_by_name: str | None = None
    is_editable: bool = True
    days_until_session: int = 0
    created_at: datetime
    updated_at: datetime | None = None
