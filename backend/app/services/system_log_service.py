from sqlalchemy.orm import Session

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
    ) -> SystemLogListResponse:
        query = self.db.query(SystemLog)

        if action is not None:
            query = query.filter(SystemLog.action == action)
        if user_id is not None:
            query = query.filter(SystemLog.user_id == user_id)

        total = query.count()
        rows = (
            query.order_by(SystemLog.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return SystemLogListResponse(
            items=[SystemLogResponse.model_validate(row) for row in rows],
            total=total,
            limit=limit,
            offset=offset,
        )
