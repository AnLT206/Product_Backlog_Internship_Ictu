from datetime import datetime

from sqlalchemy.orm import Session

from app.api.activity_log_filter import derive_action_description
from app.models.system_log import SystemLog
from app.schemas.system_log import SystemLogListResponse, SystemLogResponse


class SystemLogService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_logs(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        action: str | None = None,
        user_id: int | None = None,
        from_at: datetime | None = None,
        to_at: datetime | None = None,
    ) -> SystemLogListResponse:
        query = self.db.query(SystemLog)

        if action is not None:
            query = query.filter(SystemLog.action == action)
        if user_id is not None:
            query = query.filter(SystemLog.user_id == user_id)
        if from_at is not None:
            query = query.filter(SystemLog.created_at >= from_at)
        if to_at is not None:
            query = query.filter(SystemLog.created_at <= to_at)

        total = query.count()
        rows = (
            query.order_by(SystemLog.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items = []
        for row in rows:
            item = SystemLogResponse.model_validate(row)
            if not item.description:
                item.description = getattr(row, "description", None) or derive_action_description(
                    row.method, row.path, row.role, row.created_at
                )
            items.append(item)

        return SystemLogListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )
