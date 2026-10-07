from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ShiftType = Literal["morning", "afternoon", "full_time", "flexible"]


class WorkScheduleCreate(BaseModel):
    group_name: str = Field(..., min_length=1, max_length=100, description="Tên nhóm thực tập hoặc tên ca")
    program_id: int | None = Field(default=None, description="ID kỳ thực tập gắn với nhóm (tùy chọn)")
    shift_type: ShiftType = Field(default="flexible", description="Loại ca làm việc")
    start_time: time = Field(..., description="Giờ bắt đầu làm việc (HH:MM:SS)")
    end_time: time = Field(..., description="Giờ kết thúc ca làm việc (HH:MM:SS)")
    days_of_week: str = Field(default="2,3,4,5,6", max_length=50, description="Các thứ làm việc trong tuần (VD: 2,3,4,5,6)")
    flexible_minutes: int = Field(default=15, ge=0, le=180, description="Biên độ linh hoạt theo phút (VD: 15)")
    is_active: bool = Field(default=True, description="Trạng thái kích hoạt")


class WorkScheduleUpdate(BaseModel):
    group_name: str | None = Field(default=None, min_length=1, max_length=100)
    program_id: int | None = None
    shift_type: ShiftType | None = None
    start_time: time | None = None
    end_time: time | None = None
    days_of_week: str | None = Field(default=None, max_length=50)
    flexible_minutes: int | None = Field(default=None, ge=0, le=180)
    is_active: bool | None = None


class WorkScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int | None = None
    group_name: str
    shift_type: str
    start_time: time
    end_time: time
    days_of_week: str
    flexible_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
