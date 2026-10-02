"""Schema quản lý người dùng (admin)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


AdminManagedRole = Literal["hr", "mentor", "intern", "admin"]
AdminCreateRole = Literal["hr", "mentor", "intern"]
UserStatus = Literal["active", "inactive", "pending"]


class AdminUserResponse(BaseModel):
    id: int
    code: str
    email: EmailStr
    full_name: str | None = None
    role: str
    status: UserStatus
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    role: str | None = None


class AdminUserCreateRequest(BaseModel):
    """Admin chỉ tạo tài khoản nội bộ HR / Mentor (TTS dùng /register)."""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: AdminCreateRole
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Họ tên không được để trống.")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("Mật khẩu không được bắt đầu/kết thúc bằng khoảng trắng.")
        return value


class AdminUserUpdateRequest(BaseModel):
    status: UserStatus

