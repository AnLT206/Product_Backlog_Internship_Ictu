from __future__ import annotations

from datetime import date
from typing import Any, Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.weekly_work_schedule import WeeklyWorkSchedule
from app.schemas.weekly_work_schedule import (
    WeeklyWorkScheduleCreate,
    WeeklyWorkScheduleResponse,
    WeeklyWorkScheduleUpdate,
)


class WeeklyScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response_dto(self, item: WeeklyWorkSchedule) -> WeeklyWorkScheduleResponse:
        today = date.today()
        days_until = (item.session_date - today).days
        is_editable = True

        return WeeklyWorkScheduleResponse(
            id=item.id,
            user_id=item.user_id,
            user_name=item.user.full_name if item.user else None,
            user_code=item.user.code if item.user else None,
            role=item.role,
            session_date=item.session_date,
            shift_name=item.shift_name,
            start_time=item.start_time,
            end_time=item.end_time,
            location=item.location,
            notes=item.notes,
            status=item.status,
            created_by_id=item.created_by_id,
            created_by_name=item.created_by.full_name if item.created_by else None,
            is_editable=is_editable,
            days_until_session=days_until,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )

    def list_schedules(
        self,
        role: str | None = None,
        user_id: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | None = None,
    ) -> list[WeeklyWorkScheduleResponse]:
        query = self.db.query(WeeklyWorkSchedule)

        if role:
            query = query.filter(WeeklyWorkSchedule.role == role)
        if user_id is not None:
            query = query.filter(WeeklyWorkSchedule.user_id == user_id)
        if start_date is not None:
            query = query.filter(WeeklyWorkSchedule.session_date >= start_date)
        if end_date is not None:
            query = query.filter(WeeklyWorkSchedule.session_date <= end_date)
        if status_filter:
            query = query.filter(WeeklyWorkSchedule.status == status_filter)

        items: Sequence[WeeklyWorkSchedule] = (
            query.order_by(WeeklyWorkSchedule.session_date.asc(), WeeklyWorkSchedule.start_time.asc()).all()
        )
        return [self._to_response_dto(item) for item in items]

    def get_by_id(self, schedule_id: int) -> WeeklyWorkSchedule:
        item = self.db.query(WeeklyWorkSchedule).filter(WeeklyWorkSchedule.id == schedule_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lịch làm việc theo phiên",
            )
        return item

    def create_schedule(
        self,
        data: WeeklyWorkScheduleCreate,
        created_by_id: int | None = None,
    ) -> WeeklyWorkScheduleResponse:
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Giờ bắt đầu phải trước giờ kết thúc ca làm việc",
            )

        # Kiểm tra user_id tồn tại
        user = self.db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy người dùng với ID {data.user_id}",
            )

        item = WeeklyWorkSchedule(
            user_id=data.user_id,
            role=data.role,
            session_date=data.session_date,
            shift_name=data.shift_name.strip(),
            start_time=data.start_time,
            end_time=data.end_time,
            location=data.location.strip() if data.location else None,
            notes=data.notes.strip() if data.notes else None,
            status=data.status,
            created_by_id=created_by_id,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._to_response_dto(item)

    def update_schedule(
        self,
        schedule_id: int,
        data: WeeklyWorkScheduleUpdate,
    ) -> WeeklyWorkScheduleResponse:
        item = self.get_by_id(schedule_id)
        update_dict = data.model_dump(exclude_unset=True)

        new_start = update_dict.get("start_time", item.start_time)
        new_end = update_dict.get("end_time", item.end_time)
        if new_start >= new_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Giờ bắt đầu phải trước giờ kết thúc ca làm việc",
            )

        if "user_id" in update_dict and update_dict["user_id"] != item.user_id:
            user = self.db.query(User).filter(User.id == update_dict["user_id"]).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy người dùng với ID {update_dict['user_id']}",
                )

        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return self._to_response_dto(item)

    def delete_schedule(self, schedule_id: int) -> dict[str, str]:
        item = self.get_by_id(schedule_id)
        self.db.delete(item)
        self.db.commit()
        return {"message": "Đã xóa lịch làm việc thành công"}

    def get_user_schedule(
        self,
        user_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[WeeklyWorkScheduleResponse]:
        query = self.db.query(WeeklyWorkSchedule).filter(WeeklyWorkSchedule.user_id == user_id)
        if start_date is not None:
            query = query.filter(WeeklyWorkSchedule.session_date >= start_date)
        if end_date is not None:
            query = query.filter(WeeklyWorkSchedule.session_date <= end_date)

        items: Sequence[WeeklyWorkSchedule] = (
            query.order_by(WeeklyWorkSchedule.session_date.asc(), WeeklyWorkSchedule.start_time.asc()).all()
        )
        return [self._to_response_dto(item) for item in items]

    def generate_schedules_from_group_shifts(
        self,
        program_id: int | None = None,
        group_id: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        created_by_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Tự động đồng bộ / sinh lịch làm việc theo phiên (weekly_work_schedules) cho TTS và Mentor
        dựa trên cấu hình ca làm việc của nhóm (work_shifts) và nhóm thực tập đã được phân công.
        """
        from datetime import timedelta
        from app.models.intern_profile import InternProfile
        from app.models.internship_group import InternProfileGroup, InternshipGroup
        from app.models.mentor_intern import MentorIntern
        from app.models.work_shift import WorkShift

        # 1. Xác định phạm vi ngày (mặc định tháng 10/2026)
        if start_date is None:
            start_date = date(2026, 10, 1)
        if end_date is None:
            end_date = date(2026, 10, 31)

        # 2. Xác định danh sách nhóm cần sinh lịch
        groups_query = self.db.query(InternshipGroup)
        if group_id is not None:
            groups_query = groups_query.filter(InternshipGroup.id == group_id)
        elif program_id is not None:
            groups_query = groups_query.filter(InternshipGroup.program_id == program_id)
        groups = groups_query.all()

        if not groups:
            return {
                "success": False,
                "message": "Không tìm thấy nhóm thực tập nào để sinh lịch làm việc.",
                "created_count": 0,
            }

        weekday_key_map = {
            0: "2",
            1: "3",
            2: "4",
            3: "5",
            4: "6",
            5: "7",
            6: "CN",
        }

        today_val = date.today()
        total_created = 0

        # Theo dõi các bản ghi đã tồn tại hoặc được tạo mới để không bị trùng lặp user_id, date, start_time
        existing_rows = (
            self.db.query(WeeklyWorkSchedule)
            .filter(
                WeeklyWorkSchedule.session_date >= start_date,
                WeeklyWorkSchedule.session_date <= end_date,
            )
            .all()
        )
        existing_map: dict[tuple[int, date, Any], WeeklyWorkSchedule] = {
            (r.user_id, r.session_date, r.start_time): r for r in existing_rows
        }

        for grp in groups:
            # 3. Lấy ca làm việc của nhóm (hoặc ca chung của kỳ)
            shifts = (
                self.db.query(WorkShift)
                .filter(WorkShift.group_id == grp.id, WorkShift.is_active == True)
                .order_by(WorkShift.start_time.asc())
                .all()
            )
            if not shifts and grp.program_id:
                shifts = (
                    self.db.query(WorkShift)
                    .filter(WorkShift.program_id == grp.program_id, WorkShift.is_active == True)
                    .order_by(WorkShift.start_time.asc())
                    .all()
                )

            # Nếu chưa có ca nào trong DB, tạo ca chuẩn ICTU cho nhóm
            if not shifts:
                from datetime import time as dt_time
                s1 = WorkShift(
                    program_id=grp.program_id,
                    group_id=grp.id,
                    group_name=f"{grp.name} - Ca Sáng",
                    shift_type="morning",
                    start_time=dt_time(8, 0, 0),
                    end_time=dt_time(12, 0, 0),
                    days_of_week="2,3,4,5,6",
                    flexible_minutes=15,
                    is_active=True,
                )
                s2 = WorkShift(
                    program_id=grp.program_id,
                    group_id=grp.id,
                    group_name=f"{grp.name} - Ca Chiều",
                    shift_type="afternoon",
                    start_time=dt_time(13, 30, 0),
                    end_time=dt_time(17, 30, 0),
                    days_of_week="2,3,4,5,6",
                    flexible_minutes=15,
                    is_active=True,
                )
                self.db.add_all([s1, s2])
                self.db.commit()
                shifts = [s1, s2]

            # 4. Tìm thành viên TTS của nhóm
            memberships = (
                self.db.query(InternProfileGroup)
                .filter(
                    InternProfileGroup.group_id == grp.id,
                    InternProfileGroup.status == "active",
                )
                .all()
            )
            intern_profile_ids = [m.intern_profile_id for m in memberships]
            intern_user_ids = []
            if intern_profile_ids:
                profiles = (
                    self.db.query(InternProfile)
                    .filter(InternProfile.id.in_(intern_profile_ids))
                    .all()
                )
                intern_user_ids = [p.user_id for p in profiles if p.user_id]

            # 5. Tìm Mentor của nhóm (leader hoặc qua mentor_interns)
            mentor_user_ids = set()
            if grp.leader_user_id:
                mentor_user_ids.add(grp.leader_user_id)
            if intern_user_ids:
                m_links = (
                    self.db.query(MentorIntern)
                    .filter(MentorIntern.intern_id.in_(intern_user_ids))
                    .all()
                )
                for ml in m_links:
                    mentor_user_ids.add(ml.mentor_id)

            # Địa điểm phân theo phòng ban của nhóm
            location = (
                "P.305 – Phòng Lab QA/QC Automation ICTU"
                if grp.department_id == 2
                else "P.302 – Trung tâm Phần mềm & AI ICTU"
            )

            # 6. Duyệt từng ngày trong khoảng thời gian
            curr_date = start_date
            while curr_date <= end_date:
                w_key = weekday_key_map.get(curr_date.weekday(), "2")

                for shift in shifts:
                    days_list = [d.strip() for d in shift.days_of_week.split(",") if d.strip()]
                    is_applicable = (
                        w_key in days_list
                        or (w_key == "CN" and "8" in days_list)
                    )
                    if not is_applicable:
                        continue

                    status_val = "completed" if curr_date < today_val else "scheduled"
                    clean_shift_name = (
                        "Ca Sáng"
                        if shift.shift_type == "morning"
                        else "Ca Chiều"
                        if shift.shift_type == "afternoon"
                        else shift.group_name
                    )

                    # Sinh lịch cho từng TTS
                    for u_id in intern_user_ids:
                        slot_key = (u_id, curr_date, shift.start_time)
                        if slot_key in existing_map:
                            existing = existing_map[slot_key]
                            existing.shift_name = clean_shift_name
                            existing.end_time = shift.end_time
                            existing.location = location
                            existing.notes = f"Lịch thực tập theo nhóm: {grp.name} ({grp.code})"
                            existing.status = status_val
                        else:
                            new_sched = WeeklyWorkSchedule(
                                user_id=u_id,
                                role="intern",
                                session_date=curr_date,
                                shift_name=clean_shift_name,
                                start_time=shift.start_time,
                                end_time=shift.end_time,
                                location=location,
                                notes=f"Lịch thực tập theo nhóm: {grp.name} ({grp.code})",
                                status=status_val,
                                created_by_id=created_by_id,
                            )
                            self.db.add(new_sched)
                            existing_map[slot_key] = new_sched
                            total_created += 1

                    # Sinh lịch cho Mentor (ngăn trùng lịch mentor tham gia nhiều nhóm)
                    for m_id in mentor_user_ids:
                        slot_key = (m_id, curr_date, shift.start_time)
                        if slot_key in existing_map:
                            existing = existing_map[slot_key]
                            # Nếu mentor đã được gán ca này, cập nhật thêm thông tin nhóm hỗ trợ
                            if grp.code not in (existing.notes or ""):
                                existing.notes = f"{existing.notes or ''} & {grp.name} ({grp.code})".strip(" & ")
                        else:
                            new_sched = WeeklyWorkSchedule(
                                user_id=m_id,
                                role="mentor",
                                session_date=curr_date,
                                shift_name=clean_shift_name,
                                start_time=shift.start_time,
                                end_time=shift.end_time,
                                location=location,
                                notes=f"Lịch hướng dẫn theo nhóm: {grp.name} ({grp.code})",
                                status=status_val,
                                created_by_id=created_by_id,
                            )
                            self.db.add(new_sched)
                            existing_map[slot_key] = new_sched
                            total_created += 1

                curr_date += timedelta(days=1)

        self.db.flush()
        # Loại bỏ triệt để mọi bản ghi trùng lặp (nếu có từ trước)
        from sqlalchemy import text
        self.db.execute(
            text(
                """
                DELETE t1 FROM weekly_work_schedules t1
                INNER JOIN weekly_work_schedules t2
                WHERE t1.id > t2.id
                  AND t1.user_id = t2.user_id
                  AND t1.session_date = t2.session_date
                  AND t1.start_time = t2.start_time
                """
            )
        )
        self.db.commit()
        return {
            "success": True,
            "created_count": total_created,
            "message": f"Đã sinh và đồng bộ thành công lịch làm việc theo nhóm ({len(groups)} nhóm).",
        }
