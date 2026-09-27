"""Schema dành cho Admin quản trị hệ thống (SCRUM-18)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class AdminUserCreateRequest(BaseModel):
    """Body Admin tạo mới tài khoản người dùng (SCRUM-18)."""

    email: EmailStr = Field(..., description="Email đăng nhập của người dùng")
    password: str = Field(..., min_length=6, max_length=128, description="Mật khẩu khởi tạo")
    full_name: str = Field(..., min_length=1, max_length=100, description="Họ và tên")
    role: Literal["admin", "hr", "mentor", "intern"] = Field(
        ..., description="Vai trò trong hệ thống: admin, hr, mentor, intern"
    )
    status: Literal["active", "inactive", "pending"] = Field(
        default="active", description="Trạng thái tài khoản ban đầu"
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Họ và tên không được để trống.")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        cleaned = str(value).strip().lower()
        if not cleaned:
            raise ValueError("Email không được để trống.")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng.")
        if len(value) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự.")
        return value


class AdminUserResponse(BaseModel):
    """Thông tin user trả về sau khi tạo (tuyệt đối không lộ password_hash)."""

    id: int
    email: str
    full_name: str | None = None
    role: str
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
