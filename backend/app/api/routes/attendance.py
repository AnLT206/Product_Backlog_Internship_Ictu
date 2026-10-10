"""Routes quản lý chấm công check-in / check-out (Tasks 3, 4)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceLeaveReportResponse,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceTodayStatusResponse,
)
from app.services.attendance_report_service import AttendanceReportService
from app.services.attendance_service import AttendanceService

router = APIRouter(tags=["attendance"])


# ── Intern Attendance Endpoints ───────────────────────────────────────────────

@router.post(
    "/intern/attendance/check-in",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thực tập sinh check-in đầu ngày làm việc (Task 4)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def intern_check_in(
    payload: AttendanceCheckInRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    note = payload.note if payload else None
    return AttendanceService(db).check_in(current_user=current_user, note=note)


@router.post(
    "/intern/attendance/check-out",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Thực tập sinh check-out kết thúc ca và tính tổng giờ làm việc (Task 4)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def intern_check_out(
    payload: AttendanceCheckOutRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    note = payload.note if payload else None
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
    "/hr/attendance/report",
    response_model=AttendanceLeaveReportResponse,
    status_code=status.HTTP_200_OK,
    summary="HR xem báo cáo đi làm và nghỉ phép (Join Attendance + LeaveRequest)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_attendance_leave_report(
    from_date: date | None = Query(default=None, description="Lọc từ ngày (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày (YYYY-MM-DD)"),
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    db: Session = Depends(get_db),
) -> AttendanceLeaveReportResponse:
    return AttendanceReportService(db).get_attendance_leave_report(
        from_date=from_date,
        to_date=to_date,
        intern_id=intern_id,
    )


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
