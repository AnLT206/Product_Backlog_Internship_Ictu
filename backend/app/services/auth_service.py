"""Đăng ký chỉ dành cho TTS (role=intern). HR / mentor / admin không dùng endpoint này."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import (
    InternRegisterRequest,
    InternRegisterResponse,
    LoginRequest,
    LoginResponse,
    LoginUserResponse,
)
from app.utils.authenticate_login import authenticate_login
from app.utils.hash_password import hash_password

TTS_ROLE_NAME = "intern"


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_tts_role(self) -> Role:
        """Chỉ lấy role intern — không tạo HR/mentor/admin tại đây."""
        role = self.db.query(Role).filter(Role.name == TTS_ROLE_NAME).first()
        if role is not None:
            return role

        # Seed tối thiểu role TTS nếu DB chưa có (schema/migrate chưa chạy)
        role = Role(name=TTS_ROLE_NAME, description="Thực tập sinh")
        self.db.add(role)
        self.db.flush()
        return role

    def register_intern(self, payload: InternRegisterRequest) -> InternRegisterResponse:
        """Đăng ký tài khoản thực tập sinh (TTS). Luôn gắn role=intern, status=pending."""
        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        tts_role = self._get_tts_role()

        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role_id=tts_role.id,
            status="pending",
        )
        self.db.add(user)
        self.db.flush()

        # Hồ sơ TTS — university/major: DB cũ có thể NOT NULL → dùng "" khi chưa gửi
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

        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=user.status,
            phone_number=profile.phone_number,
        )

    def login(self, payload: LoginRequest) -> LoginResponse:
        user = self.db.query(User).filter(User.email == payload.email).first()
        if user is None or user.status == "inactive":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = authenticate_login(
            payload.password,
            user.id,
            user.role.name,
            user.password_hash,
        )
        if access_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return LoginResponse(
            access_token=access_token,
            user=LoginUserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.name,
                status=user.status,
            ),
        )
