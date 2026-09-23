from datetime import datetime, timedelta, timezone

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings
from .hash_password import verify_password


def create_access_token(user_id: int, role: str) -> str:
    if not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id phải là số nguyên dương.")

    if not isinstance(role, str) or not role.strip():
        raise ValueError("role không được rỗng.")

    settings = get_settings()
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=settings.jwt_expire_minutes)

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": issued_at,
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_access_token(token: str) -> dict | None:
    if not isinstance(token, str) or not token.strip():
        return None

    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except (ExpiredSignatureError, InvalidTokenError, ValueError):
        return None


def authenticate_login(
    plain_password: str,
    user_id: int,
    role: str,
    password_hash: str,
) -> str | None:
    if not isinstance(plain_password, str) or not plain_password:
        return None

    if not isinstance(user_id, int) or user_id <= 0:
        return None

    if not isinstance(role, str) or not role.strip():
        return None

    if not isinstance(password_hash, str) or not password_hash:
        return None

    if not verify_password(plain_password, password_hash):
        return None

    return create_access_token(user_id, role)