from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.core.cache import portal_cache
from app.models.intern_profile import InternProfile
from app.models.internship_group import InternProfileGroup, InternshipGroup
from app.models.program_member import ProgramMember
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.intern_mentor_group import (
    GroupDetail,
    GroupMemberItem,
    InternMentorGroupResponse,
    MentorDetail,
)


class InternGroupService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_my_mentor_and_group(
        self,
        intern_user_id: int,
        use_cache: bool = True,
    ) -> tuple[InternMentorGroupResponse, bool]:
        """
        Lấy thông tin Mentor hướng dẫn và Nhóm thực tập của TTS (SCRUM-240).
        Hỗ trợ cache để đảm bảo phản hồi dưới 50ms cho portal (SCRUM-241).
        Trả về (response, is_cache_hit).
        """
        cache_key = f"intern_mentor_group:{intern_user_id}"
        if use_cache:
            cached_data = portal_cache.get(cache_key)
            if cached_data is not None:
                return cached_data, True

        # 1. Tìm bản ghi program_member của intern
        pm = (
            self.db.query(ProgramMember)
            .options(
                joinedload(ProgramMember.program),
                joinedload(ProgramMember.mentor),
            )
            .filter(ProgramMember.intern_user_id == intern_user_id)
            .first()
        )

        # Kiểm tra thêm trong intern_profiles xem có gán mentor_id trực tiếp không
        intern_prof = (
            self.db.query(InternProfile)
            .filter(InternProfile.user_id == intern_user_id)
            .first()
        )

        mentor_user: User | None = None
        if pm and pm.mentor:
            mentor_user = pm.mentor
        elif intern_prof and intern_prof.mentor_id:
            mentor_user = (
                self.db.query(User)
                .filter(User.id == intern_prof.mentor_id)
                .first()
            )

        # 2. Xây dựng thông tin Mentor
        mentor_detail: MentorDetail | None = None
        if mentor_user:
            m_profile = (
                self.db.query(UserProfile)
                .options(joinedload(UserProfile.department))
                .filter(UserProfile.user_id == mentor_user.id)
                .first()
            )
            dept_name = (
                m_profile.department.name
                if m_profile and m_profile.department
                else "Ban Hướng dẫn Thực tập"
            )
            phone_val = m_profile.phone_number if m_profile else None
            pos_val = m_profile.position if m_profile else "Mentor hướng dẫn chính"

            mentor_detail = MentorDetail(
                id=mentor_user.id,
                full_name=mentor_user.full_name or "Người hướng dẫn",
                email=mentor_user.email,
                phone=phone_val,
                phone_number=phone_val,
                position=pos_val,
                department=dept_name,
                office_location="Tòa nhà Công nghệ ICTU, Văn phòng Hướng dẫn",
                avatar_url=None,
                status="online",
                status_text="Đang làm việc tại văn phòng",
                specialties=[
                    "Phát triển phần mềm",
                    "Clean Architecture",
                    "Hướng dẫn đồ án / thực tập",
                ],
                working_hours="08:00 - 17:30 (Thứ 2 - Thứ 6)",
            )

        # 3. Xây dựng thông tin Group và Members
        group_detail: GroupDetail | None = None
        members_list: list[GroupMemberItem] = []

        # 3.1. Kiểm tra xem TTS có thuộc nhóm thực tập thực tế (InternshipGroup) không
        ipg = None
        if intern_prof:
            ipg = (
                self.db.query(InternProfileGroup)
                .options(
                    joinedload(InternProfileGroup.group).joinedload(InternshipGroup.department),
                    joinedload(InternProfileGroup.group).joinedload(InternshipGroup.program),
                )
                .filter(
                    InternProfileGroup.intern_profile_id == intern_prof.id,
                    InternProfileGroup.status == "active",
                )
                .first()
            )

        if ipg and ipg.group:
            actual_group = ipg.group
            active_memberships = (
                self.db.query(InternProfileGroup)
                .options(
                    joinedload(InternProfileGroup.intern_profile).joinedload(InternProfile.user)
                )
                .filter(
                    InternProfileGroup.group_id == actual_group.id,
                    InternProfileGroup.status == "active",
                )
                .order_by(InternProfileGroup.id.asc())
                .all()
            )

            for idx, gm in enumerate(active_memberships):
                prof = gm.intern_profile
                u = prof.user if prof else None
                is_me = (u.id == intern_user_id) if u else False
                role_title = gm.role or ("Nhóm trưởng TTS" if idx == 0 else "Thành viên")
                phone_num = prof.phone_number if prof else None

                members_list.append(
                    GroupMemberItem(
                        id=u.id if u else gm.id,
                        code=u.code if u else f"TTS{gm.id:04d}",
                        full_name=u.full_name if u else "Thực tập sinh",
                        role=role_title,
                        is_current_user=is_me,
                        is_me=is_me,
                        email=u.email if u else None,
                        phone=phone_num,
                        phone_number=phone_num,
                        university=prof.university if prof else "Đại học CNTT & TT (ICTU)",
                        major=prof.major if prof else "Công nghệ thông tin",
                        avatar_url=None,
                        joined_date=(
                            gm.assigned_at.strftime("%d/%m/%Y")
                            if gm.assigned_at
                            else None
                        ),
                    )
                )

            prog_name_val = (
                actual_group.program.name
                if actual_group.program
                else (pm.program.name if pm and pm.program else None)
            )
            dept_name_val = (
                actual_group.department.name
                if actual_group.department
                else (pm.program.department if pm and pm.program else "Khoa CNTT - ICTU")
            )

            group_detail = GroupDetail(
                id=actual_group.id,
                code=actual_group.code or f"GRP-{actual_group.id:02d}",
                name=actual_group.name,
                program_name=prog_name_val,
                department_name=dept_name_val,
                mentor_id=mentor_user.id if mentor_user else None,
                mentor_name=mentor_user.full_name if mentor_user else None,
                total_members=len(members_list),
                max_slots=actual_group.max_members,
                status=actual_group.status,
                description=actual_group.description or "Nhóm dự án thực tập chuyên sâu.",
                members=members_list,
            )
        elif pm and pm.program and mentor_user:
            # Fallback khi chưa có nhóm riêng nhưng đã có mentor phụ trách trong kỳ thực tập
            prog = pm.program
            all_mentor_members = (
                self.db.query(ProgramMember)
                .options(
                    joinedload(ProgramMember.intern).joinedload(User.intern_profile)
                )
                .filter(
                    ProgramMember.program_id == prog.id,
                    ProgramMember.mentor_user_id == mentor_user.id,
                )
                .order_by(ProgramMember.id.asc())
                .all()
            )

            for idx, m in enumerate(all_mentor_members):
                u = m.intern
                p = u.intern_profile if u else None
                is_me = (u.id == intern_user_id) if u else False
                role_title = "Nhóm trưởng TTS" if idx == 0 else "Thành viên"
                phone_num = p.phone_number if p else None

                members_list.append(
                    GroupMemberItem(
                        id=u.id if u else m.id,
                        code=u.code if u else f"TTS{m.id:04d}",
                        full_name=u.full_name if u else "Thực tập sinh",
                        role=role_title,
                        is_current_user=is_me,
                        is_me=is_me,
                        email=u.email if u else None,
                        phone=phone_num,
                        phone_number=phone_num,
                        university=p.university if p else "Đại học CNTT & TT (ICTU)",
                        major=p.major if p else "Công nghệ thông tin",
                        avatar_url=None,
                        joined_date=(
                            m.created_at.strftime("%d/%m/%Y")
                            if m.created_at
                            else None
                        ),
                    )
                )

            group_detail = GroupDetail(
                id=prog.id,
                code=f"GRP-{prog.id:02d}",
                name=f"Nhóm hướng dẫn {prog.name}",
                program_name=prog.name,
                department_name=prog.department or "Khoa CNTT - ICTU",
                mentor_id=mentor_user.id,
                mentor_name=mentor_user.full_name,
                total_members=len(members_list),
                max_slots=prog.max_interns,
                status=prog.status,
                description=prog.description or "Nhóm thực tập theo mentor phụ trách.",
                members=members_list,
            )
        else:
            # Chưa được phân vào nhóm cụ thể và chưa có mentor: group_detail = None
            group_detail = None
            members_list = []

        if not mentor_detail and not group_detail:
            status_text = "unassigned"
            message_text = "Bạn chưa được phân bổ vào nhóm thực tập hoặc chưa có người hướng dẫn chính thức."
        else:
            status_text = "assigned"
            message_text = "Lấy thông tin mentor và nhóm thực tập thành công."

        response = InternMentorGroupResponse(
            status=status_text,
            message=message_text,
            mentor=mentor_detail,
            group=group_detail,
            members=members_list,
        )

        if use_cache:
            portal_cache.set(cache_key, response, ttl=120)

        return response, False

    @classmethod
    def invalidate_cache(cls, intern_user_id: int | None = None) -> None:
        """Xóa cache khi phân công mentor hoặc nhóm thay đổi (SCRUM-241)."""
        if intern_user_id is not None:
            portal_cache.delete(f"intern_mentor_group:{intern_user_id}")
        else:
            portal_cache.invalidate_prefix("intern_mentor_group:")
