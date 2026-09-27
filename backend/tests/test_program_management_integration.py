from collections.abc import Generator
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def client_and_db() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(name="hr", description="HR")
        intern_role = Role(name="intern", description="Intern")
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([hr_role, intern_role, mentor_role])
        db.flush()

        # HR user (id=1)
        db.add(
            User(
                id=1,
                email="hr_prog@example.com",
                password_hash="x",
                full_name="HR Program Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Mentor user (id=2)
        db.add(
            User(
                id=2,
                email="mentor_prog@example.com",
                password_hash="x",
                full_name="Mentor Alpha",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Intern users (id=10, 11, 12)
        db.add(
            User(
                id=10,
                email="intern10@example.com",
                password_hash="x",
                full_name="Intern Ten",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.add(
            User(
                id=11,
                email="intern11@example.com",
                password_hash="x",
                full_name="Intern Eleven",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.add(
            User(
                id=12,
                email="intern12@example.com",
                password_hash="x",
                full_name="Intern Twelve",
                role_id=intern_role.id,
                status="active",
            )
        )

        # Program 1 with max_interns = 2
        p1 = InternshipProgram(
            id=1,
            name="Kỳ thực tập Mùa Thu 2026",
            department="CNTT",
            description="Kỳ thực tập phần mềm",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=2,
            status="open",
            is_deleted=False,
        )
        # Program 2 with status = closed
        p2 = InternshipProgram(
            id=2,
            name="Kỳ thực tập Mùa Hè 2026",
            department="Marketing",
            description="Đã kết thúc",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 8, 31),
            max_interns=10,
            status="closed",
            is_deleted=False,
        )
        db.add_all([p1, p2])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


# ── SCRUM-25: API Cập nhật thông tin chi tiết một kỳ thực tập ──────────────────

def test_update_program_details_success(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "Kỳ thực tập Mùa Thu 2026 (Mở rộng)",
        "department": "Kỹ thuật phần mềm",
        "description": "Mô tả mới chi tiết",
        "max_interns": 30,
    }
    response = client.put("/api/hr/programs/1", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == payload["name"]
    assert body["department"] == payload["department"]
    assert body["description"] == payload["description"]
    assert body["max_interns"] == 30


def test_update_program_duplicate_name_conflict(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Đổi tên program 1 thành tên của program 2
    response = client.put(
        "/api/hr/programs/1",
        json={"name": "Kỳ thực tập Mùa Hè 2026"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Tên chương trình đã tồn tại."


def test_update_program_invalid_date_range(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.put(
        "/api/hr/programs/1",
        json={"start_date": "2026-10-01", "end_date": "2026-09-01"},
        headers=headers,
    )
    assert response.status_code == 422


# ── SCRUM-26: Trigger/Procedure kiểm tra số lượng TTS tối đa ───────────────────

def test_assign_interns_within_max_limit(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Program 1 có max_interns = 2. Gán 2 TTS (10 và 11)
    response = client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10, 11], "mentor_id": 2},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["assigned_count"] == 2
    assert body["intern_ids"] == [10, 11]
    assert body["mentor_id"] == 2

    # Kiểm tra program 1 hiện có current_interns = 2
    get_res = client.get("/api/hr/programs/1", headers=headers)
    assert get_res.json()["current_interns"] == 2


def test_assign_interns_exceeding_max_limit_rejected(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Gán 3 TTS vào kỳ có max_interns = 2
    response = client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10, 11, 12]},
        headers=headers,
    )
    assert response.status_code == 400
    assert "tối đa" in response.json()["detail"].lower()


def test_assign_interns_to_closed_program_rejected(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Program 2 đang có status = closed
    response = client.post(
        "/api/hr/programs/2/assign",
        json={"intern_ids": [10]},
        headers=headers,
    )
    assert response.status_code == 400
    assert "đã đóng" in response.json()["detail"].lower()


# ── SCRUM-27: Xóa mềm hoặc Đóng (Close) kỳ thực tập ────────────────────────────

def test_close_and_open_program(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Đóng kỳ thực tập 1
    close_res = client.patch("/api/hr/programs/1/close", headers=headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"

    # 2. Mở lại kỳ thực tập 1
    open_res = client.patch("/api/hr/programs/1/open", headers=headers)
    assert open_res.status_code == 200
    assert open_res.json()["status"] == "open"


def test_soft_delete_program(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Xóa mềm kỳ 1
    del_res = client.delete("/api/hr/programs/1", headers=headers)
    assert del_res.status_code == 204

    # Xem chi tiết kỳ 1 trả về 404 vì đã bị xóa mềm
    get_res = client.get("/api/hr/programs/1", headers=headers)
    assert get_res.status_code == 404

    # Danh sách bình thường không chứa kỳ 1
    list_res = client.get("/api/hr/programs", headers=headers)
    assert list_res.status_code == 200
    active_ids = [p["id"] for p in list_res.json()]
    assert 1 not in active_ids

    # Danh sách include_deleted=true chứa kỳ 1 với cờ is_deleted=True
    all_res = client.get("/api/hr/programs?include_deleted=true", headers=headers)
    assert all_res.status_code == 200
    all_programs = {p["id"]: p for p in all_res.json()}
    assert 1 in all_programs
    assert all_programs[1]["is_deleted"] is True
