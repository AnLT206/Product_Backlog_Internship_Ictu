from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ProgramCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    department: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date
    end_date: date
    max_interns: int = Field(default=50, ge=1, description="Số lượng TTS tối đa của kỳ")

    @model_validator(mode="after")
    def end_after_start(self) -> "ProgramCreateRequest":
        if self.end_date <= self.start_date:
            raise ValueError("end_date phải lớn hơn start_date.")
        return self


class ProgramUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    max_interns: int | None = Field(default=None, ge=1, description="Số lượng TTS tối đa")
    status: Literal["open", "closed"] | None = Field(default=None, description="Trạng thái mở/đóng kỳ")

    @model_validator(mode="after")
    def end_after_start_when_both(self) -> "ProgramUpdateRequest":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date <= self.start_date
        ):
            raise ValueError("end_date phải lớn hơn start_date.")
        return self


class ProgramResponse(BaseModel):
    id: int
    name: str
    department: str
    description: str | None = None
    start_date: date
    end_date: date
    max_interns: int = 50
    status: str = "open"
    is_deleted: bool = False
    current_interns: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProgramAssignRequest(BaseModel):
    intern_ids: list[int] = Field(..., min_length=1, description="Danh sách ID thực tập sinh cần gán")
    mentor_id: int | None = Field(default=None, description="ID mentor hướng dẫn (tuỳ chọn)")


class ProgramAssignResponse(BaseModel):
    program_id: int
    assigned_count: int
    intern_ids: list[int]
    mentor_id: int | None = None
    message: str
