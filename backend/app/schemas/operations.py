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
    mentor_feedback: str = Field(..., min_length=1)
    status: Literal["reviewed", "rejected"] = "reviewed"


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
    doc_type: str = "Thỏa thuận thực tập 3 bên & NDA"
