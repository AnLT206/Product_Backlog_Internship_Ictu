from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.system_log import SystemLogListResponse
from app.services.system_log_service import SystemLogService

router = APIRouter(prefix="/admin", tags=["admin"])


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
