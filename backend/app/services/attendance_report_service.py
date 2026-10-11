"""Báo cáo chuyên cần HR: Join Attendance với LeaveRequest (US-22)."""

from __future__ import annotations

import calendar
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import and_, case, distinct, func
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.internship_program import InternshipProgram
from app.models.leave_request import LeaveRequest
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.attendance import (
    AttendanceLeaveReportItem,
    AttendanceLeaveReportResponse,
    AttendanceLeaveTotals,
)

WORKED_STATUSES = ("present", "half_day", "early_leave")
APPROVED_LEAVE = "approved"


def _parse_month_range(month_str: str | None, year_val: int | None = None) -> tuple[date, date, str] | None:
    """Chuyển đổi tham số tháng thành khoảng ngày (from_date, to_date) và chuỗi YYYY-MM."""
    if not month_str:
        return None
    cleaned = month_str.strip()
    if not cleaned:
        return None

    parsed_year = year_val
    parsed_month: int | None = None

    if "-" in cleaned:
        parts = cleaned.split("-")
        if len(parts) == 2:
            try:
                parsed_year = int(parts[0])
                parsed_month = int(parts[1])
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Định dạng tháng không hợp lệ: '{month_str}'. Sử dụng định dạng YYYY-MM hoặc 1-12.",
                )
    elif "/" in cleaned:
        parts = cleaned.split("/")
        if len(parts) == 2:
            try:
                if len(parts[0]) == 4:
                    parsed_year, parsed_month = int(parts[0]), int(parts[1])
                else:
                    parsed_month, parsed_year = int(parts[0]), int(parts[1])
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Định dạng tháng không hợp lệ: '{month_str}'.",
                )
    else:
        try:
            parsed_month = int(cleaned)
            if parsed_year is None:
                parsed_year = date.today().year
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Định dạng tháng không hợp lệ: '{month_str}'. Sử dụng định dạng YYYY-MM hoặc 1-12.",
            )

    if parsed_month is None or not (1 <= parsed_month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tháng không hợp lệ: {parsed_month}. Tháng phải nằm trong khoảng từ 1 đến 12.",
        )
    if parsed_year is None or parsed_year < 1900 or parsed_year > 2100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Năm không hợp lệ: {parsed_year}.",
        )

    _, last_day = calendar.monthrange(parsed_year, parsed_month)
    month_start = date(parsed_year, parsed_month, 1)
    month_end = date(parsed_year, parsed_month, last_day)
    month_formatted = f"{parsed_year:04d}-{parsed_month:02d}"
    return month_start, month_end, month_formatted


class AttendanceReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_attendance_leave_report(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        month: str | None = None,
        year: int | None = None,
        program_id: int | None = None,
        intern_id: int | None = None,
    ) -> AttendanceLeaveReportResponse:
        """Thống kê ngày đi làm, đi muộn, nghỉ có phép và không phép kèm bộ lọc tháng/đợt.

        Câu Join:
            attendance LEFT JOIN leave_requests
              ON leave_requests.user_id = attendance.user_id
             AND attendance.work_date BETWEEN start_date AND end_date
             AND leave_requests.status = 'approved'
        """
        parsed_month_str: str | None = None
        if month:
            m_res = _parse_month_range(month, year)
            if m_res is not None:
                m_start, m_end, m_str = m_res
                parsed_month_str = m_str
                from_date = max(from_date, m_start) if from_date else m_start
                to_date = min(to_date, m_end) if to_date else m_end

        program_obj: InternshipProgram | None = None
        target_intern_ids: set[int] | None = None

        if program_id is not None:
            program_obj = (
                self.db.query(InternshipProgram)
                .filter(
                    InternshipProgram.id == program_id,
                    InternshipProgram.is_deleted == False,
                )
                .first()
            )
            if not program_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy đợt thực tập với ID {program_id}.",
                )

            member_rows = (
                self.db.query(ProgramMember.intern_user_id)
                .filter(ProgramMember.program_id == program_id)
                .all()
            )
            member_ids = {r[0] for r in member_rows}

            if intern_id is not None:
                target_intern_ids = {intern_id} if intern_id in member_ids else set()
            else:
                target_intern_ids = member_ids

            if from_date is None and month is None:
                from_date = program_obj.start_date
            if to_date is None and month is None:
                to_date = program_obj.end_date
        elif intern_id is not None:
            target_intern_ids = {intern_id}

        if from_date and to_date and from_date > to_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khoảng thời gian không hợp lệ: from_date không được lớn hơn to_date.",
            )

        if target_intern_ids is not None and len(target_intern_ids) == 0:
            return AttendanceLeaveReportResponse(
                from_date=from_date,
                to_date=to_date,
                month=parsed_month_str,
                program_id=program_obj.id if program_obj else None,
                program_name=program_obj.name if program_obj else None,
                totals=AttendanceLeaveTotals(),
                items=[],
                total=0,
            )

        items_by_id: dict[int, AttendanceLeaveReportItem] = {}
        if program_obj and target_intern_ids:
            program_intern_users = (
                self.db.query(User)
                .join(Role, Role.id == User.role_id)
                .filter(User.id.in_(target_intern_ids), Role.name == "intern")
                .all()
            )
            for u in program_intern_users:
                items_by_id[u.id] = AttendanceLeaveReportItem(
                    intern_id=u.id,
                    user_code=u.code,
                    full_name=u.full_name,
                    email=u.email,
                    program_id=program_obj.id,
                    program_name=program_obj.name,
                    present_days=0,
                    late_days=0,
                    authorized_leave_days=0,
                    unauthorized_leave_days=0,
                )

        join_condition = and_(
            LeaveRequest.user_id == Attendance.user_id,
            Attendance.work_date >= LeaveRequest.start_date,
            Attendance.work_date <= LeaveRequest.end_date,
            LeaveRequest.status == APPROVED_LEAVE,
        )

        present_days = func.count(
            distinct(case((Attendance.status.in_(WORKED_STATUSES), Attendance.work_date)))
        )
        late_days = func.count(
            distinct(case((Attendance.status == "late", Attendance.work_date)))
        )
        authorized_leave_days = func.count(
            distinct(
                case(
                    (
                        and_(Attendance.status == "absent", LeaveRequest.id.is_not(None)),
                        Attendance.work_date,
                    )
                )
            )
        )
        unauthorized_leave_days = func.count(
            distinct(
                case(
                    (
                        and_(Attendance.status == "absent", LeaveRequest.id.is_(None)),
                        Attendance.work_date,
                    )
                )
            )
        )

        query = (
            self.db.query(
                Attendance.user_id.label("intern_id"),
                User.code.label("user_code"),
                User.full_name.label("full_name"),
                User.email.label("email"),
                present_days.label("present_days"),
                late_days.label("late_days"),
                authorized_leave_days.label("authorized_leave_days"),
                unauthorized_leave_days.label("unauthorized_leave_days"),
            )
            .select_from(Attendance)
            .outerjoin(LeaveRequest, join_condition)
            .join(User, User.id == Attendance.user_id)
            .join(Role, Role.id == User.role_id)
            .filter(Role.name == "intern")
        )
        if target_intern_ids is not None:
            query = query.filter(Attendance.user_id.in_(target_intern_ids))
        if from_date is not None:
            query = query.filter(Attendance.work_date >= from_date)
        if to_date is not None:
            query = query.filter(Attendance.work_date <= to_date)

        rows = query.group_by(Attendance.user_id, User.code, User.full_name, User.email).all()

        for row in rows:
            item = items_by_id.get(row.intern_id)
            if item is None:
                item = AttendanceLeaveReportItem(
                    intern_id=row.intern_id,
                    user_code=row.user_code,
                    full_name=row.full_name,
                    email=row.email,
                )
                items_by_id[row.intern_id] = item
            item.present_days = int(row.present_days or 0)
            item.late_days = int(row.late_days or 0)
            item.authorized_leave_days = int(row.authorized_leave_days or 0)
            item.unauthorized_leave_days = int(row.unauthorized_leave_days or 0)

        self._add_leave_only_days(
            items_by_id=items_by_id,
            from_date=from_date,
            to_date=to_date,
            target_intern_ids=target_intern_ids,
        )

        intern_ids = list(items_by_id.keys())
        if intern_ids:
            pm_rows = (
                self.db.query(
                    ProgramMember.intern_user_id,
                    InternshipProgram.id,
                    InternshipProgram.name,
                )
                .join(InternshipProgram, InternshipProgram.id == ProgramMember.program_id)
                .filter(
                    ProgramMember.intern_user_id.in_(intern_ids),
                    InternshipProgram.is_deleted == False,
                )
                .all()
            )
            for intern_uid, prog_id, prog_name in pm_rows:
                if intern_uid in items_by_id and items_by_id[intern_uid].program_id is None:
                    items_by_id[intern_uid].program_id = prog_id
                    items_by_id[intern_uid].program_name = prog_name

        items = sorted(items_by_id.values(), key=lambda item: item.intern_id)
        for item in items:
            item.total_working_days = item.present_days + item.late_days
            total_days = (
                item.present_days
                + item.late_days
                + item.authorized_leave_days
                + item.unauthorized_leave_days
            )
            item.attendance_rate = (
                round(((item.present_days + item.late_days) / total_days) * 100, 2)
                if total_days > 0
                else 0.0
            )

        totals = AttendanceLeaveTotals(
            present_days=sum(item.present_days for item in items),
            late_days=sum(item.late_days for item in items),
            authorized_leave_days=sum(item.authorized_leave_days for item in items),
            unauthorized_leave_days=sum(item.unauthorized_leave_days for item in items),
        )
        return AttendanceLeaveReportResponse(
            from_date=from_date,
            to_date=to_date,
            month=parsed_month_str,
            program_id=program_obj.id if program_obj else None,
            program_name=program_obj.name if program_obj else None,
            totals=totals,
            items=items,
            total=len(items),
        )

    def _add_leave_only_days(
        self,
        items_by_id: dict[int, AttendanceLeaveReportItem],
        from_date: date | None,
        to_date: date | None,
        target_intern_ids: set[int] | None,
    ) -> None:
        """Cộng ngày nghỉ phép đã duyệt không có bản ghi attendance (vẫn thuộc kỳ lọc)."""
        leave_query = (
            self.db.query(LeaveRequest, User)
            .join(User, User.id == LeaveRequest.user_id)
            .join(Role, Role.id == User.role_id)
            .filter(Role.name == "intern", LeaveRequest.status == APPROVED_LEAVE)
        )
        if target_intern_ids is not None:
            leave_query = leave_query.filter(LeaveRequest.user_id.in_(target_intern_ids))
        if from_date is not None:
            leave_query = leave_query.filter(LeaveRequest.end_date >= from_date)
        if to_date is not None:
            leave_query = leave_query.filter(LeaveRequest.start_date <= to_date)

        counted: dict[int, set[date]] = {}
        for leave, user in leave_query.all():
            range_start = leave.start_date
            range_end = leave.end_date
            if from_date is not None:
                range_start = max(range_start, from_date)
            if to_date is not None:
                range_end = min(range_end, to_date)
            if range_end < range_start:
                continue

            item = items_by_id.get(user.id)
            if item is None:
                item = AttendanceLeaveReportItem(
                    intern_id=user.id,
                    user_code=user.code,
                    full_name=user.full_name,
                    email=user.email,
                )
                items_by_id[user.id] = item

            attended_dates = {
                work_date
                for (work_date,) in self.db.query(Attendance.work_date).filter(
                    Attendance.user_id == user.id,
                    Attendance.work_date >= range_start,
                    Attendance.work_date <= range_end,
                    Attendance.status.in_((*WORKED_STATUSES, "late", "absent")),
                )
            }
            extra = counted.setdefault(user.id, set())
            day = range_start
            while day <= range_end:
                if day not in attended_dates and day not in extra:
                    extra.add(day)
                    item.authorized_leave_days += 1
                day += timedelta(days=1)

