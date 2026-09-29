from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.program import (
    ProgramAssignRequest,
    ProgramAssignResponse,
    ProgramCreateRequest,
    ProgramResponse,
    ProgramUpdateRequest,
)


class ProgramService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response(self, row: InternshipProgram) -> ProgramResponse:
        current_interns = (
            self.db.query(ProgramMember)
            .filter(ProgramMember.program_id == row.id)
            .count()
        )
        resp = ProgramResponse.model_validate(row)
        resp.current_interns = current_interns
        return resp

    def list_programs(self, include_deleted: bool = False) -> list[ProgramResponse]:
        query = self.db.query(InternshipProgram)
        if not include_deleted:
            query = query.filter(InternshipProgram.is_deleted.is_(False))
        rows = query.order_by(InternshipProgram.id.desc()).all()
        return [self._to_response(row) for row in rows]

    def get_program(self, program_id: int) -> ProgramResponse:
        row = self._get_or_404(program_id)
        return self._to_response(row)

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
                max_interns=payload.max_interns,
                status="open",
                is_deleted=False,
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

        return self._to_response(row)

    def update_program(
        self, program_id: int, payload: ProgramUpdateRequest
    ) -> ProgramResponse:
        """Cập nhật thông tin chi tiết một kỳ thực tập (SCRUM-25)."""
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

        if "max_interns" in data and data["max_interns"] is not None:
            current_count = (
                self.db.query(ProgramMember)
                .filter(ProgramMember.program_id == program_id)
                .count()
            )
            if data["max_interns"] < current_count:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Số lượng tối đa không thể nhỏ hơn số TTS hiện có ({current_count}).",
                )

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

        return self._to_response(row)

    def close_program(self, program_id: int) -> ProgramResponse:
        """Đóng (Close) kỳ thực tập (SCRUM-27)."""
        row = self._get_or_404(program_id)
        row.status = "closed"
        try:
            self.db.commit()
            self.db.refresh(row)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể đóng kỳ thực tập.",
            ) from None
        return self._to_response(row)

    def open_program(self, program_id: int) -> ProgramResponse:
        """Mở lại kỳ thực tập (SCRUM-27)."""
        row = self._get_or_404(program_id)
        row.status = "open"
        try:
            self.db.commit()
            self.db.refresh(row)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể mở lại kỳ thực tập.",
            ) from None
        return self._to_response(row)

    def delete_program(self, program_id: int) -> None:
        """Xóa mềm (Soft Delete) kỳ thực tập (SCRUM-27)."""
        row = self._get_or_404(program_id)
        row.is_deleted = True
        row.deleted_at = datetime.utcnow()
        try:
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể xóa chương trình thực tập.",
            ) from None

    def assign_interns(
        self, program_id: int, payload: ProgramAssignRequest
    ) -> ProgramAssignResponse:
        """Gán TTS vào kỳ thực tập và kiểm tra max_interns (SCRUM-26)."""
        program = self._get_or_404(program_id)

        if program.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kỳ thực tập đã đóng, không thể tiếp nhận thêm thực tập sinh.",
            )

        # Kiểm tra mentor nếu có
        if payload.mentor_id:
            mentor = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == payload.mentor_id, Role.name == "mentor")
                .first()
            )
            if not mentor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy thông tin Mentor.",
                )

        current_count = (
            self.db.query(ProgramMember)
            .filter(ProgramMember.program_id == program_id)
            .count()
        )

        assigned: list[int] = []
        for intern_id in payload.intern_ids:
            # Kiểm tra TTS hợp lệ
            intern = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == intern_id, Role.name == "intern")
                .first()
            )
            if not intern:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy thực tập sinh có ID {intern_id}.",
                )

            # Kiểm tra đã có trong kỳ chưa
            exists = (
                self.db.query(ProgramMember)
                .filter(
                    ProgramMember.program_id == program_id,
                    ProgramMember.intern_user_id == intern_id,
                )
                .first()
            )
            if exists:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Thực tập sinh đã được phân công vào kỳ thực tập này.",
                )

            if current_count + len(assigned) >= program.max_interns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Số lượng thực tập sinh đã đạt mức tối đa của kỳ thực tập.",
                )

            member = ProgramMember(
                program_id=program_id,
                intern_user_id=intern_id,
                mentor_user_id=payload.mentor_id,
            )
            self.db.add(member)
            assigned.append(intern_id)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số lượng thực tập sinh vượt quá giới hạn hoặc dữ liệu không hợp lệ.",
            )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể gán thực tập sinh vào kỳ.",
            ) from None

        return ProgramAssignResponse(
            program_id=program_id,
            assigned_count=len(assigned),
            intern_ids=assigned,
            mentor_id=payload.mentor_id,
            message=f"Đã gán thành công {len(assigned)} thực tập sinh vào kỳ.",
        )

    def _get_or_404(
        self, program_id: int, allow_deleted: bool = False
    ) -> InternshipProgram:
        query = self.db.query(InternshipProgram).filter(InternshipProgram.id == program_id)
        if not allow_deleted:
            query = query.filter(InternshipProgram.is_deleted.is_(False))
        row = query.first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy chương trình thực tập.",
            )
        return row
