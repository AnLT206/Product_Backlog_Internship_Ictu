"""
Unit and integration tests for HRM Data Mapping, Deduplication & Reconciliation Logic (US-37).
Tests normalization, cross-field conflict detection, conflict strategies (update, merge, skip),
and preview dry-run endpoints.
"""

from __future__ import annotations

from collections.abc import Generator
from datetime import date

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
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.hrm_sync import HrmPersonnelItem
from app.services.hrm_data_mapper import HrmDataMapper
from app.services.hrm_reconciliation_service import HrmReconciliationService
from app.services.hrm_sync_service import HrmSyncService
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
            full_name="Quản Trị Viên",
            role_id=admin_role.id,
            status="active",
        )
        existing_mentor = User(
            id=2,
            code="MTR001",
            email="mentor.old@ictu.edu.vn",
            cccd="001099000111",
            password_hash="pwd",
            full_name="Nguyễn Văn Cũ",
            role_id=mentor_role.id,
            status="active",
        )
        existing_dept = Department(id=1, name="Phòng R&D", description="Research & Development")
        db.add_all([admin_user, existing_mentor, existing_dept])
        db.flush()

        mentor_profile = UserProfile(
            user_id=existing_mentor.id,
            department_id=existing_dept.id,
            phone_number="0911222333",
            position="Junior Mentor",
            dob=date(1990, 5, 20),
        )
        db.add(mentor_profile)

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


# ── TEST 1: DATA MAPPING UNIT TESTS ──────────────────────────────────────────

def test_data_mapper_normalizations() -> None:
    # 1. Email normalization
    assert HrmDataMapper.normalize_email("  User.Test@Partner.VN  ") == "user.test@partner.vn"
    with pytest.raises(ValueError):
        HrmDataMapper.normalize_email("invalid-email-string")

    # 2. Phone normalization (Vietnam standard)
    assert HrmDataMapper.normalize_phone("+84 981.234.567") == "0981234567"
    assert HrmDataMapper.normalize_phone("84982-345-678") == "0982345678"
    assert HrmDataMapper.normalize_phone("0983 456 789") == "0983456789"

    # 3. CCCD normalization
    assert HrmDataMapper.normalize_cccd("0010 9501 2341") == "001095012341"
    assert HrmDataMapper.normalize_cccd("123-456-789") == "123456789"

    # 4. Date of Birth parsing
    assert HrmDataMapper.normalize_dob("15/08/1998") == date(1998, 8, 15)
    assert HrmDataMapper.normalize_dob("1998-08-15") == date(1998, 8, 15)
    assert HrmDataMapper.normalize_dob("1998-08-15T00:00:00Z") == date(1998, 8, 15)

    # 5. Role normalization from Vietnamese keywords
    assert HrmDataMapper.normalize_role("Giảng viên hướng dẫn") == "mentor"
    assert HrmDataMapper.normalize_role("Tech Lead / Mentor") == "mentor"
    assert HrmDataMapper.normalize_role("Chuyên viên tuyển dụng & nhân sự") == "hr"
    assert HrmDataMapper.normalize_role("Thực tập sinh Java Backend") == "intern"
    assert HrmDataMapper.normalize_role("Sinh viên thực tập") == "intern"


