"""Routes quản lý chấm công check-in / check-out (Tasks 3, 4)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.attendance_raw_log import AttendanceRawLog
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceLeaveReportResponse,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceTodayStatusResponse,
)
from app.schemas.attendance_raw_log import (
    AttendanceRawLogBatchCreate,
    AttendanceRawLogBatchResponse,
    AttendanceRawLogCreate,
    AttendanceRawLogResponse,
    ProcessRawLogsRequest,
    ProcessRawLogsResponse,
)
from app.services.attendance_report_service import AttendanceReportService
from app.services.attendance_service import AttendanceService
from app.services.raw_log_processor import RawLogProcessorService

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
    "/hr/attendance-reports",
    response_model=AttendanceLeaveReportResponse,
    status_code=status.HTTP_200_OK,
    summary="HR xem báo cáo thống kê chuyên cần của thực tập sinh kèm bộ lọc theo tháng/đợt (US-22)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_attendance_reports(
    month: str | None = Query(default=None, description="Lọc theo tháng (định dạng YYYY-MM hoặc 1-12)"),
    year: int | None = Query(default=None, description="Lọc theo năm (YYYY) khi dùng cùng month 1-12"),
    program_id: int | None = Query(default=None, description="Lọc theo đợt/kỳ thực tập (Internship Program ID)"),
    batch_id: int | None = Query(default=None, description="Bí danh của program_id (lọc theo đợt thực tập)"),
    from_date: date | None = Query(default=None, description="Lọc từ ngày (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày (YYYY-MM-DD)"),
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    db: Session = Depends(get_db),
) -> AttendanceLeaveReportResponse:
    target_program_id = program_id if program_id is not None else batch_id
    return AttendanceReportService(db).get_attendance_leave_report(
        from_date=from_date,
        to_date=to_date,
        month=month,
        year=year,
        program_id=target_program_id,
        intern_id=intern_id,
    )


@router.get(
    "/hr/attendance/report",
    response_model=AttendanceLeaveReportResponse,
    status_code=status.HTTP_200_OK,
    summary="HR xem báo cáo đi làm và nghỉ phép (Legacy alias)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_attendance_leave_report(
    month: str | None = Query(default=None, description="Lọc theo tháng (định dạng YYYY-MM hoặc 1-12)"),
    year: int | None = Query(default=None, description="Lọc theo năm (YYYY)"),
    program_id: int | None = Query(default=None, description="Lọc theo đợt/kỳ thực tập"),
    batch_id: int | None = Query(default=None, description="Bí danh của program_id"),
    from_date: date | None = Query(default=None, description="Lọc từ ngày (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày (YYYY-MM-DD)"),
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    db: Session = Depends(get_db),
) -> AttendanceLeaveReportResponse:
    return get_attendance_reports(
        month=month,
        year=year,
        program_id=program_id,
        batch_id=batch_id,
        from_date=from_date,
        to_date=to_date,
        intern_id=intern_id,
        db=db,
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


# ── Peripheral Device Scanner & Raw Logs Ingestion (SCRUM-242, SCRUM-243) ──

@router.post(
    "/attendance/raw-logs",
    response_model=AttendanceRawLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận 1 bản ghi quét mã QR/thẻ từ thiết bị ngoại vi và lưu tạm vào Attendance_Raw_Logs (SCRUM-242)",
    dependencies=[Depends(require_roles("admin", "hr", "intern"))],
)
def ingest_raw_log(
    payload: AttendanceRawLogCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> AttendanceRawLogResponse:
    client_ip = request.client.host if request.client else None
    return RawLogProcessorService(db).ingest_single_log(payload, client_ip=client_ip)


@router.post(
    "/attendance/raw-logs/batch",
    response_model=AttendanceRawLogBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận hàng loạt bản ghi quét mã QR/thẻ theo lô từ thiết bị ngoại vi (SCRUM-242)",
    dependencies=[Depends(require_roles("admin", "hr"))],
)
def ingest_raw_logs_batch(
    payload: AttendanceRawLogBatchCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> AttendanceRawLogBatchResponse:
    client_ip = request.client.host if request.client else None
    return RawLogProcessorService(db).ingest_batch_logs(payload, client_ip=client_ip)


@router.get(
    "/attendance/raw-logs",
    response_model=list[AttendanceRawLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Tra cứu danh sách log thô quét mã từ thiết bị ngoại vi",
    dependencies=[Depends(require_roles("admin", "hr"))],
)
def list_raw_logs(
    device_id: str | None = Query(default=None, description="Lọc theo mã thiết bị quét"),
    user_code: str | None = Query(default=None, description="Lọc theo mã nhân viên/TTS"),
    is_processed: bool | None = Query(default=None, description="Lọc theo trạng thái đã phân tích"),
    limit: int = Query(default=50, ge=1, le=200, description="Số lượng bản ghi tối đa"),
    db: Session = Depends(get_db),
) -> list[AttendanceRawLogResponse]:
    query = db.query(AttendanceRawLog)
    if device_id:
        query = query.filter(AttendanceRawLog.device_id == device_id)
    if user_code:
        query = query.filter(AttendanceRawLog.user_code == user_code)
    if is_processed is not None:
        query = query.filter(AttendanceRawLog.is_processed == is_processed)
    
    records = query.order_by(AttendanceRawLog.scan_time.desc()).limit(limit).all()
    processor = RawLogProcessorService(db)
    return [processor._to_log_response(r) for r in records]


@router.post(
    "/attendance/process-raw-logs",
    response_model=ProcessRawLogsResponse,
    status_code=status.HTTP_200_OK,
    summary="Kích hoạt giải thuật phân tích log quét thẻ thô để tính giờ Check-in/Check-out chuẩn xác vào bảng Attendance (SCRUM-243)",
    dependencies=[Depends(require_roles("admin", "hr"))],
)
def process_raw_logs(
    payload: ProcessRawLogsRequest | None = None,
    db: Session = Depends(get_db),
) -> ProcessRawLogsResponse:
    req = payload or ProcessRawLogsRequest()
    return RawLogProcessorService(db).process_raw_logs(req)

