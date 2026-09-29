"""Schemas cho Báo cáo tuần của Thực tập sinh & Phản hồi của Mentor (Tasks 8, 9)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class WeeklyReportCreateRequest(BaseModel):
    """Body TTS nộp báo cáo tiến độ tuần (Task 8)."""

    week_number: int = Field(..., ge=1, le=52, description="Số thứ tự tuần trong kỳ thực tập")
    start_date: date = Field(..., description="Ngày bắt đầu tuần làm việc")
    end_date: date = Field(..., description="Ngày kết thúc tuần làm việc")
    title: str = Field(..., min_length=3, max_length=200, description="Tiêu đề báo cáo")
    content: str = Field(..., min_length=10, description="Chi tiết công việc đã thực hiện trong tuần")
    difficulties: str | None = Field(default=None, description="Khó khăn, vướng mắc gặp phải")
    next_week_plan: str | None = Field(default=None, description="Kế hoạch công việc tuần tiếp theo")
    program_id: int | None = Field(default=None, description="ID kỳ thực tập tương ứng")

    @field_validator("title", "content")
    @classmethod
    def strip_text(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Trường không được để trống hoặc chỉ chứa khoảng trắng.")
        return cleaned

    @model_validator(mode="after")
    def validate_dates(self) -> WeeklyReportCreateRequest:
        if self.end_date < self.start_date:
            raise ValueError("Ngày kết thúc tuần (end_date) không thể trước ngày bắt đầu (start_date).")
        return self


class ReportFeedbackCreateRequest(BaseModel):
    """Body Mentor phản hồi, nhận xét và chấm điểm báo cáo tuần (Task 9)."""

    score: Decimal | None = Field(default=None, ge=Decimal("0.0"), le=Decimal("10.0"), description="Điểm đánh giá thang 10")
    comment: str = Field(..., min_length=3, description="Nội dung nhận xét, góp ý chi tiết")

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Nội dung nhận xét không được để trống.")
        return cleaned


class ReportFeedbackResponse(BaseModel):
    """Thông tin phản hồi từ Mentor."""

    id: int
    report_id: int
    mentor_id: int
    mentor_name: str | None = None
    score: Decimal | None = None
    comment: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WeeklyReportResponse(BaseModel):
    """Chi tiết báo cáo tuần kèm phản hồi."""

    id: int
    user_id: int
    user_code: str | None = None
    user_name: str | None = None
    program_id: int | None = None
    program_name: str | None = None
    week_number: int
    start_date: date
    end_date: date
    title: str
    content: str
    difficulties: str | None = None
    next_week_plan: str | None = None
    status: Literal["draft", "submitted", "reviewed"]
    feedbacks: list[ReportFeedbackResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WeeklyReportListResponse(BaseModel):
    """Danh sách báo cáo tuần."""

    items: list[WeeklyReportResponse]
    total: int
