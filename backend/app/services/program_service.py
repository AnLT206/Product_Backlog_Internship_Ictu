from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.internship_program import InternshipProgram
from app.schemas.program import (
    ProgramCreateRequest,
    ProgramResponse,
    ProgramUpdateRequest,
)


class ProgramService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_programs(self) -> list[ProgramResponse]:
        rows = (
            self.db.query(InternshipProgram)
            .order_by(InternshipProgram.id.desc())
            .all()
        )
        return [ProgramResponse.model_validate(row) for row in rows]

    def get_program(self, program_id: int) -> ProgramResponse:
        row = self._get_or_404(program_id)
        return ProgramResponse.model_validate(row)

    def create_program(self, payload: ProgramCreateRequest) -> ProgramResponse:
        existing = (
            self.db.query(InternshipProgram)
            .filter(InternshipProgram.name == payload.name.strip())
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tên chương trình đã tồn tại.",
            )

        try:
            row = InternshipProgram(
                name=payload.name.strip(),
                department=payload.department.strip(),
                description=payload.description.strip() if payload.description else None,
                start_date=payload.start_date,
                end_date=payload.end_date,
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo chương trình thực tập.",
            ) from None

        return ProgramResponse.model_validate(row)

    def update_program(
        self, program_id: int, payload: ProgramUpdateRequest
    ) -> ProgramResponse:
        row = self._get_or_404(program_id)
        data = payload.model_dump(exclude_unset=True)

        if "name" in data and data["name"] is not None:
            name = data["name"].strip()
            clash = (
                self.db.query(InternshipProgram)
                .filter(
                    InternshipProgram.name == name,
                    InternshipProgram.id != program_id,
                )
                .first()
            )
            if clash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tên chương trình đã tồn tại.",
                )
            data["name"] = name

        if "department" in data and data["department"] is not None:
            data["department"] = data["department"].strip()

        if "description" in data and isinstance(data["description"], str):
            data["description"] = data["description"].strip() or None

        next_start = data.get("start_date", row.start_date)
        next_end = data.get("end_date", row.end_date)
        if next_end <= next_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="end_date phải lớn hơn start_date.",
            )

        for key, value in data.items():
            setattr(row, key, value)

        try:
            self.db.commit()
            self.db.refresh(row)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật chương trình thực tập.",
            ) from None

        return ProgramResponse.model_validate(row)

    def delete_program(self, program_id: int) -> None:
        row = self._get_or_404(program_id)
        try:
            self.db.delete(row)
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể xóa chương trình thực tập.",
            ) from None

    def _get_or_404(self, program_id: int) -> InternshipProgram:
        row = (
            self.db.query(InternshipProgram)
            .filter(InternshipProgram.id == program_id)
            .first()
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy chương trình thực tập.",
            )
        return row
