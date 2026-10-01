from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleResponse


class ScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_my_schedules(self, user_id: int) -> list[ScheduleResponse]:
        rows = (
            self.db.query(Schedule)
            .filter(Schedule.user_id == user_id)
            .order_by(Schedule.start_date.asc(), Schedule.id.asc())
            .all()
        )
        return [ScheduleResponse.model_validate(row) for row in rows]
