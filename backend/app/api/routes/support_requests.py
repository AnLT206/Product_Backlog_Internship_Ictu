"""Routes tiếp nhận và xử lý Yêu cầu Hỗ trợ từ Thực tập sinh (Task 5)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.support_request import (
    SupportRequestCreate,
    SupportRequestResponse,
    SupportRequestUpdateStatus,
)
from app.services.support_request_service import SupportRequestService

router = APIRouter(tags=["support-requests"])


@router.post(
    "/support-requests",
    response_model=SupportRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận Yêu cầu Hỗ trợ từ TTS gửi lên HR/Admin (Task 5)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def create_support_request(
    payload: SupportRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportRequestResponse:
    """Thực tập sinh tạo mới yêu cầu hỗ trợ (Task 5)."""
    return SupportRequestService(db).create_request(current_user.id, payload)


@router.get(
    "/support-requests/my",
    response_model=list[SupportRequestResponse],
    summary="Thực tập sinh xem danh sách yêu cầu hỗ trợ của mình",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def list_my_support_requests(
    status_filter: str | None = Query(None, alias="status", description="Lọc theo trạng thái"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SupportRequestResponse]:
    """Danh sách các yêu cầu mà TTS hiện tại đã gửi."""
    return SupportRequestService(db).list_my_requests(current_user.id, status_filter)


@router.get(
    "/support-requests",
    response_model=list[SupportRequestResponse],
    summary="HR / Admin xem toàn bộ danh sách yêu cầu hỗ trợ",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_all_support_requests(
    status_filter: str | None = Query(None, alias="status", description="Lọc theo trạng thái: pending, in_progress, resolved, rejected"),
    category_filter: str | None = Query(None, alias="category", description="Lọc theo danh mục"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[SupportRequestResponse]:
    """HR và Admin quản lý, theo dõi toàn bộ yêu cầu từ các TTS."""
    return SupportRequestService(db).list_all_requests(
        status_filter=status_filter,
        category_filter=category_filter,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/support-requests/{request_id}",
    response_model=SupportRequestResponse,
    summary="HR / Admin cập nhật trạng thái và phản hồi yêu cầu hỗ trợ",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_support_request(
    request_id: int,
    payload: SupportRequestUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SupportRequestResponse:
    """HR hoặc Admin phản hồi, đổi trạng thái yêu cầu sang in_progress, resolved, rejected."""
    return SupportRequestService(db).update_request_status(
        request_id=request_id,
        responder_id=current_user.id,
        payload=payload,
    )
