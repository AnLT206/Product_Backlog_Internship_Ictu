"""
Script làm sạch dữ liệu hệ thống (clean database):
- Đưa toàn bộ hệ thống về trạng thái trắng tinh.
- Giữ lại duy nhất 4 tài khoản hệ thống:
  1. Admin:  admin@ictu.edu.vn  / Admin@123   (AD0001)
  2. HR:     hr@ictu.edu.vn     / Hr@123      (HR0001)
  3. Mentor: mentor@ictu.edu.vn / Mentor@123  (MT0001)
  4. TTS:    intern@ictu.edu.vn / Intern@123  (TTS0002)
- Làm sạch các bảng nghiệp vụ:
  - system_logs (xóa toàn bộ)
  - notifications (xóa toàn bộ)
  - documents (xóa toàn bộ)
  - program_members (xóa toàn bộ)
  - internship_programs (xóa toàn bộ)
  - Xóa mọi tài khoản người dùng khác và profile liên quan.
  - Làm sạch thư mục uploads (nếu có).

Cách chạy:
    cd backend
    python -m scripts.clean_database
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.utils.hash_password import hash_password, verify_password

KEEP_ACCOUNTS = {
    "admin@ictu.edu.vn": {
        "code": "AD0001",
        "role": "admin",
        "full_name": "System Admin",
        "password": "Admin@123",
        "status": "active",
    },
    "hr@ictu.edu.vn": {
        "code": "HR0001",
        "role": "hr",
        "full_name": "Cán bộ Nhân sự HR",
        "password": "Hr@123",
        "status": "active",
    },
    "mentor@ictu.edu.vn": {
        "code": "MT0001",
        "role": "mentor",
        "full_name": "Mentor Hướng dẫn",
        "password": "Mentor@123",
        "status": "active",
    },
    "intern@ictu.edu.vn": {
        "code": "TTS0002",
        "role": "intern",
        "full_name": "Nguyễn Văn An",
        "password": "Intern@123",
        "status": "active",
    },
}


def clean_database(db: Session) -> None:
    print("[1/5] Đang xóa dữ liệu các bảng nghiệp vụ...")
    # Xóa log, thông báo, tài liệu, đăng ký thực tập, kỳ thực tập
    db.execute(text("DELETE FROM program_members;"))
    db.execute(text("ALTER TABLE program_members AUTO_INCREMENT = 1;"))

    db.execute(text("DELETE FROM internship_programs;"))
    db.execute(text("ALTER TABLE internship_programs AUTO_INCREMENT = 1;"))

    db.execute(text("DELETE FROM documents;"))
    db.execute(text("ALTER TABLE documents AUTO_INCREMENT = 1;"))

    db.execute(text("DELETE FROM notifications;"))
    db.execute(text("ALTER TABLE notifications AUTO_INCREMENT = 1;"))

    db.execute(text("DELETE FROM system_logs;"))
    db.execute(text("ALTER TABLE system_logs AUTO_INCREMENT = 1;"))

    print("[2/5] Đang lọc và xóa người dùng ngoài danh sách cho phép...")
    # Lấy danh sách email giữ lại
    keep_emails = tuple(KEEP_ACCOUNTS.keys())
    # Xóa profile trước hoặc dùng SQL xóa trực tiếp
    db.execute(
        text("DELETE FROM intern_profiles WHERE user_id IN (SELECT id FROM users WHERE email NOT IN :emails)"),
        {"emails": keep_emails},
    )
    db.execute(
        text("DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email NOT IN :emails)"),
        {"emails": keep_emails},
    )
    db.execute(
        text("DELETE FROM users WHERE email NOT IN :emails"),
        {"emails": keep_emails},
    )
    print("  -> Đã xóa các người dùng không nằm trong danh sách 4 tài khoản hệ thống.")

    print("[3/5] Đồng bộ và đảm bảo thông tin 4 tài khoản hệ thống chuẩn...")
    roles = {r.name: r for r in db.query(Role).all()}

    for email, info in KEEP_ACCOUNTS.items():
        role = roles.get(info["role"])
        if not role:
            raise RuntimeError(f"Role '{info['role']}' không tồn tại trong hệ thống!")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                code=info["code"],
                email=email,
                password_hash=hash_password(info["password"]),
                full_name=info["full_name"],
                role_id=role.id,
                status=info["status"],
            )
            db.add(user)
            db.flush()
            print(f"  -> Tạo mới tài khoản: {email}")
        else:
            user.code = info["code"]
            user.full_name = info["full_name"]
            user.role_id = role.id
            user.status = info["status"]
            # Đảm bảo password đúng chuẩn nếu chưa khớp
            if not verify_password(info["password"], user.password_hash):
                user.password_hash = hash_password(info["password"])
                print(f"  -> Cập nhật lại mật khẩu chuẩn cho: {email}")
            print(f"  -> Đã chuẩn hóa tài khoản: {email} ({info['code']})")

        # Đảm bảo user_profiles hoặc intern_profiles tương ứng
        if info["role"] in ("hr", "mentor"):
            up = db.execute(
                text("SELECT id FROM user_profiles WHERE user_id = :uid"),
                {"uid": user.id},
            ).first()
            if not up:
                db.execute(
                    text("INSERT INTO user_profiles (user_id) VALUES (:uid)"),
                    {"uid": user.id},
                )
                print(f"  -> Tạo user_profiles cho: {email}")
        elif info["role"] == "intern":
            ip = db.execute(
                text("SELECT id FROM intern_profiles WHERE user_id = :uid"),
                {"uid": user.id},
            ).first()
            if not ip:
                db.execute(
                    text(
                        "INSERT INTO intern_profiles (user_id, status, phone_number, university, major, gpa) "
                        "VALUES (:uid, 'approved', '0912345678', 'ĐH Công nghệ Thông tin và Truyền thông (ICTU)', 'Công nghệ thông tin', 3.65)"
                    ),
                    {"uid": user.id},
                )
                print(f"  -> Tạo intern_profiles cho: {email}")
            else:
                db.execute(
                    text(
                        "UPDATE intern_profiles SET status = 'approved', university = 'ĐH Công nghệ Thông tin và Truyền thông (ICTU)', major = 'Công nghệ thông tin', gpa = 3.65 WHERE user_id = :uid"
                    ),
                    {"uid": user.id},
                )

    print("[4/5] Dọn dẹp file tải lên trong thư mục uploads (nếu có)...")
    uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
    if uploads_dir.exists():
        for item in uploads_dir.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
        print(f"  -> Đã dọn dẹp thư mục: {uploads_dir}")
    else:
        print("  -> Thư mục uploads chưa có file nào.")

    db.commit()
    print("[5/5] Hoàn tất làm sạch dữ liệu thành công!")


def print_summary(db: Session) -> None:
    tables = [
        "users",
        "user_profiles",
        "intern_profiles",
        "documents",
        "notifications",
        "internship_programs",
        "program_members",
        "system_logs",
    ]
    print("\n" + "=" * 60)
    print("THỐNG KÊ DỮ LIỆU SAU KHI LÀM SẠCH:")
    print("=" * 60)
    for t in tables:
        count = db.execute(text(f"SELECT count(*) FROM {t}")).scalar()
        print(f"  - Bảng {t:<22}: {count:>4} bản ghi")

    print("\nDANH SÁCH TÀI KHOẢN DUY NHẤT CÒN LẠI TRONG HỆ THỐNG:")
    print("-" * 75)
    print(f"{'MÃ CODE':<10} {'VAI TRÒ':<10} {'EMAIL':<26} {'MẬT KHẨU':<12} HỌ TÊN")
    print("-" * 75)
    users = (
        db.query(User, Role)
        .join(Role, User.role_id == Role.id)
        .order_by(User.id.asc())
        .all()
    )
    for u, r in users:
        pwd = KEEP_ACCOUNTS.get(u.email, {}).get("password", "******")
        print(f"{u.code:<10} {r.name:<10} {u.email:<26} {pwd:<12} {u.full_name}")
    print("=" * 75 + "\n")


def main() -> None:
    db = SessionLocal()
    try:
        clean_database(db)
        print_summary(db)
    except Exception as exc:
        db.rollback()
        print(f"[LỖI] Quá trình làm sạch thất bại: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
