"""Service quản lý người dùng cho admin."""

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.models.role import Role
from app.models.user import User
from app.schemas.admin_user import (
    AdminManagedRole,
    AdminUserCreateRequest,
    AdminUserListResponse,
    AdminUserResponse,
)
from app.utils.hash_password import hash_password
from app.utils.user_code import next_user_code

MANAGED_ROLES = frozenset({"hr", "mentor", "intern"})
CREATE_ROLES = frozenset({"hr", "mentor"})


class AdminUserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_users(self, role: AdminManagedRole) -> AdminUserListResponse:
        if role not in MANAGED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="role phải là hr, mentor hoặc intern.",
            )

        rows = (
            self.db.query(User)
            .options(joinedload(User.role))
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == role)
            .order_by(User.code.asc(), User.id.asc())
            .all()
        )

        items = [
            AdminUserResponse(
                id=user.id,
                code=user.code,
                email=user.email,
                full_name=user.full_name,
                role=user.role.name if user.role else role,
                status=user.status,  # type: ignore[arg-type]
                created_at=user.created_at,
            )
            for user in rows
        ]
        return AdminUserListResponse(items=items, total=len(items), role=role)

    def create_user(self, payload: AdminUserCreateRequest) -> AdminUserResponse:
        if payload.role not in CREATE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Không tạo TTS tại đây. Dùng trang đăng ký công khai.",
            )

        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        role = self.db.query(Role).filter(Role.name == payload.role).first()
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Role '{payload.role}' chưa được seed.",
            )

        try:
            user = User(
                code=next_user_code(self.db, payload.role),
                email=payload.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                role_id=role.id,
                status="active",
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo tài khoản.",
            ) from None

        return AdminUserResponse(
            id=user.id,
            code=user.code,
            email=user.email,
            full_name=user.full_name,
            role=payload.role,
            status=user.status,  # type: ignore[arg-type]
            created_at=user.created_at,
        )
