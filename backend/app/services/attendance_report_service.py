"""Báo cáo chuyên cần HR: Join Attendance với LeaveRequest (US-22)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import and_, case, distinct, func
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.role import Role
from app.models.user import User
from app.schemas.attendance import (
    AttendanceLeaveReportItem,
    AttendanceLeaveReportResponse,
    AttendanceLeaveTotals,
)

WORKED_STATUSES = ("present", "half_day", "early_leave")
APPROVED_LEAVE = "approved"


class AttendanceReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_attendance_leave_report(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        intern_id: int | None = None,
    ) -> AttendanceLeaveReportResponse:
        """Thống kê ngày đi làm, đi muộn, nghỉ có phép và không phép.

        Câu Join:
            attendance LEFT JOIN leave_requests
              ON leave_requests.user_id = attendance.user_id
             AND attendance.work_date BETWEEN start_date AND end_date
             AND leave_requests.status = 'approved'
        """
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
        if intern_id is not None:
            query = query.filter(Attendance.user_id == intern_id)
        if from_date is not None:
            query = query.filter(Attendance.work_date >= from_date)
        if to_date is not None:
            query = query.filter(Attendance.work_date <= to_date)

        rows = query.group_by(Attendance.user_id, User.code, User.full_name).all()

        items_by_id: dict[int, AttendanceLeaveReportItem] = {}
        for row in rows:
            items_by_id[row.intern_id] = AttendanceLeaveReportItem(
                intern_id=row.intern_id,
                user_code=row.user_code,
                full_name=row.full_name,
                present_days=int(row.present_days or 0),
                late_days=int(row.late_days or 0),
                authorized_leave_days=int(row.authorized_leave_days or 0),
                unauthorized_leave_days=int(row.unauthorized_leave_days or 0),
            )

        self._add_leave_only_days(items_by_id, from_date, to_date, intern_id)

        items = sorted(items_by_id.values(), key=lambda item: item.intern_id)
        totals = AttendanceLeaveTotals(
            present_days=sum(item.present_days for item in items),
            late_days=sum(item.late_days for item in items),
            authorized_leave_days=sum(item.authorized_leave_days for item in items),
            unauthorized_leave_days=sum(item.unauthorized_leave_days for item in items),
        )
        return AttendanceLeaveReportResponse(
            from_date=from_date,
            to_date=to_date,
            totals=totals,
            items=items,
            total=len(items),
        )

    def _add_leave_only_days(
        self,
        items_by_id: dict[int, AttendanceLeaveReportItem],
        from_date: date | None,
        to_date: date | None,
        intern_id: int | None,
    ) -> None:
        """Cộng ngày nghỉ phép đã duyệt không có bản ghi attendance (vẫn thuộc kỳ lọc)."""
        leave_query = (
            self.db.query(LeaveRequest, User)
            .join(User, User.id == LeaveRequest.user_id)
            .join(Role, Role.id == User.role_id)
            .filter(Role.name == "intern", LeaveRequest.status == APPROVED_LEAVE)
        )
        if intern_id is not None:
            leave_query = leave_query.filter(LeaveRequest.user_id == intern_id)
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
