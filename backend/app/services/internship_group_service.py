from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_group import (
    InternProfileDepartment,
    InternProfileGroup,
    InternshipGroup,
)
from app.models.internship_program import InternshipProgram
from app.models.user import User
from app.schemas.internship_group import (
    AssignInternsToDepartmentRequest,
    AssignInternsToDepartmentResponse,
    AssignInternsToGroupRequest,
    AssignInternsToGroupResponse,
    InternDepartmentOverviewItem,
    InternGroupMemberItem,
    InternGroupOverviewItem,
    InternGroupsDepartmentsResponse,
    InternshipGroupCreate,
    InternshipGroupResponse,
    InternshipGroupUpdate,
)


class InternshipGroupService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_group(self, payload: InternshipGroupCreate) -> InternshipGroupResponse:
        """Tạo nhóm thực tập mới gắn với phòng ban và/hoặc chương trình thực tập."""
        department_name = None
        if payload.department_id is not None:
            dept = self.db.query(Department).filter(Department.id == payload.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy phòng ban có ID {payload.department_id}.",
                )
            department_name = dept.name

        program_name = None
        if payload.program_id is not None:
            prog = (
                self.db.query(InternshipProgram)
                .filter(InternshipProgram.id == payload.program_id, InternshipProgram.deleted_at.is_(None))
                .first()
            )
            if not prog:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy kỳ thực tập có ID {payload.program_id}.",
                )
            program_name = prog.name

        if payload.code:
            existing_code = (
                self.db.query(InternshipGroup)
                .filter(InternshipGroup.code == payload.code)
                .first()
            )
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã nhóm '{payload.code}' đã tồn tại trong hệ thống.",
                )

        leader_name = None
        if payload.leader_user_id is not None:
            leader_u = self.db.query(User).filter(User.id == payload.leader_user_id).first()
            if leader_u:
                leader_name = leader_u.full_name

        group = InternshipGroup(
            name=payload.name,
            code=payload.code,
            department_id=payload.department_id,
            program_id=payload.program_id,
            leader_user_id=payload.leader_user_id,
            description=payload.description,
            max_members=payload.max_members,
            status="active",
        )
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)

        return InternshipGroupResponse(
            id=group.id,
            name=group.name,
            code=group.code,
            department_id=group.department_id,
            department_name=department_name,
            program_id=group.program_id,
            program_name=program_name,
            leader_user_id=group.leader_user_id,
            leader_name=leader_name,
            description=group.description,
            max_members=group.max_members,
            current_members_count=0,
            status=group.status,
            created_at=group.created_at,
            updated_at=group.updated_at,
            members=[],
        )

    def list_groups(
        self,
        department_id: int | None = None,
        program_id: int | None = None,
        leader_user_id: int | None = None,
        status_filter: str | None = None,
    ) -> list[InternshipGroupResponse]:
        """Lấy danh sách nhóm thực tập theo bộ lọc phòng ban, chương trình, trạng thái, mentor."""
        query = self.db.query(InternshipGroup).options(
            joinedload(InternshipGroup.department),
            joinedload(InternshipGroup.program),
            joinedload(InternshipGroup.leader),
            joinedload(InternshipGroup.memberships),
        )

        if department_id is not None:
            query = query.filter(InternshipGroup.department_id == department_id)
        if program_id is not None:
            query = query.filter(InternshipGroup.program_id == program_id)
        if leader_user_id is not None:
            query = query.filter(InternshipGroup.leader_user_id == leader_user_id)
        if status_filter:
            query = query.filter(InternshipGroup.status == status_filter)

        groups = query.order_by(InternshipGroup.id.desc()).all()

        results: list[InternshipGroupResponse] = []
        for g in groups:
            active_count = sum(1 for m in g.memberships if m.status == "active")
            results.append(
                InternshipGroupResponse(
                    id=g.id,
                    name=g.name,
                    code=g.code,
                    department_id=g.department_id,
                    department_name=g.department.name if g.department else None,
                    program_id=g.program_id,
                    program_name=g.program.name if g.program else None,
                    leader_user_id=g.leader_user_id,
                    leader_name=g.leader.full_name if g.leader else None,
                    description=g.description,
                    max_members=g.max_members,
                    current_members_count=active_count,
                    status=g.status,
                    created_at=g.created_at,
                    updated_at=g.updated_at,
                )
            )
        return results

    def get_group_detail(self, group_id: int) -> InternshipGroupResponse:
        """Lấy chi tiết một nhóm thực tập kèm danh sách thành viên thực tập sinh."""
        group = (
            self.db.query(InternshipGroup)
            .options(
                joinedload(InternshipGroup.department),
                joinedload(InternshipGroup.program),
                joinedload(InternshipGroup.leader),
                joinedload(InternshipGroup.memberships)
                .joinedload(InternProfileGroup.intern_profile)
                .joinedload(InternProfile.user),
            )
            .filter(InternshipGroup.id == group_id)
            .first()
        )
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhóm thực tập có ID {group_id}.",
            )

        members_list: list[InternGroupMemberItem] = []
        for m in group.memberships:
            if m.status == "active" and m.intern_profile and m.intern_profile.user:
                u = m.intern_profile.user
                prof = m.intern_profile
                members_list.append(
                    InternGroupMemberItem(
                        intern_profile_id=prof.id,
                        user_id=u.id,
                        full_name=u.full_name,
                        email=u.email,
                        code=u.code,
                        university=prof.university,
                        major=prof.major,
                        role=m.role,
                        status=m.status,
                        assigned_at=m.assigned_at,
                    )
                )

        return InternshipGroupResponse(
            id=group.id,
            name=group.name,
            code=group.code,
            department_id=group.department_id,
            department_name=group.department.name if group.department else None,
            program_id=group.program_id,
            program_name=group.program.name if group.program else None,
            leader_user_id=group.leader_user_id,
            leader_name=group.leader.full_name if group.leader else None,
            description=group.description,
            max_members=group.max_members,
            current_members_count=len(members_list),
            status=group.status,
            created_at=group.created_at,
            updated_at=group.updated_at,
            members=members_list,
        )

    def update_group(self, group_id: int, payload: InternshipGroupUpdate) -> InternshipGroupResponse:
        """Cập nhật thông tin nhóm thực tập."""
        group = self.db.query(InternshipGroup).filter(InternshipGroup.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhóm thực tập có ID {group_id}.",
            )

        if payload.name is not None:
            group.name = payload.name
        if payload.code is not None:
            existing = (
                self.db.query(InternshipGroup)
                .filter(InternshipGroup.code == payload.code, InternshipGroup.id != group_id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã nhóm '{payload.code}' đã được sử dụng.",
                )
            group.code = payload.code
        if payload.department_id is not None:
            dept = self.db.query(Department).filter(Department.id == payload.department_id).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban.")
            group.department_id = payload.department_id
        if payload.program_id is not None:
            prog = self.db.query(InternshipProgram).filter(InternshipProgram.id == payload.program_id).first()
            if not prog:
                raise HTTPException(status_code=404, detail="Không tìm thấy kỳ thực tập.")
            group.program_id = payload.program_id
        if payload.description is not None:
            group.description = payload.description
        if payload.max_members is not None:
            group.max_members = payload.max_members
        if payload.status is not None:
            group.status = payload.status

        self.db.commit()
        return self.get_group_detail(group.id)

    def _resolve_intern_profiles(
        self,
        intern_profile_ids: list[int] | None = None,
        intern_ids: list[int] | None = None,
    ) -> list[InternProfile]:
        """Tìm và xác thực danh sách hồ sơ InternProfile từ intern_profile_ids hoặc intern_ids (user_id)."""
        profiles_to_assign: dict[int, InternProfile] = {}

        if intern_profile_ids:
            found_profiles = (
                self.db.query(InternProfile)
                .filter(InternProfile.id.in_(intern_profile_ids))
                .all()
            )
            for p in found_profiles:
                profiles_to_assign[p.id] = p
            found_p_ids = {p.id for p in found_profiles}
            for pid in intern_profile_ids:
                if pid not in found_p_ids:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Không tìm thấy hồ sơ thực tập sinh có InternProfile ID {pid}.",
                    )

        if intern_ids:
            for uid in intern_ids:
                prof = self.db.query(InternProfile).filter(InternProfile.user_id == uid).first()
                if not prof:
                    user = self.db.query(User).filter(User.id == uid).first()
                    if not user:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Không tìm thấy người dùng có User ID {uid}.",
                        )
                    # Tạo InternProfile tự động nếu chưa có
                    prof = InternProfile(user_id=user.id, status="approved")
                    self.db.add(prof)
                    self.db.flush()
                profiles_to_assign[prof.id] = prof

        if not profiles_to_assign:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng cung cấp ít nhất một thực tập sinh (intern_profile_ids hoặc intern_ids).",
            )

        return list(profiles_to_assign.values())

    def assign_interns_to_group(
        self,
        group_id: int,
        payload: AssignInternsToGroupRequest,
        assigned_by: int | None = None,
    ) -> AssignInternsToGroupResponse:
        """Phân công một hoặc nhiều thực tập sinh vào nhóm thực tập (quan hệ n-n).

        Tự động đồng bộ liên kết phòng ban tương ứng của nhóm cho TTS.
        """
        group = self.db.query(InternshipGroup).filter(InternshipGroup.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy nhóm thực tập có ID {group_id}.",
            )
        if group.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nhóm thực tập đã đóng, không thể phân công thêm thực tập sinh.",
            )

        profiles = self._resolve_intern_profiles(
            intern_profile_ids=payload.intern_profile_ids,
            intern_ids=payload.intern_ids,
        )

        current_active_count = (
            self.db.query(InternProfileGroup)
            .filter(InternProfileGroup.group_id == group_id, InternProfileGroup.status == "active")
            .count()
        )

        assigned_profile_ids: list[int] = []

        for prof in profiles:
            membership = (
                self.db.query(InternProfileGroup)
                .filter(
                    InternProfileGroup.group_id == group_id,
                    InternProfileGroup.intern_profile_id == prof.id,
                )
                .first()
            )
            if membership:
                membership.role = payload.role
                membership.status = "active"
                if assigned_by:
                    membership.assigned_by = assigned_by
            else:
                if current_active_count >= group.max_members:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Nhóm '{group.name}' đã đạt số lượng tối đa ({group.max_members} TTS).",
                    )
                new_membership = InternProfileGroup(
                    intern_profile_id=prof.id,
                    group_id=group.id,
                    role=payload.role,
                    status="active",
                    assigned_by=assigned_by,
                )
                self.db.add(new_membership)
                current_active_count += 1

            # Deactivate other active group memberships for this intern profile
            old_group_memberships = (
                self.db.query(InternProfileGroup)
                .filter(
                    InternProfileGroup.intern_profile_id == prof.id,
                    InternProfileGroup.group_id != group_id,
                    InternProfileGroup.status == "active",
                )
                .all()
            )
            for old_gm in old_group_memberships:
                old_gm.status = "inactive"

            assigned_profile_ids.append(prof.id)

            # Đồng bộ liên kết phòng ban nếu nhóm thuộc phòng ban
            if group.department_id is not None:
                dept_membership = (
                    self.db.query(InternProfileDepartment)
                    .filter(
                        InternProfileDepartment.department_id == group.department_id,
                        InternProfileDepartment.intern_profile_id == prof.id,
                    )
                    .first()
                )
                if not dept_membership:
                    self.db.add(
                        InternProfileDepartment(
                            intern_profile_id=prof.id,
                            department_id=group.department_id,
                            assigned_by=assigned_by,
                        )
                    )

            # Đồng bộ liên kết Mentor nếu nhóm có chỉ định Mentor phụ trách
            if group.leader_user_id:
                prof.mentor_id = group.leader_user_id
                if group.program_id:
                    pm_rec = (
                        self.db.query(ProgramMember)
                        .filter(
                            ProgramMember.program_id == group.program_id,
                            ProgramMember.intern_user_id == prof.user_id,
                        )
                        .first()
                    )
                    if pm_rec:
                        pm_rec.mentor_user_id = group.leader_user_id
                    else:
                        self.db.add(
                            ProgramMember(
                                program_id=group.program_id,
                                intern_user_id=prof.user_id,
                                mentor_user_id=group.leader_user_id,
                                status="active",
                            )
                        )

                from app.models.mentor_intern import MentorIntern
                mi_rec = (
                    self.db.query(MentorIntern)
                    .filter(
                        MentorIntern.mentor_id == group.leader_user_id,
                        MentorIntern.intern_id == prof.user_id,
                    )
                    .first()
                )
                if not mi_rec:
                    self.db.add(MentorIntern(mentor_id=group.leader_user_id, intern_id=prof.user_id))

            # Xóa cache cổng TTS để hiển thị tức thì
            from app.services.intern_group_service import InternGroupService
            InternGroupService.invalidate_cache(prof.user_id)

        self.db.commit()

        dept = self.db.query(Department).filter(Department.id == group.department_id).first() if group.department_id else None

        return AssignInternsToGroupResponse(
            success=True,
            group_id=group.id,
            group_name=group.name,
            department_id=group.department_id,
            department_name=dept.name if dept else None,
            assigned_count=len(assigned_profile_ids),
            assigned_intern_profile_ids=assigned_profile_ids,
            message=f"Đã phân công thành công {len(assigned_profile_ids)} TTS vào nhóm '{group.name}'.",
        )

    def remove_intern_from_group(self, group_id: int, intern_profile_id: int) -> dict:
        """Xoá thực tập sinh khỏi nhóm thực tập."""
        membership = (
            self.db.query(InternProfileGroup)
            .filter(
                InternProfileGroup.group_id == group_id,
                InternProfileGroup.intern_profile_id == intern_profile_id,
            )
            .first()
        )
        if not membership:
            # Hỗ trợ trường hợp truyền intern_profile_id là user_id của TTS
            prof_by_user = self.db.query(InternProfile).filter(InternProfile.user_id == intern_profile_id).first()
            if prof_by_user:
                membership = (
                    self.db.query(InternProfileGroup)
                    .filter(
                        InternProfileGroup.group_id == group_id,
                        InternProfileGroup.intern_profile_id == prof_by_user.id,
                    )
                    .first()
                )

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thực tập sinh ({intern_profile_id}) không có trong nhóm ID {group_id}.",
            )

        prof = self.db.query(InternProfile).filter(InternProfile.id == membership.intern_profile_id).first()
        user_id = prof.user_id if prof else None

        self.db.delete(membership)
        self.db.commit()

        if user_id:
            from app.services.intern_group_service import InternGroupService
            InternGroupService.invalidate_cache(user_id)

        return {
            "success": True,
            "message": f"Đã xoá thực tập sinh khỏi nhóm thành công.",
        }

    def assign_interns_to_department(
        self,
        department_id: int,
        payload: AssignInternsToDepartmentRequest,
        assigned_by: int | None = None,
    ) -> AssignInternsToDepartmentResponse:
        """Phân công thực tập sinh trực tiếp vào phòng ban (quan hệ n-n)."""
        dept = self.db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy phòng ban có ID {department_id}.",
            )

        profiles = self._resolve_intern_profiles(
            intern_profile_ids=payload.intern_profile_ids,
            intern_ids=payload.intern_ids,
        )

        assigned_ids: list[int] = []
        for prof in profiles:
            existing = (
                self.db.query(InternProfileDepartment)
                .filter(
                    InternProfileDepartment.department_id == department_id,
                    InternProfileDepartment.intern_profile_id == prof.id,
                )
                .first()
            )
            if not existing:
                self.db.add(
                    InternProfileDepartment(
                        intern_profile_id=prof.id,
                        department_id=department_id,
                        assigned_by=assigned_by,
                    )
                )
            assigned_ids.append(prof.id)

        self.db.commit()

        return AssignInternsToDepartmentResponse(
            success=True,
            department_id=dept.id,
            department_name=dept.name,
            assigned_count=len(assigned_ids),
            assigned_intern_profile_ids=assigned_ids,
            message=f"Đã phân công thành công {len(assigned_ids)} TTS vào phòng ban '{dept.name}'.",
        )

    def get_intern_groups_departments(
        self,
        intern_profile_id: int,
    ) -> InternGroupsDepartmentsResponse:
        """Lấy danh sách các nhóm và phòng ban mà TTS đã được phân công."""
        prof = (
            self.db.query(InternProfile)
            .options(
                joinedload(InternProfile.user),
                joinedload(InternProfile.group_memberships)
                .joinedload(InternProfileGroup.group)
                .joinedload(InternshipGroup.department),
                joinedload(InternProfile.group_memberships)
                .joinedload(InternProfileGroup.group)
                .joinedload(InternshipGroup.program),
                joinedload(InternProfile.department_memberships)
                .joinedload(InternProfileDepartment.department),
            )
            .filter(InternProfile.id == intern_profile_id)
            .first()
        )
        if not prof or not prof.user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy hồ sơ thực tập sinh có ID {intern_profile_id}.",
            )

        groups_res: list[InternGroupOverviewItem] = []
        for gm in prof.group_memberships:
            g = gm.group
            if g and gm.status == "active":
                groups_res.append(
                    InternGroupOverviewItem(
                        group_id=g.id,
                        group_name=g.name,
                        group_code=g.code,
                        department_id=g.department_id,
                        department_name=g.department.name if g.department else None,
                        program_id=g.program_id,
                        program_name=g.program.name if g.program else None,
                        role=gm.role,
                        status=gm.status,
                        assigned_at=gm.assigned_at,
                    )
                )

        depts_res: list[InternDepartmentOverviewItem] = []
        for dm in prof.department_memberships:
            if dm.department:
                depts_res.append(
                    InternDepartmentOverviewItem(
                        department_id=dm.department.id,
                        department_name=dm.department.name,
                        assigned_at=dm.assigned_at,
                    )
                )

        return InternGroupsDepartmentsResponse(
            intern_profile_id=prof.id,
            user_id=prof.user.id,
            full_name=prof.user.full_name,
            email=prof.user.email,
            groups=groups_res,
            departments=depts_res,
        )
