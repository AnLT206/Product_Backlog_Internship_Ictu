"""
Unit & Integration tests for Disaster Recovery Safe Restore (US-43 / Super Admin Safe Restore).
Covers:
- Super Admin re-authentication (admin password verification)
- Confirmation phrase verification ("CONFIRM_RESTORE")
- Checksum SHA-256 integrity check and tampering prevention
- Automatic pre-restore Emergency Safety Snapshot
- Dry-run verification API (/api/admin/backups/verify/{backup_id})
- Concurrency lock protection (409 Conflict)
- RBAC permissions (403 for non-admins)
- SystemLog auditing
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
from app.models.system_log import SystemLog
from app.models.user import User
from app.schemas.backup_record import BackupCreateRequest, SafeRestoreRequest
from app.services.backup_encryption_service import BackupEncryptionService
from app.services.backup_service import BackupService
from app.utils.authenticate_login import create_access_token
from app.utils.hash_password import hash_password


ADMIN_PASSWORD = "SuperSecureAdminPassword2026!"


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
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name="Super Quản Trị Viên",
            role_id=admin_role.id,
            status="active",
        )
        intern_user = User(
            id=2,
            code="INT001",
            email="intern@ictu.edu.vn",
            password_hash=hash_password("intern123"),
            full_name="Sinh Viên Thực Tập",
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


# ── TEST 1: DRY-RUN VERIFY BACKUP INTEGRITY ───────────────────────────────────

def test_verify_backup_file_dry_run_success(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(
                backup_type="full",
                note="Test backup for verification",
                encrypt=True,
                upload_cloud=False,
            ),
            current_user=admin_user,
        )
        backup_id = created.id

    res = client.post(
        f"/api/admin/backups/verify/{backup_id}",
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["backup_id"] == backup_id
    assert data["is_valid"] is True
    assert data["file_exists"] is True
    assert data["checksum_matched"] is True
    assert data["can_decrypt"] is True
    assert "toàn vẹn" in data["message"].lower() or "hợp lệ" in data["message"].lower()


def test_verify_backup_file_tampered_fails(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(backup_type="full", encrypt=True, upload_cloud=False),
            current_user=admin_user,
        )
        backup_id = created.id

        # Tamper the file on disk
        rec = db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()
        with open(rec.file_path, "wb") as f:
            f.write(b"CORRUPTED_PAYLOAD_NOT_ENCRYPTED_PROPERLY")

    res = client.post(
        f"/api/admin/backups/verify/{backup_id}",
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is False
    assert data["checksum_matched"] is False


# ── TEST 2: RBAC PERMISSIONS ─────────────────────────────────────────────────

def test_safe_restore_forbidden_for_non_admin(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, _, _ = test_setup

    payload = {
        "admin_password": ADMIN_PASSWORD,
        "confirmation_phrase": "CONFIRM_RESTORE",
        "create_safety_snapshot": True,
        "verify_checksum": True,
    }
    res = client.post(
        "/api/admin/backups/1/restore-safe",
        json=payload,
        headers=_auth_header(2, "intern"),
    )
    assert res.status_code == 403


# ── TEST 3: RE-AUTHENTICATION & CONFIRMATION PHRASE ──────────────────────────

def test_safe_restore_wrong_password_rejected(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(backup_type="full", encrypt=True, upload_cloud=False),
            current_user=admin_user,
        )
        backup_id = created.id

    payload = {
        "admin_password": "WrongPasswordHere!",
        "confirmation_phrase": "CONFIRM_RESTORE",
        "create_safety_snapshot": True,
        "verify_checksum": True,
    }
    res = client.post(
        f"/api/admin/backups/{backup_id}/restore-safe",
        json=payload,
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 401
    assert "Mật khẩu Super Admin không chính xác" in res.json()["detail"]


def test_safe_restore_wrong_confirmation_phrase_rejected(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(backup_type="full", encrypt=True, upload_cloud=False),
            current_user=admin_user,
        )
        backup_id = created.id

    payload = {
        "admin_password": ADMIN_PASSWORD,
        "confirmation_phrase": "YES_RESTORE_PLEASE",
        "create_safety_snapshot": True,
        "verify_checksum": True,
    }
    res = client.post(
        f"/api/admin/backups/{backup_id}/restore-safe",
        json=payload,
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 400
    assert "Cụm từ xác nhận không chính xác" in res.json()["detail"]


# ── TEST 4: CHECKSUM TAMPERING PREVENTED ──────────────────────────────────────

def test_safe_restore_checksum_mismatch_aborts(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(backup_type="full", encrypt=True, upload_cloud=False),
            current_user=admin_user,
        )
        backup_id = created.id

        # Tamper checksum in record
        rec = db.query(BackupRecord).filter(BackupRecord.id == backup_id).first()
        rec.checksum_sha256 = "0000000000000000000000000000000000000000000000000000000000000000"
        db.commit()

    payload = {
        "admin_password": ADMIN_PASSWORD,
        "confirmation_phrase": "CONFIRM_RESTORE",
        "create_safety_snapshot": True,
        "verify_checksum": True,
    }
    res = client.post(
        f"/api/admin/backups/{backup_id}/restore-safe",
        json=payload,
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 400
    assert "Mã băm SHA-256 không khớp" in res.json()["detail"]


# ── TEST 5: SUCCESSFUL SAFE RESTORE & SAFETY SNAPSHOT ────────────────────────

def test_safe_restore_success_with_safety_snapshot_and_audit(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(
                backup_type="full",
                note="Safe disaster recovery test point",
                encrypt=True,
                upload_cloud=False,
            ),
            current_user=admin_user,
        )
        backup_id = created.id

    payload = {
        "admin_password": ADMIN_PASSWORD,
        "confirmation_phrase": "CONFIRM_RESTORE",
        "create_safety_snapshot": True,
        "verify_checksum": True,
    }
    res = client.post(
        f"/api/admin/backups/{backup_id}/restore-safe",
        json=payload,
        headers=_auth_header(1, "admin"),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["backup_id"] == backup_id
    assert data["checksum_verified"] is True
    assert data["safety_snapshot_filename"] is not None
    assert "ictu_safety_snapshot_before_restore_" in data["safety_snapshot_filename"]
    assert data["execution_time_seconds"] >= 0.0

    # Verify audit log in SystemLog
    with session_factory() as db:
        log = (
            db.query(SystemLog)
            .filter(SystemLog.path.like("%restore-safe%"))
            .order_by(SystemLog.id.desc())
            .first()
        )
        assert log is not None
        assert "Super Admin" in (log.description or "")
        assert "ictu_safety_snapshot_before_restore_" in (log.description or "")

        # Verify safety snapshot is recorded in BackupRecord registry
        snap_rec = (
            db.query(BackupRecord)
            .filter(BackupRecord.backup_type == "safety_snapshot")
            .first()
        )
        assert snap_rec is not None
        assert snap_rec.filename == data["safety_snapshot_filename"]


# ── TEST 6: CONCURRENCY LOCK TEST ─────────────────────────────────────────────

def test_safe_restore_concurrency_lock_prevents_simultaneous_restore(test_setup: tuple[TestClient, sessionmaker, object]) -> None:
    client, session_factory, _ = test_setup

    with session_factory() as db:
        admin_user = db.query(User).filter(User.id == 1).first()
        service = BackupService(db)
        created = service.create_backup(
            BackupCreateRequest(backup_type="full", encrypt=True, upload_cloud=False),
            current_user=admin_user,
        )
        backup_id = created.id

    # Simulate an active concurrent restore by locking the class-level lock
    acquired = BackupService._restore_lock.acquire(blocking=False)
    assert acquired is True

    try:
        payload = {
            "admin_password": ADMIN_PASSWORD,
            "confirmation_phrase": "CONFIRM_RESTORE",
            "create_safety_snapshot": False,
            "verify_checksum": True,
        }
        res = client.post(
            f"/api/admin/backups/{backup_id}/restore-safe",
            json=payload,
            headers=_auth_header(1, "admin"),
        )
        assert res.status_code == 409
        assert "đang chạy trong hệ thống" in res.json()["detail"]
    finally:
        BackupService._restore_lock.release()
