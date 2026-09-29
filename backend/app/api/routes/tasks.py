"""Routes quản lý công việc và tiến độ (Tasks 1, 2, 7)."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.task import (
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
    TaskUpdateRequest,
)
from app.services.task_service import TaskService

router = APIRouter(tags=["tasks"])


# ── Mentor Endpoints ──────────────────────────────────────────────────────────

@router.post(
    "/mentor/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mentor tạo công việc mới và tự động gán cho thực tập sinh (Task 7)",
    dependencies=[Depends(require_roles("mentor", "admin"))],
)
def create_task_for_intern(
    payload: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    return TaskService(db).create_task(current_user=current_user, payload=payload)


@router.get(
    "/mentor/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="Mentor xem danh sách công việc đã giao",
    dependencies=[Depends(require_roles("mentor", "admin"))],
)
def list_mentor_tasks(
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    status_filter: Literal["todo", "doing", "done", "canceled"] | None = Query(
        default=None, alias="status", description="Lọc theo trạng thái công việc"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    return TaskService(db).list_tasks_for_mentor(
        current_user=current_user,
        intern_id=intern_id,
        status_filter=status_filter,
    )


# ── Intern Endpoints ──────────────────────────────────────────────────────────

@router.patch(
    "/intern/tasks/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Thực tập sinh cập nhật trạng thái và tiến độ công việc (Task 2)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def update_task_progress(
    task_id: int,
    payload: TaskUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskResponse:
    return TaskService(db).update_task_by_intern(
        current_user=current_user,
        task_id=task_id,
        payload=payload,
    )


@router.get(
    "/intern/tasks",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="Thực tập sinh xem danh sách công việc được giao",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def list_intern_tasks(
    status_filter: Literal["todo", "doing", "done", "canceled"] | None = Query(
        default=None, alias="status", description="Lọc theo trạng thái công việc"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    return TaskService(db).list_tasks_for_intern(
        current_user=current_user,
        status_filter=status_filter,
    )
