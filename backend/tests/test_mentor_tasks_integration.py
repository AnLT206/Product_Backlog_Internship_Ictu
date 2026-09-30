"""Integration tests for mentor task assignment permissions."""

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
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def mentor_task_client() -> Generator[TestClient, None, None]:
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
                    email="mentor-a@example.com",
                    password_hash="x",
                    full_name="Mentor A",
                    role_id=mentor_role.id,
                    status="active",
                ),
                User(
                    id=2,
                    code="MT0002",
                    email="mentor-b@example.com",
                    password_hash="x",
                    full_name="Mentor B",
                    role_id=mentor_role.id,
                    status="active",
                ),
                User(
                    id=10,
                    code="TTS0001",
                    email="intern-a@example.com",
                    password_hash="x",
                    full_name="Intern A",
                    role_id=intern_role.id,
                    status="active",
                ),
                User(
                    id=20,
                    code="TTS0002",
                    email="intern-b@example.com",
                    password_hash="x",
                    full_name="Intern B",
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
            ]
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

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    database.SessionLocal = original_session_local
    activity_filter.SessionLocal = original_session_local
    Base.metadata.drop_all(engine)
    engine.dispose()


def _auth(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def _task_payload(intern_id: int) -> dict[str, object]:
    return {
        "intern_id": intern_id,
        "title": "Prepare project plan",
        "description": "Create an initial project plan",
        "due_at": "2026-10-15T17:00:00",
        "status": "todo",
        "progress": 0,
    }


def test_mentor_assign_task_to_own_intern_success(mentor_task_client: TestClient) -> None:
    response = mentor_task_client.post(
        "/api/mentor/tasks",
        json=_task_payload(intern_id=10),
        headers=_auth(user_id=1, role="mentor"),
    )

    assert response.status_code in (200, 201)
    assert response.json()["mentor_id"] == 1
    assert response.json()["intern_id"] == 10


def test_mentor_assign_task_to_other_intern_forbidden(mentor_task_client: TestClient) -> None:
    response = mentor_task_client.post(
        "/api/mentor/tasks",
        json=_task_payload(intern_id=20),
        headers=_auth(user_id=1, role="mentor"),
    )

    assert response.status_code == 403


def test_intern_cannot_create_task(mentor_task_client: TestClient) -> None:
    response = mentor_task_client.post(
        "/api/mentor/tasks",
        json=_task_payload(intern_id=10),
        headers=_auth(user_id=10, role="intern"),
    )

    assert response.status_code == 403
