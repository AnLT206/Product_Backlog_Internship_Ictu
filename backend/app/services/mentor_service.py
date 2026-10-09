from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.mentor import (
    MentorAssignInternsRequest,
    MentorCreateRequest,
    MentorInternItemResponse,
    MentorResponse,
    MentorUpdateRequest,
)
from app.utils.hash_password import hash_password
from app.utils.user_code import next_user_code

MENTOR_ROLE_NAME = "mentor"


def _is_unique_constraint_error(error: IntegrityError) -> bool:
    message = str(error.orig).lower()
    return any(
        marker in message
        for marker in ("duplicate entry", "unique constraint", "duplicate key")
    )


class MentorService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_mentors(self) -> list[MentorResponse]:
        mentor_rows = (
            self.db.query(User, UserProfile, Department.name)
            .join(Role, User.role_id == Role.id)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .outerjoin(Department, Department.id == UserProfile.department_id)
            .filter(Role.name == MENTOR_ROLE_NAME)
            .order_by(User.id.asc())
            .all()
        )

        counts = dict(
            self.db.query(ProgramMember.mentor_user_id, func.count(ProgramMember.id))
            .filter(ProgramMember.mentor_user_id.isnot(None))
            .group_by(ProgramMember.mentor_user_id)
            .all()
        )

        return [
            MentorResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                status=user.status,
                phone_number=profile.phone_number if profile else None,
                dob=profile.dob if profile else None,
                position=profile.position if profile else None,
                department_id=profile.department_id if profile else None,
                department=dept_name or "Chưa phân bổ",
                intern_count=counts.get(user.id, 0),
            )
            for user, profile, dept_name in mentor_rows
        ]

    def get_mentor_interns(self, mentor_id: int) -> list[MentorInternItemResponse]:
        mentor = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == mentor_id, Role.name == MENTOR_ROLE_NAME)
            .first()
        )
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor không tồn tại.",
            )

        interns = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .outerjoin(InternProfile, InternProfile.user_id == User.id)
            .filter(Role.name == "intern", User.status == "active")
            .order_by(User.id.asc())
            .all()
        )

        members = (
            self.db.query(ProgramMember)
            .options(joinedload(ProgramMember.mentor))
            .all()
        )
        assignment_map = {}
        for m in members:
            if m.mentor_user_id:
                assignment_map[m.intern_user_id] = (
                    m.mentor_user_id,
                    m.mentor.full_name if m.mentor else None,
                )

        results = []
        for intern in interns:
            curr_mentor_id, curr_mentor_name = assignment_map.get(intern.id, (None, None))
            results.append(
                MentorInternItemResponse(
                    id=intern.id,
                    code=intern.code,
                    full_name=intern.full_name,
                    email=intern.email,
                    university=intern.intern_profile.university if intern.intern_profile else "ĐH CNTT & TT (ICTU)",
                    major=intern.intern_profile.major if intern.intern_profile else "Công nghệ thông tin",
                    status=intern.status,
                    current_mentor_id=curr_mentor_id,
                    current_mentor_name=curr_mentor_name,
                    is_assigned=(curr_mentor_id == mentor_id),
                    avatar=intern.intern_profile.avatar if intern.intern_profile else None,
                )
            )
        return results

    def assign_interns(self, mentor_id: int, intern_ids: list[int]) -> MentorResponse:
        mentor = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == mentor_id, Role.name == MENTOR_ROLE_NAME)
            .first()
        )
        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor không tồn tại.",
            )

        program = self.db.query(InternshipProgram).filter(InternshipProgram.status == "open").first()
        if not program:
            program = self.db.query(InternshipProgram).first()
        program_id = program.id if program else 1

        # Unassign previous mentees of this mentor if not in intern_ids
        prev_members = self.db.query(ProgramMember).filter(ProgramMember.mentor_user_id == mentor_id).all()
        for pm in prev_members:
            if pm.intern_user_id not in intern_ids:
                pm.mentor_user_id = None

        # Assign selected interns
        for i_id in intern_ids:
            member = self.db.query(ProgramMember).filter(
                ProgramMember.program_id == program_id,
                ProgramMember.intern_user_id == i_id,
            ).first()
            if member:
                if member.mentor_user_id and member.mentor_user_id != mentor_id:
                    intern_user = self.db.query(User).filter(User.id == i_id).first()
                    intern_name = intern_user.full_name if intern_user else f"ID {i_id}"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Thực tập sinh '{intern_name}' đã được phân công cho Mentor khác. Vui lòng chọn Mentor đó để hủy phân công trước.",
                    )
                member.mentor_user_id = mentor_id
            else:
                new_member = ProgramMember(
                    program_id=program_id,
                    intern_user_id=i_id,
                    mentor_user_id=mentor_id,
                )
                self.db.add(new_member)

        self.db.commit()

        profile = self.db.query(UserProfile).filter(UserProfile.user_id == mentor_id).first()
        new_count = self.db.query(ProgramMember).filter(ProgramMember.mentor_user_id == mentor_id).count()
        dept = (
            self.db.query(Department).filter(Department.id == profile.department_id).first()
            if profile and profile.department_id
            else None
        )
        return MentorResponse(
            id=mentor.id,
            email=mentor.email,
            full_name=mentor.full_name,
            status=mentor.status,
            phone_number=profile.phone_number if profile else None,
            dob=profile.dob if profile else None,
            position=profile.position if profile else None,
            department_id=profile.department_id if profile else None,
            department=dept.name if dept else "Chưa phân bổ",
            intern_count=new_count,
        )

    def create_mentor(self, payload: MentorCreateRequest) -> MentorResponse:
        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        if payload.cccd is not None:
            existing_cccd = (
                self.db.query(User).filter(User.cccd == payload.cccd).first()
            )
            if existing_cccd:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="CCCD đã được sử dụng.",
                )

        if payload.department_id is not None:
            department = (
                self.db.query(Department)
                .filter(Department.id == payload.department_id)
                .first()
            )
            if department is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Phòng ban không tồn tại.",
                )

        mentor_role = self.db.query(Role).filter(Role.name == MENTOR_ROLE_NAME).first()
        if mentor_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Role 'mentor' chưa được seed. Hãy seed role này trước khi tạo Mentor.",
            )

        try:
            user = User(
                code=next_user_code(self.db, MENTOR_ROLE_NAME),
                email=payload.email,
                cccd=payload.cccd,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                role_id=mentor_role.id,
                status="active",
            )
            self.db.add(user)
            self.db.flush()

            profile = UserProfile(
                user_id=user.id,
                department_id=payload.department_id,
                phone_number=payload.phone_number,
                dob=payload.dob,
                position=payload.position,
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
        except IntegrityError as error:
            self.db.rollback()
            if not _is_unique_constraint_error(error):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Không thể tạo tài khoản Mentor.",
                ) from None
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email hoặc CCCD đã được sử dụng.",
            ) from None
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo tài khoản Mentor.",
            ) from None

        return MentorResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            status=user.status,
            phone_number=profile.phone_number,
            dob=profile.dob,
            position=profile.position,
            department_id=profile.department_id,
        )

    def update_mentor(
        self, mentor_id: int, payload: MentorUpdateRequest
    ) -> MentorResponse:
        try:
            user = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == mentor_id, Role.name == MENTOR_ROLE_NAME)
                .first()
            )
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Mentor không tồn tại.",
                )

            profile = (
                self.db.query(UserProfile)
                .filter(UserProfile.user_id == user.id)
                .first()
            )
            if profile is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Hồ sơ Mentor không tồn tại.",
                )

            updates = payload.model_dump(exclude_unset=True)
            changed = False
            if "cccd" in updates:
                requested_cccd = updates["cccd"]
                if user.cccd is None:
                    existing_cccd = (
                        self.db.query(User)
                        .filter(User.cccd == requested_cccd, User.id != user.id)
                        .first()
                    )
                    if existing_cccd:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="CCCD đã được sử dụng bởi người dùng khác.",
                        )
                    user.cccd = requested_cccd
                    changed = True
                elif user.cccd != requested_cccd:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="CCCD đã được xác nhận và không được thay đổi.",
                    )

            if "department_id" in updates and updates["department_id"] is not None:
                department = (
                    self.db.query(Department)
                    .filter(Department.id == updates["department_id"])
                    .first()
                )
                if department is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Phòng ban không tồn tại.",
                    )

            if "full_name" in updates and user.full_name != updates["full_name"]:
                user.full_name = updates["full_name"]
                changed = True

            for field in ("phone_number", "dob", "position", "department_id"):
                if field in updates and getattr(profile, field) != updates[field]:
                    setattr(profile, field, updates[field])
                    changed = True

            if changed:
                self.db.commit()
                self.db.refresh(user)
                self.db.refresh(profile)

            return MentorResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                status=user.status,
                phone_number=profile.phone_number,
                dob=profile.dob,
                position=profile.position,
                department_id=profile.department_id,
            )
        except IntegrityError as error:
            self.db.rollback()
            if not _is_unique_constraint_error(error):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Không thể cập nhật hồ sơ Mentor.",
                ) from None
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CCCD đã được sử dụng bởi người dùng khác.",
            ) from None
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật hồ sơ Mentor.",
            ) from None