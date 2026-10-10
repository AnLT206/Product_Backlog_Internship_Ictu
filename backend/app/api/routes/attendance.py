"""Routes quản lý chấm công check-in / check-out (Tasks 3, 4)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceTodayStatusResponse,
)
from app.services.attendance_service import AttendanceService

router = APIRouter(tags=["attendance"])


# ── Intern Attendance Endpoints ───────────────────────────────────────────────

@router.post(
    "/intern/attendance/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thực tập sinh check-in đầu ngày làm việc (Task 4, DFD 4.3)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def intern_check_in(
    payload: AttendanceCheckInRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    note = payload.note if payload else None
    if payload and (payload.lat is not None or payload.long is not None):
        coords_str = f"GPS: ({payload.lat}, {payload.long})"
        note = f"{note} | {coords_str}" if note else coords_str
    return AttendanceService(db).check_in(current_user=current_user, note=note)


@router.post(
    "/intern/attendance/check-out",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Thực tập sinh check-out kết thúc ca và tính tổng giờ làm việc (Task 4, DFD 4.3)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def intern_check_out(
    payload: AttendanceCheckOutRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    note = payload.note if payload else None
    if payload and payload.timestamp:
        ts_str = f"Time: {payload.timestamp}"
        note = f"{note} | {ts_str}" if note else ts_str
    return AttendanceService(db).check_out(current_user=current_user, note=note)


@router.get(
    "/intern/attendance/today",
    response_model=AttendanceTodayStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Xem trạng thái chấm công của ngày hôm nay",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def get_today_attendance_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceTodayStatusResponse:
    return AttendanceService(db).get_today_status(current_user=current_user)


@router.get(
    "/intern/attendance/my-shifts",
    summary="Thực tập sinh xem danh sách ca làm việc (DFD Section 4.3)",
    dependencies=[Depends(require_roles("intern", "admin", "hr"))],
)
def get_my_shifts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.work_schedule_service import WorkScheduleService
    schedules = WorkScheduleService(db).list_work_schedules()
    return [
        {
            "id": s.id,
            "program_id": s.program_id,
            "shift_name": s.shift_name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "days_of_week": s.days_of_week,
            "status": s.status,
        }
        for s in schedules
    ]


@router.get(
    "/intern/attendance",
    response_model=AttendanceListResponse,
    status_code=status.HTTP_200_OK,
    summary="Xem lịch sử chấm công của thực tập sinh",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def list_intern_attendance_history(
    from_date: date | None = Query(default=None, description="Lọc từ ngày (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceListResponse:
    return AttendanceService(db).list_intern_history(
        current_user=current_user,
        from_date=from_date,
        to_date=to_date,
    )


# ── HR / Admin Attendance Endpoints ──────────────────────────────────────────

@router.get(
    "/hr/attendance/monthly-summary",
    summary="HR xem thống kê chuyên cần tháng của thực tập sinh (DFD Section 4.3)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_monthly_attendance_summary(
    month: str | None = Query(default=None, description="Lọc theo tháng YYYY-MM"),
    db: Session = Depends(get_db),
):
    from datetime import datetime
    from app.models.attendance import Attendance
    from app.models.user import User

    attendances = db.query(Attendance).all()
    if month:
        attendances = [
            a for a in attendances
            if a.work_date and a.work_date.strftime("%Y-%m") == month
        ]
    interns = db.query(User).filter(User.role.has(name="intern")).all()
    summary = []
    for intern in interns:
        user_atts = [a for a in attendances if a.user_id == intern.id]
        total_present = sum(1 for a in user_atts if a.status == "present")
        total_late = sum(1 for a in user_atts if a.status == "late")
        total_hours = sum(a.total_hours or 0 for a in user_atts)
        summary.append({
            "intern_id": intern.id,
            "intern_name": intern.full_name or intern.email,
            "intern_code": intern.code,
            "total_shifts": len(user_atts),
            "present_count": total_present,
            "late_count": total_late,
            "total_hours": round(total_hours, 1),
            "period": month or datetime.now().strftime("%Y-%m"),
        })
    return summary


@router.get(
    "/hr/attendance",
    response_model=AttendanceListResponse,
    status_code=status.HTTP_200_OK,
    summary="HR / Admin xem danh sách chấm công chuyên cần của TTS",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_all_intern_attendance(
    from_date: date | None = Query(default=None, description="Lọc từ ngày (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày (YYYY-MM-DD)"),
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    db: Session = Depends(get_db),
) -> AttendanceListResponse:
    return AttendanceService(db).list_all_attendance(
        from_date=from_date,
        to_date=to_date,
        intern_id=intern_id,
    )
