from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.role import Role
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentReviewRequest
from app.services.file_validator import validate_upload_file
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

        # Validate dung lượng + định dạng trước khi lưu (dùng hàm dùng chung)
        # validate_upload_file đọc và trả về content — không cần đọc lại.
        content = validate_upload_file(file)

        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file.filename).name
        stored_name = f"{intern_id}_{uuid4().hex}_{safe_name}"
        dest = UPLOAD_ROOT / stored_name

        try:
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
            hr_users = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(Role.name == "hr", User.status == "active")
                .all()
            )
            intern_name = current_user.full_name or current_user.email
            for hr in hr_users:
                NotificationService(self.db).create_notification(
                    user_id=hr.id,
                    title="TTS đã xác nhận hợp đồng",
                    body=(
                        f"{intern_name} đã xác nhận hợp đồng '{doc.file_name}'."
                    ),
                    commit=False,
                )
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

    # ── Upload CV / đơn xin thực tập (TTS tự nộp) ───────────────────────────

    def upload_intern_document(
        self,
        intern_id: int,
        doc_type: str,
        file: UploadFile,
    ) -> DocumentResponse:
        """
        TTS upload CV hoặc đơn xin thực tập.

        Parameters
        ----------
        intern_id : int
            ID của TTS hiện tại (lấy từ JWT qua get_current_user).
        doc_type : str
            ``'cv'`` hoặc ``'application'``.
        file : UploadFile
            File multipart từ request.

        Returns
        -------
        DocumentResponse

        Raises
        ------
        HTTPException 422
            - Sai doc_type.
            - File sai định dạng (không phải PDF/DOCX).
            - File vượt quá 5 MB.
        """
        # Validate doc_type
        allowed_doc_types: frozenset[str] = frozenset({"cv", "application"})
        if doc_type not in allowed_doc_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="doc_type chỉ chấp nhận 'cv' hoặc 'application'.",
            )

        # Validate file: dung lượng + định dạng (tách biệt khỏi logic lưu file)
        content = validate_upload_file(file)

        # Lưu file vào thư mục uploads/intern_docs/
        upload_root = Path(__file__).resolve().parents[2] / "uploads" / "intern_docs"
        upload_root.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file.filename).name
        stored_name = f"{intern_id}_{doc_type}_{uuid4().hex}_{safe_name}"
        dest = upload_root / stored_name

        try:
            dest.write_bytes(content)

            doc = Document(
                user_id=intern_id,
                doc_type=doc_type,
                file_name=safe_name,
                file_path=str(dest),
                status="pending",
            )
            self.db.add(doc)
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
                detail="Không thể lưu tài liệu, vui lòng thử lại.",
            ) from None

        return DocumentResponse.model_validate(doc)
