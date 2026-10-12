"""Tests tích hợp cho API POST /api/hr/assign-mentor (gán một hoặc nhiều TTS cho Mentor)."""

from datetime import date
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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
def assign_api_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        intern_role = Role(id=1, name="intern", description="Intern")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([intern_role, hr_role, mentor_role, admin_role])
        db.flush()

        # Intern 1 (id=1)
        db.add(
            User(
                id=1,
                code="TTS0001",
                email="intern1@example.com",
                password_hash="hash",
                full_name="Thực tập sinh 1",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.add(InternProfile(user_id=1, university="ĐH CNTT", major="CNTT"))

        # Intern 2 (id=2)
        db.add(
            User(
                id=2,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="hash",
                full_name="Thực tập sinh 2",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.add(InternProfile(user_id=2, university="ĐH Bách Khoa", major="KTPM"))

        # Intern 3 (id=3)
        db.add(
            User(
                id=3,
                code="TTS0003",
                email="intern3@example.com",
                password_hash="hash",
                full_name="Thực tập sinh 3",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.add(InternProfile(user_id=3, university="ĐH Sư Phạm", major="CNTT"))

        # Mentor 1 (id=10)
        db.add(
            User(
                id=10,
                code="MEN0001",
                email="mentor1@example.com",
                password_hash="hash",
                full_name="Nguyễn Văn Mentor",
                role_id=mentor_role.id,
                status="active",
            )
        )

        # HR (id=20)
        db.add(
            User(
                id=20,
                code="HR0001",
                email="hr@example.com",
                password_hash="hash",
                full_name="Trần Thị HR",
                role_id=hr_role.id,
                status="active",
            )
        )

        # Admin (id=30)
        db.add(
            User(
                id=30,
                code="ADM0001",
                email="admin@example.com",
                password_hash="hash",
                full_name="Lê Admin",
                role_id=admin_role.id,
                status="active",
            )
        )

        # Open program
        open_program = InternshipProgram(
            id=1,
            name="Kỳ thực tập Thu 2026",
            department="Phát triển phần mềm",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            status="open",
            max_interns=50,
        )
        db.add(open_program)
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, session_factory
    app.dependency_overrides.clear()


def _auth_header(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def test_assign_single_intern_via_intern_id(assign_api_client):
    client, session_factory = assign_api_client

    payload = {
        "mentor_id": 10,
        "intern_id": 1,
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["mentor_id"] == 10
    assert data["mentor_name"] == "Nguyễn Văn Mentor"
    assert data["assigned_count"] == 1
    assert data["intern_count"] == 1
    assert data["intern_ids"] == [1]
    assert "Đã phân công thành công" in data["message"]

    # Kiểm tra database đồng bộ đầy đủ
    with session_factory() as db:
        # InternProfile
        profile = db.query(InternProfile).filter(InternProfile.user_id == 1).first()
        assert profile is not None
        assert profile.mentor_id == 10

        # MentorIntern
        mi = db.query(MentorIntern).filter(MentorIntern.intern_id == 1).first()
        assert mi is not None
        assert mi.mentor_id == 10

        # ProgramMember
        pm = db.query(ProgramMember).filter(ProgramMember.intern_user_id == 1).first()
        assert pm is not None
        assert pm.mentor_user_id == 10


def test_assign_multiple_interns_via_intern_ids(assign_api_client):
    client, session_factory = assign_api_client

    payload = {
        "mentor_id": 10,
        "intern_ids": [1, 2, 3],
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["mentor_id"] == 10
    assert data["assigned_count"] == 3
    assert set(data["intern_ids"]) == {1, 2, 3}

    with session_factory() as db:
        for intern_id in [1, 2, 3]:
            profile = db.query(InternProfile).filter(InternProfile.user_id == intern_id).first()
            assert profile.mentor_id == 10

            mi = db.query(MentorIntern).filter(MentorIntern.intern_id == intern_id).first()
            assert mi.mentor_id == 10


def test_assign_combined_intern_id_and_intern_ids(assign_api_client):
    client, session_factory = assign_api_client

    payload = {
        "mentor_id": 10,
        "intern_ids": [1],
        "intern_id": 2,
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(30, "admin"),  # Admin cũng được phép
    )
    assert response.status_code == 200
    data = response.json()
    assert data["assigned_count"] == 2
    assert set(data["intern_ids"]) == {1, 2}


def test_assign_empty_intern_ids_raises_validation_error(assign_api_client):
    client, _ = assign_api_client

    # Không truyền cả intern_id và intern_ids
    response = client.post(
        "/api/hr/assign-mentor",
        json={"mentor_id": 10},
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 422


def test_assign_non_existent_mentor_returns_404(assign_api_client):
    client, _ = assign_api_client

    payload = {
        "mentor_id": 9999,
        "intern_ids": [1],
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy Mentor" in response.json()["detail"]


def test_assign_user_not_mentor_role_returns_404(assign_api_client):
    client, _ = assign_api_client

    # User 1 có role intern, không phải mentor
    payload = {
        "mentor_id": 1,
        "intern_ids": [2],
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy Mentor" in response.json()["detail"]


def test_assign_non_existent_intern_returns_404(assign_api_client):
    client, _ = assign_api_client

    payload = {
        "mentor_id": 10,
        "intern_ids": [9999],
    }
    response = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(20, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy thực tập sinh" in response.json()["detail"]


def test_assign_mentor_unauthorized_and_forbidden(assign_api_client):
    client, _ = assign_api_client

    payload = {"mentor_id": 10, "intern_ids": [1]}

    # Không có token
    resp_no_token = client.post("/api/hr/assign-mentor", json=payload)
    assert resp_no_token.status_code == 401

    # Token của intern
    resp_intern = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(1, "intern"),
    )
    assert resp_intern.status_code == 403

    # Token của mentor
    resp_mentor = client.post(
        "/api/hr/assign-mentor",
        json=payload,
        headers=_auth_header(10, "mentor"),
    )
    assert resp_mentor.status_code == 403
