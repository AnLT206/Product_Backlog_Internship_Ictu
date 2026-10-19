from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.weekly_work_schedule import (
    WeeklyWorkScheduleCreate,
    WeeklyWorkScheduleResponse,
    WeeklyWorkScheduleUpdate,
)
from app.services.weekly_schedule_service import WeeklyScheduleService

router = APIRouter(tags=["weekly-work-schedules"])


# ==================== HR / ADMIN CRUD APIS ====================

@router.get(
    "/hr/weekly-schedules",
    response_model=list[WeeklyWorkScheduleResponse],
    summary="HR/Admin lấy danh sách lịch làm việc theo phiên của từng tuần",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_weekly_schedules(
    role: str | None = Query(default=None, description="Lọc theo role: intern hoặc mentor"),
    user_id: int | None = Query(default=None, description="Lọc theo user_id"),
    start_date: date | None = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    status_filter: str | None = Query(default=None, alias="status", description="Lọc theo trạng thái"),
    db: Session = Depends(get_db),
) -> list[WeeklyWorkScheduleResponse]:
    return WeeklyScheduleService(db).list_schedules(
        role=role,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )


@router.post(
    "/hr/weekly-schedules",
    response_model=WeeklyWorkScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="HR/Admin tạo mới lịch làm việc theo phiên cho TTS hoặc Mentor",
)
def create_weekly_schedule(
    data: WeeklyWorkScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("hr", "admin")),
) -> WeeklyWorkScheduleResponse:
    return WeeklyScheduleService(db).create_schedule(data, created_by_id=current_user.id)


@router.put(
    "/hr/weekly-schedules/{schedule_id}",
    response_model=WeeklyWorkScheduleResponse,
    summary="HR/Admin chỉnh sửa lịch làm việc (Chỉ được phép sửa trước ít nhất 3 ngày)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_weekly_schedule(
    schedule_id: int,
    data: WeeklyWorkScheduleUpdate,
    db: Session = Depends(get_db),
) -> WeeklyWorkScheduleResponse:
    return WeeklyScheduleService(db).update_schedule(schedule_id, data)


@router.delete(
    "/hr/weekly-schedules/{schedule_id}",
    summary="HR/Admin xóa lịch làm việc theo phiên",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def delete_weekly_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    return WeeklyScheduleService(db).delete_schedule(schedule_id)


# ==================== INTERN / MENTOR VIEW APIS ====================

@router.get(
    "/intern/weekly-schedules",
    response_model=list[WeeklyWorkScheduleResponse],
    summary="Thực tập sinh xem lịch làm việc theo phiên của mình từ HR",
    dependencies=[Depends(require_roles("intern", "hr", "admin"))],
)
def get_intern_weekly_schedules(
    start_date: date | None = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WeeklyWorkScheduleResponse]:
    return WeeklyScheduleService(db).get_user_schedule(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/mentor/weekly-schedules",
    response_model=list[WeeklyWorkScheduleResponse],
    summary="Mentor xem lịch làm việc/hướng dẫn theo phiên của mình từ HR",
    dependencies=[Depends(require_roles("mentor", "hr", "admin"))],
)
def get_mentor_weekly_schedules(
    start_date: date | None = Query(default=None, description="Từ ngày (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="Đến ngày (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WeeklyWorkScheduleResponse]:
    return WeeklyScheduleService(db).get_user_schedule(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )
