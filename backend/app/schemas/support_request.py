"""Schema cho tính năng Tiếp nhận Yêu cầu Hỗ trợ từ Thực tập sinh (Task 5)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


SupportRequestCategory = Literal["technical", "procedure", "workspace", "mentor", "other"]
SupportRequestPriority = Literal["low", "medium", "high", "urgent"]
SupportRequestStatus = Literal["pending", "in_progress", "resolved", "rejected"]


class SupportRequestCreate(BaseModel):
    """Body gửi yêu cầu hỗ trợ từ TTS."""

    title: str = Field(..., min_length=3, max_length=200, description="Tiêu đề yêu cầu hỗ trợ")
    content: str = Field(..., min_length=5, description="Chi tiết nội dung cần hỗ trợ")
    category: SupportRequestCategory = Field(
        default="other", description="Phân loại yêu cầu: technical, procedure, workspace, mentor, other"
    )
    priority: SupportRequestPriority = Field(
        default="medium", description="Mức độ ưu tiên: low, medium, high, urgent"
    )

    @field_validator("title", "content")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Trường thông tin không được để trống hoặc chỉ chứa khoảng trắng.")
        return cleaned


class SupportRequestUpdateStatus(BaseModel):
    """Body HR/Admin phản hồi và cập nhật trạng thái yêu cầu."""

    status: Literal["in_progress", "resolved", "rejected"] = Field(
        ..., description="Trạng thái mới: in_progress, resolved, rejected"
    )
    response_note: str | None = Field(
        default=None, max_length=1000, description="Ghi chú / phản hồi của HR/Admin"
    )


class SupportRequestResponse(BaseModel):
    """Thông tin yêu cầu hỗ trợ trả về cho client."""

    id: int
    user_id: int
    user_full_name: str | None = None
    user_code: str | None = None
    user_email: str | None = None
    title: str
    content: str
    category: str
    priority: str
    status: str
    response_note: str | None = None
    responder_id: int | None = None
    responder_name: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
