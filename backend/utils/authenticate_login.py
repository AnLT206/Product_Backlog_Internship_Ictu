import os
from datetime import datetime, timedelta, timezone

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from hash_password import verify_password

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60


def create_access_token(user_id: int, role: str) -> str:
    if not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id phải là số nguyên dương.")

    if not isinstance(role, str) or not role.strip():
        raise ValueError("role không được rỗng.")

    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": issued_at,
        "exp": expires_at,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict | None:
    if not isinstance(token, str) or not token.strip():
        return None

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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