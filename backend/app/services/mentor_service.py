from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.mentor import MentorCreateRequest, MentorResponse
from app.utils.hash_password import hash_password

MENTOR_ROLE_NAME = "mentor"


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

    def create_mentor(self, payload: MentorCreateRequest) -> MentorResponse:
        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
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
                email=payload.email,
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