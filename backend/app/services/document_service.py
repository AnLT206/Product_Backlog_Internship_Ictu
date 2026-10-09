from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.intern_profile import InternProfile
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

    def get_contract(self, user_id: int) -> DocumentResponse:
        doc = (
            self.db.query(Document)
            .filter(
                Document.user_id == user_id,
                Document.doc_type == "contract",
            )
            .order_by(Document.id.desc())
            .first()
        )
        if doc is None:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                upload_root = Path(__file__).resolve().parents[2] / "uploads" / "contracts"
                upload_root.mkdir(parents=True, exist_ok=True)
                sample_file = upload_root / f"HopDongThucTap_{user_id}.pdf"
                if not sample_file.exists():
                    sample_file.write_text(
                        f"CONG HOA XA HOI CHU NGHIA VIET NAM\n"
                        f"Doc lap - Tu do - Hanh phuc\n\n"
                        f"HOP DONG TIEP NHAN THUC TAP VA DAO TAO\n"
                        f"-------------------------------------\n"
                        f"Ben A (Don vi tiep nhan): TRUONG DAI HOC CNTT & TRUYEN THONG (ICTU)\n"
                        f"Ben B (Thuc tap sinh): {user.full_name or 'Thuc tap sinh'}\n"
                        f"Ma TTS: {user.code or 'TTS'}\n"
                        f"Email: {user.email}\n"
                        f"Thoi han thuc tap: 12 tuan (Tu ngay bat dau den khi ket thuc chuong trinh)\n"
                        f"Che do: Phu cap hang thang theo quy dinh + Ho tro huong dan Mentor 1-1\n\n"
                        f"Dieu khoan: Thuc tap sinh cam ket tuan thu noi quy bao mat, quy che lam viec.\n"
                        f"Ngay tao: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}",
                        encoding="utf-8"
                    )
                doc = Document(
                    user_id=user_id,
                    doc_type="contract",
                    file_name=f"HopDongThucTap_ICTU_{user.code or user_id}.pdf",
                    file_path=str(sample_file),
                    status="pending",
                )
                self.db.add(doc)
                self.db.commit()
                self.db.refresh(doc)
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chưa có hợp đồng nào được tải lên cho bạn.",
                )
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

            # Cập nhật hồ sơ thực tập sinh sang trạng thái chờ duyệt
            profile = self.db.query(InternProfile).filter(InternProfile.user_id == intern_id).first()
            if profile:
                profile.status = "pending"
            else:
                profile = InternProfile(user_id=intern_id, status="pending")
                self.db.add(profile)

            # Cập nhật trạng thái tài khoản User sang pending để HR xét duyệt
            intern_account = self.db.query(User).filter(User.id == intern_id).first()
            if intern_account and intern_account.status != "active":
                intern_account.status = "pending"

            # Gửi thông báo tới các tài khoản HR
            try:
                hr_users = (
                    self.db.query(User)
                    .join(Role, User.role_id == Role.id)
                    .filter(Role.name == "hr", User.status == "active")
                    .all()
                )
                intern_user = self.db.query(User).filter(User.id == intern_id).first()
                intern_name = (intern_user.full_name or intern_user.email) if intern_user else f"Ứng viên #{intern_id}"
                doc_title = "CV ứng tuyển" if doc_type == "cv" else "Đơn xin thực tập"
                for hr in hr_users:
                    NotificationService(self.db).create_notification(
                        user_id=hr.id,
                        title=f"Ứng viên mới nộp {doc_title}",
                        body=(
                            f"Ứng viên {intern_name} vừa nộp {doc_title} '{safe_name}'. "
                            "Vui lòng vào Cổng Quản Trị Nhân Sự để thẩm định và xét duyệt."
                        ),
                        commit=False,
                    )
            except Exception:
                pass

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

    def get_intern_documents(
        self,
        intern_id: int,
        status_filter: str | None = None,
        doc_type: str | None = None,
    ) -> list[DocumentResponse]:
        """Lấy danh sách tài liệu cần duyệt hoặc tất cả tài liệu của TTS (SCRUM-24)."""
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

        query = self.db.query(Document).filter(Document.user_id == intern_id)
        if status_filter is not None:
            query = query.filter(Document.status == status_filter)
        if doc_type is not None:
            query = query.filter(Document.doc_type == doc_type)

        docs = query.order_by(Document.created_at.desc(), Document.id.desc()).all()
        return [DocumentResponse.model_validate(doc) for doc in docs]

