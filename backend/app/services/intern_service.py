from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User
from app.schemas.auth import InternRegisterResponse


class InternService:
    def __init__(self, db: Session) -> None:
        self.db = db

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