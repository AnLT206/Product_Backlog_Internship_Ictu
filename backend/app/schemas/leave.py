from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LeaveCreateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def end_not_before_start(self) -> "LeaveCreateRequest":
        if self.end_date < self.start_date:
            raise ValueError("Ngày kết thúc không thể trước ngày bắt đầu.")
        cleaned = self.reason.strip()
        if not cleaned:
            raise ValueError("Lý do nghỉ không được để trống.")
        self.reason = cleaned
        return self


class LeaveResponse(BaseModel):
    id: int
    start_date: date
    end_date: date
    reason: str
    status: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
