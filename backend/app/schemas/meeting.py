from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MeetingAttendeeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    full_name: str | None = None
    email: str | None = None
    is_notified: bool = False


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Tiêu đề cuộc họp")
    description: str | None = Field(default=None, description="Nội dung/mô tả cuộc họp")
    start_time: datetime = Field(..., description="Thời gian bắt đầu (ISO-8601)")
    end_time: datetime = Field(..., description="Thời gian kết thúc (ISO-8601)")
    meeting_link: str | None = Field(default=None, max_length=500, description="Địa điểm hoặc đường link họp online")
    intern_ids: list[int] = Field(..., min_length=1, description="Danh sách ID thực tập sinh tham dự")


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    meeting_link: str | None = None
    host_id: int
    host_name: str | None = None
    attendees: list[MeetingAttendeeItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None
