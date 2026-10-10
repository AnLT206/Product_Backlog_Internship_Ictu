from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


# ── Mentor Task Schemas ──
class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    intern_id: int | None = None
    intern_name: str | None = None
    due_at: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["todo", "doing", "review", "done"] = "todo"
    progress: int = Field(default=0, ge=0, le=100)


class TaskStatusUpdateRequest(BaseModel):
    status: Literal["todo", "doing", "review", "done"]
    progress: int | None = None


# ── Mentor Report Grade Schemas ──
class ReportGradeRequest(BaseModel):
    score: float = Field(..., ge=0, le=10)
    mentor_feedback: str | None = Field(default=None)
    comments: str | None = Field(default=None)
    status: Literal["reviewed", "rejected", "approved"] = "reviewed"


# ── Mentor Evaluation Schemas ──
class EvaluationSaveRequest(BaseModel):
    intern_id: int
    attendance_score: float = Field(default=9.0, ge=0, le=10)
    tech_score: float = Field(default=9.0, ge=0, le=10)
    report_score: float = Field(default=9.0, ge=0, le=10)
    final_score: float = Field(default=9.0, ge=0, le=10)
    letter_grade: str = Field(default="A")
    mentor_note: str | None = None
    status: str = "verified"


# ── HR Contract Create Schema ──
class ContractCreateRequest(BaseModel):
    intern_id: int
    contract_code: str
    doc_type: str = "Hợp đồng tiếp nhận thực tập & Cam kết bảo mật"
    start_date: str | None = "01/10/2026"
    end_date: str | None = "31/12/2026"
    allowance: str | None = "3.000.000 đ/tháng"
    department: str | None = "Trung tâm Phát triển Phần mềm ICTU"
    notes: str | None = None
    status: str = "active"


# ── Intern Weekly Report Schema ──
class InternReportCreateRequest(BaseModel):
    week_title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    file_name: str | None = None


# ── Leave Request Schemas ──
class LeaveRequestCreate(BaseModel):
    type: str = Field(..., min_length=1)
    startDate: str = Field(..., min_length=1)
    endDate: str = Field(..., min_length=1)
    session: str = "Cả ngày (08:15 - 17:30)"
    duration: str = "1.0 ngày"
    reason: str = Field(..., min_length=1)


class LeaveRequestReview(BaseModel):
    feedback: str | None = None

