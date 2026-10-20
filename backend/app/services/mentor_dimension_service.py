"""Service xử lý nghiệp vụ Phân công Mentor theo Khối / Lớp / Khóa / Ban (1-N và N-N)."""

from __future__ import annotations

from collections import defaultdict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_group import InternProfileDepartment
from app.models.mentor_intern import MentorIntern
from app.models.role import Role
from app.models.user import User
from app.schemas.mentor_dimension_assignment import (
    AssignMentorRoleResult,
    BatchAssignByDimensionRequest,
    DimensionInternsResponse,
    DimensionItemSummary,
    DimensionsSummaryResponse,
    InternWithMentorsItem,
    MatrixAssignRequest,
    MentorAssignmentItem,
    UnassignMentorRoleRequest,
)

TTS_ROLE_NAME = "intern"
MENTOR_ROLE_NAME = "mentor"


class MentorDimensionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_dimensions_summary(self) -> DimensionsSummaryResponse:
        """Tổng hợp thống kê số lượng TTS và trạng thái phân công theo 4 chiều: Khối, Lớp, Khóa, Ban."""
        # Lấy tất cả user TTS kèm profile và phòng ban
        intern_users = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .outerjoin(InternProfile, User.id == InternProfile.user_id)
            .options(
                joinedload(User.intern_profile).joinedload(InternProfile.departments)
            )
            .filter(Role.name == TTS_ROLE_NAME)
            .all()
        )

        total_interns = len(intern_users)
        if total_interns == 0:
            return DimensionsSummaryResponse(
                majors=[], classes=[], intakes=[], departments=[],
                total_interns=0, total_assigned=0, total_unassigned=0
            )

        # Lấy tất cả bản ghi mentor_interns hiện có
        all_mi = self.db.query(MentorIntern).all()
        intern_mentors_map = defaultdict(set)
        for mi in all_mi:
            intern_mentors_map[mi.intern_id].add(mi.mentor_id)

        # Gom nhóm theo từng chiều
        majors_map = defaultdict(lambda: {"intern_ids": set(), "mentors": set()})
        classes_map = defaultdict(lambda: {"intern_ids": set(), "mentors": set()})
        intakes_map = defaultdict(lambda: {"intern_ids": set(), "mentors": set()})
        depts_map = defaultdict(lambda: {"intern_ids": set(), "mentors": set()})

        assigned_intern_ids = set()

        for u in intern_users:
            p = u.intern_profile
            u_mentors = set(intern_mentors_map.get(u.id, set()))
            if p and p.mentor_id:
                u_mentors.add(p.mentor_id)

            if len(u_mentors) > 0:
                assigned_intern_ids.add(u.id)

            # 1. Khối (Major)
            major_val = (p.major.strip() if p and p.major else "") or "Chưa phân khối"
            majors_map[major_val]["intern_ids"].add(u.id)
            majors_map[major_val]["mentors"].update(u_mentors)

            # 2. Lớp (Class)
            class_val = (p.class_name.strip() if p and p.class_name else "") or "Chưa phân lớp"
            classes_map[class_val]["intern_ids"].add(u.id)
            classes_map[class_val]["mentors"].update(u_mentors)

            # 3. Khóa (Intake / Academic Year)
            intake_val = (p.academic_year.strip() if p and p.academic_year else "") or "Chưa phân khóa"
            intakes_map[intake_val]["intern_ids"].add(u.id)
            intakes_map[intake_val]["mentors"].update(u_mentors)

            # 4. Ban (Department)
            if p and p.departments:
                for dept in p.departments:
                    depts_map[dept.name]["intern_ids"].add(u.id)
                    depts_map[dept.name]["mentors"].update(u_mentors)
            else:
                depts_map["Chưa phân ban"]["intern_ids"].add(u.id)
                depts_map["Chưa phân ban"]["mentors"].update(u_mentors)

        def build_summaries(dim_type: str, mapping: dict) -> list[DimensionItemSummary]:
            result = []
            for val, data in sorted(mapping.items(), key=lambda x: (-len(x[1]["intern_ids"]), x[0])):
                tot = len(data["intern_ids"])
                asg = len(data["intern_ids"].intersection(assigned_intern_ids))
                result.append(
                    DimensionItemSummary(
                        dimension_type=dim_type,
                        value=val,
                        total_interns=tot,
                        assigned_interns=asg,
                        unassigned_interns=tot - asg,
                        mentor_count=len(data["mentors"]),
                    )
                )
            return result

        total_asg = len(assigned_intern_ids)
        return DimensionsSummaryResponse(
            majors=build_summaries("major", majors_map),
            classes=build_summaries("class", classes_map),
            intakes=build_summaries("intake", intakes_map),
            departments=build_summaries("department", depts_map),
            total_interns=total_interns,
            total_assigned=total_asg,
            total_unassigned=total_interns - total_asg,
        )

    def get_interns_by_dimension(
        self, dimension_type: str, dimension_value: str
    ) -> DimensionInternsResponse:
        """Lấy danh sách chi tiết TTS kèm các Mentor đang phụ trách theo Khối/Lớp/Khóa/Ban."""
        dim_type = dimension_type.lower().strip()
        dim_val = dimension_value.strip()

        query = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .outerjoin(InternProfile, User.id == InternProfile.user_id)
            .options(
                joinedload(User.intern_profile).joinedload(InternProfile.departments),
                joinedload(User.intern_profile).joinedload(InternProfile.mentor),
            )
            .filter(Role.name == TTS_ROLE_NAME)
        )

        if dim_type == "major":
            if dim_val == "Chưa phân khối":
                query = query.filter((InternProfile.major == None) | (InternProfile.major == ""))
            else:
                query = query.filter(InternProfile.major == dim_val)
        elif dim_type == "class":
            if dim_val == "Chưa phân lớp":
                query = query.filter((InternProfile.class_name == None) | (InternProfile.class_name == ""))
            else:
                query = query.filter(InternProfile.class_name == dim_val)
        elif dim_type == "intake":
            if dim_val == "Chưa phân khóa":
                query = query.filter((InternProfile.academic_year == None) | (InternProfile.academic_year == ""))
            else:
                query = query.filter(InternProfile.academic_year == dim_val)
        elif dim_type == "department":
            if dim_val == "Chưa phân ban":
                query = query.filter(~InternProfile.departments.any())
            else:
                query = query.filter(InternProfile.departments.any(Department.name == dim_val))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Loại tiêu chí '{dimension_type}' không hợp lệ. Hỗ trợ: major, class, intake, department.",
            )

        intern_users = query.all()
        if not intern_users:
            return DimensionInternsResponse(
                dimension_type=dimension_type,
                dimension_value=dimension_value,
                total=0,
                interns=[],
            )

        intern_ids = [u.id for u in intern_users]
        mentor_intern_records = (
            self.db.query(MentorIntern)
            .options(joinedload(MentorIntern.mentor))
            .filter(MentorIntern.intern_id.in_(intern_ids))
            .all()
        )

        mi_by_intern = defaultdict(list)
        for mi in mentor_intern_records:
            if mi.mentor:
                mi_by_intern[mi.intern_id].append(
                    MentorAssignmentItem(
                        id=mi.id,
                        mentor_id=mi.mentor_id,
                        mentor_name=mi.mentor.full_name or mi.mentor.email,
                        mentor_email=mi.mentor.email,
                        role_type=mi.role_type,
                        dimension_type=mi.dimension_type,
                        dimension_value=mi.dimension_value,
                        assigned_at=mi.assigned_at,
                    )
                )

        intern_items = []
        for u in intern_users:
            p = u.intern_profile
            dept_names = [d.name for d in p.departments] if (p and p.departments) else []
            primary_id = p.mentor_id if p else None
            primary_name = p.mentor.full_name if (p and p.mentor) else None

            intern_items.append(
                InternWithMentorsItem(
                    id=u.id,
                    code=u.code,
                    full_name=u.full_name,
                    email=u.email,
                    major=p.major if p else None,
                    class_name=p.class_name if p else None,
                    academic_year=p.academic_year if p else None,
                    departments=dept_names,
                    primary_mentor_id=primary_id,
                    primary_mentor_name=primary_name,
                    mentors=mi_by_intern.get(u.id, []),
                )
            )

        return DimensionInternsResponse(
            dimension_type=dimension_type,
            dimension_value=dimension_value,
            total=len(intern_items),
            interns=intern_items,
        )

    def batch_assign_by_dimension(
        self, payload: BatchAssignByDimensionRequest, assigned_by_id: int
    ) -> AssignMentorRoleResult:
        """Phân công 1 hoặc nhiều Mentor (1-N hoặc N-N) cho nhóm TTS theo Khối/Lớp/Khóa/Ban."""
        # 1. Xác thực danh sách Mentors
        unique_mentor_ids = list(dict.fromkeys(payload.mentor_ids))
        mentors = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id.in_(unique_mentor_ids), Role.name == MENTOR_ROLE_NAME)
            .all()
        )
        found_mentor_ids = {m.id for m in mentors}
        for m_id in unique_mentor_ids:
            if m_id not in found_mentor_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy Mentor với ID {m_id}.",
                )

        # 2. Lấy danh sách TTS thuộc tiêu chí
        dim_resp = self.get_interns_by_dimension(payload.dimension_type, payload.dimension_value)
        if dim_resp.total == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy thực tập sinh nào thuộc tiêu chí {payload.dimension_type} = '{payload.dimension_value}'.",
            )

        target_ids = {it.id for it in dim_resp.interns}
        if payload.target_intern_ids:
            target_ids = target_ids.intersection(set(payload.target_intern_ids))
            if not target_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không có thực tập sinh nào phù hợp trong danh sách được chỉ định.",
                )

        assigned_count = 0
        affected_interns = len(target_ids)

        for i_id in target_ids:
            # Nếu chế độ là replace: xóa bỏ các mentor cùng role_type của intern này
            if payload.assignment_mode == "replace":
                self.db.query(MentorIntern).filter(
                    MentorIntern.intern_id == i_id,
                    MentorIntern.role_type == payload.role_type,
                ).delete(synchronize_session=False)

            # Gán từng mentor
            for m_id in unique_mentor_ids:
                existing = (
                    self.db.query(MentorIntern)
                    .filter(
                        MentorIntern.mentor_id == m_id,
                        MentorIntern.intern_id == i_id,
                        MentorIntern.role_type == payload.role_type,
                    )
                    .first()
                )
                if not existing:
                    new_mi = MentorIntern(
                        mentor_id=m_id,
                        intern_id=i_id,
                        role_type=payload.role_type,
                        dimension_type=payload.dimension_type,
                        dimension_value=payload.dimension_value,
                        assigned_by_id=assigned_by_id,
                    )
                    self.db.add(new_mi)
                    assigned_count += 1
                else:
                    existing.dimension_type = payload.dimension_type
                    existing.dimension_value = payload.dimension_value
                    existing.assigned_by_id = assigned_by_id

            # Đồng bộ mentor chính vào intern_profile.mentor_id nếu role_type == primary
            if payload.role_type == "primary" and len(unique_mentor_ids) > 0:
                p = self.db.query(InternProfile).filter(InternProfile.user_id == i_id).first()
                if p:
                    p.mentor_id = unique_mentor_ids[0]

        self.db.commit()

        role_labels = {
            "primary": "Mentor chính",
            "technical": "Mentor kỹ thuật",
            "co_mentor": "Mentor đồng hành",
            "advisor": "Cố vấn chuyên môn",
        }
        role_label = role_labels.get(payload.role_type, payload.role_type)

        return AssignMentorRoleResult(
            success=True,
            message=f"Đã phân công {len(unique_mentor_ids)} Mentor (vai trò {role_label}) cho {affected_interns} thực tập sinh thuộc {payload.dimension_type} '{payload.dimension_value}'.",
            assigned_count=assigned_count,
            affected_interns=affected_interns,
        )

    def matrix_assign(
        self, payload: MatrixAssignRequest, assigned_by_id: int
    ) -> AssignMentorRoleResult:
        """Phân công ma trận nhiều Mentor cho nhiều TTS (N-N linh hoạt)."""
        unique_mentor_ids = list(dict.fromkeys(payload.mentor_ids))
        unique_intern_ids = list(dict.fromkeys(payload.intern_ids))

        mentors = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id.in_(unique_mentor_ids), Role.name == MENTOR_ROLE_NAME)
            .all()
        )
        if len(mentors) != len(unique_mentor_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Một hoặc nhiều Mentor trong danh sách không tồn tại.",
            )

        interns = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id.in_(unique_intern_ids), Role.name == TTS_ROLE_NAME)
            .all()
        )
        if len(interns) != len(unique_intern_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Một hoặc nhiều Thực tập sinh trong danh sách không tồn tại.",
            )

        assigned_count = 0
        for i_id in unique_intern_ids:
            if payload.assignment_mode == "replace":
                self.db.query(MentorIntern).filter(
                    MentorIntern.intern_id == i_id,
                    MentorIntern.role_type == payload.role_type,
                ).delete(synchronize_session=False)

            for m_id in unique_mentor_ids:
                existing = (
                    self.db.query(MentorIntern)
                    .filter(
                        MentorIntern.mentor_id == m_id,
                        MentorIntern.intern_id == i_id,
                        MentorIntern.role_type == payload.role_type,
                    )
                    .first()
                )
                if not existing:
                    self.db.add(
                        MentorIntern(
                            mentor_id=m_id,
                            intern_id=i_id,
                            role_type=payload.role_type,
                            dimension_type="direct",
                            dimension_value=None,
                            assigned_by_id=assigned_by_id,
                        )
                    )
                    assigned_count += 1

            if payload.role_type == "primary" and len(unique_mentor_ids) > 0:
                p = self.db.query(InternProfile).filter(InternProfile.user_id == i_id).first()
                if p:
                    p.mentor_id = unique_mentor_ids[0]

        self.db.commit()

        return AssignMentorRoleResult(
            success=True,
            message=f"Đã gán {len(unique_mentor_ids)} Mentor cho {len(unique_intern_ids)} thực tập sinh.",
            assigned_count=assigned_count,
            affected_interns=len(unique_intern_ids),
        )

    def unassign_mentor_role(self, payload: UnassignMentorRoleRequest) -> dict:
        """Hủy phân công của một Mentor khỏi TTS theo vai trò."""
        query = self.db.query(MentorIntern).filter(
            MentorIntern.mentor_id == payload.mentor_id,
            MentorIntern.intern_id == payload.intern_id,
        )
        if payload.role_type:
            query = query.filter(MentorIntern.role_type == payload.role_type)

        deleted = query.delete(synchronize_session=False)

        # Kiểm tra xem có cần cập nhật lại intern_profile.mentor_id hay không
        p = self.db.query(InternProfile).filter(InternProfile.user_id == payload.intern_id).first()
        if p and p.mentor_id == payload.mentor_id:
            # Tìm mentor primary khác nếu có
            other_primary = (
                self.db.query(MentorIntern)
                .filter(
                    MentorIntern.intern_id == payload.intern_id,
                    MentorIntern.role_type == "primary",
                )
                .first()
            )
            p.mentor_id = other_primary.mentor_id if other_primary else None

        self.db.commit()
        return {
            "success": True,
            "message": f"Đã hủy {deleted} vai trò phân công của Mentor khỏi thực tập sinh.",
            "deleted_count": deleted,
        }
