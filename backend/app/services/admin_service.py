"""Service xử lý nghiệp vụ Admin quản trị (SCRUM-18)."""

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.admin import AdminUserCreateRequest, AdminUserResponse
from app.utils.hash_password import hash_password
from app.utils.user_code import next_user_code


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_user(self, payload: AdminUserCreateRequest) -> AdminUserResponse:
        """Thêm mới tài khoản người dùng với vai trò bất kỳ và mã hóa mật khẩu bcrypt (SCRUM-18)."""
        # 1. Kiểm tra email đã tồn tại hay chưa
        if payload.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin không thể tạo tài khoản Quản trị viên (Admin).",
            )

        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        # 2. Lấy role từ database
        role = self.db.query(Role).filter(Role.name == payload.role).first()
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{payload.role}' không tồn tại trong hệ thống.",
            )

        try:
            # 3. Tạo user với mật khẩu băm (bcrypt)
            user = User(
                code=next_user_code(self.db, payload.role),
                email=payload.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                role_id=role.id,
                status=payload.status,
            )
            self.db.add(user)
            self.db.flush()

            # 4. Khởi tạo profile tương ứng để quan hệ 1-1 luôn sẵn sàng
            if payload.role == "intern":
                profile = InternProfile(user_id=user.id)
                self.db.add(profile)
            else:
                user_prof = UserProfile(user_id=user.id)
                self.db.add(user_prof)

            self.db.commit()
            self.db.refresh(user)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo tài khoản người dùng.",
            ) from None

        return AdminUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=role.name,
            status=user.status,
            created_at=user.created_at,
        )