def test_data_mapper_map_batch_with_raw_fields() -> None:
    raw_list = [
        {
            "mail": "lead.mentor@partner.com",
            "ho_va_ten": "Hoàng Nam",
            "ma_nv": "EMP-9901",
            "dien_thoai": "+84 912 333 444",
            "chuc_vu": "Tech Lead Hướng Dẫn",
            "phong_ban": "Bộ phận AI & Cloud",
            "cmnd": "001095111222",
            "ngay_sinh": "25/12/1992",
            "trang_thai": "dang lam viec",
        },
        {
            "Email": "tts.viet@student.ictu.edu.vn",
            "FullName": "Trần Quốc Việt",
            "Code": "TTS-2026-01",
            "phone_number": "0987654321",
            "role": "Thực tập sinh",
            "truong_dai_hoc": "Đại học CNTT & TT Thái Nguyên",
            "chuyen_nganh": "Kỹ thuật phần mềm",
        },
        {
            # Bản ghi lỗi không có email
            "ho_ten": "Người Lỗi",
        },
    ]

    valid_items, errors = HrmDataMapper.map_batch(raw_list)
    assert len(valid_items) == 2
    assert len(errors) == 1
    assert errors[0]["index"] == 2

    # Kiểm tra bản ghi mentor
    mentor_item = valid_items[0]
    assert mentor_item.email == "lead.mentor@partner.com"
    assert mentor_item.full_name == "Hoàng Nam"
    assert mentor_item.employee_code == "EMP-9901"
    assert mentor_item.phone == "0912333444"
    assert mentor_item.role == "mentor"
    assert mentor_item.department_name == "Bộ phận AI & Cloud"
    assert mentor_item.dob == date(1992, 12, 25)
    assert mentor_item.status == "active"

    # Kiểm tra bản ghi intern
    intern_item = valid_items[1]
    assert intern_item.email == "tts.viet@student.ictu.edu.vn"
    assert intern_item.role == "intern"
    assert intern_item.university == "Đại học CNTT & TT Thái Nguyên"
    assert intern_item.major == "Kỹ thuật phần mềm"


# ── TEST 2: RECONCILIATION & DEDUPLICATION LOGIC ─────────────────────────────

def test_reconciliation_multi_criteria_and_conflict_detection(test_setup: tuple[TestClient, sessionmaker]) -> None:
    _, session_factory = test_setup
    with session_factory() as db:
        reconciler = HrmReconciliationService(db)

        items = [
            # 1. Trùng email với User ID 2 (mentor.old@ictu.edu.vn)
            HrmPersonnelItem(
                employee_code="MTR001",
                full_name="Nguyễn Văn Mới (Tên cập nhật)",
                email="mentor.old@ictu.edu.vn",
                phone="0911222999",
                role="mentor",
                status="active",
            ),
            # 2. Tạo mới hoàn toàn (Không trùng email, cccd, code)
            HrmPersonnelItem(
                employee_code="NEW001",
                full_name="Ngô Bá Mới",
                email="ngo.ba@ictu.edu.vn",
                phone="0933444555",
                role="mentor",
                status="active",
            ),
            # 3. Xung đột chéo: Email mới nhưng CCCD trùng với User ID 2 (001099000111)
            HrmPersonnelItem(
                employee_code="NEW002",
                full_name="Người Có CCCD Trùng",
                email="someone.different@ictu.edu.vn",
                cccd="001099000111",
                role="mentor",
                status="active",
            ),
        ]

        summary, details = reconciler.analyze_reconciliation(items, conflict_strategy="update")

        assert summary.total_input == 3
        assert summary.to_update == 2  # item 1 (khớp email) + item 3 (khớp CCCD)
        assert summary.to_create == 1  # item 2
        assert summary.conflicts_count >= 1

        # Chi tiết item 1
        assert details[0].matched_user_id == 2
        assert details[0].matched_by == "email"
        assert details[0].action == "update"
        assert details[0].diff_fields is not None
        assert "full_name" in details[0].diff_fields

        # Chi tiết item 3 (xung đột CCCD)
        assert details[2].matched_user_id == 2
        assert details[2].matched_by == "cccd"


