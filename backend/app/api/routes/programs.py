from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.program import (
    ProgramCreateRequest,
    ProgramResponse,
    ProgramUpdateRequest,
)
from app.services.program_service import ProgramService

router = APIRouter(prefix="/hr/programs", tags=["programs"])


@router.get(
    "",
    response_model=list[ProgramResponse],
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_programs(db: Session = Depends(get_db)) -> list[ProgramResponse]:
    return ProgramService(db).list_programs()


@router.post(
    "",
    response_model=ProgramResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_program(
    payload: ProgramCreateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).create_program(payload)


@router.get(
    "/{program_id}",
    response_model=ProgramResponse,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_program(program_id: int, db: Session = Depends(get_db)) -> ProgramResponse:
    return ProgramService(db).get_program(program_id)


@router.put(
    "/{program_id}",
    response_model=ProgramResponse,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_program(
    program_id: int,
    payload: ProgramUpdateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).update_program(program_id, payload)


@router.delete(
    "/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def delete_program(program_id: int, db: Session = Depends(get_db)) -> Response:
    ProgramService(db).delete_program(program_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
