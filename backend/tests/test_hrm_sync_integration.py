"""
Unit and Integration tests for HRM Integration & Synchronization Service (US-37).
Tests API sync, Webhook receiver with HMAC-SHA256, Cron scheduler controls, and Admin endpoints.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models as _models  # noqa: F401
from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.department import Department
from app.models.hrm_sync_log import HrmSyncLog
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.hrm_sync import HrmPersonnelItem, HrmWebhookPayload
from app.services.hrm_sync_service import HrmCronScheduler, HrmSyncService
from app.utils.authenticate_login import create_access_token


@pytest.fixture
def test_setup() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(id=1, name="admin", description="Admin")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        intern_role = Role(id=4, name="intern", description="Intern")
        db.add_all([admin_role, hr_role, mentor_role, intern_role])
        db.flush()

        admin_user = User(
            id=1,
            code="ADM001",
            email="admin@ictu.edu.vn",
            password_hash="pwd",
            full_name="System Administrator",
            role_id=admin_role.id,
            status="active",
        )
        intern_user = User(
            id=2,
            code="INT001",
            email="intern@student.ictu.edu.vn",
            password_hash="pwd",
            full_name="Normal Intern",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([admin_user, intern_user])

        # HRM Settings
        settings = [
            SystemSetting(key="hrm_integration_enabled", value="true", category="integration"),
            SystemSetting(key="hrm_api_endpoint", value="https://hrm.ictu.edu.vn/api/v1/interns/sync", category="integration"),
            SystemSetting(key="hrm_api_key", value="test-secret-key-2026", category="integration"),
            SystemSetting(key="hrm_webhook_secret", value="whsec_test_secret_123", category="integration"),
            SystemSetting(key="hrm_auto_sync_enabled", value="true", category="integration"),
            SystemSetting(key="hrm_cron_interval_minutes", value="60", category="integration"),
        ]
        db.add_all(settings)
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client, session_factory

    app.dependency_overrides.clear()


def _auth_header(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def test_hrm_service_sync_personnel(test_setup: tuple[TestClient, sessionmaker]) -> None:
    _, session_factory = test_setup
    with session_factory() as db:
        service = HrmSyncService(db)

        items = [
            HrmPersonnelItem(
                employee_code="HRM-MTR-101",
                full_name="Nguyễn Văn Mentor",
                email="mentor.nv@hrm-partner.vn",
                phone="0912345678",
                role="mentor",
                department_name="Phòng Công nghệ Phần mềm",
                position="Senior Tech Lead / Mentor",
                status="active",
            ),
            HrmPersonnelItem(
                employee_code="HRM-INT-202",
                full_name="Lê Thị Thực Tập",
                email="intern.lt@student.ictu.edu.vn",
                phone="0987654321",
                role="intern",
                department_name="Phòng Công nghệ Phần mềm",
                position="TTS Backend Python",
                university="ICTU",
                major="KTPM",
                status="active",
            ),
        ]

        # 1. First sync - Should create new users
        log = service.sync_personnel(items, sync_type="manual", source="TestFastHRM")
        assert log.status == "success"
        assert log.total_records == 2
        assert log.created_users == 2
        assert log.updated_users == 0
        assert log.mentors_synced == 1
        assert log.interns_synced == 1

        # Check DB records
        created_mentor = db.query(User).filter(User.email == "mentor.nv@hrm-partner.vn").first()
        assert created_mentor is not None
        assert created_mentor.full_name == "Nguyễn Văn Mentor"
        assert created_mentor.role.name == "mentor"
        profile = db.query(UserProfile).filter(UserProfile.user_id == created_mentor.id).first()
        assert profile is not None
        assert profile.position == "Senior Tech Lead / Mentor"
        assert profile.department.name == "Phòng Công nghệ Phần mềm"

        created_intern = db.query(User).filter(User.email == "intern.lt@student.ictu.edu.vn").first()
        assert created_intern is not None
        intern_prof = db.query(InternProfile).filter(InternProfile.user_id == created_intern.id).first()
        assert intern_prof is not None
        assert intern_prof.university == "ICTU"

        # 2. Second sync with updated info - Should update, not duplicate
        updated_items = [
            HrmPersonnelItem(
                employee_code="HRM-MTR-101",
                full_name="Nguyễn Văn Mentor (Cập nhật)",
                email="mentor.nv@hrm-partner.vn",
                phone="0912999999",
                role="mentor",
                department_name="Phòng Công nghệ Phần mềm",
                position="Principal Engineer",
                status="active",
            ),
        ]
        log_update = service.sync_personnel(updated_items, sync_type="manual", source="TestFastHRM")
        assert log_update.status == "success"
        assert log_update.created_users == 0
        assert log_update.updated_users == 1

        db.refresh(created_mentor)
        assert created_mentor.full_name == "Nguyễn Văn Mentor (Cập nhật)"
        db.refresh(profile)
        assert profile.phone_number == "0912999999"
        assert profile.position == "Principal Engineer"


def test_hrm_service_sync_from_api_mock_fallback(test_setup: tuple[TestClient, sessionmaker]) -> None:
    _, session_factory = test_setup
    with session_factory() as db:
        service = HrmSyncService(db)
        # Calling unreachable demo URL should gracefully fallback to standard HRM mock dataset
        log = service.sync_from_api(endpoint_override="https://unreachable-hrm.local/api", sync_type="cron")
        assert log.status == "success"
        assert log.total_records >= 3
        assert log.mentors_synced >= 2


def test_admin_hrm_endpoints_rbac(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, _ = test_setup

    # 1. Unauthenticated -> 401
    res = client.get("/api/admin/hrm/status")
    assert res.status_code == 401

    # 2. Authenticated as Intern -> 403
    intern_headers = _auth_header(2, "intern")
    res = client.get("/api/admin/hrm/status", headers=intern_headers)
    assert res.status_code == 403

    # 3. Authenticated as Admin -> 200
    admin_headers = _auth_header(1, "admin")
    res = client.get("/api/admin/hrm/status", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["integration_enabled"] is True
    assert data["scheduler_status"] in ("running", "idle")


def test_admin_hrm_sync_manual_trigger(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, session_factory = test_setup
    admin_headers = _auth_header(1, "admin")

    payload = {
        "source": "CustomHRM",
        "items": [
            {
                "employee_code": "CUSTOM-001",
                "full_name": "Phạm Minh Mentor",
                "email": "pham.minh@partner.com",
                "phone": "0977888999",
                "role": "mentor",
                "department_name": "Ban Đào Tạo & R&D",
                "position": "Lead Software Mentor",
                "status": "active",
            }
        ],
    }

    res = client.post("/api/admin/hrm/sync", json=payload, headers=admin_headers)
    assert res.status_code == 200
    resp_data = res.json()
    assert resp_data["success"] is True
    assert "Đồng bộ thành công" in resp_data["message"]
    assert resp_data["log"]["mentors_synced"] == 1
    assert resp_data["log"]["source"] == "CustomHRM"

    # Verify history endpoint
    hist_res = client.get("/api/admin/hrm/history?limit=10", headers=admin_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1
    assert history[0]["source"] == "CustomHRM"


def test_admin_hrm_scheduler_toggle(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, _ = test_setup
    admin_headers = _auth_header(1, "admin")

    # Turn scheduler off
    res = client.post("/api/admin/hrm/scheduler/toggle?active=false", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["scheduler_status"] == "stopped"

    # Turn scheduler on
    res = client.post("/api/admin/hrm/scheduler/toggle?active=true", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["scheduler_status"] == "running"

    # Ensure background thread is cleaned up after test
    HrmCronScheduler.get_instance().stop()


def test_hrm_webhook_receiver_valid_and_invalid_signature(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, _ = test_setup
    secret = "whsec_test_secret_123"

    payload_dict = {
        "event": "personnel.sync",
        "source": "FastHRM Live Webhook",
        "timestamp": 1729000000,
        "data": [
            {
                "employee_code": "WH-MTR-888",
                "full_name": "Vũ Đình Mentor",
                "email": "vu.dinh@hrm-live.vn",
                "phone": "0966554433",
                "role": "mentor",
                "department_name": "Phòng Trí Tuệ Nhân Tạo",
                "position": "AI Mentor",
                "status": "active",
            }
        ],
    }
    raw_body = json.dumps(payload_dict).encode("utf-8")

    # 1. Invalid signature -> 401
    bad_headers = {
        "Content-Type": "application/json",
        "X-HRM-Signature": "sha256=invalid_hash_signature",
    }
    res = client.post("/api/webhooks/hrm", content=raw_body, headers=bad_headers)
    assert res.status_code == 401
    assert "chữ ký số" in res.json()["detail"].lower()

    # 2. Valid HMAC SHA-256 signature -> 200
    valid_sig = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    good_headers = {
        "Content-Type": "application/json",
        "X-HRM-Signature": f"sha256={valid_sig}",
    }
    res = client.post("/api/webhooks/hrm", content=raw_body, headers=good_headers)
    assert res.status_code == 200
    resp_data = res.json()
    assert resp_data["success"] is True
    assert "Đồng bộ Webhook thành công" in resp_data["detail"]