def test_reconciliation_strategies_update_merge_skip(test_setup: tuple[TestClient, sessionmaker]) -> None:
    _, session_factory = test_setup
    with session_factory() as db:
        reconciler = HrmReconciliationService(db)

        # Dữ liệu đối soát gửi lên cho mentor hiện có (ID 2):
        # Hiện tại: full_name="Nguyễn Văn Cũ", position="Junior Mentor", phone="0911222333", dob=1990-05-20
        # Gửi lên: full_name="Nguyễn Văn Đã Đổi", position="Senior Tech Lead", phone="0999999999", cccd="001099000111"
        test_item = [
            HrmPersonnelItem(
                employee_code="MTR001",
                full_name="Nguyễn Văn Đã Đổi",
                email="mentor.old@ictu.edu.vn",
                phone="0999999999",
                role="mentor",
                position="Senior Tech Lead",
                status="active",
            )
        ]

        # ── 1. Chiến lược SKIP: Không thay đổi bất kỳ trường nào trong DB
        counts_skip, _ = reconciler.execute_sync_with_reconciliation(test_item, conflict_strategy="skip")
        assert counts_skip["skipped_users"] == 1
        assert counts_skip["updated_users"] == 0

        user_db = db.query(User).filter(User.id == 2).first()
        assert user_db.full_name == "Nguyễn Văn Cũ"

        # ── 2. Chiến lược MERGE: Chỉ điền các trường còn trống, không ghi đè dữ liệu cũ
        # Giả sử ta set phone_number của profile = None để thử merge
        profile_db = db.query(UserProfile).filter(UserProfile.user_id == 2).first()
        profile_db.phone_number = None
        db.commit()

        counts_merge, _ = reconciler.execute_sync_with_reconciliation(test_item, conflict_strategy="merge")
        assert counts_merge["updated_users"] == 1

        db.refresh(user_db)
        db.refresh(profile_db)
        # Tên không bị ghi đè vì đã có sẵn
        assert user_db.full_name == "Nguyễn Văn Cũ"
        # Phone được merge vì lúc trước đang None
        assert profile_db.phone_number == "0999999999"
        # Position giữ nguyên cũ vì đã có
        assert profile_db.position == "Junior Mentor"

        # ── 3. Chiến lược UPDATE: Ghi đè toàn bộ thông tin mới
        counts_update, _ = reconciler.execute_sync_with_reconciliation(test_item, conflict_strategy="update")
        assert counts_update["updated_users"] == 1

        db.refresh(user_db)
        db.refresh(profile_db)
        # Tên và chức danh được cập nhật mới
        assert user_db.full_name == "Nguyễn Văn Đã Đổi"
        assert profile_db.position == "Senior Tech Lead"


# ── TEST 3: PREVIEW & SYNC API INTEGRATION TESTS ─────────────────────────────

def test_api_hrm_preview_reconciliation(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, _ = test_setup
    admin_headers = _auth_header(1, "admin")

    preview_payload = {
        "conflict_strategy": "update",
        "raw_data": [
            {
                "email": "mentor.old@ictu.edu.vn",
                "ho_ten": "Nguyễn Văn Update Test",
                "role": "Giảng viên hướng dẫn",
            },
            {
                "email": "fresh.user@partner.vn",
                "ho_ten": "Sinh Viên Mới",
                "role": "Thực tập sinh",
                "truong": "ICTU",
            },
        ],
    }

    res = client.post("/api/admin/hrm/preview", json=preview_payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["summary"]["total_input"] == 2
    assert data["summary"]["to_update"] == 1
    assert data["summary"]["to_create"] == 1
    assert data["summary"]["mentors_count"] == 1
    assert data["summary"]["interns_count"] == 1

    details = data["details"]
    assert len(details) == 2
    assert details[0]["matched_by"] == "email"
    assert details[0]["is_existing"] is True
    assert details[1]["is_existing"] is False


def test_api_hrm_sync_with_raw_data_and_merge_strategy(test_setup: tuple[TestClient, sessionmaker]) -> None:
    client, session_factory = test_setup
    admin_headers = _auth_header(1, "admin")

    sync_payload = {
        "source": "PartnerERP",
        "conflict_strategy": "merge",
        "raw_data": [
            {
                "mail": "erp.mentor@partner.vn",
                "ho_ten": "Trịnh Bá Mentor",
                "dien_thoai": "+84 966 777 888",
                "chuc_vu": "Tech Lead Hướng Dẫn",
                "phong_ban": "Bộ phận Cloud DevOps",
            }
        ],
    }

    res = client.post("/api/admin/hrm/sync", json=sync_payload, headers=admin_headers)
    assert res.status_code == 200
    resp_data = res.json()
    assert resp_data["success"] is True
    assert resp_data["reconciliation"]["to_create"] == 1
    assert resp_data["log"]["mentors_synced"] == 1

    # Kiểm tra trong DB
    with session_factory() as db:
        new_mentor = db.query(User).filter(User.email == "erp.mentor@partner.vn").first()
        assert new_mentor is not None
        assert new_mentor.full_name == "Trịnh Bá Mentor"
        assert new_mentor.role.name == "mentor"
        profile = db.query(UserProfile).filter(UserProfile.user_id == new_mentor.id).first()
        assert profile is not None
        assert profile.phone_number == "0966777888"
        assert profile.department.name == "Bộ phận Cloud DevOps"
