"""Routes phân công Mentor cho Thực tập sinh (Task 6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.mentor_assignment import (
    AssignedInternListResponse,
    MentorAssignInternsRequest,
    MentorAssignResponse,
    MentorBulkAssignRequest,
)
from app.services.mentor_assignment_service import MentorAssignmentService

router = APIRouter(tags=["mentor-assignments"])


# ── HR / Admin Assignment Endpoints ──────────────────────────────────────────

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
