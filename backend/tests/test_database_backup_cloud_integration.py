"""
Integration tests for Database Automated Backup, AES Encryption, Cloud Storage,
and Disaster Recovery Restore Engine (US-43).
"""

from __future__ import annotations

import os
from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.backup_record import BackupRecord
from app.models.role import Role
from app.models.user import User
from app.schemas.backup_record import BackupCreateRequest
from app.services.backup_encryption_service import BackupEncryptionService
from app.services.backup_service import BackupService
from app.services.cloud_backup_provider import CloudBackupProvider
from app.services.database_dump_engine import DatabaseDumpEngine
from app.utils.authenticate_login import create_access_token


@pytest.fixture
def test_setup(tmp_path: object) -> Generator[tuple[TestClient, sessionmaker, object], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(id=1, name="admin", description="Admin")
        intern_role = Role(id=2, name="intern", description="Intern")
        db.add_all([admin_role, intern_role])
        db.flush()

        admin_user = User(
            id=1,
            code="ADM001",
            email="admin@ictu.edu.vn",
            password_hash="pwd",
            full_name="Quản Trị Viên",
            role_id=admin_role.id,
            status="active",
        )
        intern_user = User(
            id=2,
            code="INT001",
            email="intern@ictu.edu.vn",
            password_hash="pwd",
            full_name="Sinh Viên",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([admin_user, intern_user])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client, session_factory, engine

    app.dependency_overrides.clear()


def _auth_header(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


# ── TEST 1: DATABASE DUMP & RESTORE ENGINE ────────────────────────────────────

def test_database_dump_and_restore_engine(test_setup: tuple[TestClient, sessionmaker, object], tmp_path: any) -> None:
    _, _, test_engine = test_setup
    dump_engine = DatabaseDumpEngine(test_engine)

    dump_file = os.path.join(str(tmp_path), "test_dump.sql")
    dump_size = dump_engine.dump_database(dump_file, backup_type="full")

    assert os.path.exists(dump_file)
    assert dump_size > 0

    with open(dump_file, "r", encoding="utf-8") as f:
        content = f.read()

    assert "roles" in content
    assert "users" in content
    assert "admin@ictu.edu.vn" in content

    # Thử nạp lại file SQL
    restore_ok = dump_engine.restore_sql(dump_file)
    assert restore_ok is True


# ── TEST 2: GZIP COMPRESSION & AES/FERNET ENCRYPTION ─────────────────────────

def test_backup_encryption_and_decryption(tmp_path: any) -> None:
    enc_service = BackupEncryptionService(raw_key="super-secret-ictu-test-key-2026")

    sample_sql = os.path.join(str(tmp_path), "sample.sql")
    original_text = "-- ICTU DUMP\nINSERT INTO users (email) VALUES ('test@ictu.edu.vn');\n"
    with open(sample_sql, "w", encoding="utf-8") as f:
        f.write(original_text)

    # 1. Nén gzip và mã hóa
    enc_file, checksum, enc_size = enc_service.compress_and_encrypt(sample_sql)
    assert os.path.exists(enc_file)
    assert enc_size > 0
    assert len(checksum) == 64

    # Kiểm tra tệp mã hóa không còn đọc được chuỗi plain text
    with open(enc_file, "rb") as f:
        enc_content = f.read()
    assert b"test@ictu.edu.vn" not in enc_content

    # 2. Giải mã và giải nén
    restored_sql = os.path.join(str(tmp_path), "sample.decrypted.sql")
    decrypted_file = enc_service.decrypt_and_decompress(enc_file, restored_sql)
    assert os.path.exists(decrypted_file)

    with open(decrypted_file, "r", encoding="utf-8") as f:
        restored_text = f.read()

    assert restored_text == original_text


# ── TEST 3: CLOUD STORAGE PROVIDER & RETENTION POLICY ────────────────────────

def test_cloud_storage_provider_upload_download_retention(tmp_path: any) -> None:
    provider = CloudBackupProvider(
        provider="s3",
        bucket_name="test-ictu-backups",
        region="ap-southeast-1",
    )

    test_file = os.path.join(str(tmp_path), "cloud_sample.sql.gz.enc")
    with open(test_file, "wb") as f:
        f.write(b"MOCK_ENCRYPTED_PAYLOAD_FOR_CLOUD")

    # 1. Upload lên Cloud Storage
    res = provider.upload_file(test_file, "cloud_sample.sql.gz.enc")
    assert res["success"] is True
    assert "s3://test-ictu-backups" in res["cloud_url"]
    assert res["file_size"] > 0

    # 2. List backups trên Cloud
    items = provider.list_cloud_backups()
    assert len(items) >= 1
    assert any("cloud_sample.sql.gz.enc" in item["filename"] for item in items)

    # 3. Download từ Cloud Storage về local
    download_dest = os.path.join(str(tmp_path), "downloaded_from_cloud.enc")
    provider.download_file(res["cloud_url"], download_dest)
    assert os.path.exists(download_dest)
    with open(download_dest, "rb") as f:
        assert f.read() == b"MOCK_ENCRYPTED_PAYLOAD_FOR_CLOUD"

    # 4. Status
    status = provider.get_cloud_status()
    assert status.connected is True
    assert status.bucket == "test-ictu-backups"
    assert status.total_cloud_objects >= 1

    # 5. Retention policy
    deleted = provider.apply_retention_policy(retention_days=0)  # Xóa các file cũ
    assert deleted >= 1


# ── TEST 4: BACKUP SERVICE CREATE & DISASTER RECOVERY RESTORE ────────────────

def test_backup_service_create_and_restore(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    _, session_factory, _ = test_setup
    with session_factory() as db:
        admin = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)

        # 1. Kích hoạt sao lưu tự động (Dump + Nén + Mã hóa + Upload Cloud)
        request = BackupCreateRequest(
            backup_type="full",
            note="Kiểm thử sao lưu mã hóa Cloud",
            encrypt=True,
            upload_cloud=True,
        )
        backup_item = service.create_backup(request, current_user=admin)

        assert backup_item.is_encrypted is True
        assert backup_item.encryption_algorithm == "AES-256-Fernet"
        assert backup_item.checksum_sha256 is not None
        assert backup_item.cloud_storage_url is not None
        assert "s3://" in backup_item.cloud_storage_url

        # Kiểm tra trong DB
        db_rec = db.query(BackupRecord).filter(BackupRecord.id == backup_item.id).first()
        assert db_rec is not None
        assert db_rec.status == "completed"

        # 2. Khôi phục CSDL từ bản sao lưu mã hóa
        restore_res = service.restore_backup(backup_item.id, current_user=admin)
        assert "Khôi phục dữ liệu thành công" in restore_res["detail"]

        reloaded_rec = db.query(BackupRecord).filter(BackupRecord.id == backup_item.id).first()
        assert reloaded_rec is not None
        assert reloaded_rec.restored_at is not None



# ── TEST 5: ADMIN BACKUP API ENDPOINTS & RBAC ────────────────────────────────

def test_admin_backup_api_endpoints(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, _, _ = test_setup
    admin_headers = _auth_header(1, "admin")
    intern_headers = _auth_header(2, "intern")

    # 1. RBAC check: Intern bị 403 Forbidden
    res = client.get("/api/admin/backups", headers=intern_headers)
    assert res.status_code == 403

    # 2. Admin get overview (có cloud_status)
    res = client.get("/api/admin/backups", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "cloud_status" in data
    assert data["cloud_status"]["connected"] is True

    # 3. Kích hoạt kịch bản sao lưu tự động định kỳ qua API daily-run
    daily_res = client.post("/api/admin/backups/daily-run", headers=admin_headers)
    assert daily_res.status_code == 200
    daily_data = daily_res.json()
    assert daily_data["is_encrypted"] is True
    assert daily_data["cloud_storage_url"] is not None
    backup_id = daily_data["id"]

    # 4. Kiểm tra trạng thái Cloud Storage API
    cloud_res = client.get("/api/admin/backups/cloud-status", headers=admin_headers)
    assert cloud_res.status_code == 200
    assert cloud_res.json()["connected"] is True

    # 5. Phục hồi qua API
    restore_res = client.post(f"/api/admin/backups/{backup_id}/restore", headers=admin_headers)
    assert restore_res.status_code == 200
    assert "Khôi phục dữ liệu thành công" in restore_res.json()["detail"]
