from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.leave import LeaveCreateRequest, LeaveResponse
from app.services.leave_service import LeaveService

router = APIRouter(tags=["leaves"])


@router.post(
    "/leaves",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Gửi đơn xin nghỉ phép",
    dependencies=[Depends(require_roles("intern"))],
)
def create_leave(
    payload: LeaveCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaveResponse:
    return LeaveService(db).create_leave(current_user.id, payload)


@router.get(
    "/leaves",
    response_model=list[LeaveResponse],
    summary="Lấy danh sách đơn xin nghỉ đã nộp",
    dependencies=[Depends(require_roles("intern"))],
)
def list_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LeaveResponse]:
    return LeaveService(db).list_my_leaves(current_user.id)
