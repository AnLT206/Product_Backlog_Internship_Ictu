from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.internship_program import InternshipProgram
from app.models.work_shift import WorkShift
from app.schemas.work_schedule import WorkScheduleCreate, WorkScheduleUpdate


class WorkScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_work_schedules(
        self,
        program_id: int | None = None,
        group_id: int | None = None,
    ) -> list[WorkShift]:
        query = self.db.query(WorkShift)
        if program_id is not None:
            query = query.filter(WorkShift.program_id == program_id)
        if group_id is not None:
            query = query.filter((WorkShift.group_id == group_id) | (WorkShift.group_id.is_(None)))
        return query.order_by(WorkShift.start_time.asc(), WorkShift.id.asc()).all()

    def get_by_id(self, schedule_id: int) -> WorkShift:
        shift = self.db.query(WorkShift).filter(WorkShift.id == schedule_id).first()
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cấu hình ca làm việc",
            )
        return shift

    def create_work_schedule(self, data: WorkScheduleCreate) -> WorkShift:
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Giờ bắt đầu phải trước giờ kết thúc ca làm việc",
            )

        if data.program_id is not None:
            program = (
                self.db.query(InternshipProgram)
                .filter(InternshipProgram.id == data.program_id, InternshipProgram.is_deleted == False)
                .first()
            )
            if not program:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Kỳ thực tập không tồn tại hoặc đã bị xóa",
                )

        # Ngăn chặn tạo trùng lặp phiên làm việc có cùng program, group, shift_type, start_time
        existing = (
            self.db.query(WorkShift)
            .filter(
                WorkShift.program_id == data.program_id,
                WorkShift.group_id == data.group_id,
                WorkShift.shift_type == data.shift_type,
                WorkShift.start_time == data.start_time,
            )
            .first()
        )
        if existing:
            existing.group_name = data.group_name.strip()
            existing.end_time = data.end_time
            existing.days_of_week = data.days_of_week.strip()
            existing.flexible_minutes = data.flexible_minutes
            existing.is_active = data.is_active
            self.db.commit()
            self.db.refresh(existing)
            return existing

        shift = WorkShift(
            program_id=data.program_id,
            group_id=data.group_id,
            group_name=data.group_name.strip(),
            shift_type=data.shift_type,
            start_time=data.start_time,
            end_time=data.end_time,
            days_of_week=data.days_of_week.strip(),
            flexible_minutes=data.flexible_minutes,
            is_active=data.is_active,
        )
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        self._sync_to_weekly_schedules(shift)
        return shift

    def update_work_schedule(self, schedule_id: int, data: WorkScheduleUpdate) -> WorkShift:
        shift = self.get_by_id(schedule_id)
        old_start = shift.start_time
        old_end = shift.end_time

        update_dict = data.model_dump(exclude_unset=True)

        new_start = update_dict.get("start_time", shift.start_time)
        new_end = update_dict.get("end_time", shift.end_time)
        if new_start >= new_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Giờ bắt đầu phải trước giờ kết thúc ca làm việc",
            )

        if "program_id" in update_dict and update_dict["program_id"] is not None:
            program = (
                self.db.query(InternshipProgram)
                .filter(
                    InternshipProgram.id == update_dict["program_id"],
                    InternshipProgram.is_deleted == False,
                )
                .first()
            )
            if not program:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Kỳ thực tập không tồn tại hoặc đã bị xóa",
                )

        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(shift, key, value)

        self.db.commit()
        self.db.refresh(shift)
        # Tự động đồng bộ các thay đổi lịch sang lịch cá nhân của TTS & Mentor
        self._sync_to_weekly_schedules(shift, old_start_time=old_start, old_end_time=old_end)
        return shift

    def delete_work_schedule(self, schedule_id: int) -> dict[str, str]:
        shift = self.get_by_id(schedule_id)
        try:
            from datetime import date
            from app.models.weekly_work_schedule import WeeklyWorkSchedule
            u_ids = self._get_affected_user_ids(shift)
            if u_ids:
                self.db.query(WeeklyWorkSchedule).filter(
                    WeeklyWorkSchedule.user_id.in_(u_ids),
                    WeeklyWorkSchedule.session_date >= date.today(),
                    WeeklyWorkSchedule.start_time == shift.start_time,
                ).delete(synchronize_session=False)
                self.db.commit()
        except Exception:
            pass

        self.db.delete(shift)
        self.db.commit()
        return {"detail": "Đã xóa ca làm việc thành công"}

    def _get_affected_user_ids(self, shift: WorkShift) -> set[int]:
        """Lấy danh sách ID người dùng (TTS và Mentor) bị ảnh hưởng bởi ca làm việc này."""
        from app.models.intern_profile import InternProfile
        from app.models.internship_group import InternProfileGroup, InternshipGroup
        from app.models.mentor_intern import MentorIntern

        user_ids = set()
        group_ids = []
        if shift.group_id:
            group_ids = [shift.group_id]
        elif shift.program_id:
            groups = self.db.query(InternshipGroup).filter(InternshipGroup.program_id == shift.program_id).all()
            group_ids = [g.id for g in groups]

        if not group_ids:
            return user_ids

        # Tìm thành viên TTS
        memberships = (
            self.db.query(InternProfileGroup)
            .filter(InternProfileGroup.group_id.in_(group_ids), InternProfileGroup.status == "active")
            .all()
        )
        p_ids = [m.intern_profile_id for m in memberships]
        if p_ids:
            profiles = self.db.query(InternProfile).filter(InternProfile.id.in_(p_ids)).all()
            for p in profiles:
                if p.user_id:
                    user_ids.add(p.user_id)

        # Tìm Mentors
        groups_objs = self.db.query(InternshipGroup).filter(InternshipGroup.id.in_(group_ids)).all()
        for g in groups_objs:
            if g.leader_user_id:
                user_ids.add(g.leader_user_id)

        if user_ids:
            m_links = self.db.query(MentorIntern).filter(MentorIntern.intern_id.in_(user_ids)).all()
            for ml in m_links:
                user_ids.add(ml.mentor_id)

        return user_ids

    def _sync_to_weekly_schedules(
        self,
        shift: WorkShift,
        old_start_time: Any = None,
        old_end_time: Any = None,
    ) -> None:
        """
        Tự động đồng bộ các thay đổi của khung giờ/ca làm việc sang bảng weekly_work_schedules
        của sinh viên thực tập và mentor cho các ngày từ hôm nay trở đi.
        """
        try:
            from datetime import date
            from app.models.weekly_work_schedule import WeeklyWorkSchedule
            from app.services.weekly_schedule_service import WeeklyScheduleService

            today_val = date.today()
            u_ids = self._get_affected_user_ids(shift)

            # 1. Nếu ca bị tắt (is_active = False), xóa các phiên tương lai
            if not shift.is_active:
                target_start = old_start_time or shift.start_time
                if u_ids:
                    self.db.query(WeeklyWorkSchedule).filter(
                        WeeklyWorkSchedule.user_id.in_(u_ids),
                        WeeklyWorkSchedule.session_date >= today_val,
                        WeeklyWorkSchedule.start_time == target_start,
                    ).delete(synchronize_session=False)
                    self.db.commit()
                return

            # 2. Cập nhật các phiên tương lai nếu giờ hoặc tên ca thay đổi
            clean_shift_name = (
                "Ca Sáng"
                if shift.shift_type == "morning"
                else "Ca Chiều"
                if shift.shift_type == "afternoon"
                else shift.group_name
            )

            if u_ids and old_start_time and old_start_time != shift.start_time:
                self.db.query(WeeklyWorkSchedule).filter(
                    WeeklyWorkSchedule.user_id.in_(u_ids),
                    WeeklyWorkSchedule.session_date >= today_val,
                    WeeklyWorkSchedule.start_time == old_start_time,
                ).update(
                    {
                        WeeklyWorkSchedule.start_time: shift.start_time,
                        WeeklyWorkSchedule.end_time: shift.end_time,
                        WeeklyWorkSchedule.shift_name: clean_shift_name,
                    },
                    synchronize_session=False,
                )
                self.db.commit()
            elif u_ids and old_end_time and old_end_time != shift.end_time:
                self.db.query(WeeklyWorkSchedule).filter(
                    WeeklyWorkSchedule.user_id.in_(u_ids),
                    WeeklyWorkSchedule.session_date >= today_val,
                    WeeklyWorkSchedule.start_time == shift.start_time,
                ).update(
                    {
                        WeeklyWorkSchedule.end_time: shift.end_time,
                        WeeklyWorkSchedule.shift_name: clean_shift_name,
                    },
                    synchronize_session=False,
                )
                self.db.commit()

            # 3. Đồng bộ lại toàn bộ ngày làm việc nếu có ngày mới
            WeeklyScheduleService(self.db).generate_schedules_from_group_shifts(
                program_id=shift.program_id,
                group_id=shift.group_id,
                start_date=today_val,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Lỗi tự động đồng bộ sang weekly_work_schedules: %s", e)

