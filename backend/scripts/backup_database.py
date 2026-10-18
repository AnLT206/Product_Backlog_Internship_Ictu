#!/usr/bin/env python3
"""
Kịch bản tự động sao lưu Database (MySQL / PostgreSQL / SQLite) định kỳ hàng ngày
và lưu trữ mã hóa lên Cloud Storage (US-43).

Sử dụng:
    python scripts/backup_database.py
    python scripts/backup_database.py --type full --encrypt --cloud-upload
    python scripts/backup_database.py --retention-days 30

Ví dụ thiết lập crontab chạy 02:00 AM hàng ngày:
    0 2 * * * cd /app && python scripts/backup_database.py --encrypt --cloud-upload >> /var/log/backup.log 2>&1
"""

from __future__ import annotations

import argparse
import os
import sys

# Đảm bảo import được backend app
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.database import SessionLocal, engine
from app.schemas.backup_record import BackupCreateRequest
from app.services.backup_service import BackupService


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Kịch bản tự động sao lưu Database và lưu trữ mã hóa lên Cloud Storage"
    )
    parser.add_argument(
        "--type",
        choices=["full", "data_only", "schema_only"],
        default="full",
        help="Loại bản sao lưu: full (toàn bộ), data_only (dữ liệu), schema_only (cấu trúc bảng)",
    )
    parser.add_argument(
        "--encrypt",
        action="store_true",
        default=True,
        help="Nén gzip và mã hóa đối xứng an toàn (mặc định: True)",
    )
    parser.add_argument(
        "--no-encrypt",
        dest="encrypt",
        action="store_false",
        help="Không mã hóa tệp sao lưu",
    )
    parser.add_argument(
        "--cloud-upload",
        action="store_true",
        default=True,
        help="Tải tệp sao lưu đã mã hóa lên Cloud Storage (mặc định: True)",
    )
    parser.add_argument(
        "--no-cloud-upload",
        dest="cloud_upload",
        action="store_false",
        help="Không tải lên Cloud Storage",
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=30,
        help="Số ngày lưu trữ tệp trên Cloud Storage trước khi tự động dọn dẹp (mặc định: 30 ngày)",
    )
    parser.add_argument(
        "--note",
        type=str,
        default=None,
        help="Ghi chú cho bản sao lưu",
    )

    args = parser.parse_args()

    print("=" * 65)
    print("ICTU INTERNSHIP PORTAL - AUTOMATED DATABASE BACKUP SCRIPT")
    print(f"Timestamp: {os.popen('date').read().strip()}")
    print(f"Backup Type: {args.type.upper()}")
    print(f"Encryption: {'Enabled (AES-256-Fernet)' if args.encrypt else 'Disabled'}")
    print(f"Cloud Storage Upload: {'Enabled' if args.cloud_upload else 'Disabled'}")
    print(f"Retention Period: {args.retention_days} days")
    print("=" * 65)

    db = SessionLocal()
    try:
        service = BackupService(db)
        request = BackupCreateRequest(
            backup_type=args.type,
            note=args.note or f"Kịch bản CLI sao lưu tự động ({args.type.upper()})",
            encrypt=args.encrypt,
            upload_cloud=args.cloud_upload,
        )

        backup_item = service.create_backup(request, current_user=None)

        print("\n[SUCCESS] Sao lưu CSDL thành công!")
        print(f"- ID: {backup_item.id}")
        print(f"- Tên tệp: {backup_item.filename}")
        print(f"- Đường dẫn: {backup_item.file_path}")
        print(f"- Dung lượng: {backup_item.file_size_formatted}")
        print(f"- Đã mã hóa: {backup_item.is_encrypted} ({backup_item.encryption_algorithm or 'N/A'})")
        print(f"- Checksum SHA-256: {backup_item.checksum_sha256 or 'N/A'}")
        print(f"- Cloud Storage URL: {backup_item.cloud_storage_url or 'Chưa tải lên cloud'}")
        print(f"- Cloud Uploaded At: {backup_item.cloud_uploaded_at or 'N/A'}")

        # Dọn dẹp retention policy trên Cloud Storage
        if args.cloud_upload:
            deleted_count = service.cloud_provider.apply_retention_policy(args.retention_days)
            if deleted_count > 0:
                print(f"- Đã dọn dẹp {deleted_count} bản sao lưu cũ quá {args.retention_days} ngày trên Cloud Storage.")

        return 0

    except Exception as exc:
        print(f"\n[ERROR] Lỗi thực thi kịch bản sao lưu Database: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
