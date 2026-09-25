from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.notification_service import NotificationService


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def review_document(
        self, document_id: int, payload: DocumentReviewRequest
    ) -> DocumentResponse:
        doc = (
            self.db.query(Document).filter(Document.id == document_id).first()
        )
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài liệu.",
            )

        note = payload.review_note.strip() if payload.review_note else None
        if payload.status == "rejected" and not note:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Từ chối tài liệu cần có ghi chú (review_note).",
            )

        doc.status = payload.status
        doc.review_note = note

        try:
            if payload.status == "rejected":
                NotificationService(self.db).create_notification(
                    user_id=doc.user_id,
                    title="Tài liệu bị từ chối",
                    body=(
                        f"Tài liệu '{doc.file_name}' ({doc.doc_type}) đã bị từ chối. "
                        f"Lý do: {note}"
                    ),
                    commit=False,
                )
            self.db.commit()
            self.db.refresh(doc)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể duyệt tài liệu.",
            ) from None

        return DocumentResponse.model_validate(doc)
