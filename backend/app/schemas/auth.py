"""Schema đăng ký TTS (intern) — không dùng cho HR / mentor / admin."""

import re
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

PHONE_PATTERN = re.compile(r"^(0|\+84)[0-9]{8,10}$")


class InternRegisterRequest(BaseModel):
    """Body đăng ký thực tập sinh. Không có trường role — luôn tạo user role=intern."""

    full_name: str = Field(..., min_length=1, max_length=100, description="Họ và tên TTS")
    email: EmailStr = Field(..., description="Email đăng nhập TTS")
    password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)
    phone_number: str | None = Field(default=None, max_length=20)
    dob: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    university: str | None = Field(default=None, max_length=150)
    major: str | None = Field(default=None, max_length=150)
    academic_year: str | None = Field(default=None, max_length=50)
    gpa: Decimal | None = Field(default=None, ge=0, le=4)
    address: str | None = Field(default=None, max_length=255)

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
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("Mật khẩu không được bắt đầu/kết thúc bằng khoảng trắng.")
        if len(value) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự.")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not PHONE_PATTERN.match(cleaned):
            raise ValueError(
                "Số điện thoại không hợp lệ. Dùng dạng 0xxxxxxxxx hoặc +84xxxxxxxxx."
            )
        return cleaned

    @field_validator("university", "major", "academic_year", "address")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def passwords_match(self) -> "InternRegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Xác nhận mật khẩu không khớp.")
        return self


class InternRegisterResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: Literal["intern"] = "intern"
    status: Literal["pending", "active", "inactive"]
    phone_number: str | None = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class LoginUserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    status: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: LoginUserResponse


class UserProfileResponse(LoginUserResponse):
    phone_number: str | None = None
    dob: date | None = None
    gender: str | None = None
    university: str | None = None
    major: str | None = None
    academic_year: str | None = None
    gpa: Decimal | None = None
    address: str | None = None


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)
    dob: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    university: str | None = Field(default=None, max_length=150)
    major: str | None = Field(default=None, max_length=150)
    academic_year: str | None = Field(default=None, max_length=50)
    gpa: Decimal | None = Field(default=None, ge=0, le=4)
    address: str | None = Field(default=None, max_length=255)
