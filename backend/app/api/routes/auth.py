from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.auth import InternRegisterRequest, InternRegisterResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=InternRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản thực tập sinh (TTS)",
    description=(
        "Chỉ dành cho **thực tập sinh**. Luôn tạo user với `role=intern`, `status=pending` "
        "và bản ghi `intern_profiles`. "
        "HR / mentor / admin **không** đăng ký qua API này (tài khoản nội bộ do admin tạo)."
    ),
)
def register_intern(
    payload: InternRegisterRequest,
    db: Session = Depends(get_db),
) -> InternRegisterResponse:
    return AuthService(db).register_intern(payload)
