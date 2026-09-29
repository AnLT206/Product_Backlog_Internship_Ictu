"""Tests tích hợp cho Quản lý công việc & Tiến độ (Tasks 1, 2, 7)."""

from collections.abc import Generator

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
from app.models.task import Task
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def task_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        mentor_role = Role(id=1, name="mentor", description="Mentor")
        intern_role = Role(id=2, name="intern", description="Intern")
        admin_role = Role(id=3, name="admin", description="Admin")
        db.add_all([mentor_role, intern_role, admin_role])
        db.flush()

        # Mentor 1 (id=1)
        db.add(
            User(
                id=1,
                code="MT0001",
                email="mentor1@example.com",
                password_hash="x",
                full_name="Mentor One",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Mentor 2 (id=2)
        db.add(
            User(
                id=2,
                code="MT0002",
                email="mentor2@example.com",
                password_hash="x",
                full_name="Mentor Two",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Intern 1 (id=10) - thuộc quản lý của Mentor 1
        db.add(
            User(
                id=10,
                code="TTS0001",
                email="intern1@example.com",
                password_hash="x",
                full_name="Intern One",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Intern 2 (id=20) - thuộc quản lý của Mentor 2
        db.add(
            User(
                id=20,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="x",
                full_name="Intern Two",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Admin (id=99)
        db.add(
            User(
                id=99,
                code="AD0001",
                email="admin@example.com",
                password_hash="x",
                full_name="Admin Boss",
                role_id=admin_role.id,
                status="active",
            )
        )
        db.flush()

        from datetime import date

        # Chương trình thực tập
        program = InternshipProgram(
            id=1,
            name="Program 2026",
            department="CNTT",
            description="Kỳ thực tập CNTT",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 9, 1),
            max_interns=30,
            status="open",
        )
        db.add(program)
        db.flush()

        # Gán Intern 1 (id=10) cho Mentor 1 (id=1)
        db.add(
            ProgramMember(
                program_id=1,
                intern_user_id=10,
                mentor_user_id=1,
            )
        )
        # Gán Intern 2 (id=20) cho Mentor 2 (id=2)
        db.add(
            ProgramMember(
                program_id=1,
                intern_user_id=20,
                mentor_user_id=2,
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    import app.api.activity_log_filter as activity_filter
    import app.core.database as database

    original_session_local = database.SessionLocal
    database.SessionLocal = session_factory
    activity_filter.SessionLocal = session_factory

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    database.SessionLocal = original_session_local
    activity_filter.SessionLocal = original_session_local
    Base.metadata.drop_all(engine)
    engine.dispose()


# ── Task 7: Mentor tạo mới công việc và gán cho TTS ──────────────────────────

def test_mentor_create_task_success(task_client):
    client, _ = task_client
    token = create_access_token(user_id=1, role="mentor")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "intern_id": 10,
        "title": "Thiết kế cơ sở dữ liệu",
        "description": "Viết schema và migration cho chức năng tasks",
        "due_at": "2026-10-15T17:00:00",
        "status": "todo",
        "progress": 0,
    }
    response = client.post("/api/mentor/tasks", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["mentor_id"] == 1
    assert data["intern_id"] == 10
    assert data["status"] == "todo"
    assert data["progress"] == 0
    assert data["intern_name"] == "Intern One"
    assert data["mentor_name"] == "Mentor One"


def test_mentor_cannot_assign_task_to_unmanaged_intern(task_client):
    client, _ = task_client
    # Mentor 1 cố gắng giao việc cho Intern 2 (thuộc quyền Mentor 2)
    token = create_access_token(user_id=1, role="mentor")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "intern_id": 20,
        "title": "Nhiệm vụ trái quyền",
        "progress": 0,
    }
    response = client.post("/api/mentor/tasks", json=payload, headers=headers)
    assert response.status_code == 403
    assert "chỉ có thể giao việc cho thực tập sinh thuộc quyền quản lý" in response.json()["detail"]


def test_mentor_create_task_with_invalid_progress(task_client):
    client, _ = task_client
    token = create_access_token(user_id=1, role="mentor")
    headers = {"Authorization": f"Bearer {token}"}

    # Tiến độ vượt quá 100%
    payload = {
        "intern_id": 10,
        "title": "Task tiến độ lỗi",
        "progress": 120,
    }
    response = client.post("/api/mentor/tasks", json=payload, headers=headers)
    assert response.status_code in (400, 422)


def test_mentor_create_task_non_existent_intern(task_client):
    client, _ = task_client
    token = create_access_token(user_id=1, role="mentor")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "intern_id": 9999,
        "title": "Task không có intern",
        "progress": 0,
    }
    response = client.post("/api/mentor/tasks", json=payload, headers=headers)
    assert response.status_code == 404


# ── Task 2 & Task 1: TTS cập nhật trạng thái và tiến độ công việc ────────────

def test_intern_update_task_progress_and_auto_status(task_client):
    client, session_factory = task_client

    # 1. Mentor tạo task trước
    with session_factory() as db:
        t = Task(
            id=101,
            mentor_id=1,
            intern_id=10,
            title="Nhiệm vụ kiểm thử",
            status="todo",
            progress=0,
        )
        db.add(t)
        db.commit()

    intern_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern_token}"}

    # 2. TTS cập nhật tiến độ lên 50% -> trạng thái tự động thành 'doing'
    res1 = client.patch(
        "/api/intern/tasks/101",
        json={"progress": 50},
        headers=headers,
    )
    assert res1.status_code == 200
    assert res1.json()["progress"] == 50
    assert res1.json()["status"] == "doing"

    # 3. TTS cập nhật tiến độ lên 100% -> trạng thái tự động thành 'done'
    res2 = client.patch(
        "/api/intern/tasks/101",
        json={"progress": 100},
        headers=headers,
    )
    assert res2.status_code == 200
    assert res2.json()["progress"] == 100
    assert res2.json()["status"] == "done"


def test_intern_cannot_update_other_intern_task(task_client):
    client, session_factory = task_client

    # Task thuộc về Intern 2 (id=20)
    with session_factory() as db:
        t = Task(
            id=102,
            mentor_id=2,
            intern_id=20,
            title="Nhiệm vụ của Intern 2",
            status="todo",
            progress=0,
        )
        db.add(t)
        db.commit()

    # Intern 1 (id=10) cố cập nhật task của Intern 2
    intern1_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern1_token}"}

    response = client.patch(
        "/api/intern/tasks/102",
        json={"progress": 50},
        headers=headers,
    )
    assert response.status_code == 403
    assert "không có quyền cập nhật" in response.json()["detail"]


def test_intern_update_non_existent_task(task_client):
    client, _ = task_client
    intern_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern_token}"}

    response = client.patch(
        "/api/intern/tasks/9999",
        json={"progress": 50},
        headers=headers,
    )
    assert response.status_code == 404


# ── Tra cứu danh sách công việc (GET Endpoints) ──────────────────────────────

def test_intern_list_own_tasks(task_client):
    client, session_factory = task_client

    with session_factory() as db:
        t1 = Task(id=201, mentor_id=1, intern_id=10, title="Task 1", status="todo", progress=0)
        t2 = Task(id=202, mentor_id=1, intern_id=10, title="Task 2", status="done", progress=100)
        t3 = Task(id=203, mentor_id=2, intern_id=20, title="Task Khác", status="todo", progress=0)
        db.add_all([t1, t2, t3])
        db.commit()

    intern_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern_token}"}

    res_all = client.get("/api/intern/tasks", headers=headers)
    assert res_all.status_code == 200
    data = res_all.json()
    assert data["total"] == 2
    task_ids = [item["id"] for item in data["items"]]
    assert 201 in task_ids
    assert 202 in task_ids
    assert 203 not in task_ids

    # Lọc theo status
    res_filtered = client.get("/api/intern/tasks?status=done", headers=headers)
    assert res_filtered.status_code == 200
    assert res_filtered.json()["total"] == 1
    assert res_filtered.json()["items"][0]["id"] == 202


def test_mentor_list_assigned_tasks(task_client):
    client, session_factory = task_client

    with session_factory() as db:
        t1 = Task(id=301, mentor_id=1, intern_id=10, title="M1 Task A", status="todo", progress=0)
        t2 = Task(id=302, mentor_id=1, intern_id=10, title="M1 Task B", status="doing", progress=40)
        t3 = Task(id=303, mentor_id=2, intern_id=20, title="M2 Task C", status="todo", progress=0)
        db.add_all([t1, t2, t3])
        db.commit()

    mentor_token = create_access_token(user_id=1, role="mentor")
    headers = {"Authorization": f"Bearer {mentor_token}"}

    response = client.get("/api/mentor/tasks", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    task_ids = [item["id"] for item in data["items"]]
    assert 301 in task_ids
    assert 302 in task_ids
    assert 303 not in task_ids


def test_unauthenticated_request_rejected(task_client):
    client, _ = task_client
    res1 = client.get("/api/mentor/tasks")
    assert res1.status_code == 401

    res2 = client.get("/api/intern/tasks")
    assert res2.status_code == 401
