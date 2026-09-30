"""Integration tests for intern task progress updates and mentor visibility."""

from collections.abc import Generator
from datetime import date

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
def progress_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
        db.add_all([mentor_role, intern_role])
        db.flush()

        db.add_all(
            [
                User(
                    id=1,
                    code="MT0001",
                    email="mentor1@example.com",
                    password_hash="x",
                    full_name="Mentor One",
                    role_id=mentor_role.id,
                    status="active",
                ),
                User(
                    id=2,
                    code="MT0002",
                    email="mentor2@example.com",
                    password_hash="x",
                    full_name="Mentor Two",
                    role_id=mentor_role.id,
                    status="active",
                ),
                User(
                    id=10,
                    code="TTS0001",
                    email="intern1@example.com",
                    password_hash="x",
                    full_name="Intern One",
                    role_id=intern_role.id,
                    status="active",
                ),
                User(
                    id=20,
                    code="TTS0002",
                    email="intern2@example.com",
                    password_hash="x",
                    full_name="Intern Two",
                    role_id=intern_role.id,
                    status="active",
                ),
            ]
        )
        db.flush()

        db.add(
            InternshipProgram(
                id=1,
                name="Program 2026",
                department="CNTT",
                description="Internship program",
                start_date=date(2026, 6, 1),
                end_date=date(2026, 9, 1),
                max_interns=30,
                status="open",
            )
        )
        db.add_all(
            [
                ProgramMember(program_id=1, intern_user_id=10, mentor_user_id=1),
                ProgramMember(program_id=1, intern_user_id=20, mentor_user_id=2),
                Task(
                    id=101,
                    mentor_id=1,
                    intern_id=10,
                    title="Implement progress tracking",
                    status="todo",
                    progress=0,
                ),
                Task(
                    id=102,
                    mentor_id=2,
                    intern_id=20,
                    title="Intern Two task",
                    status="todo",
                    progress=0,
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    import app.api.activity_log_filter as activity_filter
    import app.core.database as database

    original_session_local = database.SessionLocal
    original_activity_session_local = activity_filter.SessionLocal
    database.SessionLocal = session_factory
    activity_filter.SessionLocal = session_factory
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            yield client, session_factory
    finally:
        app.dependency_overrides.clear()
        database.SessionLocal = original_session_local
        activity_filter.SessionLocal = original_activity_session_local
        Base.metadata.drop_all(engine)
        engine.dispose()


def _auth(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def _update_task_progress(client: TestClient, task_id: int = 101):
    return client.patch(
        f"/api/intern/tasks/{task_id}",
        json={"status": "doing", "progress": 65},
        headers=_auth(user_id=10, role="intern"),
    )


def test_intern_update_task_progress_success(progress_client) -> None:
    client, session_factory = progress_client

    response = _update_task_progress(client)

    assert response.status_code == 200
    assert response.json()["status"] == "doing"
    assert response.json()["progress"] == 65
    with session_factory() as db:
        task = db.query(Task).filter(Task.id == 101).one()
        assert task.status == "doing"
        assert task.progress == 65


def test_mentor_view_synced_intern_progress(progress_client) -> None:
    client, _ = progress_client
    update_response = _update_task_progress(client)
    assert update_response.status_code == 200

    response = client.get(
        "/api/mentor/tasks",
        params={"intern_id": 10},
        headers=_auth(user_id=1, role="mentor"),
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == 101
    assert items[0]["status"] == "doing"
    assert items[0]["progress"] == 65


def test_intern_cannot_update_other_intern_task(progress_client) -> None:
    client, session_factory = progress_client

    response = _update_task_progress(client, task_id=102)

    assert response.status_code == 403
    with session_factory() as db:
        task = db.query(Task).filter(Task.id == 102).one()
        assert task.status == "todo"
        assert task.progress == 0
