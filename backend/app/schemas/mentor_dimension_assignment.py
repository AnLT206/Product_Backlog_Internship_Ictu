from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RoleTypeLiteral = Literal["primary", "technical", "co_mentor", "advisor"]
DimensionTypeLiteral = Literal["major", "class", "intake", "department"]


class DimensionItemSummary(BaseModel):
    """Thống kê tổng số TTS và trạng thái phân công của một nhóm (Khối / Lớp / Khóa / Ban)."""

    dimension_type: str
    value: str
    total_interns: int
    assigned_interns: int
    unassigned_interns: int
    mentor_count: int


class DimensionsSummaryResponse(BaseModel):
    """Tổng hợp tóm tắt 4 chiều phân loại TTS."""

    majors: list[DimensionItemSummary] = []
    classes: list[DimensionItemSummary] = []
    intakes: list[DimensionItemSummary] = []
    departments: list[DimensionItemSummary] = []
    total_interns: int = 0
    total_assigned: int = 0
    total_unassigned: int = 0


class MentorAssignmentItem(BaseModel):
    """Thông tin một Mentor được gán cho TTS theo vai trò."""

    id: int
    mentor_id: int
    mentor_name: str
    mentor_email: str
    role_type: RoleTypeLiteral
    dimension_type: str
    dimension_value: str | None = None
    assigned_at: datetime


class InternWithMentorsItem(BaseModel):
    """Hồ sơ TTS kèm toàn bộ danh sách Mentor đang hướng dẫn (hỗ trợ N-N)."""

    id: int
    code: str | None = None
    full_name: str | None = None
    email: str
    major: str | None = None
    class_name: str | None = None
    academic_year: str | None = None
    departments: list[str] = []
    primary_mentor_id: int | None = None
    primary_mentor_name: str | None = None
    mentors: list[MentorAssignmentItem] = []


class DimensionInternsResponse(BaseModel):
    """Danh sách chi tiết TTS thuộc một Khối/Lớp/Khóa/Ban cụ thể."""

    dimension_type: str
    dimension_value: str
    total: int
    interns: list[InternWithMentorsItem] = []


class BatchAssignByDimensionRequest(BaseModel):
    """Yêu cầu phân công Mentor hàng loạt theo Khối / Lớp / Khóa / Ban (hỗ trợ 1-N & N-N)."""

    dimension_type: DimensionTypeLiteral
    dimension_value: str = Field(..., min_length=1, max_length=150)
    mentor_ids: list[int] = Field(..., min_length=1, description="Danh sách Mentor cần phân công")
    role_type: RoleTypeLiteral = Field(
        default="primary",
        description="Vai trò Mentor: primary (Chính), technical (Kỹ thuật), co_mentor (Đồng hành), advisor (Cố vấn)",
    )
    assignment_mode: Literal["append", "replace"] = Field(
        default="append",
        description="'append' giữ nguyên mentor hiện tại và bổ sung thêm, 'replace' thay thế mentor cùng vai trò",
    )
    target_intern_ids: list[int] | None = Field(
        default=None,
        description="Tùy chọn danh sách ID của các TTS được chọn cụ thể trong nhóm đó (nếu None sẽ áp dụng toàn bộ nhóm)",
    )


class MatrixAssignRequest(BaseModel):
    """Phân công ma trận nhiều Mentor cho nhiều TTS (N-N tự do)."""

    mentor_ids: list[int] = Field(..., min_length=1)
    intern_ids: list[int] = Field(..., min_length=1)
    role_type: RoleTypeLiteral = "primary"
    assignment_mode: Literal["append", "replace"] = "append"


class AssignMentorRoleResult(BaseModel):
    """Kết quả phân công."""

    success: bool = True
    message: str
    assigned_count: int
    affected_interns: int


class UnassignMentorRoleRequest(BaseModel):
    """Yêu cầu gỡ bỏ vai trò của Mentor khỏi TTS."""

    mentor_id: int
    intern_id: int
    role_type: RoleTypeLiteral | None = None
