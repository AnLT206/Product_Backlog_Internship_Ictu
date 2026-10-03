from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.leave_request import LeaveRequest
from app.schemas.leave import LeaveCreateRequest, LeaveResponse


class LeaveService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_leave(self, user_id: int, payload: LeaveCreateRequest) -> LeaveResponse:
        row = LeaveRequest(
            user_id=user_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            reason=payload.reason,
            status="pending",
        )
        try:
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể gửi đơn xin nghỉ.",
            ) from None
        return LeaveResponse.model_validate(row)

    def list_my_leaves(self, user_id: int) -> list[LeaveResponse]:
        rows = (
            self.db.query(LeaveRequest)
            .filter(LeaveRequest.user_id == user_id)
            .order_by(LeaveRequest.id.desc())
            .all()
        )
        return [LeaveResponse.model_validate(row) for row in rows]
