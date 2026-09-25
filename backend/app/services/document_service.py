from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.role import Role
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.notification_service import NotificationService

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "contracts"


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upload_contract(
        self, intern_id: int, file: UploadFile
    ) -> DocumentResponse:
        intern = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == intern_id, Role.name == "intern")
            .first()
        )
        if intern is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hồ sơ thực tập sinh.",
            )

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu tên file hợp đồng.",
            )

        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file.filename).name
        stored_name = f"{intern_id}_{uuid4().hex}_{safe_name}"
        dest = UPLOAD_ROOT / stored_name

        try:
            content = file.file.read()
            if not content:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="File hợp đồng trống.",
                )
            dest.write_bytes(content)

            doc = Document(
                user_id=intern_id,
                doc_type="contract",
                file_name=safe_name,
                file_path=str(dest),
                status="pending",
            )
            self.db.add(doc)
            self.db.flush()

            NotificationService(self.db).create_notification(
                user_id=intern_id,
                title="Hợp đồng mới cần xác nhận",
                body=(
                    f"HR đã tải lên hợp đồng '{safe_name}'. "
                    "Vui lòng xem và xác nhận hợp đồng."
                ),
                commit=False,
            )
            self.db.commit()
            self.db.refresh(doc)
        except HTTPException:
            self.db.rollback()
            if dest.exists():
                dest.unlink(missing_ok=True)
            raise
        except SQLAlchemyError:
            self.db.rollback()
            if dest.exists():
                dest.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tải lên hợp đồng.",
            ) from None

        return DocumentResponse.model_validate(doc)

    def confirm_contract(self, current_user: User) -> DocumentResponse:
        if current_user.role.name != "intern":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ thực tập sinh mới xác nhận được hợp đồng.",
            )
        if current_user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Chỉ TTS đang active mới xác nhận được hợp đồng.",
            )

        doc = (
            self.db.query(Document)
            .filter(
                Document.user_id == current_user.id,
                Document.doc_type == "contract",
                Document.confirmed_at.is_(None),
            )
            .order_by(Document.id.desc())
            .first()
        )
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không có hợp đồng cần xác nhận.",
            )

        doc.status = "approved"
        doc.confirmed_at = datetime.now(timezone.utc).replace(tzinfo=None)

        try:
            self.db.commit()
            self.db.refresh(doc)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể xác nhận hợp đồng.",
            ) from None

        return DocumentResponse.model_validate(doc)

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
