from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.admin import AdminUserCreateRequest, AdminUserResponse
from app.schemas.admin_user import AdminManagedRole, AdminUserListResponse
from app.schemas.permission import (
    PermissionActionResponse,
    PermissionMatrixResponse,
    PermissionMatrixUpdateRequest,
    RolePermissionUpdateRequest,
)
from app.schemas.system_log import SystemLogListResponse
from app.services.admin_service import AdminService
from app.services.admin_user_service import AdminUserService
from app.services.permission_service import PermissionService
from app.services.system_log_service import SystemLogService


router = APIRouter(prefix="/admin", tags=["admin"])
users_router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin tạo mới tài khoản người dùng (SCRUM-18)",
    dependencies=[Depends(require_roles("admin"))],
)
@users_router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới tài khoản người dùng (SCRUM-18)",
    dependencies=[Depends(require_roles("admin"))],
)
def create_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
) -> AdminUserResponse:
    return AdminService(db).create_user(payload)



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


# ── Phân quyền ma trận (SCRUM-20) ─────────────────────────────────────────────

@router.get(
    "/permissions",
    response_model=PermissionMatrixResponse,
    summary="Lấy ma trận phân quyền hệ thống (SCRUM-20)",
    dependencies=[Depends(require_roles("admin"))],
)
def get_permission_matrix(
    db: Session = Depends(get_db),
) -> PermissionMatrixResponse:
    return PermissionService(db).get_permission_matrix()


@router.put(
    "/permissions",
    response_model=PermissionActionResponse,
    summary="Lưu cập nhật toàn bộ ma trận phân quyền hệ thống (SCRUM-20)",
    dependencies=[Depends(require_roles("admin"))],
)
def update_permission_matrix(
    payload: PermissionMatrixUpdateRequest,
    db: Session = Depends(get_db),
) -> PermissionActionResponse:
    updated = PermissionService(db).update_permission_matrix(payload.matrix)
    return PermissionActionResponse(
        detail="Lưu phân quyền thành công.",
        matrix=updated,
    )


@router.put(
    "/roles/{role_id}/permissions",
    response_model=PermissionActionResponse,
    summary="Cập nhật quyền theo vai trò (SCRUM-20)",
    dependencies=[Depends(require_roles("admin"))],
)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionUpdateRequest,
    db: Session = Depends(get_db),
) -> PermissionActionResponse:
    PermissionService(db).update_role_permissions(role_id, payload.permission_keys)
    return PermissionActionResponse(
        detail=f"Cập nhật quyền cho vai trò ID {role_id} thành công.",
    )

