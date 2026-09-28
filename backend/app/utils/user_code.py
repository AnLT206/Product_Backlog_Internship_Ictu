"""Mã người dùng hiển thị theo vai trò: HR0001, MT0001, TTS0001, AD0001."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User

ROLE_CODE_PREFIX: dict[str, str] = {
    "admin": "AD",
    "hr": "HR",
    "mentor": "MT",
    "intern": "TTS",
}

_CODE_RE = re.compile(r"^([A-Z]+)(\d+)$")


def prefix_for_role(role_name: str) -> str:
    return ROLE_CODE_PREFIX.get(role_name, "US")


def format_user_code(prefix: str, seq: int) -> str:
    return f"{prefix}{seq:04d}"


def next_user_code(db: Session, role_name: str) -> str:
    """Sinh mã tiếp theo cho role (HR0001, MT0002, …)."""
    prefix = prefix_for_role(role_name)
    codes = (
        db.query(User.code)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == role_name, User.code.isnot(None))
        .all()
    )

    max_seq = 0
    for (code,) in codes:
        if not code:
            continue
        match = _CODE_RE.match(code.strip().upper())
        if match and match.group(1) == prefix:
            max_seq = max(max_seq, int(match.group(2)))

    return format_user_code(prefix, max_seq + 1)


def backfill_user_codes(db: Session) -> int:
    """Gán mã cho user chưa có code, theo thứ tự id trong từng role."""
    updated = 0
    for role_name, prefix in ROLE_CODE_PREFIX.items():
        users = (
            db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(Role.name == role_name)
            .order_by(User.id.asc())
            .all()
        )
        seq = 0
        for user in users:
            if user.code:
                match = _CODE_RE.match(user.code.strip().upper())
                if match and match.group(1) == prefix:
                    seq = max(seq, int(match.group(2)))
                continue
            seq += 1
            user.code = format_user_code(prefix, seq)
            updated += 1
    return updated
