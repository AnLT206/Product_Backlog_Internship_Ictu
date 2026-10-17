from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MentorDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    position: str | None = None
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    office_location: str | None = None
    avatar_url: str | None = None
    status: str = "online"
    status_text: str | None = None
    specialties: list[str] = Field(default_factory=list)
    working_hours: str | None = "08:00 - 17:30 (Thứ 2 - Thứ 6)"


class GroupDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | str
    code: str | None = None
    name: str
    program_name: str | None = None
    department_name: str | None = None
    mentor_id: int | None = None
    mentor_name: str | None = None
    total_members: int = 0
    max_slots: int = 50
    status: str = "active"
    description: str | None = None
    members: list[GroupMemberItem] = Field(default_factory=list)


class GroupMemberItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str | None = None
    full_name: str
    role: str = "Thành viên"
    is_current_user: bool = False
    is_me: bool = False
    email: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    university: str | None = None
    major: str | None = None
    avatar_url: str | None = None
    joined_date: str | None = None


class InternMentorGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str = "assigned"
    message: str | None = None
    mentor: MentorDetail | None = None
    group: GroupDetail | None = None
    members: list[GroupMemberItem] = Field(default_factory=list)
