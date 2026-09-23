from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.mentor import MentorCreateRequest, MentorResponse
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