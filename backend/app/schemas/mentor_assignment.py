"""Schema phân công Mentor cho Thực tập sinh (Task 6)."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class MentorAssignInternsRequest(BaseModel):
    """Body HR phân công TTS cho Mentor theo mentor_id trên path."""

    intern_ids: list[int] = Field(..., min_length=1, description="Danh sách ID thực tập sinh cần gán")
    program_id: int | None = Field(default=None, description="ID kỳ thực tập (tùy chọn)")

    @field_validator("intern_ids")
    @classmethod
    def validate_intern_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("Danh sách intern_ids không được để trống.")
        for item in v:
            if not isinstance(item, int) or item <= 0:
                raise ValueError("Mỗi intern_id phải là số nguyên dương hợp lệ.")
        # Loại bỏ trùng lặp nếu có nhưng vẫn giữ thứ tự
        seen = set()
        unique = []
        for x in v:
            if x not in seen:
                seen.add(x)
                unique.append(x)
        return unique


class MentorBulkAssignRequest(MentorAssignInternsRequest):
    """Body HR phân công hàng loạt TTS cho một Mentor."""

    mentor_id: int = Field(..., gt=0, description="ID của Mentor nhận phân công")


class AssignedInternItem(BaseModel):
    """Chi tiết thực tập sinh được phân công cho Mentor."""

    intern_id: int
    intern_code: str | None = None
    intern_name: str | None = None
    intern_email: str
    program_id: int
    program_name: str | None = None
    assigned_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignedInternListResponse(BaseModel):
    """Danh sách TTS được phân công cho Mentor."""

    items: list[AssignedInternItem]
    total: int


class MentorAssignResponse(BaseModel):
    """Kết quả phân công Mentor cho TTS."""

    mentor_id: int
    mentor_name: str | None = None
    assigned_count: int
    intern_ids: list[int]
    message: str
