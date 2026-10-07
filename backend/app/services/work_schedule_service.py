from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.internship_program import InternshipProgram
from app.models.work_shift import WorkShift
from app.schemas.work_schedule import WorkScheduleCreate, WorkScheduleUpdate


class WorkScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_work_schedules(self, program_id: int | None = None) -> list[WorkShift]:
        query = self.db.query(WorkShift)
        if program_id is not None:
            query = query.filter(WorkShift.program_id == program_id)
        return query.order_by(WorkShift.id.desc()).all()

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

        shift = WorkShift(
            program_id=data.program_id,
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
        return shift

    def update_work_schedule(self, schedule_id: int, data: WorkScheduleUpdate) -> WorkShift:
        shift = self.get_by_id(schedule_id)

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
        return shift
