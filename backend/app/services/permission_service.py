from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.permission import Permission, RolePermission
from app.models.role import Role
from app.schemas.permission import (
    PermissionMatrixResponse,
    PermissionModuleItem,
    RoleItem,
)

ROLE_LABELS = {
    "admin": "Quản trị viên (Admin)",
    "hr": "HR",
    "mentor": "Mentor",
    "intern": "Thực tập sinh",
}

DEFAULT_PERMISSION_DEFS = [
    # Xác thực
    ("auth_login", "Đăng nhập", "Xác thực"),
    ("auth_register", "Đăng ký (public)", "Xác thực"),
    # Hồ sơ
    ("interns_view", "Xem hồ sơ thực tập sinh", "Hồ sơ"),
    ("interns_create", "Thêm / sửa hồ sơ", "Hồ sơ"),
    ("interns_approve", "Duyệt / từ chối hồ sơ", "Hồ sơ"),
    ("documents_review", "Duyệt tài liệu", "Hồ sơ"),
    # Chương trình
    ("programs_manage", "Quản lý chương trình", "Chương trình"),
    ("programs_assign", "Phân công Mentor/TTS", "Chương trình"),
    ("schedule_view", "Xem lịch thực tập", "Chương trình"),
    # Công việc
    ("tasks_manage", "Giao / quản lý nhiệm vụ", "Công việc"),
    ("tasks_update", "Cập nhật tiến độ nhiệm vụ", "Công việc"),
    ("reports_submit", "Nộp báo cáo tuần", "Công việc"),
    ("reports_feedback", "Phản hồi báo cáo", "Công việc"),
    ("evaluations", "Đánh giá & tổng hợp", "Công việc"),
    # Chấm công
    ("attendance_self", "Chấm công cá nhân", "Chấm công"),
    ("attendance_hr", "Xem báo cáo chấm công", "Chấm công"),
    ("leave_request", "Đăng ký nghỉ phép", "Chấm công"),
    ("leave_approve", "Duyệt nghỉ phép", "Chấm công"),
    # Quyền lợi
    ("allowances", "Quản lý phụ cấp", "Quyền lợi"),
    ("support_tickets", "Yêu cầu / duyệt hỗ trợ", "Quyền lợi"),
    # Thống kê
    ("stats_view", "Xem thống kê", "Thống kê"),
    ("stats_export", "Xuất báo cáo Excel/PDF", "Thống kê"),
    # Quản trị
    ("admin_users", "Quản lý người dùng", "Quản trị"),
    ("admin_roles", "Phân quyền vai trò", "Quản trị"),
    ("admin_audit_logs", "Nhật ký hệ thống", "Quản trị"),
    ("admin_backup", "Sao lưu dữ liệu", "Quản trị"),
]

DEFAULT_ROLE_PERMS = {
    "admin": {
        "auth_login", "interns_view", "interns_create", "interns_approve", "documents_review",
        "programs_manage", "programs_assign", "schedule_view", "tasks_manage", "tasks_update",
        "reports_feedback", "evaluations", "attendance_hr", "leave_approve", "allowances",
        "support_tickets", "stats_view", "stats_export", "admin_users", "admin_roles",
        "admin_audit_logs", "admin_backup",
    },
    "hr": {
        "auth_login", "interns_view", "interns_create", "interns_approve", "documents_review",
        "programs_manage", "programs_assign", "schedule_view", "evaluations", "attendance_hr",
        "leave_approve", "allowances", "support_tickets", "stats_view", "stats_export",
    },
    "mentor": {
        "auth_login", "interns_view", "schedule_view", "tasks_manage", "tasks_update",
        "reports_feedback", "evaluations", "support_tickets",
    },
    "intern": {
        "auth_login", "auth_register", "schedule_view", "tasks_update", "reports_submit",
        "attendance_self", "leave_request", "support_tickets",
    },
}


class PermissionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def seed_defaults_if_needed(self) -> None:
        """Tự động seed và chuẩn hóa permissions và role_permissions (đảm bảo UTF-8 tiếng Việt chuẩn)."""
        existing_perms = {p.name: p for p in self.db.query(Permission).all()}
        needs_commit = False

        for key, label, group in DEFAULT_PERMISSION_DEFS:
            if key not in existing_perms:
                self.db.add(Permission(name=key, label=label, group_name=group))
                needs_commit = True
            else:
                perm = existing_perms[key]
                if perm.label != label or perm.group_name != group:
                    perm.label = label
                    perm.group_name = group
                    needs_commit = True

        self.db.flush()

        existing_rp_count = self.db.query(RolePermission).count()
        if existing_rp_count == 0:
            roles = self.db.query(Role).all()
            perms_by_name = {p.name: p for p in self.db.query(Permission).all()}

            for role in roles:
                default_keys = DEFAULT_ROLE_PERMS.get(role.name, set())
                for key in default_keys:
                    if key in perms_by_name:
                        perm = perms_by_name[key]
                        self.db.add(
                            RolePermission(role_id=role.id, permission_id=perm.id)
                        )
            needs_commit = True

        if needs_commit:
            self.db.commit()

    def get_permission_matrix(self) -> PermissionMatrixResponse:
        """Lấy ma trận phân quyền hiện tại (SCRUM-20)."""
        self.seed_defaults_if_needed()

        roles = self.db.query(Role).order_by(Role.id.asc()).all()
        perms = self.db.query(Permission).order_by(Permission.id.asc()).all()

        role_items = [
            RoleItem(key=r.name, label=ROLE_LABELS.get(r.name, r.name.capitalize()))
            for r in roles
        ]
        module_items = [
            PermissionModuleItem(key=p.name, label=p.label, group=p.group_name)
            for p in perms
        ]

        active_rps = self.db.query(RolePermission).all()
        active_set = {(rp.role_id, rp.permission_id) for rp in active_rps}

        matrix: dict[str, dict[str, bool]] = {}
        for r in roles:
            matrix[r.name] = {}
            for p in perms:
                matrix[r.name][p.name] = (r.id, p.id) in active_set

        return PermissionMatrixResponse(
            roles=role_items,
            modules=module_items,
            matrix=matrix,
        )

    def update_permission_matrix(
        self, matrix_data: dict[str, dict[str, bool]]
    ) -> dict[str, dict[str, bool]]:
        """Lưu toàn bộ ma trận phân quyền (SCRUM-20)."""
        self.seed_defaults_if_needed()

        roles_by_name = {r.name: r for r in self.db.query(Role).all()}
        perms_by_name = {p.name: p for p in self.db.query(Permission).all()}

        for role_name, perms_dict in matrix_data.items():
            role = roles_by_name.get(role_name)
            if not role:
                continue

            for perm_name, is_granted in perms_dict.items():
                perm = perms_by_name.get(perm_name)
                if not perm:
                    continue

                existing = (
                    self.db.query(RolePermission)
                    .filter(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == perm.id,
                    )
                    .first()
                )

                if is_granted and not existing:
                    self.db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                elif not is_granted and existing:
                    self.db.delete(existing)

        self.db.commit()
        return matrix_data

    def update_role_permissions(
        self, role_id_or_name: int | str, permission_keys: list[str]
    ) -> dict[str, bool]:
        """Cập nhật quyền cho 1 vai trò cụ thể (SCRUM-20)."""
        self.seed_defaults_if_needed()

        if isinstance(role_id_or_name, int) or str(role_id_or_name).isdigit():
            role = self.db.query(Role).filter(Role.id == int(role_id_or_name)).first()
        else:
            role = self.db.query(Role).filter(Role.name == str(role_id_or_name)).first()

        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy vai trò (Role).",
            )

        perms_by_name = {p.name: p for p in self.db.query(Permission).all()}

        # Xóa toàn bộ quyền cũ của role
        self.db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()

        # Thêm các quyền mới
        granted_result: dict[str, bool] = {}
        for key in permission_keys:
            if key in perms_by_name:
                perm = perms_by_name[key]
                self.db.add(RolePermission(role_id=role.id, permission_id=perm.id))
                granted_result[key] = True

        self.db.commit()
        return granted_result

    def has_permission(self, role_name: str, permission_key: str) -> bool:
        """Kiểm tra quyền động của vai trò (Dùng cho Middleware chặn quyền - SCRUM-19)."""
        if role_name == "admin":
            return True

        role = self.db.query(Role).filter(Role.name == role_name).first()
        if not role:
            return False

        perm = self.db.query(Permission).filter(Permission.name == permission_key).first()
        if not perm:
            return False

        exists = (
            self.db.query(RolePermission)
            .filter(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == perm.id,
            )
            .first()
        )
        return exists is not None
