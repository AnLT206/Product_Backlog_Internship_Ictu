import math

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import InternRegisterResponse
from app.schemas.document import DocumentResponse
from app.schemas.intern import (

    InternCreateRequest,
    InternFilterOptionsResponse,
    InternListItem,
    InternListResponse,
)
from app.utils.hash_password import hash_password

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

    def approve(self, intern_id: int) -> InternRegisterResponse:
        user = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == intern_id, Role.name == "intern")
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hồ sơ thực tập sinh.",
            )
        if user.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Chỉ hồ sơ đang chờ duyệt mới được duyệt.",
            )

        user.status = "active"
        self.db.commit()
        self.db.refresh(user)
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

        items = [
            InternListItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role="intern",
                status=u.status,
                phone_number=u.intern_profile.phone_number if u.intern_profile else None,
                dob=u.intern_profile.dob if u.intern_profile else None,
                gender=u.intern_profile.gender if u.intern_profile else None,
                university=u.intern_profile.university if u.intern_profile else None,
                major=u.intern_profile.major if u.intern_profile else None,
                academic_year=u.intern_profile.academic_year if u.intern_profile else None,
                gpa=u.intern_profile.gpa if u.intern_profile else None,
                address=u.intern_profile.address if u.intern_profile else None,
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

        return InternFilterOptionsResponse(
            universities=[u[0] for u in unis if u[0]],
            majors=[m[0] for m in majors if m[0]],
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


