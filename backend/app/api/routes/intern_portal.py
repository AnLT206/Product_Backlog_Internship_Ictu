"""Routes cho cổng thông tin thực tập sinh (SCRUM-240, SCRUM-241)."""

import time
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.core.cache import ttl_cache
from app.models.user import User
from app.schemas.intern_mentor_group import InternMentorGroupResponse
from app.services.intern_group_service import InternGroupService

router = APIRouter(prefix="/intern", tags=["intern-portal"])


@router.get(
    "/my-mentor-and-group",
    response_model=InternMentorGroupResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin Mentor hướng dẫn và nhóm thực tập của TTS (SCRUM-240, SCRUM-241)",
    description=(
        "Trả về chi tiết Mentor (họ tên, email, SĐT, phòng ban) và danh sách bạn cùng nhóm/đợt thực tập. "
        "Áp dụng in-memory cache để tối ưu tốc độ truy cập trang chủ (SCRUM-241). "
        "Header X-Cache cho biết HIT hoặc MISS, X-Response-Time-Ms cho biết thời gian xử lý."
    ),
    dependencies=[Depends(require_roles("intern", "admin", "mentor", "hr"))],
)
def get_my_mentor_and_group(
    response: Response,
    use_cache: bool = Query(
        default=True,
        description="Sử dụng cache để tối ưu tốc độ phản hồi (<50ms). Đặt false để bỏ qua cache.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InternMentorGroupResponse:
    start_time = time.perf_counter()
    service = InternGroupService(db)
    data, is_hit = service.get_my_mentor_and_group(current_user.id, use_cache=use_cache)

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Cache"] = "HIT" if is_hit else "MISS"
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"

    return data


@router.get(
    "/mentor-group",
    response_model=InternMentorGroupResponse,
    status_code=status.HTTP_200_OK,
    summary="Alias cho /api/intern/my-mentor-and-group tương thích với Frontend (SCRUM-240, SCRUM-241)",
    dependencies=[Depends(require_roles("intern", "admin", "mentor", "hr"))],
)
def get_mentor_group_alias(
    response: Response,
    use_cache: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InternMentorGroupResponse:
    return get_my_mentor_and_group(
        response=response,
        use_cache=use_cache,
        current_user=current_user,
        db=db,
    )


@router.post(
    "/my-mentor-and-group/invalidate-cache",
    status_code=status.HTTP_200_OK,
    summary="Xóa cache thông tin mentor và nhóm cho TTS hiện tại hoặc toàn bộ",
    dependencies=[Depends(require_roles("intern", "admin", "hr"))],
)
def invalidate_mentor_group_cache(
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    InternGroupService.invalidate_cache(current_user.id)
    return {"message": f"Cache invalidated successfully for user {current_user.id}"}
