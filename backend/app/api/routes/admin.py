import os
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.admin import AdminUserCreateRequest, AdminUserResponse
from app.schemas.admin_user import AdminManagedRole, AdminUserListResponse, AdminUserUpdateRequest
from app.schemas.backup_record import (
    BackupCreateRequest,
    BackupItemResponse,
    BackupOverviewResponse,
    BackupScheduleConfig,
)
from app.schemas.permission import (
    PermissionActionResponse,
    PermissionMatrixResponse,
    PermissionMatrixUpdateRequest,
    RolePermissionUpdateRequest,
)
from app.schemas.system_log import SystemLogListResponse
from app.schemas.system_setting import (
    SystemSettingsResponse,
    SystemSettingsUpdateRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services.admin_service import AdminService
from app.services.admin_user_service import AdminUserService
from app.services.backup_service import BackupService
from app.services.permission_service import PermissionService
from app.services.settings_service import SettingsService
from app.services.system_log_service import SystemLogService
from fastapi.responses import FileResponse



router = APIRouter(prefix="/admin", tags=["admin"])
users_router = APIRouter(prefix="/users", tags=["users"])
settings_router = APIRouter(prefix="/settings", tags=["settings"])


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
    role: str | None = Query(None, description="hr | mentor | intern | admin | all"),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> AdminUserListResponse:
    return AdminUserService(db).list_users(role)


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
    summary="Admin cập nhật trạng thái người dùng (kích hoạt / ngưng / duyệt)",
    dependencies=[Depends(require_roles("admin"))],
)
def update_user_status(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
) -> AdminUserResponse:
    return AdminUserService(db).update_user_status(user_id, payload.status)


@router.delete(
    "/users/{user_id}",
    summary="Admin xóa người dùng khỏi cơ sở dữ liệu",
    dependencies=[Depends(require_roles("admin"))],
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    return AdminUserService(db).delete_user(user_id)


@router.post(
    "/users/{user_id}/reset-password",
    summary="Admin đặt lại mật khẩu tạm cho người dùng",
    dependencies=[Depends(require_roles("admin"))],
)
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    return AdminUserService(db).reset_password(user_id)



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


# ── Cấu hình Tham số & SSO/LDAP ──────────────────────────────────────────────

@settings_router.get(
    "/public",
    summary="Lấy cấu hình tham số hệ thống công khai",
)
@router.get(
    "/settings/public",
    summary="Lấy cấu hình tham số hệ thống công khai",
)
def get_public_settings(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return SettingsService(db).get_public_settings()


@router.get(
    "/settings",
    response_model=SystemSettingsResponse,
    summary="Lấy cấu hình tham số hệ thống và SSO/LDAP",
    dependencies=[Depends(require_roles("admin"))],
)
def get_system_settings(
    db: Session = Depends(get_db),
) -> SystemSettingsResponse:
    return SettingsService(db).get_settings()


@router.put(
    "/settings",
    response_model=SystemSettingsResponse,
    summary="Cập nhật cấu hình tham số hệ thống và SSO/LDAP",
    dependencies=[Depends(require_roles("admin"))],
)
def update_system_settings(
    payload: SystemSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SystemSettingsResponse:
    return SettingsService(db).update_settings(payload.settings, current_user)


@router.post(
    "/settings/test-ldap",
    response_model=TestConnectionResponse,
    summary="Kiểm tra kết nối tới máy chủ LDAP / SSO Active Directory",
    dependencies=[Depends(require_roles("admin"))],
)
def test_ldap_connection(
    payload: TestConnectionRequest,
    db: Session = Depends(get_db),
) -> TestConnectionResponse:
    return SettingsService(db).test_ldap_connection(payload.ldap_server_url, payload.ldap_base_dn)


@router.post(
    "/settings/test-hrm",
    response_model=TestConnectionResponse,
    summary="Kiểm tra kết nối cổng đồng bộ HRM doanh nghiệp đối tác",
    dependencies=[Depends(require_roles("admin"))],
)
def test_hrm_connection(
    db: Session = Depends(get_db),
) -> TestConnectionResponse:
    return SettingsService(db).test_hrm_connection()


# ── Sao lưu & Khôi phục Dữ liệu (Backup & Restore) ───────────────────────────

@router.get(
    "/backups",
    response_model=BackupOverviewResponse,
    summary="Danh sách các bản sao lưu và thông tin lập lịch sao lưu",
    dependencies=[Depends(require_roles("admin"))],
)
def get_backups_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BackupOverviewResponse:
    service = BackupService(db)
    service.ensure_initial_backups(current_user)
    return service.get_overview()


@router.post(
    "/backups",
    response_model=BackupItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo bản sao lưu dữ liệu mới tức thì",
    dependencies=[Depends(require_roles("admin"))],
)
def create_backup(
    payload: BackupCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BackupItemResponse:
    return BackupService(db).create_backup(payload, current_user)


@router.get(
    "/backups/{backup_id}/download",
    summary="Tải về file sao lưu cơ sở dữ liệu (.sql)",
    dependencies=[Depends(require_roles("admin"))],
)
def download_backup_file(
    backup_id: int,
    db: Session = Depends(get_db),
) -> FileResponse:
    from app.models.backup_record import BackupRecord
    record = db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tệp sao lưu.")
    return FileResponse(
        path=record.file_path,
        filename=record.filename,
        media_type="application/sql",
    )


@router.post(
    "/backups/{backup_id}/restore",
    summary="Khôi phục cơ sở dữ liệu từ bản sao lưu",
    dependencies=[Depends(require_roles("admin"))],
)
def restore_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return BackupService(db).restore_backup(backup_id, current_user)


@router.delete(
    "/backups/{backup_id}",
    summary="Xóa bản sao lưu dữ liệu",
    dependencies=[Depends(require_roles("admin"))],
)
def delete_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return BackupService(db).delete_backup(backup_id, current_user)


@router.put(
    "/backups/schedule",
    response_model=BackupScheduleConfig,
    summary="Cập nhật cấu hình lịch sao lưu tự động",
    dependencies=[Depends(require_roles("admin"))],
)
def update_backup_schedule(
    payload: BackupScheduleConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BackupScheduleConfig:
    return BackupService(db).update_schedule(payload.model_dump(), current_user)


