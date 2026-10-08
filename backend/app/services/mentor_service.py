from fastapi import HTTPException, status
from sqlalchemy import and_, case, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, aliased

from app.models.department import Department
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.mentor import (
    MentorCreateRequest,
    MentorResponse,
    MentorUpdateRequest,
    MentorWorkloadResponse,
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
            self.db.query(User, UserProfile)
            .join(Role, User.role_id == Role.id)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .filter(Role.name == MENTOR_ROLE_NAME)
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
            )
            for user, profile in mentor_rows
        ]

    def get_workload(self) -> list[MentorWorkloadResponse]:
        mentor_user = aliased(User)
        mentor_role = aliased(Role)
        intern_user = aliased(User)
        intern_role = aliased(Role)

        assigned_programs = (
            self.db.query(
                ProgramMember.mentor_user_id.label("mentor_id"),
                ProgramMember.program_id.label("program_id"),
            )
            .join(InternshipProgram, ProgramMember.program_id == InternshipProgram.id)
            .filter(
                ProgramMember.mentor_user_id.is_not(None),
                InternshipProgram.is_deleted.is_(False),
            )
            .group_by(ProgramMember.mentor_user_id, ProgramMember.program_id)
            .subquery()
        )

        rows = (
            self.db.query(
                mentor_user.id.label("mentor_id"),
                mentor_user.full_name.label("mentor_name"),
                InternshipProgram.id.label("program_id"),
                InternshipProgram.name.label("program_name"),
                func.count(
                    func.distinct(
                        case(
                            (intern_role.id.is_not(None), intern_user.id),
                        )
                    )
                ).label("active_intern_count"),
                InternshipProgram.max_interns.label("quota"),
            )
            .join(mentor_role, mentor_user.role_id == mentor_role.id)
            .outerjoin(assigned_programs, assigned_programs.c.mentor_id == mentor_user.id)
            .outerjoin(
                InternshipProgram,
                InternshipProgram.id == assigned_programs.c.program_id,
            )
            .outerjoin(
                ProgramMember,
                and_(
                    ProgramMember.mentor_user_id == mentor_user.id,
                    ProgramMember.program_id == assigned_programs.c.program_id,
                ),
            )
            .outerjoin(
                intern_user,
                and_(
                    intern_user.id == ProgramMember.intern_user_id,
                    intern_user.status == "active",
                ),
            )
            .outerjoin(
                intern_role,
                and_(
                    intern_role.id == intern_user.role_id,
                    intern_role.name == "intern",
                ),
            )
            .filter(mentor_role.name == MENTOR_ROLE_NAME)
            .group_by(
                mentor_user.id,
                mentor_user.full_name,
                InternshipProgram.id,
                InternshipProgram.name,
                InternshipProgram.max_interns,
            )
            .order_by(mentor_user.id, InternshipProgram.id)
            .all()
        )

        return [
            MentorWorkloadResponse(
                mentor_id=row.mentor_id,
                mentor_name=row.mentor_name,
                program_id=row.program_id,
                program_name=row.program_name,
                active_intern_count=row.active_intern_count,
                quota=row.quota,
            )
            for row in rows
        ]

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