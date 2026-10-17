"""Service tiếp nhận bản ghi quét thẻ/QR thô và giải thuật phân tích vào bảng Attendance (SCRUM-242, SCRUM-243)."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session, joinedload

from app.models.attendance import Attendance
from app.models.attendance_raw_log import AttendanceRawLog
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.user import User
from app.models.work_shift import WorkShift
from app.schemas.attendance_raw_log import (
    AttendanceRawLogBatchCreate,
    AttendanceRawLogBatchResponse,
    AttendanceRawLogCreate,
    AttendanceRawLogResponse,
    ProcessedDayAttendanceDetail,
    ProcessRawLogsRequest,
    ProcessRawLogsResponse,
)


class RawLogProcessorService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── SCRUM-242: Tiếp nhận log quét thô ────────────────────────────────────

    def ingest_single_log(
        self, payload: AttendanceRawLogCreate, client_ip: str | None = None
    ) -> AttendanceRawLogResponse:
        """Tiếp nhận 1 bản ghi quét từ thiết bị ngoại vi và lưu vào attendance_raw_logs."""
        scan_time = payload.scan_time or datetime.now()
        device_ip = payload.device_ip or client_ip

        user_id = payload.user_id
        error_note = None

        if user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                error_note = f"User ID {user_id} không tồn tại trong hệ thống"
                user_id = None
        elif payload.user_code:
            user = self.db.query(User).filter(User.code == payload.user_code.strip()).first()
            if user:
                user_id = user.id
            else:
                error_note = f"Mã người dùng '{payload.user_code.strip()}' không tồn tại"
        else:
            error_note = "Thiếu cả user_id và user_code"

        raw_log = AttendanceRawLog(
            device_id=payload.device_id.strip(),
            device_ip=device_ip,
            user_code=payload.user_code.strip() if payload.user_code else None,
            user_id=user_id,
            scan_time=scan_time,
            scan_type=payload.scan_type,
            direction=payload.direction,
            raw_payload=payload.raw_payload,
            is_processed=False,
            error_note=error_note,
        )
        self.db.add(raw_log)
        self.db.commit()
        self.db.refresh(raw_log)

        # Eager load user for full response
        if raw_log.user_id:
            raw_log = (
                self.db.query(AttendanceRawLog)
                .options(joinedload(AttendanceRawLog.user))
                .filter(AttendanceRawLog.id == raw_log.id)
                .first()
            )

        return self._to_log_response(raw_log)

    def ingest_batch_logs(
        self, payload: AttendanceRawLogBatchCreate, client_ip: str | None = None
    ) -> AttendanceRawLogBatchResponse:
        """Tiếp nhận hàng loạt bản ghi quét từ thiết bị ngoại vi theo lô (batch)."""
        if not payload.logs:
            return AttendanceRawLogBatchResponse(
                received_count=0,
                success_count=0,
                failed_count=0,
                created_logs=[],
                message="Danh sách bản ghi rỗng",
            )

        # Thu thập trước danh sách user codes để batch query
        codes_to_lookup = {
            item.user_code.strip()
            for item in payload.logs
            if item.user_code and not item.user_id
        }
        user_by_code: dict[str, User] = {}
        if codes_to_lookup:
            found_users = self.db.query(User).filter(User.code.in_(codes_to_lookup)).all()
            user_by_code = {u.code: u for u in found_users}

        ids_to_lookup = {item.user_id for item in payload.logs if item.user_id}
        user_by_id: dict[int, User] = {}
        if ids_to_lookup:
            found_users_by_id = self.db.query(User).filter(User.id.in_(ids_to_lookup)).all()
            user_by_id = {u.id: u for u in found_users_by_id}

        created_objects: list[AttendanceRawLog] = []
        success_count = 0
        failed_count = 0

        for item in payload.logs:
            device_id = item.device_id.strip() if item.device_id else (payload.device_id or "UNKNOWN")
            device_ip = item.device_ip or client_ip
            scan_time = item.scan_time or datetime.now()

            user_id = item.user_id
            error_note = None

            if user_id:
                if user_id in user_by_id:
                    pass
                else:
                    error_note = f"User ID {user_id} không tồn tại"
                    user_id = None
            elif item.user_code:
                code_clean = item.user_code.strip()
                if code_clean in user_by_code:
                    user_id = user_by_code[code_clean].id
                else:
                    error_note = f"Mã người dùng '{code_clean}' không tồn tại"
            else:
                error_note = "Thiếu cả user_id và user_code"

            if error_note:
                failed_count += 1
            else:
                success_count += 1

            raw_log = AttendanceRawLog(
                device_id=device_id,
                device_ip=device_ip,
                user_code=item.user_code.strip() if item.user_code else None,
                user_id=user_id,
                scan_time=scan_time,
                scan_type=item.scan_type,
                direction=item.direction,
                raw_payload=item.raw_payload,
                is_processed=False,
                error_note=error_note,
            )
            created_objects.append(raw_log)

        self.db.add_all(created_objects)
        self.db.commit()

        # Refresh objects
        res_list = [self._to_log_response(obj) for obj in created_objects]
        return AttendanceRawLogBatchResponse(
            received_count=len(payload.logs),
            success_count=success_count,
            failed_count=failed_count,
            created_logs=res_list,
            message=f"Đã tiếp nhận {len(payload.logs)} logs ({success_count} hợp lệ, {failed_count} có cảnh báo).",
        )

    # ── SCRUM-243: Giải thuật phân tích log thô $\rightarrow$ Attendance chính thức ──

    def _get_work_shift(self, user_id: int, work_date: date) -> WorkShift | None:
        """Tra cứu ca làm việc tương ứng của TTS theo ngày trong tuần."""
        shifts = (
            self.db.query(WorkShift)
            .join(
                ProgramMember,
                ProgramMember.program_id == WorkShift.program_id,
            )
            .join(
                InternshipProgram,
                InternshipProgram.id == WorkShift.program_id,
            )
            .filter(
                ProgramMember.intern_user_id == user_id,
                WorkShift.is_active.is_(True),
                InternshipProgram.is_deleted.is_(False),
                InternshipProgram.start_date <= work_date,
                InternshipProgram.end_date >= work_date,
            )
            .order_by(WorkShift.id.desc())
            .all()
        )
        weekday = str(work_date.isoweekday())
        return next(
            (
                shift
                for shift in shifts
                if weekday in {day.strip() for day in shift.days_of_week.split(",")}
            ),
            None,
        )

    def process_raw_logs(self, req: ProcessRawLogsRequest) -> ProcessRawLogsResponse:
        """
        Giải thuật phân tích log quét thô:
        1. Lọc các logs cần xử lý (user_id IS NOT NULL).
        2. Gom nhóm theo (user_id, work_date).
        3. Xác định check_in_at = min(scan_time), check_out_at = max(scan_time).
        4. Đối chiếu ca làm việc (work_shifts), tính số giờ (total_hours) và status (present, late, half_day, early_leave).
        5. Upsert vào bảng Attendance chính thức và đánh dấu is_processed=True.
        """
        query = self.db.query(AttendanceRawLog).filter(
            AttendanceRawLog.user_id.isnot(None)
        )

        if not req.reprocess_all:
            query = query.filter(AttendanceRawLog.is_processed.is_(False))

        if req.user_id:
            query = query.filter(AttendanceRawLog.user_id == req.user_id)

        if req.target_date:
            start_dt = datetime.combine(req.target_date, time.min)
            end_dt = datetime.combine(req.target_date, time.max)
            query = query.filter(
                AttendanceRawLog.scan_time >= start_dt,
                AttendanceRawLog.scan_time <= end_dt,
            )

        target_logs = query.order_by(AttendanceRawLog.scan_time.asc()).all()

        if not target_logs:
            return ProcessRawLogsResponse(
                processed_logs_count=0,
                affected_users_count=0,
                attendance_created_count=0,
                attendance_updated_count=0,
                details=[],
                message="Không có bản ghi log thô nào cần xử lý.",
            )

        # Gom nhóm logs theo (user_id, work_date)
        grouped_logs: dict[tuple[int, date], list[AttendanceRawLog]] = defaultdict(list)
        for log in target_logs:
            log_date = log.scan_time.date()
            grouped_logs[(log.user_id, log_date)].append(log)

        # Nếu không reprocess_all, cũng cần load thêm các logs đã xử lý trong cùng ngày của user đó
        # để đảm bảo tính toán min/max toàn diện trong ngày!
        now_time = datetime.now()
        details: list[ProcessedDayAttendanceDetail] = []
        created_count = 0
        updated_count = 0
        affected_users = set()

        # Cache User info
        user_ids = {u_id for (u_id, _) in grouped_logs.keys()}
        users_map = {
            u.id: u for u in self.db.query(User).filter(User.id.in_(user_ids)).all()
        }

        for (u_id, w_date), logs in grouped_logs.items():
            affected_users.add(u_id)
            user_obj = users_map.get(u_id)

            # Lấy toàn bộ logs của user trong ngày này (kể cả đã processed trước đó)
            day_start = datetime.combine(w_date, time.min)
            day_end = datetime.combine(w_date, time.max)
            all_day_logs = (
                self.db.query(AttendanceRawLog)
                .filter(
                    AttendanceRawLog.user_id == u_id,
                    AttendanceRawLog.scan_time >= day_start,
                    AttendanceRawLog.scan_time <= day_end,
                )
                .order_by(AttendanceRawLog.scan_time.asc())
                .all()
            )

            scans = [l.scan_time for l in all_day_logs]
            if not scans:
                continue

            earliest_scan = min(scans)
            latest_scan = max(scans)

            # Kiểm tra xem có quét kết thúc ca (check-out) không
            # Nếu có ít nhất 2 lần quét và cách nhau tối thiểu 60 giây
            has_check_out = (len(scans) >= 2) and (
                (latest_scan - earliest_scan).total_seconds() >= 60
            )
            check_out_at = latest_scan if has_check_out else None

            # Tra cứu ca làm việc
            work_shift = self._get_work_shift(u_id, w_date)

            # Tính toán status và total_hours
            att_status = "present"
            if work_shift:
                shift_start = datetime.combine(w_date, work_shift.start_time)
                latest_on_time = shift_start + timedelta(
                    minutes=work_shift.flexible_minutes
                )
                if earliest_scan > latest_on_time:
                    att_status = "late"

            total_hours: Decimal | None = None
            if check_out_at:
                duration_sec = (check_out_at - earliest_scan).total_seconds()
                total_hours = round(Decimal(str(max(0.0, duration_sec / 3600))), 2)

                # Quy chuẩn nửa ngày hoặc về sớm
                if total_hours < Decimal("4.00") and att_status == "present":
                    att_status = "half_day"
                elif total_hours >= Decimal("4.00") and work_shift:
                    earliest_leave_on_time = datetime.combine(
                        w_date, work_shift.end_time
                    ) - timedelta(minutes=work_shift.flexible_minutes)
                    if check_out_at < earliest_leave_on_time:
                        att_status = "early_leave"

            # Upsert vào bảng Attendance
            existing_att = (
                self.db.query(Attendance)
                .filter(Attendance.user_id == u_id, Attendance.work_date == w_date)
                .first()
            )

            action_taken = "unchanged"
            note_content = "Ghi nhận tự động từ máy quét QR/thẻ"

            if not existing_att:
                new_att = Attendance(
                    user_id=u_id,
                    work_date=w_date,
                    check_in_at=earliest_scan,
                    check_out_at=check_out_at,
                    total_hours=total_hours,
                    status=att_status,
                    note=note_content,
                )
                self.db.add(new_att)
                created_count += 1
                action_taken = "created"
            else:
                # Merge thông minh: giữ check-in sớm nhất, check-out muộn nhất
                merged_check_in = min(existing_att.check_in_at, earliest_scan)
                merged_check_out = existing_att.check_out_at
                if check_out_at:
                    if merged_check_out:
                        merged_check_out = max(merged_check_out, check_out_at)
                    else:
                        merged_check_out = check_out_at

                merged_hours = None
                if merged_check_out:
                    m_sec = (merged_check_out - merged_check_in).total_seconds()
                    merged_hours = round(Decimal(str(max(0.0, m_sec / 3600))), 2)

                existing_att.check_in_at = merged_check_in
                existing_att.check_out_at = merged_check_out
                existing_att.total_hours = merged_hours
                existing_att.status = att_status
                if note_content not in (existing_att.note or ""):
                    existing_att.note = (
                        f"{existing_att.note}; {note_content}"
                        if existing_att.note
                        else note_content
                    )
                updated_count += 1
                action_taken = "updated"

            # Đánh dấu toàn bộ logs của nhóm này là đã xử lý
            for l in logs:
                l.is_processed = True
                l.processed_at = now_time

            details.append(
                ProcessedDayAttendanceDetail(
                    user_id=u_id,
                    user_code=user_obj.code if user_obj else None,
                    full_name=user_obj.full_name if user_obj else None,
                    work_date=w_date,
                    raw_scans_count=len(all_day_logs),
                    check_in_at=earliest_scan,
                    check_out_at=check_out_at,
                    total_hours=float(total_hours) if total_hours is not None else None,
                    status=att_status,
                    action_taken=action_taken,
                )
            )

        self.db.commit()

        return ProcessRawLogsResponse(
            processed_logs_count=len(target_logs),
            affected_users_count=len(affected_users),
            attendance_created_count=created_count,
            attendance_updated_count=updated_count,
            details=details,
            message=(
                f"Đã phân tích thành công {len(target_logs)} logs thô cho {len(affected_users)} TTS "
                f"({created_count} ngày công mới, {updated_count} ngày công được cập nhật)."
            ),
        )

    def _to_log_response(self, raw_log: AttendanceRawLog) -> AttendanceRawLogResponse:
        return AttendanceRawLogResponse(
            id=raw_log.id,
            device_id=raw_log.device_id,
            device_ip=raw_log.device_ip,
            user_code=raw_log.user_code,
            user_id=raw_log.user_id,
            user_full_name=raw_log.user.full_name if raw_log.user else None,
            scan_time=raw_log.scan_time,
            scan_type=raw_log.scan_type,
            direction=raw_log.direction,
            is_processed=raw_log.is_processed,
            processed_at=raw_log.processed_at,
            error_note=raw_log.error_note,
            created_at=raw_log.created_at,
        )
