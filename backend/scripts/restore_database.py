#!/usr/bin/env python3
"""
Kịch bản phục hồi cơ sở dữ liệu (Disaster Recovery) từ bản sao lưu cục bộ hoặc Cloud Storage.
Tự động giải mã tệp sao lưu đã mã hóa và nạp dữ liệu vào Database.

Sử dụng:
    python scripts/restore_database.py --backup-id 1
    python scripts/restore_database.py --file backups/ictu_backup_full_20261019_020000.sql.gz.enc
    python scripts/restore_database.py --cloud-url s3://ictu-internship-backups/2026/10/ictu_backup_full.sql.gz.enc
"""

from __future__ import annotations

import argparse
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.database import SessionLocal, engine
from app.services.backup_encryption_service import BackupEncryptionService
from app.services.backup_service import BackupService
from app.services.cloud_backup_provider import CloudBackupProvider
from app.services.database_dump_engine import DatabaseDumpEngine


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Kịch bản phục hồi CSDL từ bản sao lưu cục bộ hoặc Cloud Storage (Disaster Recovery)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--backup-id", type=int, help="ID bản ghi sao lưu trong bảng backup_records")
    group.add_argument("--file", type=str, help="Đường dẫn tới tệp sao lưu (.sql hoặc .sql.gz.enc)")
    group.add_argument("--cloud-url", type=str, help="Địa chỉ bản sao lưu trên Cloud Storage (s3://...)")

    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Bỏ qua xác nhận an toàn trước khi phục hồi CSDL",
    )

    args = parser.parse_args()

    print("=" * 65)
    print("ICTU INTERNSHIP PORTAL - DATABASE RESTORE & DISASTER RECOVERY")
    print("=" * 65)
    print("CẢNH BÁO: Quá trình phục hồi sẽ ghi đè dữ liệu hiện tại trong Database!")

    if not args.yes:
        confirm = input("Bạn có chắc chắn muốn tiếp tục phục hồi CSDL? (yes/no): ").strip().lower()
        if confirm not in ("yes", "y"):
            print("Đã hủy thao tác phục hồi.")
            return 0

    db = SessionLocal()
    try:
        service = BackupService(db)

        if args.backup_id:
            res = service.restore_backup(args.backup_id, current_user=None)
            print(f"\n[SUCCESS] {res['detail']}")
            print(f"- Tệp phục hồi: {res['filename']}")
            print(f"- Thời điểm phục hồi: {res['restored_at']}")
            return 0

        # Nếu truyền qua file hoặc cloud-url trực tiếp
        target_file = args.file
        if args.cloud_url:
            cloud_provider = CloudBackupProvider()
            filename = os.path.basename(args.cloud_url)
            local_dest = os.path.join(service._ensure_storage_dir(), f"downloaded_{filename}")
            print(f"Đang tải bản sao lưu từ Cloud Storage: {args.cloud_url} ...")
            target_file = cloud_provider.download_file(args.cloud_url, local_dest)
            print(f"Tải thành công: {target_file}")

        if not target_file or not os.path.exists(target_file):
            print(f"\n[ERROR] Tệp không tồn tại: {target_file}", file=sys.stderr)
            return 1

        # Giải mã nếu tệp bị mã hóa
        sql_to_execute = target_file
        temp_decrypted = None
        if target_file.endswith(".enc"):
            print("Đang giải mã và giải nén tệp sao lưu...")
            temp_decrypted = target_file + ".restore.sql"
            enc_service = BackupEncryptionService()
            enc_service.decrypt_and_decompress(target_file, temp_decrypted)
            sql_to_execute = temp_decrypted
            print(f"Giải mã hoàn tất: {sql_to_execute}")

        try:
            print("Đang nạp cấu trúc và dữ liệu vào Database...")
            dump_engine = DatabaseDumpEngine(engine)
            dump_engine.restore_sql(sql_to_execute)
            print("\n[SUCCESS] Khôi phục cơ sở dữ liệu thành công!")
        finally:
            if temp_decrypted and os.path.exists(temp_decrypted):
                try:
                    os.remove(temp_decrypted)
                except Exception:
                    pass

        return 0

    except Exception as exc:
        print(f"\n[ERROR] Lỗi trong quá trình phục hồi Database: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
