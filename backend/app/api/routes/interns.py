from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.auth import InternRegisterResponse
from app.schemas.document import DocumentResponse
from app.schemas.intern import (
    InternCreateRequest,
    InternProfileStatusResponse,
    InternProfileStatusUpdateRequest,
)
from app.services.document_service import DocumentService
from app.services.intern_service import InternService

router = APIRouter(prefix="/hr/interns", tags=["interns"])


@router.post(
    "",
    response_model=InternRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_intern(
    payload: InternCreateRequest,
    db: Session = Depends(get_db),
) -> InternRegisterResponse:
    return InternService(db).create_intern(payload)


@router.post(
    "/{intern_id}/approve",
    response_model=InternRegisterResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def approve_intern(
    intern_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> InternRegisterResponse:
    return InternService(db).approve(intern_id, background_tasks)


@router.patch(
    "/{intern_id}/status",
    response_model=InternProfileStatusResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_intern_status(
    intern_id: int,
    payload: InternProfileStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> InternProfileStatusResponse:
    return InternService(db).update_profile_status(
        intern_id, payload.status, background_tasks
    )


@router.post(
    "/{intern_id}/contract",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
async def upload_contract(
    intern_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    return DocumentService(db).upload_contract(intern_id, file)
