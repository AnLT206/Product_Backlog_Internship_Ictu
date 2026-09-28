from typing import Literal

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.auth import InternRegisterResponse
from app.schemas.document import DocumentResponse
from app.schemas.intern import (
    InternCreateRequest,
    InternFilterOptionsResponse,
    InternListItem,
    InternListResponse,
    InternProfileStatusResponse,
    InternProfileStatusUpdateRequest,
)
from app.services.document_service import DocumentService
from app.services.intern_service import InternService

router = APIRouter(prefix="/hr/interns", tags=["interns"])


@router.get(
    "",
    response_model=InternListResponse,
    status_code=status.HTTP_200_OK,
    summary="Tìm kiếm và lọc danh sách thực tập sinh (SCRUM-22)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_interns(
    q: str | None = Query(default=None, description="Tìm kiếm theo họ tên hoặc email"),
    university: str | None = Query(default=None, description="Lọc theo trường đại học"),
    major: str | None = Query(default=None, description="Lọc theo ngành học"),
    status: Literal["pending", "active", "inactive"] | None = Query(
        default=None, description="Lọc theo trạng thái hồ sơ"
    ),
    page: int = Query(default=1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Số lượng mục trên mỗi trang"),
    db: Session = Depends(get_db),
) -> InternListResponse:
    return InternService(db).list_interns(
        q=q,
        university=university,
        major=major,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/filter-options",
    response_model=InternFilterOptionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách các trường và ngành hiện có cho bộ lọc dropdown",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_intern_filter_options(
    db: Session = Depends(get_db),
) -> InternFilterOptionsResponse:
    return InternService(db).get_filter_options()



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


@router.get(
    "/{intern_id}/documents",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách tài liệu cần duyệt của một thực tập sinh (SCRUM-24)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_intern_documents(
    intern_id: int,
    status: Literal["pending", "approved", "rejected"] | None = Query(
        default=None,
        description="Lọc theo trạng thái tài liệu (ví dụ: 'pending' để lấy tài liệu chờ duyệt)",
    ),
    doc_type: Literal["cv", "application", "contract", "other"] | None = Query(
        default=None,
        description="Lọc theo loại tài liệu ('cv', 'application', 'contract', 'other')",
    ),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    return DocumentService(db).get_intern_documents(
        intern_id=intern_id,
        status_filter=status,
        doc_type=doc_type,
    )

