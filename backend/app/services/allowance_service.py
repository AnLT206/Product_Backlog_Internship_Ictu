from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.allowance import Allowance
from app.models.allowance_history import AllowanceHistory
from app.models.user import User
from app.schemas.allowance import (
    AllowanceCreate,
    AllowanceHistoryResponse,
    AllowanceResponse,
    AllowanceUpdate,
)


class AllowanceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_my_allowances(self, user_id: int) -> list[AllowanceHistoryResponse]:
        rows = (
            self.db.query(AllowanceHistory)
            .filter(AllowanceHistory.intern_id == user_id)
            .order_by(AllowanceHistory.period.desc(), AllowanceHistory.id.desc())
            .all()
        )
        return [AllowanceHistoryResponse.model_validate(row) for row in rows]

    def _to_response(self, row: Allowance) -> AllowanceResponse:
        return AllowanceResponse(
            id=row.id,
            intern_id=row.intern_id,
            intern_name=row.intern.full_name if row.intern else None,
            intern_code=row.intern.code if row.intern else None,
            period=row.period,
            base_amount=row.base_amount,
            actual_work_days=row.actual_work_days,
            bonus=row.bonus,
            deduction=row.deduction,
            total_amount=row.total_amount,
            payment_status=row.payment_status,
            payment_date=row.payment_date,
            note=row.note,
            created_by=row.created_by,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def list_hr_allowances(
        self,
        period: str | None = None,
        intern_id: int | None = None,
        payment_status: str | None = None,
    ) -> list[AllowanceResponse]:
        query = self.db.query(Allowance).options(joinedload(Allowance.intern))
        if period:
            query = query.filter(Allowance.period == period.strip())
        if intern_id:
            query = query.filter(Allowance.intern_id == intern_id)
        if payment_status:
            query = query.filter(Allowance.payment_status == payment_status.strip())

        rows = query.order_by(Allowance.period.desc(), Allowance.id.desc()).all()
        return [self._to_response(row) for row in rows]

    def get_hr_allowance_by_id(self, allowance_id: int) -> AllowanceResponse:
        row = (
            self.db.query(Allowance)
            .options(joinedload(Allowance.intern))
            .filter(Allowance.id == allowance_id)
            .first()
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bản ghi phụ cấp",
            )
        return self._to_response(row)

    def create_hr_allowance(self, data: AllowanceCreate, creator_id: int) -> AllowanceResponse:
        intern = (
            self.db.query(User)
            .filter(User.id == data.intern_id)
            .first()
        )
        if not intern:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thực tập sinh",
            )

        # Kiểm tra trùng kỳ
        existed = (
            self.db.query(Allowance)
            .filter(Allowance.intern_id == data.intern_id, Allowance.period == data.period)
            .first()
        )
        if existed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phụ cấp của thực tập sinh cho kỳ {data.period} đã tồn tại",
            )

        total_amount = data.total_amount
        if total_amount is None:
            # Tự tính theo công thức: (base_amount / 22) * actual_work_days + bonus - deduction
            calculated = (data.base_amount / Decimal("22")) * data.actual_work_days + data.bonus - data.deduction
            total_amount = max(Decimal("0.00"), round(calculated, 2))

        allowance = Allowance(
            intern_id=data.intern_id,
            period=data.period,
            base_amount=data.base_amount,
            actual_work_days=data.actual_work_days,
            bonus=data.bonus,
            deduction=data.deduction,
            total_amount=total_amount,
            payment_status=data.payment_status,
            payment_date=data.payment_date,
            note=data.note,
            created_by=creator_id,
        )
        self.db.add(allowance)
        self.db.commit()
        self.db.refresh(allowance)
        return self._to_response(allowance)

    def update_hr_allowance(self, allowance_id: int, data: AllowanceUpdate) -> AllowanceResponse:
        row = (
            self.db.query(Allowance)
            .options(joinedload(Allowance.intern))
            .filter(Allowance.id == allowance_id)
            .first()
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bản ghi phụ cấp",
            )

        update_dict = data.model_dump(exclude_unset=True)

        for key, value in update_dict.items():
            setattr(row, key, value)

        # Nếu không truyền total_amount trực tiếp mà có thay đổi các trường cấu thành -> tự tính lại
        if "total_amount" not in update_dict and any(
            k in update_dict for k in ("base_amount", "actual_work_days", "bonus", "deduction")
        ):
            calculated = (row.base_amount / Decimal("22")) * row.actual_work_days + row.bonus - row.deduction
            row.total_amount = max(Decimal("0.00"), round(calculated, 2))

        self.db.commit()
        self.db.refresh(row)
        return self._to_response(row)
