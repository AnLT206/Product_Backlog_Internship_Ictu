from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.admin_user import (
    AdminManagedRole,
    AdminUserCreateRequest,
    AdminUserListResponse,
    AdminUserResponse,
)
from app.schemas.system_log import SystemLogListResponse
from app.services.admin_user_service import AdminUserService
from app.services.system_log_service import SystemLogService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="Danh sách người dùng theo vai trò (admin)",
)
def list_users(
    role: AdminManagedRole = Query(..., description="hr | mentor | intern"),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> AdminUserListResponse:
    return AdminUserService(db).list_users(role)


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo tài khoản nội bộ HR / Mentor (admin)",
)
def create_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> AdminUserResponse:
    return AdminUserService(db).create_user(payload)


@router.get(
    "/system-logs",
    response_model=SystemLogListResponse,
    summary="Danh sách nhật ký hoạt động (admin)",
)
def list_system_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    action: Literal["CREATE", "UPDATE", "DELETE"] | None = Query(default=None),
    user_id: int | None = Query(default=None, ge=1),
    from_at: datetime | None = Query(
        default=None,
        description="Lọc từ thời điểm (ISO 8601), inclusive",
    ),
    to_at: datetime | None = Query(
        default=None,
        description="Lọc đến thời điểm (ISO 8601), inclusive",
    ),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> SystemLogListResponse:
    return SystemLogService(db).list_logs(
        limit=limit,
        offset=offset,
        action=action,
        user_id=user_id,
        from_at=from_at,
        to_at=to_at,
    )
