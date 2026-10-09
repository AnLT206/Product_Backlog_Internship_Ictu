from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.intern_profile import InternProfile
from app.models.user import User
from app.schemas.auth import (
    InternRegisterRequest,
    InternRegisterResponse,
    LoginRequest,
    LoginResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
)
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


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    return AuthService(db).login(payload)


def _profile_response(user: User) -> UserProfileResponse:
    profile = user.intern_profile
    return UserProfileResponse(
        id=user.id,
        code=user.code,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name,
        status=user.status,
        profile_status=profile.status if profile else user.status,
        phone_number=profile.phone_number if profile else None,
        dob=profile.dob if profile else None,
        gender=profile.gender if profile else None,
        university=profile.university if profile else None,
        major=profile.major if profile else None,
        academic_year=profile.academic_year if profile else None,
        gpa=profile.gpa if profile else None,
        address=profile.address if profile else None,
        avatar=profile.avatar if profile else None,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)) -> UserProfileResponse:
    return _profile_response(current_user)


@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    if payload.full_name is not None:
        current_user.full_name = " ".join(payload.full_name.split())
    if payload.cccd is not None:
        current_user.cccd = payload.cccd.strip() or None
    code_val = payload.code if payload.code is not None else payload.student_code
    if code_val is not None:
        current_user.code = code_val.strip() or None

    profile = current_user.intern_profile
    if profile is None:
        profile = InternProfile(user_id=current_user.id)
        db.add(profile)

    profile_data = payload.model_dump(exclude_unset=True, exclude={"full_name", "cccd", "code", "student_code"})
    if "phone" in profile_data:
        p_val = profile_data.pop("phone")
        if "phone_number" not in profile_data and p_val is not None:
            profile_data["phone_number"] = p_val

    for field, value in profile_data.items():
        if hasattr(profile, field):
            setattr(profile, field, value)

    db.commit()
    db.refresh(current_user)
    return _profile_response(current_user)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xác nhận mật khẩu mới không khớp.",
        )
    from app.utils.hash_password import hash_password, verify_password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công."}

