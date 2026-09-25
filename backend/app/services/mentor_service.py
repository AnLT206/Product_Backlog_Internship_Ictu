from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.mentor import MentorCreateRequest, MentorResponse, MentorUpdateRequest
from app.utils.hash_password import hash_password

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