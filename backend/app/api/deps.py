from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.utils.authenticate_login import verify_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token xác thực không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
	credentials: Annotated[
		HTTPAuthorizationCredentials | None,
		Security(bearer_scheme),
	],
	db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    payload = verify_access_token(credentials.credentials)
    if payload is None:
        raise _unauthorized()

    subject = payload.get("sub")
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise _unauthorized() from None

    if user_id <= 0:
        raise _unauthorized()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.status != "active":
        raise _unauthorized()

    return user


def require_roles(*allowed_roles: str) -> Callable:
	def role_dependency(
		current_user: User = Depends(get_current_user),
	) -> User:
		if current_user.role.name not in allowed_roles:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Bạn không có quyền thực hiện thao tác này.",
			)
		return current_user

	return role_dependency

__all__ = ["get_db", "get_current_user", "require_roles"]
