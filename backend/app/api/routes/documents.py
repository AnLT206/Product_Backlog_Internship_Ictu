from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.document_service import DocumentService

router = APIRouter(prefix="/hr/documents", tags=["documents"])


@router.get(
    "/intern/{intern_id}",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách tài liệu của một thực tập sinh (SCRUM-24 alias)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_intern_documents_by_id(
    intern_id: int,
    status: Literal["pending", "approved", "rejected"] | None = Query(
        default=None,
        description="Lọc theo trạng thái tài liệu",
    ),
    doc_type: Literal["cv", "application", "contract", "other"] | None = Query(
        default=None,
        description="Lọc theo loại tài liệu",
    ),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    return DocumentService(db).get_intern_documents(
        intern_id=intern_id,
        status_filter=status,
        doc_type=doc_type,
    )


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


# ── Tải file tài liệu chung (HR / Admin hoặc chính TTS sở hữu) ───────────────

download_router = APIRouter(prefix="/documents", tags=["documents"])


@download_router.get(
    "/{document_id}/download",
    summary="Tải về file tài liệu",
)
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from pathlib import Path
    from fastapi.responses import FileResponse
    from app.models.document import Document

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài liệu không tồn tại.",
        )
    if current_user.role.name not in ("hr", "admin") and doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tải tài liệu này.",
        )
    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File không tồn tại trên hệ thống lưu trữ.",
        )
    return FileResponse(path=str(file_path), filename=doc.file_name)
