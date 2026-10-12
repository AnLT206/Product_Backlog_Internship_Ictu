"""Tests tích hợp cho quan hệ phân công Mentor qua InternProfile.mentor_id và bảng Mentor_Interns (US-30)."""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.mentor_intern import MentorIntern
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def db_session_and_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(id=1, name="hr", description="HR")
        intern_role = Role(id=2, name="intern", description="Intern")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([hr_role, intern_role, mentor_role, admin_role])
        db.flush()

        # HR (id=1)
        hr_user = User(
            id=1,
            code="HR0001",
            email="hr@example.com",
            password_hash="pwd",
            full_name="HR Manager",
            role_id=hr_role.id,
            status="active",
        )
        # Mentor 1 (id=2)
        mentor_user = User(
            id=2,
            code="MT0001",
            email="mentor1@example.com",
            password_hash="pwd",
            full_name="Mentor Nguyen",
            role_id=mentor_role.id,
            status="active",
        )
        # Mentor 2 (id=3)
        mentor_user_2 = User(
            id=3,
            code="MT0002",
            email="mentor2@example.com",
            password_hash="pwd",
            full_name="Mentor Tran",
            role_id=mentor_role.id,
            status="active",
        )
        # Intern 1 (id=10)
        intern_user_1 = User(
            id=10,
            code="TTS0001",
            email="intern1@example.com",
            password_hash="pwd",
            full_name="Intern Le",
            role_id=intern_role.id,
            status="active",
        )
        # Intern 2 (id=11)
        intern_user_2 = User(
            id=11,
            code="TTS0002",
            email="intern2@example.com",
            password_hash="pwd",
            full_name="Intern Pham",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([hr_user, mentor_user, mentor_user_2, intern_user_1, intern_user_2])
        db.flush()

        p1 = InternProfile(
            user_id=10,
            university="ICTU",
            major="CNTT",
            status="approved",
        )
        p2 = InternProfile(
            user_id=11,
            university="ICTU",
            major="KTPM",
            status="approved",
        )
        db.add_all([p1, p2])

        prog = InternshipProgram(
            id=1,
            name="Đợt 1 - 2026",
            department="CNTT",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=20,
            status="open",
        )
        db.add(prog)
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def _hr_headers() -> dict[str, str]:
    token = create_access_token(user_id=1, role="hr")
    return {"Authorization": f"Bearer {token}"}


# ── 1. Kiểm tra cấu trúc Schema Bảng và Khóa ngoại ────────────────────────────

def test_intern_profile_and_mentor_interns_schema_structure(db_session_and_client):
    """Kiểm tra cột mentor_id trong intern_profiles và cấu trúc bảng trung gian mentor_interns."""
    _, session_factory = db_session_and_client
    with session_factory() as db:
        inspector = inspect(db.get_bind())

        # Kiểm tra cột bảng intern_profiles
        ip_columns = {col["name"]: col for col in inspector.get_columns("intern_profiles")}
        assert "mentor_id" in ip_columns, "Bảng intern_profiles phải có cột mentor_id"
        assert ip_columns["mentor_id"]["nullable"] is True

        # Kiểm tra bảng trung gian mentor_interns
        table_names = inspector.get_table_names()
        assert "mentor_interns" in table_names, "Hệ thống phải có bảng trung gian mentor_interns"

        mi_columns = {col["name"]: col for col in inspector.get_columns("mentor_interns")}
        assert "mentor_id" in mi_columns
        assert "intern_id" in mi_columns
        assert "assigned_at" in mi_columns


# ── 2. Kiểm tra gán Mentor cập nhật InternProfile và MentorIntern ───────────────

def test_assign_interns_syncs_intern_profile_and_mentor_interns(db_session_and_client):
    """Gán Mentor cho TTS cập nhật đồng thời InternProfile.mentor_id và MentorIntern."""
    client, session_factory = db_session_and_client

    # HR gán intern 10 và 11 cho mentor 2 trong program 1
    resp = client.post(
        "/api/hr/mentors/2/assign-interns",
        json={"intern_ids": [10, 11], "program_id": 1},
        headers=_hr_headers(),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["mentor_id"] == 2
    assert body["assigned_count"] == 2

    with session_factory() as db:
        # 1. Kiểm tra InternProfile có mentor_id = 2
        p1 = db.query(InternProfile).filter(InternProfile.user_id == 10).one()
        p2 = db.query(InternProfile).filter(InternProfile.user_id == 11).one()
        assert p1.mentor_id == 2
        assert p2.mentor_id == 2

        # Kiểm tra ORM relationship: intern_profile.mentor
        assert p1.mentor is not None
        assert p1.mentor.id == 2
        assert p1.mentor.full_name == "Mentor Nguyen"

        # Kiểm tra ORM relationship: mentor_user.mentored_intern_profiles
        mentor = db.query(User).filter(User.id == 2).one()
        assigned_intern_user_ids = {prof.user_id for prof in mentor.mentored_intern_profiles}
        assert {10, 11} <= assigned_intern_user_ids

        # 2. Kiểm tra bảng trung gian mentor_interns
        mi_rows = db.query(MentorIntern).filter(MentorIntern.mentor_id == 2).all()
        assert len(mi_rows) == 2
        mi_intern_ids = {row.intern_id for row in mi_rows}
        assert mi_intern_ids == {10, 11}


# ── 3. Kiểm tra thay đổi phân công sang Mentor khác ───────────────────────────

def test_reassign_intern_to_another_mentor(db_session_and_client):
    """Đổi phân công TTS sang mentor khác cập nhật chính xác quan hệ."""
    client, session_factory = db_session_and_client

    # Đầu tiên gán cho Mentor 2
    client.post(
        "/api/hr/mentors/2/assign-interns",
        json={"intern_ids": [10], "program_id": 1},
        headers=_hr_headers(),
    )

    # Đổi sang Mentor 3
    resp = client.post(
        "/api/hr/mentors/assign",
        json={"mentor_id": 3, "intern_ids": [10], "program_id": 1},
        headers=_hr_headers(),
    )
    assert resp.status_code == 200

    with session_factory() as db:
        profile = db.query(InternProfile).filter(InternProfile.user_id == 10).one()
        assert profile.mentor_id == 3
        assert profile.mentor.full_name == "Mentor Tran"

        mi = db.query(MentorIntern).filter(MentorIntern.intern_id == 10).one()
        assert mi.mentor_id == 3


# ── 4. Tạo thực tập sinh mới kèm MentorId trực tiếp ───────────────────────────

def test_create_intern_with_mentor_id(db_session_and_client):
    """HR tạo TTS mới kèm mentor_id lưu đúng vào InternProfile và MentorIntern."""
    client, session_factory = db_session_and_client

    payload = {
        "full_name": "Nguyen Van Moi",
        "email": "intern_new@example.com",
        "password": "Password123",
        "university": "ICTU",
        "major": "ATTT",
        "status": "pending",
        "mentor_id": 2,
    }
    resp = client.post("/api/hr/interns", json=payload, headers=_hr_headers())
    assert resp.status_code == 201
    new_user_id = resp.json()["id"]

    with session_factory() as db:
        profile = db.query(InternProfile).filter(InternProfile.user_id == new_user_id).one()
        assert profile.mentor_id == 2

        mi = db.query(MentorIntern).filter(MentorIntern.intern_id == new_user_id).first()
        assert mi is not None
        assert mi.mentor_id == 2

    # Lấy thông tin chi tiết TTS qua API có mentor_id và mentor_name
    detail_resp = client.get(f"/api/hr/interns/{new_user_id}", headers=_hr_headers())
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["mentor_id"] == 2
    assert detail["mentor_name"] == "Mentor Nguyen"


# ── 5. Cập nhật hồ sơ thực tập sinh qua API PUT ────────────────────────────────

def test_update_intern_profile_mentor_id(db_session_and_client):
    """Cập nhật hồ sơ TTS gán mentor_id thành công."""
    client, session_factory = db_session_and_client

    update_resp = client.put(
        "/api/hr/interns/10",
        json={"mentor_id": 3},
        headers=_hr_headers(),
    )
    assert update_resp.status_code == 200
    body = update_resp.json()
    assert body["mentor_id"] == 3
    assert body["mentor_name"] == "Mentor Tran"

    with session_factory() as db:
        profile = db.query(InternProfile).filter(InternProfile.user_id == 10).one()
        assert profile.mentor_id == 3


# ── 6. Báo lỗi khi gán Mentor ID không tồn tại ─────────────────────────────────

def test_assign_non_existent_mentor_fails(db_session_and_client):
    """Gán mentor_id không tồn tại hoặc không phải mentor trả về 404."""
    client, _ = db_session_and_client

    # Mentor ID 9999 không tồn tại
    resp1 = client.put(
        "/api/hr/interns/10",
        json={"mentor_id": 9999},
        headers=_hr_headers(),
    )
    assert resp1.status_code == 404

    # ID 10 là intern (không phải mentor)
    resp2 = client.put(
        "/api/hr/interns/11",
        json={"mentor_id": 10},
        headers=_hr_headers(),
    )
    assert resp2.status_code == 404
