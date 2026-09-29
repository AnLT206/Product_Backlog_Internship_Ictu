"""Service xử lý logic chấm công và tính toán thời gian làm việc (Tasks 3, 4)."""

from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.attendance import (
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceTodayStatusResponse,
)


class AttendanceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response(self, att: Attendance) -> AttendanceResponse:
        user_code = att.user.code if att.user else None
        full_name = att.user.full_name if att.user else None
        email = att.user.email if att.user else None
        total_h = float(att.total_hours) if att.total_hours is not None else None

        return AttendanceResponse(
            id=att.id,
            user_id=att.user_id,
            user_code=user_code,
            full_name=full_name,
            email=email,
            work_date=att.work_date,
            check_in_at=att.check_in_at,
            check_out_at=att.check_out_at,
            total_hours=total_h,
            status=att.status,
            note=att.note,
            created_at=att.created_at,
        )

    def check_in(self, current_user: User, note: str | None = None) -> AttendanceResponse:
        """Thực tập sinh check-in đầu ngày làm việc (Task 4)."""
        today = datetime.now().date()
        now = datetime.now()

        # 1. Ràng buộc: Mỗi TTS chỉ được check-in 1 lần trong ngày (Task 3 & 4)
        existing = (
            self.db.query(Attendance)
            .filter(Attendance.user_id == current_user.id, Attendance.work_date == today)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã check-in ngày hôm nay rồi.",
            )

        new_record = Attendance(
            user_id=current_user.id,
            work_date=today,
            check_in_at=now,
            status="present",
            note=note.strip() if note else None,
        )
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)

        new_record = (
            self.db.query(Attendance)
            .options(joinedload(Attendance.user))
            .filter(Attendance.id == new_record.id)
            .first()
        )
        return self._to_response(new_record)

    def check_out(self, current_user: User, note: str | None = None) -> AttendanceResponse:
        """Thực tập sinh check-out kết thúc ca, tự động tính tổng số giờ làm (Task 4)."""
        today = datetime.now().date()
        now = datetime.now()

        # 1. Kiểm tra đã check-in chưa
        record = (
            self.db.query(Attendance)
            .options(joinedload(Attendance.user))
            .filter(Attendance.user_id == current_user.id, Attendance.work_date == today)
            .first()
        )
        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn chưa check-in hôm nay, không thể check-out.",
            )

        # 2. Kiểm tra đã check-out chưa
        if record.check_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã check-out ngày hôm nay rồi.",
            )

        # 3. Tính toán tổng thời gian làm việc trong ngày (Decimal giờ, làm tròn 2 chữ số thập phân)
        duration_seconds = (now - record.check_in_at).total_seconds()
        if duration_seconds < 0:
            duration_seconds = 0
        total_hours = round(Decimal(str(duration_seconds / 3600)), 2)

        record.check_out_at = now
        record.total_hours = total_hours

        # Cập nhật trạng thái nếu làm ít hơn nửa ngày (< 4 tiếng)
        if total_hours < Decimal("4.00") and record.status == "present":
            record.status = "half_day"

        if note and note.strip():
            record.note = f"{record.note}; {note.strip()}" if record.note else note.strip()

        self.db.commit()
        self.db.refresh(record)
        return self._to_response(record)

    def get_today_status(self, current_user: User) -> AttendanceTodayStatusResponse:
        """Lấy trạng thái chấm công của ngày hôm nay."""
        today = datetime.now().date()
        record = (
            self.db.query(Attendance)
            .options(joinedload(Attendance.user))
            .filter(Attendance.user_id == current_user.id, Attendance.work_date == today)
            .first()
        )
        checked_in = record is not None
        checked_out = record is not None and record.check_out_at is not None

        return AttendanceTodayStatusResponse(
            work_date=today,
            checked_in=checked_in,
            checked_out=checked_out,
            record=self._to_response(record) if record else None,
        )

    def list_intern_history(
        self,
        current_user: User,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> AttendanceListResponse:
        """Lấy lịch sử chấm công của thực tập sinh."""
        query = (
            self.db.query(Attendance)
            .options(joinedload(Attendance.user))
            .filter(Attendance.user_id == current_user.id)
        )
        if from_date:
            query = query.filter(Attendance.work_date >= from_date)
        if to_date:
            query = query.filter(Attendance.work_date <= to_date)

        rows = query.order_by(Attendance.work_date.desc(), Attendance.id.desc()).all()
        items = [self._to_response(a) for a in rows]
        return AttendanceListResponse(items=items, total=len(items))

    def list_all_attendance(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        intern_id: int | None = None,
    ) -> AttendanceListResponse:
        """HR / Admin xem danh sách chấm công chuyên cần của thực tập sinh."""
        query = (
            self.db.query(Attendance)
            .options(joinedload(Attendance.user))
        )
        if intern_id:
            query = query.filter(Attendance.user_id == intern_id)
        if from_date:
            query = query.filter(Attendance.work_date >= from_date)
        if to_date:
            query = query.filter(Attendance.work_date <= to_date)

        rows = query.order_by(Attendance.work_date.desc(), Attendance.id.desc()).all()
        items = [self._to_response(a) for a in rows]
        return AttendanceListResponse(items=items, total=len(items))
