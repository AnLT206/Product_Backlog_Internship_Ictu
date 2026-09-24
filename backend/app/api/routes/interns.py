from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.user import User
from app.schemas.auth import InternRegisterResponse
from app.services.intern_service import InternService

router = APIRouter(prefix="/hr/interns", tags=["interns"])


@router.post(
    "/{intern_id}/approve",
    response_model=InternRegisterResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def approve_intern(
    intern_id: int,
    db: Session = Depends(get_db),
) -> InternRegisterResponse:
    return InternService(db).approve(intern_id)