from sqlalchemy.orm import Session

from app.models.allowance_history import AllowanceHistory
from app.schemas.allowance import AllowanceHistoryResponse


class AllowanceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_my_allowances(self, user_id: int) -> list[AllowanceHistoryResponse]:
        rows = (
            self.db.query(AllowanceHistory)
            .filter(AllowanceHistory.intern_id == user_id)
            .order_by(AllowanceHistory.period.desc(), AllowanceHistory.id.desc())
            .all()
        )
        return [AllowanceHistoryResponse.model_validate(row) for row in rows]
