from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.program import (
    ProgramAssignRequest,
    ProgramAssignResponse,
    ProgramCompletionStatsResponse,
    ProgramCreateRequest,
    ProgramGroupBatchAssignRequest,
    ProgramGroupBatchAssignResponse,
    ProgramMemberItem,
    ProgramPeriodRequest,
    ProgramResponse,
    ProgramUpdateMemberRequest,
    ProgramUpdateRequest,
)
from app.services.program_service import ProgramService

router = APIRouter(prefix="/hr/programs", tags=["programs"])


@router.post(
    "/assign-groups",
    response_model=ProgramGroupBatchAssignResponse,
    status_code=status.HTTP_200_OK,
    summary="HR gán hàng loạt thực tập sinh vào một chương trình hoặc nhóm cụ thể",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_groups(
    payload: ProgramGroupBatchAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgramGroupBatchAssignResponse:
    """Gán hàng loạt TTS vào kỳ thực tập hoặc nhóm thực tập cụ thể (POST /api/hr/programs/assign-groups)."""
    return ProgramService(db).assign_groups(payload, assigned_by=current_user.id)


@router.get(
    "",
    response_model=list[ProgramResponse],
    summary="Lấy danh sách các kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_programs(
    include_deleted: bool = Query(default=False, description="Bao gồm cả các kỳ đã xóa mềm"),
    db: Session = Depends(get_db),
) -> list[ProgramResponse]:
    return ProgramService(db).list_programs(include_deleted=include_deleted)


@router.post(
    "",
    response_model=ProgramResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_program(
    payload: ProgramCreateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).create_program(payload)


@router.get(
    "/completion-stats",
    response_model=ProgramCompletionStatsResponse,
    summary="Thống kê số lượng thực tập sinh theo trạng thái và tỷ lệ hoàn thành (US-33)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_completion_stats(
    program_id: int | None = Query(default=None, description="Lọc theo ID kỳ thực tập cụ thể (tùy chọn)"),
    db: Session = Depends(get_db),
) -> ProgramCompletionStatsResponse:
    return ProgramService(db).get_completion_stats(program_id=program_id)


@router.get(
    "/{program_id}",
    response_model=ProgramResponse,
    summary="Xem thông tin chi tiết một kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_program(program_id: int, db: Session = Depends(get_db)) -> ProgramResponse:
    return ProgramService(db).get_program(program_id)


@router.put(
    "/{program_id}",
    response_model=ProgramResponse,
    summary="Cập nhật thông tin chi tiết một kỳ thực tập (SCRUM-25)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_program(
    program_id: int,
    payload: ProgramUpdateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).update_program(program_id, payload)


@router.put(
    "/{program_id}/period",
    response_model=ProgramResponse,
    summary="Chỉnh sửa khoảng thời gian thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_program_period(
    program_id: int,
    payload: ProgramPeriodRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).update_period(program_id, payload)


@router.patch(
    "/{program_id}/close",
    response_model=ProgramResponse,
    summary="Đóng (Close) kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def close_program(
    program_id: int,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).close_program(program_id)


@router.patch(
    "/{program_id}/open",
    response_model=ProgramResponse,
    summary="Mở lại kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def open_program(
    program_id: int,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).open_program(program_id)


@router.post(
    "/{program_id}/assign",
    response_model=ProgramAssignResponse,
    summary="Gán thực tập sinh vào kỳ thực tập và kiểm tra số lượng tối đa (SCRUM-26)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns(
    program_id: int,
    payload: ProgramAssignRequest,
    db: Session = Depends(get_db),
) -> ProgramAssignResponse:
    return ProgramService(db).assign_interns(program_id, payload)


@router.delete(
    "/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Xóa mềm (Soft Delete) kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def delete_program(program_id: int, db: Session = Depends(get_db)) -> Response:
    ProgramService(db).delete_program(program_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{program_id}/interns/{intern_id}",
    summary="Gỡ hoàn toàn thực tập sinh khỏi kỳ thực tập (HR / Admin only)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def remove_intern_from_program(
    program_id: int,
    intern_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    return ProgramService(db).unassign_intern_from_program(program_id, intern_id)


@router.get(
    "/{program_id}/members",
    response_model=list[ProgramMemberItem],
    summary="Lấy danh sách các TTS và Mentor trong kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_program_members(
    program_id: int,
    db: Session = Depends(get_db),
) -> list[ProgramMemberItem]:
    return ProgramService(db).list_program_members(program_id)


@router.put(
    "/{program_id}/members/{intern_id}",
    response_model=ProgramMemberItem,
    summary="Cập nhật thông tin phân công Mentor hoặc trạng thái TTS trong kỳ",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_program_member(
    program_id: int,
    intern_id: int,
    payload: ProgramUpdateMemberRequest,
    db: Session = Depends(get_db),
) -> ProgramMemberItem:
    return ProgramService(db).update_program_member(program_id, intern_id, payload)


@router.delete(
    "/{program_id}/members/{intern_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Hủy / Gỡ TTS khỏi kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def remove_program_member(
    program_id: int,
    intern_id: int,
    db: Session = Depends(get_db),
) -> Response:
    ProgramService(db).remove_program_member(program_id, intern_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
