"""Service xử lý nghiệp vụ Phân công Mentor cho Thực tập sinh (Task 6)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.mentor_assignment import (
    AssignedInternItem,
    AssignedInternListResponse,
    MentorAssignResponse,
)

MENTOR_ROLE_NAME = "mentor"
TTS_ROLE_NAME = "intern"


class MentorAssignmentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def assign_interns_to_mentor(
        self,
        mentor_id: int,
        intern_ids: list[int],
        program_id: int | None = None,
        auto_assign_open_program: bool = False,
    ) -> MentorAssignResponse:
        """Phân công đơn lẻ hoặc hàng loạt TTS cho một Mentor (Task 6)."""
        # 1. Kiểm tra Mentor hợp lệ
        mentor = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == mentor_id, Role.name == MENTOR_ROLE_NAME)
            .first()
        )
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy Mentor với ID {mentor_id}.",
            )

        # 2. Kiểm tra danh sách TTS hợp lệ
        unique_intern_ids = list(dict.fromkeys(intern_ids))
        interns = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id.in_(unique_intern_ids), Role.name == TTS_ROLE_NAME)
            .all()
        )
        found_ids = {u.id for u in interns}
        for i_id in unique_intern_ids:
            if i_id not in found_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy thực tập sinh có ID {i_id}.",
                )

        # 2.1 Kiểm tra giới hạn tải công việc của Mentor (Tối đa 5 TTS/Mentor để cân bằng tải)
        MAX_INTERNS_PER_MENTOR = 5
        current_mentor_interns = (
            self.db.query(ProgramMember.intern_user_id)
            .join(InternshipProgram, ProgramMember.program_id == InternshipProgram.id)
            .filter(
                ProgramMember.mentor_user_id == mentor.id,
                ProgramMember.intern_user_id.notin_(unique_intern_ids),
                InternshipProgram.deleted_at.is_(None),
            )
            .distinct()
            .count()
        )
        if current_mentor_interns + len(unique_intern_ids) > MAX_INTERNS_PER_MENTOR:
            remaining_slots = max(0, MAX_INTERNS_PER_MENTOR - current_mentor_interns)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mentor '{mentor.full_name}' chỉ còn nhận tối đa {remaining_slots} thực tập sinh (Hạn mức: {MAX_INTERNS_PER_MENTOR} TTS/Mentor để đảm bảo cân bằng tải). Vui lòng phân bổ cho Mentor khác.",
            )

        # 3. Phân công theo kỳ thực tập (Program)
        if program_id is not None:
            program = (
                self.db.query(InternshipProgram)
                .filter(InternshipProgram.id == program_id, InternshipProgram.deleted_at.is_(None))
                .first()
            )
            if not program:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy kỳ thực tập có ID {program_id}.",
                )
            if program.status == "closed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Kỳ thực tập đã đóng, không thể phân công thêm thực tập sinh.",
                )

            current_count = (
                self.db.query(ProgramMember)
                .filter(ProgramMember.program_id == program_id)
                .count()
            )

            for intern in interns:
                member = (
                    self.db.query(ProgramMember)
                    .filter(
                        ProgramMember.program_id == program_id,
                        ProgramMember.intern_user_id == intern.id,
                    )
                    .first()
                )
                if member:
                    # Cập nhật hoặc đổi Mentor cho TTS đã có trong kỳ
                    member.mentor_user_id = mentor.id
                else:
                    # Nếu TTS chưa có trong kỳ thì thêm mới (nếu chưa vượt quá giới hạn)
                    if current_count >= program.max_interns:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Số lượng thực tập sinh đã đạt mức tối đa của kỳ thực tập.",
                        )
                    new_member = ProgramMember(
                        program_id=program_id,
                        intern_user_id=intern.id,
                        mentor_user_id=mentor.id,
                    )
                    self.db.add(new_member)
                    current_count += 1
        else:
            # Nếu không truyền program_id: tìm bản ghi kỳ thực tập hiện tại của TTS để cập nhật
            for intern in interns:
                member = (
                    self.db.query(ProgramMember)
                    .join(InternshipProgram, ProgramMember.program_id == InternshipProgram.id)
                    .filter(
                        ProgramMember.intern_user_id == intern.id,
                        InternshipProgram.deleted_at.is_(None),
                    )
                    .order_by(ProgramMember.id.desc())
                    .first()
                )
                if member:
                    member.mentor_user_id = mentor.id
                elif auto_assign_open_program:
                    fallback_program = (
                        self.db.query(InternshipProgram)
                        .filter(InternshipProgram.status == "open", InternshipProgram.deleted_at.is_(None))
                        .order_by(InternshipProgram.id.desc())
                        .first()
                    )
                    if not fallback_program:
                        fallback_program = (
                            self.db.query(InternshipProgram)
                            .filter(InternshipProgram.deleted_at.is_(None))
                            .order_by(InternshipProgram.id.desc())
                            .first()
                        )
                    if fallback_program:
                        new_member = ProgramMember(
                            program_id=fallback_program.id,
                            intern_user_id=intern.id,
                            mentor_user_id=mentor.id,
                        )
                        self.db.add(new_member)
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Thực tập sinh '{intern.full_name}' (ID: {intern.id}) chưa thuộc kỳ thực tập nào và hệ thống chưa có kỳ mở.",
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Thực tập sinh '{intern.full_name}' (ID: {intern.id}) chưa thuộc kỳ thực tập nào. Vui lòng chỉ định program_id.",
                    )
                member = member  # noop

        # Đồng bộ quan hệ phân công vào bảng InternProfile (mentor_id) và MentorIntern (US-30)
        from app.models.intern_profile import InternProfile
        from app.models.mentor_intern import MentorIntern

        for intern in interns:
            profile = (
                self.db.query(InternProfile)
                .filter(InternProfile.user_id == intern.id)
                .first()
            )
            if profile:
                profile.mentor_id = mentor.id
            else:
                profile = InternProfile(user_id=intern.id, mentor_id=mentor.id)
                self.db.add(profile)

            mi = (
                self.db.query(MentorIntern)
                .filter(MentorIntern.intern_id == intern.id)
                .first()
            )
            if mi:
                mi.mentor_id = mentor.id
            else:
                self.db.add(MentorIntern(mentor_id=mentor.id, intern_id=intern.id))

        self.db.commit()

        return MentorAssignResponse(
            mentor_id=mentor.id,
            mentor_name=mentor.full_name,
            assigned_count=len(unique_intern_ids),
            intern_ids=unique_intern_ids,
            message=f"Đã phân công thành công {len(unique_intern_ids)} thực tập sinh cho Mentor {mentor.full_name}.",
        )

    def get_assigned_interns(self, mentor_id: int) -> AssignedInternListResponse:
        """Lấy danh sách các TTS đang được phân công cho một Mentor (Task 6)."""
        mentor = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == mentor_id, Role.name == MENTOR_ROLE_NAME)
            .first()
        )
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy Mentor với ID {mentor_id}.",
            )

        members = (
            self.db.query(ProgramMember)
            .options(
                joinedload(ProgramMember.intern),
                joinedload(ProgramMember.program),
            )
            .filter(ProgramMember.mentor_user_id == mentor_id)
            .all()
        )

        items = [
            AssignedInternItem(
                intern_id=m.intern_user_id,
                intern_code=m.intern.code if m.intern else None,
                intern_name=m.intern.full_name if m.intern else None,
                intern_email=m.intern.email if m.intern else "",
                program_id=m.program_id,
                program_name=m.program.name if m.program else None,
                assigned_at=m.created_at,
            )
            for m in members
        ]

        return AssignedInternListResponse(items=items, total=len(items))

    def unassign_intern(
        self, mentor_id: int, intern_id: int, program_id: int | None = None
    ) -> dict[str, str]:
        """Hủy phân công một thực tập sinh khỏi Mentor và đồng bộ toàn diện CSDL."""
        from app.models.intern_profile import InternProfile
        from app.models.mentor_intern import MentorIntern
        from app.models.internship_group import InternshipGroup, InternProfileGroup
        from app.services.intern_group_service import InternGroupService

        query = self.db.query(ProgramMember).filter(
            ProgramMember.mentor_user_id == mentor_id,
            ProgramMember.intern_user_id == intern_id,
        )
        if program_id is not None:
            query = query.filter(ProgramMember.program_id == program_id)

        member = query.first()
        if not member:
            # Fallback: Tìm bản ghi phân công của TTS với bất kỳ Mentor nào
            fallback_query = self.db.query(ProgramMember).filter(
                ProgramMember.intern_user_id == intern_id,
                ProgramMember.mentor_user_id.isnot(None),
            )
            if program_id is not None:
                fallback_query = fallback_query.filter(ProgramMember.program_id == program_id)
            member = fallback_query.first()

        resolved_mentor_id = member.mentor_user_id if member and member.mentor_user_id else mentor_id

        # Kiểm tra xem có bất kỳ liên kết nào trong hệ thống không
        profile = self.db.query(InternProfile).filter(InternProfile.user_id == intern_id).first()
        mi = self.db.query(MentorIntern).filter(MentorIntern.intern_id == intern_id).first()

        if not member and not profile and not mi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy liên kết phân công giữa Mentor và thực tập sinh này.",
            )

        # 1. Hủy phân công trên các bản ghi ProgramMember
        pm_query = self.db.query(ProgramMember).filter(ProgramMember.intern_user_id == intern_id)
        if program_id is not None:
            pm_records = pm_query.filter(ProgramMember.program_id == program_id).all()
        else:
            pm_records = pm_query.filter(
                (ProgramMember.mentor_user_id == mentor_id)
                | (ProgramMember.mentor_user_id == resolved_mentor_id)
                | (ProgramMember.mentor_user_id.isnot(None))
            ).all()

        for pm in pm_records:
            pm.mentor_user_id = None

        # 2. Kiểm tra xem còn bất kỳ ProgramMember nào còn mentor không
        remaining_pm = (
            self.db.query(ProgramMember)
            .filter(
                ProgramMember.intern_user_id == intern_id,
                ProgramMember.mentor_user_id.isnot(None),
            )
            .first()
        )

        if not remaining_pm:
            if profile:
                profile.mentor_id = None
            self.db.query(MentorIntern).filter(
                MentorIntern.intern_id == intern_id,
            ).delete(synchronize_session=False)
        else:
            if profile:
                profile.mentor_id = remaining_pm.mentor_user_id
            self.db.query(MentorIntern).filter(
                MentorIntern.intern_id == intern_id,
                (MentorIntern.mentor_id == mentor_id) | (MentorIntern.mentor_id == resolved_mentor_id),
            ).delete(synchronize_session=False)

        # 3. Gỡ thực tập sinh khỏi các Nhóm thực tập (InternProfileGroup) liên quan
        if profile:
            if program_id is not None:
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
            else:
                self.db.query(InternProfileGroup).filter(
                    InternProfileGroup.intern_profile_id == profile.id,
                ).delete(synchronize_session=False)

        self.db.commit()

        # 5. Xóa cache của Portal TTS
        try:
            InternGroupService.invalidate_cache(intern_id)
        except Exception:
            pass

        return {"message": "Đã hủy phân công thực tập sinh khỏi Mentor thành công."}
