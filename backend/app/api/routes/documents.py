from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
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
