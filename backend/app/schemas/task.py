"""Schemas cho quản lý công việc và tiến độ (Tasks 1, 2, 7)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["todo", "doing", "done", "canceled"]


class TaskCreateRequest(BaseModel):
    """Body Mentor tạo công việc mới và tự động gán cho TTS."""

    intern_id: int = Field(..., description="ID của thực tập sinh được giao việc")
    title: str = Field(..., min_length=1, max_length=255, description="Tiêu đề công việc")
    description: str | None = Field(default=None, description="Mô tả chi tiết công việc")
    due_at: datetime | None = Field(default=None, description="Hạn chót hoàn thành")
    status: TaskStatus = Field(default="todo", description="Trạng thái ban đầu")
    progress: int = Field(default=0, ge=0, le=100, description="Tiến độ hoàn thành (0 - 100%)")


class TaskUpdateRequest(BaseModel):
    """Body TTS cập nhật trạng thái và tiến độ công việc."""

    status: TaskStatus | None = Field(default=None, description="Trạng thái công việc mới")
    progress: int | None = Field(default=None, ge=0, le=100, description="Tiến độ mới (0 - 100%)")


class TaskResponse(BaseModel):
    """Thông tin chi tiết một công việc."""

    id: int
    mentor_id: int
    intern_id: int
    title: str
    description: str | None = None
    status: str
    progress: int
    due_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    mentor_name: str | None = None
    intern_name: str | None = None

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    """Danh sách các công việc."""

    items: list[TaskResponse]
    total: int
