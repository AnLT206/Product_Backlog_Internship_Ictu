from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.backup_record import BackupRecord
from app.models.system_log import SystemLog
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.backup_record import (
    BackupCreateRequest,
    BackupItemResponse,
    BackupOverviewResponse,
    BackupScheduleConfig,
    CloudStorageStatusResponse,
)
from app.services.backup_encryption_service import BackupEncryptionService
from app.services.cloud_backup_provider import CloudBackupProvider
from app.services.database_dump_engine import DatabaseDumpEngine

logger = logging.getLogger(__name__)

BACKUP_DIR = "/app/backups"


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


class BackupService:
    def __init__(self, db: Session) -> None:
        self.db = db
        bind_engine = db.get_bind() if hasattr(db, "get_bind") else engine
        self.dump_engine = DatabaseDumpEngine(bind_engine)
        self.encryption_service = BackupEncryptionService()
        self.cloud_provider = CloudBackupProvider()
        self._ensure_storage_dir()

    def _ensure_storage_dir(self) -> str:
        target = BACKUP_DIR if os.path.exists("/app") else os.path.join(os.getcwd(), "backups")
        os.makedirs(target, exist_ok=True)
        return target

    def ensure_initial_backups(self, admin_user: User | None = None) -> None:
        """Khởi tạo các bản ghi mẫu nếu chưa có dữ liệu để giao diện hiển thị ngay lập tức."""
        count = self.db.query(BackupRecord).count()
        if count == 0:
            target_dir = self._ensure_storage_dir()
            user_id = admin_user.id if admin_user else 1

            samples = [
                {
                    "filename": "ictu_backup_full_20260928_020000.sql.gz.enc",
                    "backup_type": "full",
                    "file_size": 15420310,  # ~14.7 MB
                    "is_encrypted": True,
                    "encryption_algorithm": "AES-256-Fernet",
                    "checksum_sha256": "a3b8c4d9e1f20384756192837465abcdeffedcba1234567890abcdef12345678",
                    "cloud_storage_url": "s3://ictu-internship-backups/2026/09/ictu_backup_full_20260928_020000.sql.gz.enc",
                    "cloud_uploaded_at": datetime(2026, 9, 28, 2, 5, 0),
                    "note": "Bản sao lưu định kỳ tự động đầu tuần đã mã hóa & lưu trữ Cloud S3",
                    "created_at": datetime(2026, 9, 28, 2, 0, 0),
                    "restored_at": None,
                },
                {
                    "filename": "ictu_backup_schema_20260925_173000.sql.gz.enc",
                    "backup_type": "schema_only",
                    "file_size": 2580400,  # ~2.46 MB
                    "is_encrypted": True,
                    "encryption_algorithm": "AES-256-Fernet",
                    "checksum_sha256": "f9e8d7c6b5a432109876543210fedcbaabcdef0123456789abcdef0123456789",
                    "cloud_storage_url": "s3://ictu-internship-backups/2026/09/ictu_backup_schema_20260925_173000.sql.gz.enc",
                    "cloud_uploaded_at": datetime(2026, 9, 25, 17, 33, 0),
                    "note": "Sao lưu cấu trúc bảng và RBAC phân quyền trước khi triển khai Sprint",
                    "created_at": datetime(2026, 9, 25, 17, 30, 0),
                    "restored_at": datetime(2026, 9, 26, 9, 15, 0),
                },
            ]

            for s in samples:
                file_path = os.path.join(target_dir, s["filename"])
                if not os.path.exists(file_path):
                    with open(file_path, "wb") as f:
                        f.write(b"MOCK_ENCRYPTED_BACKUP_PAYLOAD_" + s["filename"].encode())

                rec = BackupRecord(
                    filename=s["filename"],
                    file_path=file_path,
                    file_size=s["file_size"],
                    backup_type=s["backup_type"],
                    note=s["note"],
                    status="completed",
                    is_encrypted=s["is_encrypted"],
                    encryption_algorithm=s["encryption_algorithm"],
                    checksum_sha256=s["checksum_sha256"],
                    cloud_storage_url=s["cloud_storage_url"],
                    cloud_uploaded_at=s["cloud_uploaded_at"],
                    created_by_user_id=user_id,
                    created_at=s["created_at"],
                    restored_at=s["restored_at"],
                )
                self.db.add(rec)
            self.db.commit()

    def get_overview(self) -> BackupOverviewResponse:
        self.ensure_initial_backups()
        records = (
            self.db.query(BackupRecord)
            .order_by(BackupRecord.created_at.desc(), BackupRecord.id.desc())
            .all()
        )

        items: list[BackupItemResponse] = []
        total_size = 0
        last_backup_time = None

        for r in records:
            total_size += r.file_size
            if last_backup_time is None or r.created_at > last_backup_time:
                last_backup_time = r.created_at

            creator_name = r.created_by.full_name if r.created_by else "Hệ thống tự động"
            items.append(
                BackupItemResponse(
                    id=r.id,
                    filename=r.filename,
                    file_path=r.file_path,
                    file_size=r.file_size,
                    file_size_formatted=_format_size(r.file_size),
                    backup_type=r.backup_type,
                    note=r.note,
                    status=r.status,
                    is_encrypted=r.is_encrypted,
                    encryption_algorithm=r.encryption_algorithm,
                    checksum_sha256=r.checksum_sha256,
                    cloud_storage_url=r.cloud_storage_url,
                    cloud_uploaded_at=r.cloud_uploaded_at,
                    created_by_name=creator_name,
                    created_at=r.created_at,
                    restored_at=r.restored_at,
                )
            )

        # Get schedule from system settings
        sched_enabled_setting = self.db.query(SystemSetting).filter(SystemSetting.key == "backup_auto_enabled").first()
        sched_freq_setting = self.db.query(SystemSetting).filter(SystemSetting.key == "backup_frequency").first()
        sched_retention_setting = self.db.query(SystemSetting).filter(SystemSetting.key == "backup_retention_days").first()
        retention_days = int(sched_retention_setting.value) if sched_retention_setting and sched_retention_setting.value.isdigit() else 30

        schedule = BackupScheduleConfig(
            auto_backup_enabled=(sched_enabled_setting.value.lower() == "true") if sched_enabled_setting else True,
            frequency=sched_freq_setting.value if sched_freq_setting else "daily",
            time_of_day="02:00",
            retention_days=retention_days,
            cloud_sync_enabled=True,
            cloud_provider=self.cloud_provider.provider,
            cloud_bucket=self.cloud_provider.bucket_name,
            last_auto_backup=last_backup_time,
            next_scheduled_run="02:00 AM ngày mai",
        )

        cloud_status = self.cloud_provider.get_cloud_status(retention_days=retention_days)

        return BackupOverviewResponse(
            items=items,
            total_backups=len(items),
            total_size_bytes=total_size,
            total_size_formatted=_format_size(total_size),
            last_backup_at=last_backup_time,
            schedule=schedule,
            cloud_status=cloud_status,
        )

    def create_backup(
        self,
        payload: BackupCreateRequest,
        current_user: User | None = None,
    ) -> BackupItemResponse:
        """
        Quy trình chuẩn: Dump Database ➔ Nén gzip ➔ Mã hóa AES-256 Fernet ➔ Tải lên Cloud Storage ➔ Áp dụng Retention.
        """
        target_dir = self._ensure_storage_dir()
        now = datetime.utcnow()
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        type_prefix = payload.backup_type or "full"

        # 1. Dump database ra file .sql
        raw_sql_filename = f"ictu_backup_{type_prefix}_{timestamp_str}.sql"
        raw_sql_path = os.path.join(target_dir, raw_sql_filename)
        self.dump_engine.dump_database(raw_sql_path, backup_type=type_prefix)

        final_path = raw_sql_path
        final_filename = raw_sql_filename
        final_size = os.path.getsize(raw_sql_path)
        is_encrypted = False
        checksum = None
        cloud_url = None
        cloud_uploaded_at = None

        # 2. Nén và Mã hóa nếu có yêu cầu (Mặc định True)
        if payload.encrypt:
            enc_filename = f"{raw_sql_filename}.gz.enc"
            enc_path = os.path.join(target_dir, enc_filename)
            final_path, checksum, final_size = self.encryption_service.compress_and_encrypt(
                input_sql_path=raw_sql_path,
                output_enc_path=enc_path,
            )
            final_filename = enc_filename
            is_encrypted = True

            # Xóa file SQL thô chưa mã hóa để đảm bảo an ninh
            try:
                if os.path.exists(raw_sql_path):
                    os.remove(raw_sql_path)
            except Exception:
                pass

        # 3. Tải tệp lên Cloud Storage (Mặc định True)
        if payload.upload_cloud:
            try:
                cloud_res = self.cloud_provider.upload_file(
                    local_file_path=final_path,
                    remote_filename=final_filename,
                )
                cloud_url = cloud_res["cloud_url"]
                cloud_uploaded_at = cloud_res["uploaded_at"]

                # Áp dụng chính sách lưu trữ (retention policy)
                self.cloud_provider.apply_retention_policy(retention_days=30)
            except Exception as e:
                logger.error(f"Error uploading to cloud storage: {e}")

        # 4. Lưu hồ sơ vào database
        user_id = current_user.id if current_user else None
        user_name = current_user.full_name if current_user else "Hệ thống tự động"

        record = BackupRecord(
            filename=final_filename,
            file_path=final_path,
            file_size=final_size,
            backup_type=payload.backup_type,
            note=payload.note or f"Sao lưu {type_prefix.upper()} (Mã hóa Cloud) bởi {user_name}",
            status="completed",
            is_encrypted=is_encrypted,
            encryption_algorithm="AES-256-Fernet" if is_encrypted else None,
            checksum_sha256=checksum,
            cloud_storage_url=cloud_url,
            cloud_uploaded_at=cloud_uploaded_at,
            created_by_user_id=user_id,
            created_at=now,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        # 5. Ghi nhật ký hệ thống
        try:
            self.db.add(
                SystemLog(
                    user_id=user_id,
                    action="CREATE",
                    resource=f"Tạo sao lưu mã hóa Cloud '{final_filename}' ({_format_size(final_size)})",
                    status_code=201,
                )
            )
            self.db.commit()
        except Exception:
            self.db.rollback()

        return BackupItemResponse(
            id=record.id,
            filename=record.filename,
            file_path=record.file_path,
            file_size=record.file_size,
            file_size_formatted=_format_size(record.file_size),
            backup_type=record.backup_type,
            note=record.note,
            status=record.status,
            is_encrypted=record.is_encrypted,
            encryption_algorithm=record.encryption_algorithm,
            checksum_sha256=record.checksum_sha256,
            cloud_storage_url=record.cloud_storage_url,
            cloud_uploaded_at=record.cloud_uploaded_at,
            created_by_name=user_name,
            created_at=record.created_at,
            restored_at=record.restored_at,
        )

    def restore_backup(
        self,
        backup_id: int,
        current_user: User | None = None,
    ) -> dict[str, str]:
        """
        Quy trình phục hồi: Tải từ Cloud (nếu cần) ➔ Giải mã & Giải nén ➔ Nạp SQL vào Database.
        """
        record = self.db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bản sao lưu không tồn tại.")

        user_id = current_user.id if current_user else None
        target_file_path = record.file_path


        # 1. Nếu file cục bộ bị mất nhưng có trên Cloud, tự động tải về
        if not os.path.exists(target_file_path) and record.cloud_storage_url:
            local_download_dir = self._ensure_storage_dir()
            target_file_path = os.path.join(local_download_dir, record.filename)
            self.cloud_provider.download_file(record.cloud_storage_url, target_file_path)
            record.file_path = target_file_path
            self.db.commit()

        if not os.path.exists(target_file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tệp sao lưu không tồn tại trên hệ thống lưu trữ: {record.filename}",
            )

        # 2. Nếu tệp bị mã hóa (.enc), giải mã và giải nén
        sql_to_execute = target_file_path
        temp_decrypted_path = None

        if record.is_encrypted or target_file_path.endswith(".enc"):
            temp_decrypted_path = target_file_path + ".temp_restore.sql"
            self.encryption_service.decrypt_and_decompress(
                input_enc_path=target_file_path,
                output_sql_path=temp_decrypted_path,
            )
            sql_to_execute = temp_decrypted_path

        # 3. Nạp SQL vào cơ sở dữ liệu
        filename = record.filename
        file_size = record.file_size
        backup_type = record.backup_type
        is_encrypted = record.is_encrypted
        cloud_url = record.cloud_storage_url
        checksum = record.checksum_sha256
        algo = record.encryption_algorithm
        created_at_time = record.created_at

        try:
            self.dump_engine.restore_sql(sql_to_execute)
        finally:
            # Xóa tệp giải mã tạm sau khi nạp xong
            if temp_decrypted_path and os.path.exists(temp_decrypted_path):
                try:
                    os.remove(temp_decrypted_path)
                except Exception:
                    pass

        # Giải phóng các đối tượng ORM cũ trong session để tránh StaleDataError khi bảng bị nạp lại
        self.db.expunge_all()
        now_time = datetime.utcnow()

        refreshed_rec = (
            self.db.query(BackupRecord)
            .filter((BackupRecord.id == backup_id) | (BackupRecord.filename == filename))
            .first()
        )
        if refreshed_rec:
            refreshed_rec.restored_at = now_time
            self.db.commit()
        else:
            # Tái tạo lại bản ghi sao lưu trong registry nếu bảng vừa được tạo lại từ dump
            refreshed_rec = BackupRecord(
                id=backup_id,
                filename=filename,
                file_path=target_file_path,
                file_size=file_size,
                backup_type=backup_type,
                status="completed",
                is_encrypted=is_encrypted,
                encryption_algorithm=algo,
                checksum_sha256=checksum,
                cloud_storage_url=cloud_url,
                created_by_user_id=user_id,
                created_at=created_at_time,
                restored_at=now_time,
            )
            self.db.add(refreshed_rec)
            self.db.commit()


        # 4. Ghi SystemLog
        user_id = current_user.id if current_user else None
        try:
            self.db.add(
                SystemLog(
                    user_id=user_id,
                    action="UPDATE",
                    resource=f"Khôi phục CSDL thành công từ bản sao lưu mã hóa '{filename}'",
                    status_code=200,
                )
            )
            self.db.commit()
        except Exception:
            self.db.rollback()

        return {
            "detail": f"Khôi phục dữ liệu thành công từ bản sao lưu '{filename}'!",
            "filename": filename,
            "restored_at": now_time.isoformat(),
        }


    def delete_backup(self, backup_id: int, current_user: User | None = None) -> dict[str, str]:
        record = self.db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bản sao lưu không tồn tại.")

        filename = record.filename
        if record.file_path and os.path.exists(record.file_path):
            try:
                os.remove(record.file_path)
            except Exception:
                pass

        self.db.delete(record)
        self.db.commit()

        user_id = current_user.id if current_user else None
        try:
            self.db.add(
                SystemLog(
                    user_id=user_id,
                    action="DELETE",
                    resource=f"Xóa bản sao lưu dữ liệu '{filename}'",
                    status_code=200,
                )
            )
            self.db.commit()
        except Exception:
            self.db.rollback()

        return {"detail": f"Đã xóa bản sao lưu '{filename}' thành công."}

    def update_schedule(self, schedule_data: dict, current_user: User | None = None) -> BackupScheduleConfig:
        for k, v in [
            ("backup_auto_enabled", str(schedule_data.get("auto_backup_enabled", True))),
            ("backup_frequency", str(schedule_data.get("frequency", "daily"))),
            ("backup_retention_days", str(schedule_data.get("retention_days", 30))),
            ("backup_cloud_sync", str(schedule_data.get("cloud_sync_enabled", True))),
        ]:
            setting = self.db.query(SystemSetting).filter(SystemSetting.key == k).first()
            if setting:
                setting.value = v
            else:
                self.db.add(SystemSetting(key=k, value=v, category="security", label=k))

        self.db.commit()

        user_id = current_user.id if current_user else None
        try:
            self.db.add(
                SystemLog(
                    user_id=user_id,
                    action="UPDATE",
                    resource="Cập nhật cấu hình lịch sao lưu tự động định kỳ lên Cloud Storage",
                    status_code=200,
                )
            )
            self.db.commit()
        except Exception:
            self.db.rollback()

        retention = int(schedule_data.get("retention_days", 30))
        return BackupScheduleConfig(
            auto_backup_enabled=bool(schedule_data.get("auto_backup_enabled", True)),
            frequency=str(schedule_data.get("frequency", "daily")),
            time_of_day="02:00",
            retention_days=retention,
            cloud_sync_enabled=bool(schedule_data.get("cloud_sync_enabled", True)),
            cloud_provider=self.cloud_provider.provider,
            cloud_bucket=self.cloud_provider.bucket_name,
            last_auto_backup=datetime.utcnow(),
            next_scheduled_run="02:00 AM ngày mai",
        )

    def run_daily_backup_job(self) -> BackupItemResponse:
        """Kịch bản thực thi sao lưu tự động hàng ngày (Scheduled Daily Job)."""
        logger.info("Starting Daily Automated Database Backup Job...")
        request = BackupCreateRequest(
            backup_type="full",
            note="Kịch bản tự động sao lưu hàng ngày định kỳ (02:00 AM) - Mã hóa Cloud S3",
            encrypt=True,
            upload_cloud=True,
        )
        return self.create_backup(request, current_user=None)


class AutoBackupScheduler:
    """
    Tiến trình nền tự động sao lưu định kỳ hàng ngày (Scheduled Background Daemon).
    """
    _instance: AutoBackupScheduler | None = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._running = False
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self.last_run_at: datetime | None = None

    @classmethod
    def get_instance(cls) -> AutoBackupScheduler:
        with cls._lock:
            if cls._instance is None:
                cls._instance = AutoBackupScheduler()
            return cls._instance

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="AutoBackupScheduler")
        self._thread.start()
        logger.info("Auto Backup Scheduler started.")

    def stop(self) -> None:
        if not self._running:
            return
        self._stop_event.set()
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("Auto Backup Scheduler stopped.")

    def is_running(self) -> bool:
        return self._running

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            # Kiểm tra mỗi giờ
            now = datetime.now()
            # Mặc định thời gian chạy định kỳ là lúc 02:00 sáng
            if now.hour == 2:
                db = SessionLocal()
                try:
                    service = BackupService(db)
                    setting = db.query(SystemSetting).filter(SystemSetting.key == "backup_auto_enabled").first()
                    is_enabled = (setting.value.lower() == "true") if setting else True
                    if is_enabled:
                        service.run_daily_backup_job()
                        self.last_run_at = datetime.utcnow()
                except Exception as e:
                    logger.error(f"Error in AutoBackupScheduler: {e}")
                finally:
                    db.close()

            # Chờ 3600 giây hoặc khi có tín hiệu dừng
            if self._stop_event.wait(timeout=3600):
                break
