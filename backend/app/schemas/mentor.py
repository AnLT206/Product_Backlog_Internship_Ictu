import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _normalize_cccd(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("CCCD phải gồm đúng 12 chữ số.")
    cleaned = value.strip()
    if re.fullmatch(r"[0-9]{12}", cleaned) is None:
        raise ValueError("CCCD phải gồm đúng 12 chữ số.")
    return cleaned


class MentorCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    cccd: str | None = None
    phone_number: str | None = Field(default=None, max_length=20)
    dob: date | None = None
    position: str | None = Field(default=None, max_length=100)
    department_id: int | None = None

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

    @field_validator("cccd", mode="before")
    @classmethod
    def validate_cccd(cls, value: object) -> str:
        return _normalize_cccd(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("Mật khẩu không được bắt đầu/kết thúc bằng khoảng trắng.")
        return value

    @field_validator("phone_number", "position")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class MentorUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone_number: str | None = Field(default=None, max_length=20)
    dob: date | None = None
    position: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    cccd: str | None = None

    @field_validator("cccd", mode="before")
    @classmethod
    def validate_cccd(cls, value: object) -> str:
        return _normalize_cccd(value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Họ và tên không được để trống.")
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Họ và tên không được để trống.")
        return cleaned

    @field_validator("phone_number", "position")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class MentorResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: Literal["mentor"] = "mentor"
    status: Literal["pending", "active", "inactive"]
    phone_number: str | None = None
    dob: date | None = None
    position: str | None = None
    department_id: int | None = None