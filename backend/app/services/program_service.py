from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.internship_group import (
    InternProfileDepartment,
    InternProfileGroup,
    InternshipGroup,
)
from app.models.internship_program import InternshipProgram
from app.models.mentor_intern import MentorIntern
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.program import (
    InternStatusSummary,
    PreviousPeriodSummary,
    ProgramAssignRequest,
    ProgramAssignResponse,
    ProgramCompletionItem,
    ProgramCompletionStatsResponse,
    ProgramCreateRequest,
    ProgramGroupBatchAssignRequest,
    ProgramGroupBatchAssignResponse,
    ProgramMemberItem,
    ProgramPeriodRequest,
    ProgramResponse,
    ProgramUpdateMemberRequest,
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
        current_mentors = (
            self.db.query(ProgramMember.mentor_user_id)
            .filter(
                ProgramMember.program_id == row.id,
                ProgramMember.mentor_user_id.isnot(None),
            )
            .distinct()
            .count()
        )
        resp = ProgramResponse.model_validate(row)
        resp.current_interns = current_interns
        resp.current_mentors = current_mentors
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
                max_mentors=payload.max_mentors,
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

    def update_period(self, program_id: int, payload: ProgramPeriodRequest) -> ProgramResponse:
        """Chỉnh ngày bắt đầu và kết thúc của một kỳ thực tập."""
        row = self._get_or_404(program_id)
        row.start_date = payload.start_date
        row.end_date = payload.end_date
        try:
            self.db.commit()
            self.db.refresh(row)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật khoảng thời gian thực tập.",
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

        if payload.mentor_id:
            for intern_id in assigned:
                prof = (
                    self.db.query(InternProfile)
                    .filter(InternProfile.user_id == intern_id)
                    .first()
                )
                if prof:
                    prof.mentor_id = payload.mentor_id
                else:
                    self.db.add(
                        InternProfile(user_id=intern_id, mentor_id=payload.mentor_id, status="approved")
                    )

                mi = (
                    self.db.query(MentorIntern)
                    .filter(MentorIntern.intern_id == intern_id)
                    .first()
                )
                if mi:
                    mi.mentor_id = payload.mentor_id
                else:
                    self.db.add(
                        MentorIntern(mentor_id=payload.mentor_id, intern_id=intern_id)
                    )

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

    def list_program_members(self, program_id: int) -> list[ProgramMemberItem]:
        """Lấy danh sách các TTS và Mentor trong kỳ thực tập."""
        program = self._get_or_404(program_id, allow_deleted=True)
        members = (
            self.db.query(ProgramMember)
            .filter(ProgramMember.program_id == program.id)
            .order_by(ProgramMember.id.desc())
            .all()
        )
        result: list[ProgramMemberItem] = []
        for m in members:
            intern = self.db.query(User).filter(User.id == m.intern_user_id).first()
            mentor = (
                self.db.query(User).filter(User.id == m.mentor_user_id).first()
                if m.mentor_user_id
                else None
            )
            profile = (
                self.db.query(InternProfile)
                .filter(InternProfile.user_id == m.intern_user_id)
                .first()
            )
            result.append(
                ProgramMemberItem(
                    id=m.id,
                    program_id=m.program_id,
                    intern_user_id=m.intern_user_id,
                    intern_name=(
                        intern.full_name
                        if intern and intern.full_name
                        else (intern.email if intern else f"TTS #{m.intern_user_id}")
                    ),
                    intern_email=intern.email if intern else "",
                    intern_code=intern.code if intern else None,
                    phone_number=profile.phone_number if profile else None,
                    university=profile.university if profile else None,
                    major=profile.major if profile else None,
                    mentor_user_id=m.mentor_user_id,
                    mentor_name=mentor.full_name if mentor else None,
                    mentor_email=mentor.email if mentor else None,
                    status=m.status,
                    created_at=m.created_at,
                )
            )
        return result

    def update_program_member(
        self, program_id: int, intern_id: int, payload: ProgramUpdateMemberRequest
    ) -> ProgramMemberItem:
        """Cập nhật Mentor hoặc trạng thái cho một TTS trong kỳ thực tập."""
        self._get_or_404(program_id)
        member = (
            self.db.query(ProgramMember)
            .filter(
                ProgramMember.program_id == program_id,
                ProgramMember.intern_user_id == intern_id,
            )
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thực tập sinh trong kỳ thực tập này.",
            )

        if payload.mentor_id is not None:
            if payload.mentor_id > 0:
                mentor = (
                    self.db.query(User)
                    .join(Role, User.role_id == Role.id)
                    .filter(User.id == payload.mentor_id, Role.name == "mentor")
                    .first()
                )
                if not mentor:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy Mentor tương ứng.",
                    )
                member.mentor_user_id = payload.mentor_id

                prof = (
                    self.db.query(InternProfile)
                    .filter(InternProfile.user_id == intern_id)
                    .first()
                )
                if prof:
                    prof.mentor_id = payload.mentor_id
                else:
                    self.db.add(
                        InternProfile(user_id=intern_id, mentor_id=payload.mentor_id, status="approved")
                    )

                mi = (
                    self.db.query(MentorIntern)
                    .filter(MentorIntern.intern_id == intern_id)
                    .first()
                )
                if mi:
                    mi.mentor_id = payload.mentor_id
                else:
                    self.db.add(
                        MentorIntern(mentor_id=payload.mentor_id, intern_id=intern_id)
                    )
            else:
                member.mentor_user_id = None
                prof = (
                    self.db.query(InternProfile)
                    .filter(InternProfile.user_id == intern_id)
                    .first()
                )
                if prof and prof.mentor_id == member.mentor_user_id:
                    prof.mentor_id = None
                mi = (
                    self.db.query(MentorIntern)
                    .filter(MentorIntern.intern_id == intern_id)
                    .first()
                )
                if mi:
                    self.db.delete(mi)

        if payload.status:
            valid_statuses = {"in_progress", "completed", "dropped_out", "failed"}
            if payload.status in valid_statuses:
                member.status = payload.status

        try:
            self.db.commit()
            self.db.refresh(member)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật thành viên kỳ thực tập.",
            ) from None

        intern = self.db.query(User).filter(User.id == member.intern_user_id).first()
        mentor = (
            self.db.query(User).filter(User.id == member.mentor_user_id).first()
            if member.mentor_user_id
            else None
        )
        profile = (
            self.db.query(InternProfile)
            .filter(InternProfile.user_id == member.intern_user_id)
            .first()
        )
        return ProgramMemberItem(
            id=member.id,
            program_id=member.program_id,
            intern_user_id=member.intern_user_id,
            intern_name=(
                intern.full_name
                if intern and intern.full_name
                else (intern.email if intern else f"TTS #{member.intern_user_id}")
            ),
            intern_email=intern.email if intern else "",
            intern_code=intern.code if intern else None,
            phone_number=profile.phone_number if profile else None,
            university=profile.university if profile else None,
            major=profile.major if profile else None,
            mentor_user_id=member.mentor_user_id,
            mentor_name=mentor.full_name if mentor else None,
            mentor_email=mentor.email if mentor else None,
            status=member.status,
            created_at=member.created_at,
        )

    def remove_program_member(self, program_id: int, intern_id: int) -> None:
        """Xóa một TTS khỏi kỳ thực tập."""
        self._get_or_404(program_id)
        member = (
            self.db.query(ProgramMember)
            .filter(
                ProgramMember.program_id == program_id,
                ProgramMember.intern_user_id == intern_id,
            )
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thực tập sinh trong kỳ thực tập này.",
            )

        self.db.delete(member)
        try:
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể xóa thực tập sinh khỏi kỳ thực tập.",
            ) from None

    def unassign_intern_from_program(self, program_id: int, intern_id: int) -> dict[str, str]:
        """Gỡ hoàn toàn một thực tập sinh khỏi kỳ thực tập và dọn dẹp các liên kết nhóm/mentor liên quan."""
        from app.models.intern_profile import InternProfile
        from app.models.mentor_intern import MentorIntern
        from app.models.internship_group import InternshipGroup, InternProfileGroup
        from app.services.intern_group_service import InternGroupService

        program = self._get_or_404(program_id)

        # 1. Tìm bản ghi ProgramMember
        pm = (
            self.db.query(ProgramMember)
            .filter(
                ProgramMember.program_id == program_id,
                ProgramMember.intern_user_id == intern_id,
            )
            .first()
        )
        if not pm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thực tập sinh ID {intern_id} không có trong kỳ thực tập '{program.name}'.",
            )

        mentor_id = pm.mentor_user_id
        self.db.delete(pm)

        # 2. Gỡ khỏi các nhóm thuộc kỳ này
        profile = (
            self.db.query(InternProfile)
            .filter(InternProfile.user_id == intern_id)
            .first()
        )
        if profile:
            group_ids = [
                g.id
                for g in self.db.query(InternshipGroup)
                .filter(InternshipGroup.program_id == program_id)
                .all()
            ]
            if group_ids:
                self.db.query(InternProfileGroup).filter(
                    InternProfileGroup.intern_profile_id == profile.id,
                    InternProfileGroup.group_id.in_(group_ids),
                ).delete(synchronize_session=False)

            # 3. Kiểm tra xem TTS còn ở kỳ nào khác không
            remaining_pm = (
                self.db.query(ProgramMember)
                .filter(ProgramMember.intern_user_id == intern_id)
                .first()
            )
            if not remaining_pm:
                profile.mentor_id = None
                self.db.query(MentorIntern).filter(MentorIntern.intern_id == intern_id).delete(synchronize_session=False)
            elif mentor_id:
                still_has_same_mentor = (
                    self.db.query(ProgramMember)
                    .filter(
                        ProgramMember.intern_user_id == intern_id,
                        ProgramMember.mentor_user_id == mentor_id,
                    )
                    .first()
                )
                if not still_has_same_mentor:
                    self.db.query(MentorIntern).filter(
                        MentorIntern.intern_id == intern_id,
                        MentorIntern.mentor_id == mentor_id,
                    ).delete(synchronize_session=False)

        try:
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể gỡ thực tập sinh khỏi kỳ thực tập.",
            ) from None

        try:
            InternGroupService.invalidate_cache(intern_id)
        except Exception:
            pass

        return {
            "message": f"Đã gỡ thực tập sinh khỏi kỳ thực tập '{program.name}' thành công.",
            "program_id": str(program_id),
            "intern_id": str(intern_id),
        }
    def assign_groups(
        self,
        payload: ProgramGroupBatchAssignRequest,
        assigned_by: int | None = None,
    ) -> ProgramGroupBatchAssignResponse:
        """Gán hàng loạt thực tập sinh vào một chương trình hoặc nhóm cụ thể (POST /api/hr/programs/assign-groups)."""
        program = None
        if payload.program_id is not None:
            program = (
                self.db.query(InternshipProgram)
                .filter(
                    InternshipProgram.id == payload.program_id,
                    InternshipProgram.is_deleted.is_(False),
                )
                .first()
            )
            if not program:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy kỳ thực tập có ID {payload.program_id}.",
                )
            if program.status == "closed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Kỳ thực tập đã đóng, không thể tiếp nhận thêm thực tập sinh.",
                )

        group = None
        if payload.group_id is not None:
            group = (
                self.db.query(InternshipGroup)
                .filter(InternshipGroup.id == payload.group_id)
                .first()
            )
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy nhóm thực tập có ID {payload.group_id}.",
                )
            if group.status == "closed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nhóm thực tập đã đóng, không thể tiếp nhận thêm thực tập sinh.",
                )

        if program is None and group is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng cung cấp ít nhất program_id hoặc group_id để phân công.",
            )

        if payload.mentor_id is not None:
            mentor = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == payload.mentor_id, Role.name == "mentor")
                .first()
            )
            if not mentor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy Mentor có ID {payload.mentor_id}.",
                )

        # 1. Thu thập và xác thực danh sách thực tập sinh
        interns_map: dict[int, tuple[User, InternProfile]] = {}

        if payload.intern_ids:
            unique_uids = list(dict.fromkeys(payload.intern_ids))
            users = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id.in_(unique_uids), Role.name == "intern")
                .all()
            )
            found_uids = {u.id for u in users}
            for uid in unique_uids:
                if uid not in found_uids:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Không tìm thấy thực tập sinh có User ID {uid}.",
                    )
            for u in users:
                prof = (
                    self.db.query(InternProfile)
                    .filter(InternProfile.user_id == u.id)
                    .first()
                )
                if not prof:
                    prof = InternProfile(user_id=u.id, status="approved")
                    self.db.add(prof)
                    self.db.flush()
                interns_map[u.id] = (u, prof)

        if payload.intern_profile_ids:
            unique_pids = list(dict.fromkeys(payload.intern_profile_ids))
            profiles = (
                self.db.query(InternProfile)
                .filter(InternProfile.id.in_(unique_pids))
                .all()
            )
            found_pids = {p.id for p in profiles}
            for pid in unique_pids:
                if pid not in found_pids:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Không tìm thấy hồ sơ thực tập sinh có Profile ID {pid}.",
                    )
            for p in profiles:
                u = self.db.query(User).filter(User.id == p.user_id).first()
                if not u:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Không tìm thấy tài khoản người dùng cho hồ sơ Profile ID {p.id}.",
                    )
                interns_map[u.id] = (u, p)

        if not interns_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng cung cấp danh sách thực tập sinh cần gán.",
            )

        target_interns = list(interns_map.values())

        # 2. Kiểm tra giới hạn số lượng (Capacity Check)
        if program is not None:
            current_pm_count = (
                self.db.query(ProgramMember)
                .filter(ProgramMember.program_id == program.id)
                .count()
            )
            existing_user_ids = {
                pm.intern_user_id
                for pm in self.db.query(ProgramMember.intern_user_id)
                .filter(
                    ProgramMember.program_id == program.id,
                    ProgramMember.intern_user_id.in_([u.id for u, _ in target_interns]),
                )
                .all()
            }
            new_to_program = [u for u, _ in target_interns if u.id not in existing_user_ids]
            if current_pm_count + len(new_to_program) > program.max_interns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số lượng thực tập sinh vượt quá giới hạn tối đa của kỳ thực tập '{program.name}' ({program.max_interns} TTS).",
                )

        if group is not None:
            current_group_count = (
                self.db.query(InternProfileGroup)
                .filter(
                    InternProfileGroup.group_id == group.id,
                    InternProfileGroup.status == "active",
                )
                .count()
            )
            existing_profile_ids = {
                ipg.intern_profile_id
                for ipg in self.db.query(InternProfileGroup.intern_profile_id)
                .filter(
                    InternProfileGroup.group_id == group.id,
                    InternProfileGroup.status == "active",
                    InternProfileGroup.intern_profile_id.in_([p.id for _, p in target_interns]),
                )
                .all()
            }
            new_to_group = [p for _, p in target_interns if p.id not in existing_profile_ids]
            if current_group_count + len(new_to_group) > group.max_members:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số lượng thực tập sinh vượt quá giới hạn tối đa của nhóm '{group.name}' ({group.max_members} TTS).",
                )

        # 3. Phân công vào chương trình và/hoặc nhóm
        assigned_user_ids: list[int] = []
        assigned_profile_ids: list[int] = []

        for user, profile in target_interns:
            assigned_user_ids.append(user.id)
            assigned_profile_ids.append(profile.id)

            if program is not None:
                pm = (
                    self.db.query(ProgramMember)
                    .filter(
                        ProgramMember.program_id == program.id,
                        ProgramMember.intern_user_id == user.id,
                    )
                    .first()
                )
                if pm:
                    if payload.mentor_id:
                        pm.mentor_user_id = payload.mentor_id
                else:
                    new_pm = ProgramMember(
                        program_id=program.id,
                        intern_user_id=user.id,
                        mentor_user_id=payload.mentor_id,
                    )
                    self.db.add(new_pm)

            if group is not None:
                ipg = (
                    self.db.query(InternProfileGroup)
                    .filter(
                        InternProfileGroup.group_id == group.id,
                        InternProfileGroup.intern_profile_id == profile.id,
                    )
                    .first()
                )
                if ipg:
                    ipg.role = payload.role
                    ipg.status = "active"
                    if assigned_by:
                        ipg.assigned_by = assigned_by
                else:
                    new_ipg = InternProfileGroup(
                        group_id=group.id,
                        intern_profile_id=profile.id,
                        role=payload.role,
                        status="active",
                        assigned_by=assigned_by,
                    )
                    self.db.add(new_ipg)

                # Tự động đồng bộ liên kết phòng ban tương ứng của nhóm
                if group.department_id is not None:
                    ipd = (
                        self.db.query(InternProfileDepartment)
                        .filter(
                            InternProfileDepartment.department_id == group.department_id,
                            InternProfileDepartment.intern_profile_id == profile.id,
                        )
                        .first()
                    )
                    if not ipd:
                        self.db.add(
                            InternProfileDepartment(
                                department_id=group.department_id,
                                intern_profile_id=profile.id,
                                assigned_by=assigned_by,
                            )
                        )

            # Phân công mentor nếu có
            if payload.mentor_id is not None:
                profile.mentor_id = payload.mentor_id
                mi = (
                    self.db.query(MentorIntern)
                    .filter(MentorIntern.intern_id == user.id)
                    .first()
                )
                if mi:
                    mi.mentor_id = payload.mentor_id
                else:
                    self.db.add(MentorIntern(mentor_id=payload.mentor_id, intern_id=user.id))

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dữ liệu phân công không hợp lệ hoặc vi phạm ràng buộc dữ liệu.",
            )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể thực hiện phân công vào chương trình hoặc nhóm.",
            ) from None

        target_descs = []
        if program:
            target_descs.append(f"kỳ thực tập '{program.name}'")
        if group:
            target_descs.append(f"nhóm '{group.name}'")
        target_str = " và ".join(target_descs)

        dept_id = group.department_id if group else None
        dept_name = group.department.name if group and group.department else None

        return ProgramGroupBatchAssignResponse(
            success=True,
            program_id=program.id if program else None,
            program_name=program.name if program else None,
            group_id=group.id if group else None,
            group_name=group.name if group else None,
            department_id=dept_id,
            department_name=dept_name,
            assigned_count=len(target_interns),
            intern_ids=assigned_user_ids,
            intern_profile_ids=assigned_profile_ids,
            mentor_id=payload.mentor_id,
            message=f"Đã gán thành công {len(target_interns)} thực tập sinh vào {target_str}.",
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

    def get_completion_stats(
        self, program_id: int | None = None
    ) -> ProgramCompletionStatsResponse:
        """[BE] Thiết lập câu truy vấn tính toán số lượng thực tập sinh theo trạng thái (US-33).

        Trạng thái:
        - Đang thực tập (in_progress)
        - Đã hoàn thành (completed)
        - Bỏ cuộc (dropped_out)
        - Không đạt (failed)

        Tính toán các tỷ lệ tương ứng (completion_rate, dropout_rate, failure_rate, in_progress_rate),
        xử lý an toàn khi chia cho 0, thống kê theo từng kỳ và so sánh với kỳ trước.
        """
        # 1. Nếu chỉ định program_id, kiểm tra tồn tại
        target_program: InternshipProgram | None = None
        if program_id is not None:
            target_program = (
                self.db.query(InternshipProgram)
                .filter(InternshipProgram.id == program_id, InternshipProgram.is_deleted.is_(False))
                .first()
            )
            if not target_program:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy kỳ thực tập có ID {program_id}.",
                )

        # 2. Câu truy vấn tổng hợp trạng thái (Tổng quan hoặc theo kỳ cụ thể)
        summary_query = (
            self.db.query(
                func.count(ProgramMember.id).label("total"),
                func.count(case((ProgramMember.status == "in_progress", ProgramMember.id))).label("in_progress"),
                func.count(case((ProgramMember.status == "completed", ProgramMember.id))).label("completed"),
                func.count(case((ProgramMember.status == "dropped_out", ProgramMember.id))).label("dropped_out"),
                func.count(case((ProgramMember.status == "failed", ProgramMember.id))).label("failed"),
            )
            .join(
                InternshipProgram,
                and_(
                    InternshipProgram.id == ProgramMember.program_id,
                    InternshipProgram.is_deleted.is_(False),
                ),
            )
        )
        if program_id is not None:
            summary_query = summary_query.filter(ProgramMember.program_id == program_id)

        sum_row = summary_query.one()
        total = sum_row.total or 0
        in_progress = sum_row.in_progress or 0
        completed = sum_row.completed or 0
        dropped_out = sum_row.dropped_out or 0
        failed = sum_row.failed or 0
        not_completed = dropped_out + failed

        # Xử lý an toàn tránh chia cho 0
        completion_rate = round((completed / total) * 100, 2) if total > 0 else 0.0
        dropout_rate = round((dropped_out / total) * 100, 2) if total > 0 else 0.0
        failure_rate = round((failed / total) * 100, 2) if total > 0 else 0.0
        in_progress_rate = round((in_progress / total) * 100, 2) if total > 0 else 0.0

        summary = InternStatusSummary(
            total=total,
            in_progress=in_progress,
            completed=completed,
            dropped_out=dropped_out,
            failed=failed,
            not_completed=not_completed,
            completion_rate=completion_rate,
            dropout_rate=dropout_rate,
            failure_rate=failure_rate,
            in_progress_rate=in_progress_rate,
        )

        # 3. Câu truy vấn chi tiết từng chương trình (GROUP BY theo từng kỳ)
        prog_rows = (
            self.db.query(
                InternshipProgram.id,
                InternshipProgram.name,
                InternshipProgram.department,
                InternshipProgram.start_date,
                func.count(ProgramMember.id).label("total"),
                func.count(case((ProgramMember.status == "in_progress", ProgramMember.id))).label("in_progress"),
                func.count(case((ProgramMember.status == "completed", ProgramMember.id))).label("completed"),
                func.count(case((ProgramMember.status == "dropped_out", ProgramMember.id))).label("dropped_out"),
                func.count(case((ProgramMember.status == "failed", ProgramMember.id))).label("failed"),
            )
            .outerjoin(
                ProgramMember,
                ProgramMember.program_id == InternshipProgram.id,
            )
            .filter(InternshipProgram.is_deleted.is_(False))
            .group_by(
                InternshipProgram.id,
                InternshipProgram.name,
                InternshipProgram.department,
                InternshipProgram.start_date,
            )
            .order_by(
                InternshipProgram.start_date.desc(),
                InternshipProgram.id.desc(),
            )
            .all()
        )

        programs_list: list[ProgramCompletionItem] = []
        for p in prog_rows:
            p_total = p.total or 0
            p_comp = p.completed or 0
            p_inp = p.in_progress or 0
            p_drop = p.dropped_out or 0
            p_fail = p.failed or 0
            p_not_comp = p_drop + p_fail
            p_rate = round((p_comp / p_total) * 100, 2) if p_total > 0 else 0.0

            programs_list.append(
                ProgramCompletionItem(
                    id=p.id,
                    name=p.name,
                    department=p.department,
                    total=p_total,
                    completed=p_comp,
                    in_progress=p_inp,
                    dropped_out=p_drop,
                    failed=p_fail,
                    not_completed=p_not_comp,
                    completion_rate=p_rate,
                )
            )

        # 4. Xác định kỳ trước (previous_period) để so sánh chênh lệch
        previous_period: PreviousPeriodSummary | None = None
        if target_program is not None:
            # Tìm kỳ thực tập có ngày bắt đầu trước kỳ đang xét
            prev_prog = (
                self.db.query(InternshipProgram)
                .filter(
                    InternshipProgram.is_deleted.is_(False),
                    InternshipProgram.id != target_program.id,
                    InternshipProgram.start_date <= target_program.start_date,
                )
                .order_by(InternshipProgram.start_date.desc(), InternshipProgram.id.desc())
                .first()
            )
        else:
            # Nếu lấy toàn cục, lấy kỳ thứ 2 trong danh sách để so sánh với kỳ mới nhất
            prev_prog = None
            if len(prog_rows) >= 2:
                prev_prog_id = prog_rows[1].id
                prev_prog = (
                    self.db.query(InternshipProgram)
                    .filter(InternshipProgram.id == prev_prog_id)
                    .first()
                )

        if prev_prog:
            prev_row = (
                self.db.query(
                    func.count(ProgramMember.id).label("total"),
                    func.count(case((ProgramMember.status == "completed", ProgramMember.id))).label("completed"),
                )
                .filter(ProgramMember.program_id == prev_prog.id)
                .one()
            )
            prev_total = prev_row.total or 0
            prev_comp = prev_row.completed or 0
            prev_rate = round((prev_comp / prev_total) * 100, 2) if prev_total > 0 else 0.0

            previous_period = PreviousPeriodSummary(
                id=prev_prog.id,
                name=prev_prog.name,
                total=prev_total,
                completed=prev_comp,
                completion_rate=prev_rate,
            )

        return ProgramCompletionStatsResponse(
            summary=summary,
            previous_period=previous_period,
            programs=programs_list,
        )

