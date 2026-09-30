from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.mentor import (
    MentorAssignInternsRequest,
    MentorCreateRequest,
    MentorInternItemResponse,
    MentorResponse,
    MentorUpdateRequest,
)
from app.services.mentor_service import MentorService

router = APIRouter(prefix="/hr/mentors", tags=["mentors"])


@router.post(
    "",
    response_model=MentorResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_mentor(
    payload: MentorCreateRequest,
    db: Session = Depends(get_db),
) -> MentorResponse:
    return MentorService(db).create_mentor(payload)


@router.get(
    "",
    response_model=list[MentorResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_mentors(db: Session = Depends(get_db)) -> list[MentorResponse]:
    return MentorService(db).list_mentors()


@router.patch(
    "/{mentor_id}",
    response_model=MentorResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_mentor(
    mentor_id: int,
    payload: MentorUpdateRequest,
    db: Session = Depends(get_db),
) -> MentorResponse:
    return MentorService(db).update_mentor(mentor_id, payload)


@router.get(
    "/{mentor_id}/interns",
    response_model=list[MentorInternItemResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_mentor_interns(
    mentor_id: int,
    db: Session = Depends(get_db),
) -> list[MentorInternItemResponse]:
    return MentorService(db).get_mentor_interns(mentor_id)


@router.post(
    "/{mentor_id}/assign-interns",
    response_model=MentorResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns(
    mentor_id: int,
    payload: MentorAssignInternsRequest,
    db: Session = Depends(get_db),
) -> MentorResponse:
    return MentorService(db).assign_interns(mentor_id, payload.intern_ids)