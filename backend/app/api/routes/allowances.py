from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.allowance import (
    AllowanceCreate,
    AllowanceHistoryResponse,
    AllowanceResponse,
    AllowanceUpdate,
)
from app.services.allowance_service import AllowanceService

router = APIRouter(tags=["allowances"])


@router.get(
    "/allowances",
    response_model=list[AllowanceHistoryResponse],
    summary="Lịch sử phụ cấp của người dùng đang đăng nhập",
    dependencies=[Depends(require_roles("intern"))],
)
def list_my_allowances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AllowanceHistoryResponse]:
    return AllowanceService(db).list_my_allowances(current_user.id)


# --- APIs HR Quản lý Phụ cấp (SCRUM-174, SCRUM-175) ---


@router.get(
    "/hr/allowances",
    response_model=list[AllowanceResponse],
    summary="HR xem danh sách phụ cấp của thực tập sinh (SCRUM-175)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_hr_allowances(
    period: str | None = Query(default=None, description="Lọc theo kỳ YYYY-MM"),
    intern_id: int | None = Query(default=None, description="Lọc theo ID thực tập sinh"),
    payment_status: str | None = Query(default=None, description="Lọc theo trạng thái thanh toán"),
    db: Session = Depends(get_db),
) -> list[AllowanceResponse]:
    return AllowanceService(db).list_hr_allowances(
        period=period, intern_id=intern_id, payment_status=payment_status
    )


@router.get(
    "/hr/allowances/{allowance_id}",
    response_model=AllowanceResponse,
    summary="HR xem chi tiết bản ghi phụ cấp",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_hr_allowance(
    allowance_id: int,
    db: Session = Depends(get_db),
) -> AllowanceResponse:
    return AllowanceService(db).get_hr_allowance_by_id(allowance_id)


@router.post(
    "/hr/allowances",
    response_model=AllowanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="HR nhập thông tin phụ cấp cho thực tập sinh (SCRUM-175)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_hr_allowance(
    data: AllowanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllowanceResponse:
    return AllowanceService(db).create_hr_allowance(data, creator_id=current_user.id)


@router.put(
    "/hr/allowances/{allowance_id}",
    response_model=AllowanceResponse,
    summary="HR cập nhật thông tin phụ cấp và trạng thái thanh toán (SCRUM-175)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_hr_allowance(
    allowance_id: int,
    data: AllowanceUpdate,
    db: Session = Depends(get_db),
) -> AllowanceResponse:
    return AllowanceService(db).update_hr_allowance(allowance_id, data)
