"""Routes phân công Mentor cho Thực tập sinh (Task 6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.mentor_assignment import (
    AssignedInternListResponse,
    HRAssignMentorRequest,
    HRAssignMentorResponse,
    MentorAssignInternsRequest,
    MentorAssignResponse,
    MentorBulkAssignRequest,
)
from app.schemas.mentor_dimension_assignment import (
    AssignMentorRoleResult,
    BatchAssignByDimensionRequest,
    DimensionInternsResponse,
    DimensionsSummaryResponse,
    MatrixAssignRequest,
    UnassignMentorRoleRequest,
)
from app.services.mentor_assignment_service import MentorAssignmentService
from app.services.mentor_dimension_service import MentorDimensionService

router = APIRouter(tags=["mentor-assignments"])


# ── HR / Admin Assignment Endpoints ──────────────────────────────────────────

@router.post(
    "/hr/assign-mentor",
    response_model=HRAssignMentorResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều TTS cho một Mentor (POST /api/hr/assign-mentor)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_mentor(
    payload: HRAssignMentorRequest,
    db: Session = Depends(get_db),
) -> HRAssignMentorResponse:
    """HR/Admin gán một hoặc nhiều thực tập sinh cho một Mentor phụ trách."""
    res = MentorAssignmentService(db).assign_interns_to_mentor(
        mentor_id=payload.mentor_id,
        intern_ids=payload.intern_ids,
        program_id=payload.program_id,
        auto_assign_open_program=True,
    )
    return HRAssignMentorResponse(
        success=True,
        mentor_id=res.mentor_id,
        mentor_name=res.mentor_name,
        intern_ids=res.intern_ids,
        assigned_count=res.assigned_count,
        intern_count=res.assigned_count,
        message=res.message,
    )


@router.post(
    "/hr/mentors/{mentor_id}/assign-interns",
    response_model=MentorAssignResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều TTS cho Mentor (Task 6)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns_to_mentor(
    mentor_id: int,
    payload: MentorAssignInternsRequest,
    db: Session = Depends(get_db),
) -> MentorAssignResponse:
    """HR/Admin gán danh sách thực tập sinh cho một Mentor phụ trách."""
    return MentorAssignmentService(db).assign_interns_to_mentor(
        mentor_id=mentor_id,
        intern_ids=payload.intern_ids,
        program_id=payload.program_id,
    )


@router.post(
    "/hr/mentors/assign",
    response_model=MentorAssignResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công hàng loạt TTS cho Mentor (Task 6)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def bulk_assign_interns(
    payload: MentorBulkAssignRequest,
    db: Session = Depends(get_db),
) -> MentorAssignResponse:
    """Endpoint gán hàng loạt linh hoạt có mentor_id trong body."""
    return MentorAssignmentService(db).assign_interns_to_mentor(
        mentor_id=payload.mentor_id,
        intern_ids=payload.intern_ids,
        program_id=payload.program_id,
    )


@router.get(
    "/hr/mentors/{mentor_id}/assigned-interns",
    response_model=AssignedInternListResponse,
    summary="HR xem danh sách các TTS được phân công cho Mentor (Task 6)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_assigned_interns_by_hr(
    mentor_id: int,
    db: Session = Depends(get_db),
) -> AssignedInternListResponse:
    """HR tra cứu danh sách thực tập sinh thuộc quyền hướng dẫn của một Mentor."""
    return MentorAssignmentService(db).get_assigned_interns(mentor_id)


@router.delete(
    "/hr/mentors/{mentor_id}/assigned-interns/{intern_id}",
    summary="HR hủy phân công TTS khỏi Mentor (Task 6)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def unassign_intern(
    mentor_id: int,
    intern_id: int,
    program_id: int | None = Query(None, description="ID kỳ thực tập cụ thể nếu có"),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """HR gỡ liên kết phân công giữa Mentor và TTS."""
    return MentorAssignmentService(db).unassign_intern(
        mentor_id=mentor_id,
        intern_id=intern_id,
        program_id=program_id,
    )


# ── Mentor Endpoints ──────────────────────────────────────────────────────────

@router.get(
    "/mentor/assigned-interns",
    response_model=AssignedInternListResponse,
    summary="Mentor xem danh sách thực tập sinh mình đang phụ trách (Task 6)",
    dependencies=[Depends(require_roles("mentor", "admin"))],
)
def get_my_assigned_interns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignedInternListResponse:
    """Mentor tra cứu danh sách các TTS mà mình được phân công hướng dẫn."""
    return MentorAssignmentService(db).get_assigned_interns(current_user.id)


# ── HR Dimension-based & Multi-Mentor (1-N & N-N) Endpoints ───────────────────

@router.get(
    "/hr/mentor-assignments/dimensions-summary",
    response_model=DimensionsSummaryResponse,
    summary="HR xem tổng hợp phân loại TTS theo Khối / Lớp / Khóa / Ban",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_dimensions_summary(
    db: Session = Depends(get_db),
) -> DimensionsSummaryResponse:
    return MentorDimensionService(db).get_dimensions_summary()


@router.get(
    "/hr/mentor-assignments/by-dimension",
    response_model=DimensionInternsResponse,
    summary="HR lấy danh sách TTS kèm danh sách Mentor theo tiêu chí Khối/Lớp/Khóa/Ban",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_interns_by_dimension(
    dimension_type: str = Query(..., description="major | class | intake | department"),
    dimension_value: str = Query(..., description="Giá trị cụ thể của tiêu chí"),
    db: Session = Depends(get_db),
) -> DimensionInternsResponse:
    return MentorDimensionService(db).get_interns_by_dimension(dimension_type, dimension_value)


@router.post(
    "/hr/mentor-assignments/batch-by-dimension",
    response_model=AssignMentorRoleResult,
    summary="HR phân công Mentor hàng loạt theo Khối/Lớp/Khóa/Ban (hỗ trợ 1-N & N-N)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def batch_assign_by_dimension(
    payload: BatchAssignByDimensionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignMentorRoleResult:
    return MentorDimensionService(db).batch_assign_by_dimension(payload, assigned_by_id=current_user.id)


@router.post(
    "/hr/mentor-assignments/matrix",
    response_model=AssignMentorRoleResult,
    summary="HR phân công ma trận nhiều Mentor cho nhiều TTS (N-N)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def matrix_assign(
    payload: MatrixAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignMentorRoleResult:
    return MentorDimensionService(db).matrix_assign(payload, assigned_by_id=current_user.id)


@router.delete(
    "/hr/mentor-assignments/role",
    summary="HR hủy phân công Mentor khỏi TTS theo vai trò",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def unassign_mentor_role(
    payload: UnassignMentorRoleRequest,
    db: Session = Depends(get_db),
) -> dict:
    return MentorDimensionService(db).unassign_mentor_role(payload)

