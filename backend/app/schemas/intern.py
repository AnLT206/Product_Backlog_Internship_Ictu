"""Schema HR tạo hồ sơ TTS."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class InternCreateRequest(BaseModel):
    """Body HR thêm hồ sơ thực tập sinh."""

    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., description="Email đăng nhập TTS — bắt buộc, hợp lệ")
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
    def normalize_email(cls, value: EmailStr) -> str:
        cleaned = str(value).strip().lower()
        if not cleaned:
            raise ValueError("Email không được để trống.")
        return cleaned

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


class InternListItem(BaseModel):
    """Thông tin tóm tắt TTS trả về trong danh sách tìm kiếm/lọc."""

    id: int
    code: str | None = None
    email: str
    full_name: str | None = None
    role: str = "intern"
    status: str
    has_cv: bool = False
    cv_file_name: str | None = None
    cv_id: int | None = None
    phone_number: str | None = None
    dob: date | None = None
    gender: str | None = None
    university: str | None = None
    major: str | None = None
    academic_year: str | None = None
    gpa: Decimal | None = None
    address: str | None = None
    avatar: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class InternListResponse(BaseModel):
    """Kết quả phân trang danh sách TTS."""

    items: list[InternListItem]
    total: int
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    total_pages: int


class InternFilterOptionsResponse(BaseModel):
    """Các tùy chọn phục vụ cho dropdown lọc trên UI."""

    universities: list[str]
    majors: list[str]
    statuses: list[str] = ["pending", "active", "inactive"]


class InternProfileStatusUpdateRequest(BaseModel):
    status: Literal["approved", "rejected"]

    model_config = ConfigDict(extra="forbid")


class InternProfileStatusResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    profile_status: Literal["pending", "approved", "rejected"]
    account_status: Literal["pending", "active", "inactive"]


class InternUpdateRequest(BaseModel):
    """Body cập nhật hồ sơ thực tập sinh (HR / admin)."""

    full_name: str | None = Field(default=None, min_length=1, max_length=100)
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
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Họ và tên không được để trống.")
        return cleaned


class InternRejectRequest(BaseModel):
    note: str | None = Field(default=None, max_length=255)


class InternDetailResponse(InternListItem):
    """Chi tiết đầy đủ của một TTS bao gồm cả danh sách tài liệu."""

    documents: list = []

