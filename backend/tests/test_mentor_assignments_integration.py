"""Tests tích hợp cho Phân công Mentor cho Thực tập sinh (Task 6)."""

from collections.abc import Generator
from datetime import date, timedelta

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
def assign_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
                full_name="Intern One",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Intern 2 (id=2)
        db.add(
            User(
                id=2,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="hash",
                full_name="Intern Two",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Mentor 1 (id=3)
        db.add(
            User(
                id=3,
                code="MT0001",
                email="mentor1@example.com",
                password_hash="hash",
                full_name="Mentor One",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # HR (id=4)
        db.add(
            User(
                id=4,
                code="HR0001",
                email="hr1@example.com",
                password_hash="hash",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )

        # Program 1 (id=1, open)
        prog1 = InternshipProgram(
            id=1,
            name="Kỳ Thực tập Mùa Thu 2026",
            department="Công nghệ Thông tin",
            description="Kỳ thực tập kỹ thuật",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            max_interns=10,
            status="open",
        )
        db.add(prog1)

        # Program 2 (id=2, closed)
        prog2 = InternshipProgram(
            id=2,
            name="Kỳ Thực tập Đã Đóng",
            department="Nhân sự",
            description="Đã kết thúc",
            start_date=date.today() - timedelta(days=120),
            end_date=date.today() - timedelta(days=30),
            max_interns=5,
            status="closed",
        )
        db.add(prog2)

        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def _auth(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def test_hr_assign_interns_to_mentor_with_program_id(assign_client):
    client, session_factory = assign_client

    payload = {
        "intern_ids": [1, 2],
        "program_id": 1,
    }
    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json=payload,
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mentor_id"] == 3
    assert data["assigned_count"] == 2
    assert set(data["intern_ids"]) == {1, 2}
    assert "Đã phân công thành công" in data["message"]

    with session_factory() as db:
        members = db.query(ProgramMember).filter(ProgramMember.program_id == 1).all()
        assert len(members) == 2
        for m in members:
            assert m.mentor_user_id == 3


def test_hr_bulk_assign_interns(assign_client):
    client, session_factory = assign_client

    payload = {
        "mentor_id": 3,
        "intern_ids": [1],
        "program_id": 1,
    }
    response = client.post(
        "/api/hr/mentors/assign",
        json=payload,
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mentor_id"] == 3
    assert data["assigned_count"] == 1


def test_hr_assign_interns_without_program_id_updates_existing(assign_client):
    client, session_factory = assign_client

    # Thêm TTS vào kỳ trước nhưng chưa có mentor
    with session_factory() as db:
        db.add(ProgramMember(program_id=1, intern_user_id=1, mentor_user_id=None))
        db.commit()

    # Phân công không chỉ định program_id
    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1]},
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 200

    with session_factory() as db:
        member = db.query(ProgramMember).filter(ProgramMember.intern_user_id == 1).first()
        assert member is not None
        assert member.mentor_user_id == 3


def test_hr_assign_fails_if_intern_not_in_any_program_without_program_id(assign_client):
    client, _ = assign_client

    # TTS 2 chưa ở trong bất kỳ kỳ thực tập nào
    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [2]},
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 400
    assert "chưa thuộc kỳ thực tập nào" in response.json()["detail"]


def test_hr_assign_to_closed_program_fails(assign_client):
    client, _ = assign_client

    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1], "program_id": 2},
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 400
    assert "Kỳ thực tập đã đóng" in response.json()["detail"]


def test_hr_assign_to_non_existent_mentor_404(assign_client):
    client, _ = assign_client

    response = client.post(
        "/api/hr/mentors/99999/assign-interns",
        json={"intern_ids": [1], "program_id": 1},
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy Mentor" in response.json()["detail"]


def test_hr_assign_non_existent_intern_404(assign_client):
    client, _ = assign_client

    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [99999], "program_id": 1},
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy thực tập sinh" in response.json()["detail"]


def test_hr_get_assigned_interns(assign_client):
    client, _ = assign_client

    # Gán TTS 1 cho Mentor 3
    client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1], "program_id": 1},
        headers=_auth(4, "hr"),
    )

    # HR xem danh sách
    response = client.get(
        "/api/hr/mentors/3/assigned-interns",
        headers=_auth(4, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["intern_id"] == 1
    assert item["intern_code"] == "TTS0001"
    assert item["intern_name"] == "Intern One"
    assert item["program_name"] == "Kỳ Thực tập Mùa Thu 2026"


def test_hr_get_mentor_workload_by_program(assign_client):
    client, session_factory = assign_client

    with session_factory() as db:
        mentor_role = db.query(Role).filter(Role.name == "mentor").one()
        db.query(User).filter(User.id == 2).update({User.status: "inactive"})
        db.add_all(
            [
                User(
                    id=5,
                    code="MT0002",
                    email="mentor-no-program@example.com",
                    password_hash="hash",
                    full_name="Mentor No Program",
                    role_id=mentor_role.id,
                    status="active",
                ),
                User(
                    id=6,
                    code="MT0003",
                    email="mentor-inactive-intern@example.com",
                    password_hash="hash",
                    full_name="Mentor Inactive Intern",
                    role_id=mentor_role.id,
                    status="active",
                ),
                InternshipProgram(
                    id=3,
                    name="Deleted Program",
                    department="Engineering",
                    start_date=date.today(),
                    end_date=date.today() + timedelta(days=30),
                    max_interns=99,
                    is_deleted=True,
                ),
            ]
        )
        db.add_all(
            [
                ProgramMember(program_id=1, intern_user_id=1, mentor_user_id=3),
                ProgramMember(program_id=1, intern_user_id=2, mentor_user_id=3),
                ProgramMember(program_id=2, intern_user_id=1, mentor_user_id=3),
                ProgramMember(program_id=2, intern_user_id=2, mentor_user_id=6),
                ProgramMember(program_id=3, intern_user_id=1, mentor_user_id=3),
            ]
        )
        db.commit()

    response = client.get("/api/hr/mentors/workload", headers=_auth(4, "hr"))

    assert response.status_code == 200
    rows = response.json()
    by_pair = {(row["mentor_id"], row["program_id"]): row for row in rows}
    assert by_pair[(3, 1)]["active_intern_count"] == 1
    assert by_pair[(3, 1)]["quota"] == 10
    assert by_pair[(3, 2)]["active_intern_count"] == 1
    assert by_pair[(3, 2)]["quota"] == 5
    assert by_pair[(6, 2)]["active_intern_count"] == 0
    assert by_pair[(6, 2)]["quota"] == 5
    no_program = by_pair[(5, None)]
    assert no_program["program_name"] is None
    assert no_program["active_intern_count"] == 0
    assert no_program["quota"] is None
    assert all(row["program_id"] != 3 for row in rows)


def test_intern_cannot_get_mentor_workload(assign_client):
    client, _ = assign_client

    response = client.get(
        "/api/hr/mentors/workload",
        headers=_auth(1, "intern"),
    )

    assert response.status_code == 403


def test_mentor_get_my_assigned_interns(assign_client):
    client, _ = assign_client

    client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1, 2], "program_id": 1},
        headers=_auth(4, "hr"),
    )

    # Mentor (id=3) tự xem danh sách TTS của mình
    response = client.get(
        "/api/mentor/assigned-interns",
        headers=_auth(3, "mentor"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    ids = {item["intern_id"] for item in data["items"]}
    assert ids == {1, 2}


def test_hr_assignment_is_visible_to_assigned_mentor(assign_client):
    client, _ = assign_client

    assignment_response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1], "program_id": 1},
        headers=_auth(4, "hr"),
    )
    assert assignment_response.status_code in (200, 201)
    assignment_data = assignment_response.json()
    assert assignment_data["mentor_id"] == 3
    assert assignment_data["intern_ids"] == [1]

    mentor_response = client.get(
        "/api/mentor/assigned-interns",
        headers=_auth(3, "mentor"),
    )
    assert mentor_response.status_code == 200
    mentor_data = mentor_response.json()
    assert mentor_data["total"] == 1
    assert [
        (item["intern_id"], item["intern_code"], item["intern_name"])
        for item in mentor_data["items"]
    ] == [(1, "TTS0001", "Intern One")]


def test_hr_unassign_intern(assign_client):
    client, session_factory = assign_client

    # Gán
    client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1], "program_id": 1},
        headers=_auth(4, "hr"),
    )

    # Hủy phân công
    del_res = client.delete(
        "/api/hr/mentors/3/assigned-interns/1?program_id=1",
        headers=_auth(4, "hr"),
    )
    assert del_res.status_code == 200
    assert "Đã hủy phân công" in del_res.json()["message"]

    # Kiểm tra trong DB: mentor_user_id đã thành None
    with session_factory() as db:
        member = db.query(ProgramMember).filter(
            ProgramMember.program_id == 1,
            ProgramMember.intern_user_id == 1,
        ).first()
        assert member is not None
        assert member.mentor_user_id is None


def test_intern_forbidden_to_assign_mentor(assign_client):
    client, _ = assign_client

    response = client.post(
        "/api/hr/mentors/3/assign-interns",
        json={"intern_ids": [1], "program_id": 1},
        headers=_auth(1, "intern"),
    )
    assert response.status_code == 403
