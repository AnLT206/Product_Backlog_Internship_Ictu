"""
Seed tài khoản mẫu HR / Mentor / TTS vào DB (idempotent).

Chạy từ thư mục backend/:

    PYTHONPATH=. python -m scripts.seed_users

Mật khẩu mặc định cho mọi tài khoản seed: User@123
(đổi trước khi dùng môi trường thật)
"""

from __future__ import annotations

import sys
import time

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.utils.hash_password import hash_password
from app.utils.user_code import backfill_user_codes, next_user_code
from scripts.seed_admin import ensure_roles

DEFAULT_PASSWORD = "User@123"
MAX_RETRIES = 30
RETRY_DELAY_SEC = 2.0

# (email, full_name, role, status)
SEED_USERS: list[tuple[str, str, str, str]] = [
    ("hr@ictu.edu.vn", "Nguyễn Thị HR", "hr", "active"),
    ("hr2@ictu.edu.vn", "Trần Văn Nhân Sự", "hr", "active"),
    ("mentor@ictu.edu.vn", "Lê Minh Mentor", "mentor", "active"),
    ("mentor2@ictu.edu.vn", "Phạm Quốc Hướng", "mentor", "inactive"),
    ("tts01@student.ictu.edu.vn", "Hoàng Anh TTS", "intern", "pending"),
    ("tts02@student.ictu.edu.vn", "Đỗ Thị Lan", "intern", "active"),
    ("tts03@student.ictu.edu.vn", "Vũ Đức Nam", "intern", "pending"),
]


def ensure_user(
    db: Session,
    roles: dict[str, Role],
    email: str,
    full_name: str,
    role_name: str,
    status: str,
) -> None:
    email = email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        print(f"[seed-users] đã có: {email} (id={existing.id}, role={role_name}, status={existing.status})")
        return

    role = roles.get(role_name)
    if role is None:
        raise SystemExit(f"Thiếu role '{role_name}' — chạy seed_admin trước.")

    user = User(
        code=next_user_code(db, role_name),
        email=email,
        password_hash=hash_password(DEFAULT_PASSWORD),
        full_name=full_name,
        role_id=role.id,
        status=status,
    )
    db.add(user)
    db.flush()
    print(f"[seed-users] tạo: {email} (id={user.id}, role={role_name}, status={status})")


def list_users(db: Session) -> None:
    rows = (
        db.query(User, Role)
        .join(Role, User.role_id == Role.id)
        .order_by(Role.name.asc(), User.id.asc())
        .all()
    )
    print("\n[seed-users] Danh sách users trong DB:")
    print(f"{'ID':<6} {'CODE':<10} {'ROLE':<10} {'STATUS':<10} {'EMAIL':<36} FULL_NAME")
    print("-" * 100)
    for user, role in rows:
        print(
            f"{user.id:<6} {user.code or '—':<10} {role.name:<10} {user.status:<10} "
            f"{user.email:<36} {user.full_name or ''}"
        )
    print(f"Tổng: {len(rows)} user(s)\n")


def run_seed() -> None:
    db = SessionLocal()
    try:
        roles = ensure_roles(db)
        for email, full_name, role_name, status in SEED_USERS:
            ensure_user(db, roles, email, full_name, role_name, status)
        filled = backfill_user_codes(db)
        if filled:
            print(f"[seed-users] gán mã hiển thị cho {filled} user(s)")
        db.commit()
        print(f"[seed-users] xong. Mật khẩu mặc định: {DEFAULT_PASSWORD}")
        list_users(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> int:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            run_seed()
            return 0
        except OperationalError as exc:
            last_error = exc
            print(
                f"[seed-users] DB chưa sẵn sàng (lần {attempt}/{MAX_RETRIES}), chờ {RETRY_DELAY_SEC}s…",
                file=sys.stderr,
            )
            time.sleep(RETRY_DELAY_SEC)
        except Exception as exc:  # noqa: BLE001
            print(f"[seed-users] lỗi: {exc}", file=sys.stderr)
            return 1

    print(
        f"[seed-users] lỗi: không kết nối được DB sau {MAX_RETRIES} lần — {last_error}",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
