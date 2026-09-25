"""Action Filter: tự động ghi system_logs cho thao tác Thêm/Sửa/Xóa thành công."""

from __future__ import annotations

import logging
from collections.abc import Callable

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
