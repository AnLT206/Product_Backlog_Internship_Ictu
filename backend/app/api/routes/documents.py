import io
from typing import Literal
import xml.etree.ElementTree as ET
import zipfile

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_flexible, get_db, require_roles
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.document_service import DocumentService


def extract_docx_paragraphs(file_source) -> list[str]:
    """
    Trích xuất danh sách các đoạn văn bản (paragraphs) từ file .docx
    file_source có thể là đường dẫn file (str, Path) hoặc io.BytesIO.
    """
    try:
        with zipfile.ZipFile(file_source, "r") as z:
            if "word/document.xml" not in z.namelist():
                return []
            xml_bytes = z.read("word/document.xml")
            tree = ET.fromstring(xml_bytes)
            ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            paragraphs = []
            for p in tree.iter(f"{ns}p"):
                texts = [node.text for node in p.iter(f"{ns}t") if node.text]
                full_text = "".join(texts).strip()
                if full_text:
                    paragraphs.append(full_text)
            return paragraphs
    except Exception:
        return []


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
    dependencies=[Depends(require_roles("intern", "admin"))],
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


@intern_router.get(
    "",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="TTS / Ứng viên lấy danh sách tài liệu cá nhân đã nộp",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def get_my_documents(
    doc_type: Literal["cv", "application", "contract", "other"] | None = Query(
        default=None,
        description="Lọc theo loại tài liệu",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    return DocumentService(db).get_intern_documents(
        intern_id=current_user.id,
        doc_type=doc_type,
    )


@intern_router.post(
    "/preview-file",
    status_code=status.HTTP_200_OK,
    summary="Xem trước trực tiếp nội dung file ứng viên chọn trước khi nộp",
    dependencies=[Depends(require_roles("intern", "hr", "admin"))],
)
async def preview_staged_document(
    file: UploadFile = File(...),
):
    content = await file.read()
    file_name = file.filename or "tailieu"
    ext = file_name.split(".")[-1].lower() if "." in file_name else ""

    paragraphs = []
    if ext in ("docx", "doc"):
        paragraphs = extract_docx_paragraphs(io.BytesIO(content))

    return {
        "file_name": file_name,
        "extension": ext,
        "file_size": len(content),
        "paragraphs": paragraphs,
        "total_paragraphs": len(paragraphs),
        "status": "success",
    }


@intern_router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="TTS / Ứng viên xóa tài liệu cá nhân đã nộp",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def delete_my_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from pathlib import Path
    from app.models.document import Document
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        doc = db.query(Document).filter(Document.id == document_id).first()
    if doc:
        try:
            p = Path(doc.file_path)
            if p.exists():
                p.unlink()
        except Exception:
            pass
        db.delete(doc)
        db.commit()
    return {"detail": "Đã xóa tài liệu thành công"}


# ── Tải & Xem trước file tài liệu chung (HR / Admin hoặc chính TTS sở hữu) ──

download_router = APIRouter(prefix="/documents", tags=["documents"])


@download_router.get(
    "/{document_id}/download",
    summary="Tải về file tài liệu",
)
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
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


@download_router.get(
    "/{document_id}/view",
    summary="Xem trước trực tiếp tài liệu trong ứng dụng mà không cần tải xuống",
)
def view_document(
    document_id: int,
    raw: bool = Query(default=False, description="Nếu True thì luôn trả về JSON trích xuất nội dung văn bản"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
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
            detail="Bạn không có quyền xem tài liệu này.",
        )
    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File không tồn tại trên hệ thống lưu trữ.",
        )

    file_name = doc.file_name or file_path.name
    ext = file_name.split(".")[-1].lower() if "." in file_name else ""

    # Nếu là PDF và không yêu cầu raw JSON:
    # Trả về FileResponse với Content-Disposition: inline để browser hiển thị trong <iframe>
    if ext == "pdf" and not raw:
        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{file_name}"'},
        )

    # Nếu là file DOCX/DOC hoặc khi yêu cầu raw JSON
    paragraphs = []
    if ext in ("docx", "doc"):
        paragraphs = extract_docx_paragraphs(str(file_path))

    return {
        "id": doc.id,
        "file_name": file_name,
        "doc_type": doc.doc_type,
        "extension": ext,
        "paragraphs": paragraphs,
        "total_paragraphs": len(paragraphs),
        "file_size": file_path.stat().st_size,
        "uploaded_at": doc.created_at.isoformat() if doc.created_at else None,
    }
