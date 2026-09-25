"""
Seed roles + tài khoản admin mặc định (idempotent).

Chạy từ thư mục backend/:

    PYTHONPATH=. python -m scripts.seed_admin

Docker (backend): chạy tự động trước uvicorn nếu ADMIN_SEED_ON_STARTUP=true.

Tuỳ chọn env (.env):

    ADMIN_SEED_EMAIL=admin@ictu.edu.vn
    ADMIN_SEED_PASSWORD=Admin@123
    ADMIN_SEED_FULL_NAME=System Admin
    ADMIN_SEED_ON_STARTUP=true
    ADMIN_SEED_MAX_RETRIES=30
"""

from __future__ import annotations

import os
import sys
import time

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.utils.hash_password import hash_password

DEFAULT_ROLES: list[tuple[str, str]] = [
    ("intern", "Thực tập sinh (TTS) — đăng ký công khai qua /api/auth/register"),
    ("hr", "Nhân sự — tài khoản nội bộ, không đăng ký công khai"),
    ("mentor", "Mentor hướng dẫn — tài khoản nội bộ, không đăng ký công khai"),
    ("admin", "Quản trị hệ thống — tài khoản nội bộ, không đăng ký công khai"),
]

ADMIN_EMAIL = os.getenv("ADMIN_SEED_EMAIL", "admin@ictu.edu.vn").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_SEED_PASSWORD", "Admin@123")
ADMIN_FULL_NAME = os.getenv("ADMIN_SEED_FULL_NAME", "System Admin").strip()
MAX_RETRIES = int(os.getenv("ADMIN_SEED_MAX_RETRIES", "30"))
RETRY_DELAY_SEC = float(os.getenv("ADMIN_SEED_RETRY_DELAY", "2"))


def ensure_roles(db: Session) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for name, description in DEFAULT_ROLES:
        role = db.query(Role).filter(Role.name == name).first()
        if role is None:
            role = Role(name=name, description=description)
            db.add(role)
            db.flush()
            print(f"[seed] tạo role: {name}")
        else:
            if role.description != description:
                role.description = description
            print(f"[seed] role đã có: {name}")
        roles[name] = role
    return roles


def ensure_admin(db: Session, roles: dict[str, Role]) -> None:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        raise SystemExit("ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD không được rỗng.")

    admin_role = roles.get("admin")
    if admin_role is None:
        raise SystemExit("Thiếu role admin — seed roles thất bại.")

    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing is not None:
        print(
            f"[seed] giữ nguyên admin cố định: {ADMIN_EMAIL} "
            f"(id={existing.id}, status={existing.status}) — không tạo lại."
        )
        return

    user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name=ADMIN_FULL_NAME or "System Admin",
        role_id=admin_role.id,
        status="active",
    )
    db.add(user)
    db.flush()
    print(f"[seed] tạo admin: {ADMIN_EMAIL} (id={user.id}, status=active)")
    print(f"[seed] mật khẩu dev mặc định: {ADMIN_PASSWORD}")
    print("[seed] Đổi mật khẩu trước khi dùng môi trường thật.")


def run_seed() -> None:
    db = SessionLocal()
    try:
        roles = ensure_roles(db)
        ensure_admin(db, roles)
        db.commit()
        print("[seed] xong.")
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
                f"[seed] DB chưa sẵn sàng (lần {attempt}/{MAX_RETRIES}), chờ {RETRY_DELAY_SEC}s…",
                file=sys.stderr,
            )
            time.sleep(RETRY_DELAY_SEC)
        except Exception as exc:  # noqa: BLE001 — script CLI
            print(f"[seed] lỗi: {exc}", file=sys.stderr)
            return 1

    print(f"[seed] lỗi: không kết nối được DB sau {MAX_RETRIES} lần — {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
