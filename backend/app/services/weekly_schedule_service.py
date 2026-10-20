from __future__ import annotations

from datetime import date
from typing import Sequence

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
