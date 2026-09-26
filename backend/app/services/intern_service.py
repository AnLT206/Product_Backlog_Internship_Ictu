from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import InternRegisterResponse
from app.schemas.intern import (
    InternCreateRequest,
    InternProfileStatusResponse,
)
from app.services.email_service import EmailService
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

    def approve(
        self, intern_id: int, background_tasks: BackgroundTasks
    ) -> InternRegisterResponse:
        user, profile = self._get_pending_intern(intern_id)
        try:
            profile.status = "approved"
            user.status = "active"
            self.db.commit()
            self.db.refresh(user)
            EmailService.enqueue_email(
                background_tasks,
                user.email,
                "Hồ sơ thực tập sinh đã được duyệt",
                (
                    f"Xin chào {user.full_name or 'bạn'},\n\n"
                    "Hồ sơ thực tập sinh của bạn đã được duyệt. "
                    "Bạn có thể dùng email và mật khẩu đã đăng ký để đăng nhập hệ thống."
                ),
            )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể duyệt hồ sơ thực tập sinh.",
            ) from None
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

    def update_profile_status(
        self,
        intern_id: int,
        profile_status: str,
        background_tasks: BackgroundTasks,
    ) -> InternProfileStatusResponse:
        user, profile = self._get_pending_intern(intern_id)
        try:
            profile.status = profile_status
            user.status = "active" if profile_status == "approved" else "inactive"
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
            if profile_status == "approved":
                EmailService.enqueue_email(
                    background_tasks,
                    user.email,
                    "Hồ sơ thực tập sinh đã được duyệt",
                    (
                        f"Xin chào {user.full_name or 'bạn'},\n\n"
                        "Hồ sơ thực tập sinh của bạn đã được duyệt. "
                        "Bạn có thể dùng email và mật khẩu đã đăng ký để đăng nhập hệ thống."
                    ),
                )
            else:
                EmailService.enqueue_email(
                    background_tasks,
                    user.email,
                    "Thông báo kết quả hồ sơ thực tập sinh",
                    (
                        f"Xin chào {user.full_name or 'bạn'},\n\n"
                        "Hồ sơ thực tập sinh của bạn hiện chưa được chấp nhận."
                    ),
                )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật trạng thái hồ sơ thực tập sinh.",
            ) from None

        return InternProfileStatusResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            profile_status=profile.status,
            account_status=user.status,
        )

    def _get_pending_intern(self, intern_id: int) -> tuple[User, InternProfile]:
        try:
            user = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == intern_id, Role.name == TTS_ROLE_NAME)
                .first()
            )
            if user is None or user.intern_profile is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy hồ sơ thực tập sinh.",
                )
            if user.intern_profile.status != "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Chỉ hồ sơ đang chờ duyệt mới được cập nhật.",
                )
            return user, user.intern_profile
        except HTTPException:
            raise
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể truy vấn hồ sơ thực tập sinh.",
            ) from None
