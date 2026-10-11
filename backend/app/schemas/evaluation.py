from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EvaluationCreateRequest(BaseModel):
    intern_id: int = Field(..., gt=0)
    skill_score: int = Field(..., ge=1, le=10)
    attitude_score: int = Field(..., ge=1, le=10)
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class EvaluationResponse(BaseModel):
    id: int
    intern_id: int
    mentor_id: int
    skill_score: int
    attitude_score: int
    comment: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UniversityReportSummary(BaseModel):
    university: str
    intern_count: int = 0
    evaluated_count: int = 0
    average_score: float | None = None
    average_attendance_rate: float = 0.0


class ProgramReportSummary(BaseModel):
    program_id: int
    program_name: str
    intern_count: int = 0
    evaluated_count: int = 0
    average_score: float | None = None
    average_attendance_rate: float = 0.0


class FinalEvaluationItem(BaseModel):
    intern_id: int
    intern_code: str | None = None
    full_name: str | None = None
    email: str
    university: str | None = None
    major: str | None = None
    academic_year: str | None = None
    program_id: int | None = None
    program_name: str | None = None
    mentor_id: int | None = None
    mentor_name: str | None = None
    skill_score: int | None = None
    attitude_score: int | None = None
    final_score: float | None = None
    grade: str = "Chưa đánh giá"
    comment: str | None = None
    is_evaluated: bool = False
    present_days: int = 0
    late_days: int = 0
    authorized_leave_days: int = 0
    unauthorized_leave_days: int = 0
    total_working_days: int = 0
    attendance_rate: float = 0.0


class FinalEvaluationReportResponse(BaseModel):
    total_interns: int
    evaluated_count: int
    unevaluated_count: int
    average_score: float | None = None
    grade_distribution: dict[str, int]
    by_university: list[UniversityReportSummary]
    by_program: list[ProgramReportSummary]
    items: list[FinalEvaluationItem]
