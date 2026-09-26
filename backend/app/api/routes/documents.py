from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.document_service import DocumentService

router = APIRouter(prefix="/hr/documents", tags=["documents"])


@router.post(
    "/{document_id}/review",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def review_document(
    document_id: int,
    payload: DocumentReviewRequest,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    return DocumentService(db).review_document(document_id, payload)


# ── TTS upload CV / đơn xin thực tập ─────────────────────────────────────────

intern_router = APIRouter(prefix="/intern/documents", tags=["documents"])


@intern_router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="TTS upload CV hoặc đơn xin thực tập",
    description=(
        "Upload file CV (`doc_type=cv`) hoặc đơn xin thực tập (`doc_type=application`). "
        "Chỉ chấp nhận **PDF** hoặc **DOCX**, dung lượng tối đa **5 MB**. "
        "Sai định dạng hoặc vượt dung lượng → 422."
    ),
    dependencies=[Depends(require_roles("intern"))],
)
async def upload_intern_document(
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    """
    Parameters
    ----------
    doc_type : str (query param)
        Loại tài liệu: ``cv`` hoặc ``application``.
        Truyền qua query string: ``/intern/documents/upload?doc_type=cv``
    file : UploadFile
        File cần upload (multipart/form-data).
    """
    return DocumentService(db).upload_intern_document(current_user.id, doc_type, file)
