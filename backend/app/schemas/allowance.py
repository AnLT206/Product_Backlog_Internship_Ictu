from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PaymentStatus = Literal["unpaid", "paid", "cancelled"]


class AllowanceHistoryResponse(BaseModel):
    id: int
    period: str
    allowance_type: str
    amount: Decimal
    note: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AllowanceCreate(BaseModel):
    intern_id: int = Field(..., description="ID của thực tập sinh")
    period: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Kỳ tính công YYYY-MM (VD: 2026-10)")
    base_amount: Decimal = Field(default=Decimal("0.00"), ge=0, description="Mức phụ cấp tiêu chuẩn")
    actual_work_days: Decimal = Field(default=Decimal("0.0"), ge=0, le=31, description="Số ngày công thực tế")
    bonus: Decimal = Field(default=Decimal("0.00"), ge=0, description="Thưởng")
    deduction: Decimal = Field(default=Decimal("0.00"), ge=0, description="Khấu trừ / phạt")
    total_amount: Decimal | None = Field(default=None, ge=0, description="Tổng thực nhận (nếu để trống hệ thống tự tính)")
    payment_status: PaymentStatus = Field(default="unpaid", description="Trạng thái thanh toán")
    payment_date: date | None = Field(default=None, description="Ngày chi trả")
    note: str | None = Field(default=None, max_length=255, description="Ghi chú")


class AllowanceUpdate(BaseModel):
    base_amount: Decimal | None = Field(default=None, ge=0)
    actual_work_days: Decimal | None = Field(default=None, ge=0, le=31)
    bonus: Decimal | None = Field(default=None, ge=0)
    deduction: Decimal | None = Field(default=None, ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    payment_status: PaymentStatus | None = None
    payment_date: date | None = None
    note: str | None = Field(default=None, max_length=255)


class AllowanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    intern_id: int
    intern_name: str | None = None
    intern_code: str | None = None
    period: str
    base_amount: Decimal
    actual_work_days: Decimal
    bonus: Decimal
    deduction: Decimal
    total_amount: Decimal
    payment_status: str
    payment_date: date | None = None
    note: str | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None
