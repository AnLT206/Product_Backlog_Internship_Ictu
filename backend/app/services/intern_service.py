from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import InternRegisterResponse
from app.schemas.intern import InternCreateRequest
from app.utils.hash_password import hash_password

TTS_ROLE_NAME = "intern"


class InternService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_intern(self, payload: InternCreateRequest) -> InternRegisterResponse:
        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        intern_role = self.db.query(Role).filter(Role.name == TTS_ROLE_NAME).first()
        if intern_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Role 'intern' chưa được seed. Hãy seed role này trước khi tạo TTS.",
            )

        try:
            user = User(
                email=payload.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                role_id=intern_role.id,
                status=payload.status,
            )
            self.db.add(user)
            self.db.flush()

            profile = InternProfile(
                user_id=user.id,
                phone_number=payload.phone_number,
                dob=payload.dob,
                gender=payload.gender or "other",
                university=payload.university or "",
                major=payload.major or "",
                academic_year=payload.academic_year,
                gpa=payload.gpa,
                address=payload.address,
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo hồ sơ thực tập sinh.",
            ) from None

        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=user.status,
            phone_number=profile.phone_number,
        )

    def approve(self, intern_id: int) -> InternRegisterResponse:
        user = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == intern_id, Role.name == "intern")
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hồ sơ thực tập sinh.",
            )
        if user.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Chỉ hồ sơ đang chờ duyệt mới được duyệt.",
            )

        user.status = "active"
        self.db.commit()
        self.db.refresh(user)
        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=user.status,
            phone_number=user.intern_profile.phone_number
            if user.intern_profile
            else None,
        )
