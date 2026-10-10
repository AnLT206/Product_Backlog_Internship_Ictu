import math

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import InternRegisterResponse
from app.schemas.document import DocumentResponse
from app.schemas.intern import (
    InternCreateRequest,
    InternDetailResponse,
    InternFilterOptionsResponse,
    InternListItem,
    InternListResponse,
    InternProfileStatusResponse,
    InternUpdateRequest,
)
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
from app.utils.hash_password import hash_password
from app.utils.user_code import next_user_code

TTS_ROLE_NAME = "intern"


class InternService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_intern(self, payload: InternCreateRequest) -> InternRegisterResponse:
        existing = self.db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        intern_role = self.db.query(Role).filter(Role.name == TTS_ROLE_NAME).first()
        if intern_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Role 'intern' chưa được seed. Hãy seed role này trước khi tạo TTS.",
            )

        try:
            user = User(
                code=next_user_code(self.db, TTS_ROLE_NAME),
                email=payload.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                role_id=intern_role.id,
                status=payload.status,
            )
            self.db.add(user)
            self.db.flush()

            profile = InternProfile(
                user_id=user.id,
                phone_number=payload.phone_number,
                dob=payload.dob,
                gender=payload.gender or "other",
                university=payload.university or "",
                major=payload.major or "",
                academic_year=payload.academic_year,
                gpa=payload.gpa,
                address=payload.address,
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo hồ sơ thực tập sinh.",
            ) from None

        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=user.status,
            phone_number=profile.phone_number,
        )

    def approve(
        self, intern_id: int, background_tasks: BackgroundTasks
    ) -> InternRegisterResponse:
        user, profile = self._get_pending_intern(intern_id)
        try:
            profile.status = "approved"
            user.status = "active"
            intern_role = self.db.query(Role).filter(Role.name == TTS_ROLE_NAME).first()
            if intern_role:
                user.role_id = intern_role.id
            from app.models.document import Document
            self.db.query(Document).filter(
                Document.user_id == intern_id, Document.doc_type == "cv"
            ).update({"status": "approved"}, synchronize_session=False)
            self.db.commit()
            self.db.refresh(user)
            EmailService.enqueue_email(
                background_tasks,
                user.email,
                "Hồ sơ thực tập sinh đã được duyệt",
                (
                    f"Xin chào {user.full_name or 'bạn'},\n\n"
                    "Hồ sơ thực tập sinh của bạn đã được duyệt. "
                    "Bạn có thể dùng email và mật khẩu đã đăng ký để đăng nhập hệ thống."
                ),
            )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể duyệt hồ sơ thực tập sinh.",
            ) from None
        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=user.status,
            phone_number=user.intern_profile.phone_number
            if user.intern_profile
            else None,
        )

    def list_interns(
        self,
        *,
        q: str | None = None,
        university: str | None = None,
        major: str | None = None,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> InternListResponse:
        """Tìm kiếm text và lọc danh sách TTS theo các điều kiện dropdown (SCRUM-22)."""
        query = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .outerjoin(InternProfile, User.id == InternProfile.user_id)
            .filter(Role.name == TTS_ROLE_NAME)
        )

        if q and q.strip():
            kw = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(kw),
                    User.email.ilike(kw),
                )
            )

        if university and university.strip():
            query = query.filter(InternProfile.university == university.strip())

        if major and major.strip():
            query = query.filter(InternProfile.major == major.strip())

        if status_filter and status_filter.strip():
            query = query.filter(User.status == status_filter.strip())

        total = query.count()
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        offset = (page - 1) * page_size

        users = (
            query.order_by(User.created_at.desc(), User.id.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        user_ids = [u.id for u in users]
        cv_map: dict[int, Document] = {}
        if user_ids:
            cv_docs = (
                self.db.query(Document)
                .filter(Document.user_id.in_(user_ids), Document.doc_type == "cv")
                .order_by(Document.id.desc())
                .all()
            )
            for d in cv_docs:
                if d.user_id not in cv_map:
                    cv_map[d.user_id] = d

        items = [
            InternListItem(
                id=u.id,
                code=u.code,
                email=u.email,
                full_name=u.full_name,
                role="intern",
                status=(
                    "rejected"
                    if (u.intern_profile and u.intern_profile.status == "rejected")
                    else (
                        "pending"
                        if (u.intern_profile and u.intern_profile.status == "pending")
                        or (u.id in cv_map and cv_map[u.id].status == "pending" and u.status != "active")
                        else u.status
                    )
                ),
                has_cv=(u.id in cv_map),
                cv_file_name=cv_map[u.id].file_name if u.id in cv_map else None,
                cv_id=cv_map[u.id].id if u.id in cv_map else None,
                phone_number=u.intern_profile.phone_number if u.intern_profile else None,
                dob=u.intern_profile.dob if u.intern_profile else None,
                gender=u.intern_profile.gender if u.intern_profile else None,
                university=u.intern_profile.university if u.intern_profile else None,
                major=u.intern_profile.major if u.intern_profile else None,
                academic_year=u.intern_profile.academic_year if u.intern_profile else None,
                gpa=u.intern_profile.gpa if u.intern_profile else None,
                address=u.intern_profile.address if u.intern_profile else None,
                avatar=u.intern_profile.avatar if u.intern_profile else None,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
            for u in users
        ]

        return InternListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    def get_filter_options(self) -> InternFilterOptionsResponse:
        """Lấy danh sách các trường và ngành hiện có để hiển thị dropdown bộ lọc."""
        unis = (
            self.db.query(InternProfile.university)
            .join(User, InternProfile.user_id == User.id)
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == TTS_ROLE_NAME)
            .filter(InternProfile.university.isnot(None), InternProfile.university != "")
            .distinct()
            .order_by(InternProfile.university.asc())
            .all()
        )
        majors = (
            self.db.query(InternProfile.major)
            .join(User, InternProfile.user_id == User.id)
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == TTS_ROLE_NAME)
            .filter(InternProfile.major.isnot(None), InternProfile.major != "")
            .distinct()
            .order_by(InternProfile.major.asc())
            .all()
        )

        db_unis = [u[0] for u in unis if u[0]]
        db_majors = [m[0] for m in majors if m[0]]

        standard_it_majors = [
            "Công nghệ thông tin",
            "Kỹ thuật phần mềm",
            "Khoa học máy tính",
            "An toàn thông tin",
            "Hệ thống thông tin",
            "Mạng máy tính & Truyền thông dữ liệu",
            "Trí tuệ nhân tạo & Khoa học dữ liệu",
            "Kỹ thuật máy tính",
        ]

        # Kết hợp các ngành từ database với danh mục ngành CNTT chuẩn
        combined_majors = list(dict.fromkeys(db_majors + standard_it_majors))

        return InternFilterOptionsResponse(
            universities=db_unis,
            majors=combined_majors,
            statuses=["pending", "active", "inactive"],
        )

    def get_documents(
        self,
        intern_id: int,
        status_filter: str | None = None,
        doc_type: str | None = None,
    ) -> list[DocumentResponse]:
        """Lấy danh sách tài liệu cần duyệt hoặc tất cả tài liệu của TTS (SCRUM-24)."""
        from app.services.document_service import DocumentService

        return DocumentService(self.db).get_intern_documents(
            intern_id=intern_id,
            status_filter=status_filter,
            doc_type=doc_type,
        )

    def update_profile_status(
        self,
        intern_id: int,
        profile_status: str,
        background_tasks: BackgroundTasks,
    ) -> InternProfileStatusResponse:
        user, profile = self._get_pending_intern(intern_id)
        try:
            profile.status = profile_status
            user.status = "active" if profile_status == "approved" else "inactive"
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
            if profile_status == "approved":
                EmailService.enqueue_email(
                    background_tasks,
                    user.email,
                    "Hồ sơ thực tập sinh đã được duyệt",
                    (
                        f"Xin chào {user.full_name or 'bạn'},\n\n"
                        "Hồ sơ thực tập sinh của bạn đã được duyệt. "
                        "Bạn có thể dùng email và mật khẩu đã đăng ký để đăng nhập hệ thống."
                    ),
                )
                NotificationService(self.db).create_notification(
                    user_id=user.id,
                    title="🎉 Hồ sơ đã được duyệt & Hợp đồng thực tập",
                    body=(
                        "Chúc mừng bạn! Hồ sơ thực tập sinh đã được HR phê duyệt kèm Hợp đồng tiếp nhận thực tập. "
                        "Vui lòng đọc kỹ hợp đồng và tích 'Xác nhận đã đọc hợp đồng' để kích hoạt đầy đủ quyền thao tác."
                    ),
                    commit=False,
                )
                self.db.commit()
            else:
                EmailService.enqueue_email(
                    background_tasks,
                    user.email,
                    "Thông báo kết quả hồ sơ thực tập sinh",
                    (
                        f"Xin chào {user.full_name or 'bạn'},\n\n"
                        "Hồ sơ thực tập sinh của bạn hiện chưa được chấp nhận."
                    ),
                )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật trạng thái hồ sơ thực tập sinh.",
            ) from None

        return InternProfileStatusResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            profile_status=profile.status,
            account_status=user.status,
        )

    def _get_pending_intern(self, intern_id: int) -> tuple[User, InternProfile]:
        try:
            user = (
                self.db.query(User)
                .join(Role, User.role_id == Role.id)
                .filter(User.id == intern_id, Role.name == TTS_ROLE_NAME)
                .first()
            )
            if user is None or user.intern_profile is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy hồ sơ thực tập sinh.",
                )
            return user, user.intern_profile
        except HTTPException:
            raise
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể truy vấn hồ sơ thực tập sinh.",
            ) from None

    def get_intern(self, intern_id: int) -> InternDetailResponse:
        user = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == intern_id, Role.name == TTS_ROLE_NAME)
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hồ sơ thực tập sinh.",
            )
        profile = user.intern_profile
        from app.services.document_service import DocumentService
        docs = DocumentService(self.db).get_intern_documents(intern_id)

        return InternDetailResponse(
            id=user.id,
            code=user.code,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status=(
                "rejected"
                if (profile and profile.status == "rejected")
                else (
                    "pending"
                    if (profile and profile.status == "pending")
                    else user.status
                )
            ),
            phone_number=profile.phone_number if profile else None,
            dob=profile.dob if profile else None,
            gender=profile.gender if profile else None,
            university=profile.university if profile else None,
            major=profile.major if profile else None,
            academic_year=profile.academic_year if profile else None,
            gpa=profile.gpa if profile else None,
            address=profile.address if profile else None,
            created_at=user.created_at,
            updated_at=user.updated_at,
            documents=docs,
        )

    def update_intern(
        self, intern_id: int, payload: InternUpdateRequest
    ) -> InternDetailResponse:
        user = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == intern_id, Role.name == TTS_ROLE_NAME)
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hồ sơ thực tập sinh.",
            )
        profile = user.intern_profile
        if profile is None:
            profile = InternProfile(user_id=user.id)
            self.db.add(profile)

        if payload.full_name is not None:
            user.full_name = payload.full_name

        data = payload.model_dump(exclude_unset=True, exclude={"full_name"})
        for field, value in data.items():
            setattr(profile, field, value)

        try:
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể cập nhật hồ sơ thực tập sinh.",
            ) from None

        return self.get_intern(intern_id)

    def reject(
        self, intern_id: int, note: str | None, background_tasks: BackgroundTasks
    ) -> InternRegisterResponse:
        user, profile = self._get_pending_intern(intern_id)
        try:
            profile.status = "rejected"
            user.status = "inactive"
            from app.models.document import Document
            self.db.query(Document).filter(
                Document.user_id == intern_id, Document.doc_type == "cv"
            ).update(
                {"status": "rejected", "review_note": (note or "")[:255] if note else None},
                synchronize_session=False,
            )
            from app.services.notification_service import NotificationService
            NotificationService(self.db).create_notification(
                user_id=user.id,
                title="Thông báo kết quả xét duyệt hồ sơ thực tập",
                body=(
                    f"Hồ sơ ứng tuyển của bạn hiện chưa được tiếp nhận. "
                    + (f"Lý do: {note}. " if note else "")
                    + "Bạn có thể chuẩn bị lại CV và nộp lại hồ sơ bất kỳ lúc nào."
                ),
                commit=False,
            )
            self.db.commit()
            self.db.refresh(user)
            self.db.refresh(profile)
            EmailService.enqueue_email(
                background_tasks,
                user.email,
                "Thông báo kết quả xét duyệt hồ sơ thực tập sinh",
                (
                    f"Xin chào {user.full_name or 'bạn'},\n\n"
                    f"Hồ sơ thực tập sinh của bạn hiện chưa được tiếp nhận.\n"
                    + (f"Ghi chú từ bộ phận nhân sự: {note}\n" if note else "")
                    + "Cảm ơn bạn đã quan tâm đến chương trình thực tập tại ICTU."
                ),
            )
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể từ chối hồ sơ thực tập sinh.",
            ) from None
        return InternRegisterResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role="intern",
            status="rejected",
            phone_number=profile.phone_number if profile else None,
        )
