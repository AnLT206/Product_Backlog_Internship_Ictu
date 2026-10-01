from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.allowance import AllowanceHistoryResponse
from app.services.allowance_service import AllowanceService

router = APIRouter(tags=["allowances"])


@router.get(
    "/allowances",
    response_model=list[AllowanceHistoryResponse],
    summary="Lịch sử phụ cấp của người dùng đang đăng nhập",
    dependencies=[Depends(require_roles("intern"))],
)
def list_my_allowances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AllowanceHistoryResponse]:
    return AllowanceService(db).list_my_allowances(current_user.id)
