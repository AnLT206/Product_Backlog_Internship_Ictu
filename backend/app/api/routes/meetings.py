from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.meeting import MeetingCreate, MeetingResponse
from app.services.meeting_service import MeetingService

router = APIRouter(tags=["meetings"])


@router.post(
    "/hr/meetings",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo lịch họp mới và tự động gửi email thông báo cho thực tập sinh (SCRUM-178, SCRUM-179)",
    dependencies=[Depends(require_roles("hr", "mentor", "admin"))],
)
def create_meeting(
    data: MeetingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeetingResponse:
    return MeetingService(db).create_meeting(
        data=data,
        host=current_user,
        background_tasks=background_tasks,
    )


@router.get(
    "/meetings",
    response_model=list[MeetingResponse],
    summary="Lấy danh sách các cuộc họp của người dùng",
)
def list_my_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MeetingResponse]:
    role_name = current_user.role.name if current_user.role else "intern"
    return MeetingService(db).list_meetings(user_id=current_user.id, role_name=role_name)


@router.get(
    "/meetings/{meeting_id}",
    response_model=MeetingResponse,
    summary="Xem chi tiết thông tin cuộc họp",
)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> MeetingResponse:
    return MeetingService(db).get_by_id(meeting_id)
