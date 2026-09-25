"""Schema HR tạo hồ sơ TTS."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class InternCreateRequest(BaseModel):
    """Body HR thêm hồ sơ thực tập sinh."""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=150)
    password: str = Field(..., min_length=6, max_length=128)
    phone_number: str | None = Field(default=None, max_length=20)
    dob: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    university: str | None = Field(default=None, max_length=150)
    major: str | None = Field(default=None, max_length=150)
    academic_year: str | None = Field(default=None, max_length=50)
    gpa: Decimal | None = Field(default=None, ge=0, le=4)
    address: str | None = Field(default=None, max_length=255)
    status: Literal["pending", "active"] = "pending"

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Họ và tên không được để trống.")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("Mật khẩu không được bắt đầu/kết thúc bằng khoảng trắng.")
        return value

    @field_validator("university", "major", "academic_year", "address", "phone_number")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None
