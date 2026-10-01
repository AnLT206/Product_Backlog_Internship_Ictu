from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.schedule import ScheduleResponse
from app.services.schedule_service import ScheduleService

router = APIRouter(tags=["schedules"])


@router.get(
    "/schedules",
    response_model=list[ScheduleResponse],
    summary="Lấy lịch thực tập cá nhân của thực tập sinh đang đăng nhập",
    dependencies=[Depends(require_roles("intern"))],
)
def list_my_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScheduleResponse]:
    return ScheduleService(db).list_my_schedules(current_user.id)
