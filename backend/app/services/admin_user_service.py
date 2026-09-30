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

MANAGED_ROLES = frozenset({"hr", "mentor", "intern", "admin"})
CREATE_ROLES = frozenset({"hr", "mentor", "intern", "admin"})


class AdminUserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_users(self, role: str | None = None) -> AdminUserListResponse:
        query = (
            self.db.query(User)
            .options(joinedload(User.role))
            .join(Role, User.role_id == Role.id)
        )
        if role and role != "all":
            if role not in MANAGED_ROLES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="role phải là hr, mentor, intern hoặc admin.",
                )
            query = query.filter(Role.name == role)

        rows = query.order_by(User.code.asc(), User.id.asc()).all()

        items = [
            AdminUserResponse(
                id=user.id,
                code=user.code,
                email=user.email,
                full_name=user.full_name,
                role=user.role.name if user.role else (role or "unknown"),
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
                detail=f"Vai trò '{payload.role}' không hợp lệ.",
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

    def update_user_status(self, user_id: int, new_status: str) -> AdminUserResponse:
        user = (
            self.db.query(User)
            .options(joinedload(User.role))
            .filter(User.id == user_id)
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy người dùng với ID {user_id}.",
            )

        user.status = new_status

        try:
            self.db.commit()
            self.db.refresh(user)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật trạng thái người dùng.",
            ) from None

        return AdminUserResponse(
            id=user.id,
            code=user.code,
            email=user.email,
            full_name=user.full_name,
            role=user.role.name if user.role else "intern",
            status=user.status,  # type: ignore[arg-type]
            created_at=user.created_at,
        )

    def delete_user(self, user_id: int) -> dict[str, str]:
        user = self.db.query(User).options(joinedload(User.role)).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy người dùng với ID {user_id}.",
            )

        if user.role and user.role.name == "admin":
            admin_count = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(Role.name == "admin")
                .count()
            )
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không thể xóa tài khoản Quản trị viên duy nhất của hệ thống.",
                )

        try:
            self.db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể xóa tài khoản người dùng khỏi cơ sở dữ liệu.",
            ) from None

        return {"detail": "Đã xóa tài khoản người dùng thành công."}

    def reset_password(self, user_id: int) -> dict[str, str]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy người dùng với ID {user_id}.",
            )

        temp_pass = "Ictu@2026"
        user.password_hash = hash_password(temp_pass)
        try:
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể đặt lại mật khẩu.",
            ) from None

        return {
            "detail": f"Đã đặt lại mật khẩu tạm thành công: {temp_pass}",
            "temporary_password": temp_pass,
        }

