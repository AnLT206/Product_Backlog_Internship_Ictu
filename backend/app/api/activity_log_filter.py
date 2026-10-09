"""Action Filter: tự động ghi system_logs cho thao tác Thêm/Sửa/Xóa thành công."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.database import SessionLocal
from app.models.system_log import SystemLog
from app.utils.authenticate_login import verify_access_token

logger = logging.getLogger(__name__)

MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
METHOD_TO_ACTION = {
    "POST": "CREATE",
    "PUT": "UPDATE",
    "PATCH": "UPDATE",
    "DELETE": "DELETE",
}
SKIP_PATH_PREFIXES = (
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)
# Login không phải CRUD nghiệp vụ — bỏ qua để tránh nhiễu nhật ký.
SKIP_EXACT_PATHS = frozenset({"/api/auth/login"})


def resolve_action(method: str) -> str | None:
    return METHOD_TO_ACTION.get(method.upper())


def derive_resource(path: str) -> str:
    """Rút resource từ path, ví dụ /api/hr/mentors/3 → hr/mentors."""
    parts = [p for p in path.strip("/").split("/") if p]
    if parts and parts[0] == "api":
        parts = parts[1:]
    meaningful = [p for p in parts if not p.isdigit()]
    if not meaningful:
        return path[:100]
    return "/".join(meaningful[:2])[:100]


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45] or None
    if request.client is None:
        return None
    return (request.client.host or "")[:45] or None


def _actor_from_request(request: Request) -> tuple[int | None, str | None]:
    auth = request.headers.get("authorization") or ""
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None, None

    payload = verify_access_token(token.strip())
    if payload is None:
        return None, None

    subject = payload.get("sub")
    role = payload.get("role")
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        return None, str(role) if role else None

    if user_id <= 0:
        return None, str(role) if role else None

    role_name = str(role).strip() if isinstance(role, str) and role.strip() else None
    return user_id, role_name


def should_log(request: Request, status_code: int) -> bool:
    if request.method.upper() not in MUTATING_METHODS:
        return False
    if not (200 <= status_code < 300):
        return False

    path = request.url.path
    if path in SKIP_EXACT_PATHS:
        return False
    return not any(path == prefix or path.startswith(f"{prefix}/") for prefix in SKIP_PATH_PREFIXES)


def derive_action_description(method: str, path: str, role: str | None, timestamp: datetime | None = None) -> str:
    m = method.upper()
    ts = timestamp or datetime.now()
    ts_str = ts.strftime("%Y-%m-%d %H:%M:%S")
    desc = "Thao tác hệ thống"

    p = path.lower()
    if "/api/hr/interns" in p:
        if "approve" in p:
            desc = "HR phê duyệt tiếp nhận hồ sơ thực tập sinh"
        elif "reject" in p:
            desc = "HR từ chối hồ sơ ứng viên"
        elif m == "POST":
            desc = "HR tạo mới hồ sơ thực tập sinh"
        elif m in ("PUT", "PATCH"):
            desc = "HR cập nhật hồ sơ thực tập sinh"
        elif m == "DELETE":
            desc = "HR xóa hồ sơ thực tập sinh"
    elif "/api/hr/assign-mentor" in p:
        desc = "HR phân công Mentor phụ trách thực tập sinh"
    elif "/api/hr/programs" in p:
        if m == "POST":
            desc = "HR tạo mới kỳ thực tập"
        elif m in ("PUT", "PATCH"):
            desc = "HR cập nhật thông tin kỳ thực tập"
    elif "/api/hr/contracts" in p:
        desc = "HR tạo / phát hành hợp đồng tiếp nhận thực tập"
    elif "/api/mentor/tasks" in p:
        if "status" in p:
            desc = "Cập nhật trạng thái nhiệm vụ Sprint"
        elif m == "POST":
            desc = "Mentor giao nhiệm vụ Sprint cho thực tập sinh"
        elif m == "DELETE":
            desc = "Mentor xóa nhiệm vụ Sprint"
    elif "/api/mentor/reports" in p:
        if "grade" in p:
            desc = "Mentor chấm điểm và phản hồi báo cáo tuần"
        elif m == "POST":
            desc = "Mentor đánh giá báo cáo tuần"
    elif "/api/mentor/evaluations" in p:
        desc = "Mentor lưu bảng điểm và đánh giá năng lực của TTS"
    elif "/api/intern/reports" in p or "/api/intern/weekly-reports" in p:
        if m == "POST":
            desc = "Thực tập sinh nộp báo cáo tuần"
        elif m == "DELETE":
            desc = "Thực tập sinh xóa báo cáo tuần"
    elif "/api/intern/attendance" in p or "/api/attendance" in p:
        desc = "Thực tập sinh điểm danh / chấm công ngày"
    elif "/api/documents" in p:
        desc = "Tải lên / cập nhật tài liệu hồ sơ"
    elif "/api/contracts/sign" in p or "sign" in p:
        desc = "Thực tập sinh ký hợp đồng thực tập số"
    elif "/api/admin/users" in p:
        if "status" in p:
            desc = "Admin cập nhật trạng thái tài khoản người dùng"
        elif "reset-password" in p:
            desc = "Admin đặt lại mật khẩu cho người dùng"
        elif m == "POST":
            desc = "Admin tạo mới tài khoản người dùng"
        elif m == "DELETE":
            desc = "Admin xóa tài khoản người dùng"
    elif "/api/admin/roles" in p or "/api/roles" in p:
        desc = "Admin cập nhật ma trận phân quyền RBAC"
    elif "/api/admin/settings" in p:
        desc = "Admin cập nhật cấu hình hệ thống"
    elif "/api/leaves" in p:
        desc = "Nộp / duyệt đơn xin nghỉ phép"
    elif "/api/tickets" in p:
        desc = "Gửi / xử lý yêu cầu hỗ trợ (Support Ticket)"
    else:
        role_label = role.upper() if role else "User"
        action_map = {"POST": "Tạo mới", "PUT": "Cập nhật", "PATCH": "Chỉnh sửa", "DELETE": "Xóa"}
        desc = f"{role_label} {action_map.get(m, m)} dữ liệu tại {derive_resource(path)}"

    return f"{desc} [{ts_str}]"


def write_activity_log(
    *,
    user_id: int | None,
    role: str | None,
    action: str,
    method: str,
    path: str,
    resource: str | None,
    ip_address: str | None,
    user_agent: str | None,
    status_code: int,
) -> None:
    """Ghi log bằng session riêng — không phá transaction của request hiện tại."""
    db = SessionLocal()
    now = datetime.now()
    desc = derive_action_description(method, path, role, now)
    try:
        db.add(
            SystemLog(
                user_id=user_id,
                role=role,
                action=action,
                method=method.upper()[:10],
                path=path[:500],
                resource=resource,
                ip_address=ip_address,
                user_agent=(user_agent[:500] if user_agent else None),
                status_code=status_code,
                description=desc[:500],
                created_at=now,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to write system activity log")
    finally:
        db.close()


class ActivityLogFilterMiddleware(BaseHTTPMiddleware):
    """Action Filter tương đương ASP.NET: bắt POST/PUT/PATCH/DELETE thành công."""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        response = await call_next(request)

        if not should_log(request, response.status_code):
            return response

        action = resolve_action(request.method)
        if action is None:
            return response

        user_id, role = _actor_from_request(request)
        path = request.url.path
        try:
            write_activity_log(
                user_id=user_id,
                role=role,
                action=action,
                method=request.method,
                path=path,
                resource=derive_resource(path),
                ip_address=_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                status_code=response.status_code,
            )
        except Exception:
            logger.exception("Activity log filter unexpected error")

        return response
