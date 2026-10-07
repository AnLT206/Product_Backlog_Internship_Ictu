from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.work_schedule import (
    WorkScheduleCreate,
    WorkScheduleResponse,
    WorkScheduleUpdate,
)
from app.services.work_schedule_service import WorkScheduleService

router = APIRouter(prefix="/hr/work-schedules", tags=["hr-work-schedules"])


@router.get(
    "",
    response_model=list[WorkScheduleResponse],
    summary="Lấy danh sách cấu hình ca làm việc linh hoạt cho các nhóm (SCRUM-173)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_work_schedules(
    program_id: int | None = Query(default=None, description="Lọc theo kỳ thực tập"),
    db: Session = Depends(get_db),
) -> list[WorkScheduleResponse]:
    return WorkScheduleService(db).list_work_schedules(program_id=program_id)


@router.get(
    "/{schedule_id}",
    response_model=WorkScheduleResponse,
    summary="Xem chi tiết cấu hình ca làm việc theo ID",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_work_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
) -> WorkScheduleResponse:
    return WorkScheduleService(db).get_by_id(schedule_id)


@router.post(
    "",
    response_model=WorkScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới khung giờ / ca làm việc linh hoạt cho nhóm thực tập (SCRUM-173)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_work_schedule(
    data: WorkScheduleCreate,
    db: Session = Depends(get_db),
) -> WorkScheduleResponse:
    return WorkScheduleService(db).create_work_schedule(data)


@router.put(
    "/{schedule_id}",
    response_model=WorkScheduleResponse,
    summary="Cập nhật khung giờ làm việc linh hoạt cho nhóm thực tập (SCRUM-173)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_work_schedule(
    schedule_id: int,
    data: WorkScheduleUpdate,
    db: Session = Depends(get_db),
) -> WorkScheduleResponse:
    return WorkScheduleService(db).update_work_schedule(schedule_id, data)
