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
    max_mentors: int = Field(default=10, ge=1, description="Số lượng Mentor tối đa của kỳ")

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
    max_mentors: int | None = Field(default=None, ge=1, description="Số lượng Mentor tối đa")
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


class ProgramPeriodRequest(BaseModel):
    """Khoảng thời gian thực tập: ngày bắt đầu và ngày kết thúc."""

    start_date: date
    end_date: date

    @model_validator(mode="after")
    def end_after_start(self) -> "ProgramPeriodRequest":
        if self.end_date <= self.start_date:
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
    max_mentors: int = 10
    status: str = "open"
    is_deleted: bool = False
    current_interns: int = 0
    current_mentors: int = 0
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


class ProgramMemberItem(BaseModel):
    id: int
    program_id: int
    intern_user_id: int
    intern_name: str
    intern_email: str
    intern_code: str | None = None
    phone_number: str | None = None
    university: str | None = None
    major: str | None = None
    mentor_user_id: int | None = None
    mentor_name: str | None = None
    mentor_email: str | None = None
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProgramUpdateMemberRequest(BaseModel):
    mentor_id: int | None = None
    status: str | None = None


class ProgramGroupBatchAssignRequest(BaseModel):
    program_id: int | None = Field(default=None, description="ID kỳ thực tập cần gán")
    group_id: int | None = Field(default=None, description="ID nhóm thực tập cần gán")
    intern_ids: list[int] | None = Field(default=None, description="Danh sách User ID của TTS cần gán")
    intern_profile_ids: list[int] | None = Field(default=None, description="Danh sách InternProfile ID của TTS cần gán")
    mentor_id: int | None = Field(default=None, description="ID mentor hướng dẫn (tuỳ chọn)")
    role: str = Field(default="member", max_length=50, description="Vai trò trong nhóm (member, leader)")

    @model_validator(mode="after")
    def check_target_and_interns(self) -> "ProgramGroupBatchAssignRequest":
        if self.program_id is None and self.group_id is None:
            raise ValueError("Vui lòng cung cấp ít nhất program_id hoặc group_id để phân công.")

        has_intern_ids = bool(self.intern_ids and len(self.intern_ids) > 0)
        has_profile_ids = bool(self.intern_profile_ids and len(self.intern_profile_ids) > 0)
        if not has_intern_ids and not has_profile_ids:
            raise ValueError("Vui lòng cung cấp danh sách thực tập sinh cần gán (intern_ids hoặc intern_profile_ids).")
        return self


class ProgramGroupBatchAssignResponse(BaseModel):
    success: bool = True
    program_id: int | None = None
    program_name: str | None = None
    group_id: int | None = None
    group_name: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    assigned_count: int
    intern_ids: list[int] = Field(default_factory=list)
    intern_profile_ids: list[int] = Field(default_factory=list)
    mentor_id: int | None = None
    message: str


class InternStatusSummary(BaseModel):

    """Tổng hợp số lượng TTS theo 4 trạng thái và các tỷ lệ tương ứng (US-33)."""

    total: int = Field(default=0, description="Tổng số thực tập sinh")
    in_progress: int = Field(default=0, description="Số lượng đang thực tập")
    completed: int = Field(default=0, description="Số lượng đã hoàn thành")
    dropped_out: int = Field(default=0, description="Số lượng bỏ cuộc")
    failed: int = Field(default=0, description="Số lượng không đạt")
    not_completed: int = Field(default=0, description="Tổng số không hoàn thành (bỏ cuộc + không đạt)")
    completion_rate: float = Field(default=0.0, description="Tỷ lệ hoàn thành (%)")
    dropout_rate: float = Field(default=0.0, description="Tỷ lệ bỏ cuộc (%)")
    failure_rate: float = Field(default=0.0, description="Tỷ lệ không đạt (%)")
    in_progress_rate: float = Field(default=0.0, description="Tỷ lệ đang thực tập (%)")


class ProgramCompletionItem(BaseModel):
    """Chi tiết trạng thái và tỷ lệ hoàn thành theo từng kỳ thực tập."""

    id: int
    name: str
    department: str
    total: int = 0
    completed: int = 0
    in_progress: int = 0
    dropped_out: int = 0
    failed: int = 0
    not_completed: int = 0
    completion_rate: float = 0.0


class PreviousPeriodSummary(BaseModel):
    """Thông tin kỳ thực tập liền trước để so sánh chênh lệch tỷ lệ."""

    id: int
    name: str
    total: int = 0
    completed: int = 0
    completion_rate: float = 0.0


class ProgramCompletionStatsResponse(BaseModel):
    """Phản hồi API thống kê tỷ lệ hoàn thành chương trình thực tập (US-33)."""

    summary: InternStatusSummary
    previous_period: PreviousPeriodSummary | None = None
    programs: list[ProgramCompletionItem] = Field(default_factory=list)

