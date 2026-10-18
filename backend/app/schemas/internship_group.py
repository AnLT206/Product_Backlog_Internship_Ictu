from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class InternshipGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Tên nhóm thực tập")
    code: str | None = Field(None, max_length=50, description="Mã nhóm thực tập")
    department_id: int | None = Field(None, description="ID phòng ban gắn với nhóm")
    program_id: int | None = Field(None, description="ID chương trình thực tập gắn với nhóm")
    description: str | None = Field(None, max_length=500, description="Mô tả nhóm")
    max_members: int = Field(20, ge=1, le=500, description="Số lượng thành viên tối đa")


class InternshipGroupCreate(InternshipGroupBase):
    pass


class InternshipGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    code: str | None = Field(None, max_length=50)
    department_id: int | None = None
    program_id: int | None = None
    description: str | None = Field(None, max_length=500)
    max_members: int | None = Field(None, ge=1, le=500)
    status: str | None = Field(None, pattern="^(active|inactive|closed)$")


class InternGroupMemberItem(BaseModel):
    intern_profile_id: int
    user_id: int
    full_name: str
    email: str
    code: str | None = None
    university: str | None = None
    major: str | None = None
    role: str = "member"
    status: str = "active"
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InternshipGroupResponse(BaseModel):
    id: int
    name: str
    code: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    program_id: int | None = None
    program_name: str | None = None
    description: str | None = None
    max_members: int
    current_members_count: int = 0
    status: str
    created_at: datetime
    updated_at: datetime
    members: list[InternGroupMemberItem] | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignInternsToGroupRequest(BaseModel):
    group_id: int | None = Field(None, description="ID nhóm thực tập (nếu không truyền qua URL)")
    intern_profile_ids: list[int] | None = Field(None, description="Danh sách InternProfile ID cần phân công")
    intern_ids: list[int] | None = Field(None, description="Danh sách User ID của TTS cần phân công (tuỳ chọn)")
    role: str = Field("member", max_length=50, description="Vai trò trong nhóm (leader, member)")


class AssignInternsToGroupResponse(BaseModel):
    success: bool = True
    group_id: int
    group_name: str
    department_id: int | None = None
    department_name: str | None = None
    assigned_count: int
    assigned_intern_profile_ids: list[int]
    message: str


class AssignInternsToDepartmentRequest(BaseModel):
    department_id: int | None = Field(None, description="ID phòng ban (nếu không truyền qua URL)")
    intern_profile_ids: list[int] | None = Field(None, description="Danh sách InternProfile ID")
    intern_ids: list[int] | None = Field(None, description="Danh sách User ID của TTS (tuỳ chọn)")


class AssignInternsToDepartmentResponse(BaseModel):
    success: bool = True
    department_id: int
    department_name: str
    assigned_count: int
    assigned_intern_profile_ids: list[int]
    message: str


class InternGroupOverviewItem(BaseModel):
    group_id: int
    group_name: str
    group_code: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    program_id: int | None = None
    program_name: str | None = None
    role: str
    status: str
    assigned_at: datetime


class InternDepartmentOverviewItem(BaseModel):
    department_id: int
    department_name: str
    assigned_at: datetime


class InternGroupsDepartmentsResponse(BaseModel):
    intern_profile_id: int
    user_id: int
    full_name: str
    email: str
    groups: list[InternGroupOverviewItem]
    departments: list[InternDepartmentOverviewItem]
