from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def integration_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(name="admin", description="Admin")
        hr_role = Role(name="hr", description="HR")
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([admin_role, hr_role, mentor_role])
        db.flush()
        db.add_all(
            [
                User(
                    id=1,
                    email="admin@example.com",
                    password_hash="not-used",
                    full_name="Admin",
                    role_id=admin_role.id,
                    status="active",
                ),
                User(
                    id=2,
                    email="hr@example.com",
                    password_hash="not-used",
                    full_name="HR",
                    role_id=hr_role.id,
                    status="active",
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    # Activity filter dùng SessionLocal riêng — trỏ về cùng SQLite in-memory.
    import app.api.activity_log_filter as activity_filter
    import app.core.database as database

    original_session_local = database.SessionLocal
    database.SessionLocal = session_factory
    activity_filter.SessionLocal = session_factory

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    database.SessionLocal = original_session_local
    activity_filter.SessionLocal = original_session_local
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_mutating_action_is_logged_and_admin_can_list(integration_client):
    hr_token = create_access_token(user_id=2, role="hr")
    create_response = integration_client.post(
        "/api/hr/mentors",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={
            "full_name": "Mentor Logged",
            "email": "mentor.logged@example.com",
            "password": "Secret1",
        },
    )
    assert create_response.status_code == 201

    admin_token = create_access_token(user_id=1, role="admin")
    list_response = integration_client.get(
        "/api/admin/system-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"action": "CREATE", "user_id": 2},
    )
    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] >= 1
    assert body["items"][0]["action"] == "CREATE"
    assert body["items"][0]["method"] == "POST"
    assert body["items"][0]["path"] == "/api/hr/mentors"
    assert body["items"][0]["resource"] == "hr/mentors"
    assert body["items"][0]["user_id"] == 2
    assert body["items"][0]["role"] == "hr"
    assert body["items"][0]["status_code"] == 201


def test_non_admin_cannot_list_system_logs(integration_client):
    hr_token = create_access_token(user_id=2, role="hr")
    response = integration_client.get(
        "/api/admin/system-logs",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 403


def test_login_is_not_written_to_system_logs(integration_client):
    from app.api.activity_log_filter import should_log
    from starlette.requests import Request

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/auth/login",
        "raw_path": b"/api/auth/login",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 123),
        "server": ("test", 80),
    }
    request = Request(scope)
    assert should_log(request, 200) is False


def test_list_system_logs_supports_time_filter(integration_client):
    from datetime import datetime, timedelta, timezone

    hr_token = create_access_token(user_id=2, role="hr")
    create_response = integration_client.post(
        "/api/hr/mentors",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={
            "full_name": "Mentor Time",
            "email": "mentor.time@example.com",
            "password": "Secret1",
        },
    )
    assert create_response.status_code == 201

    admin_token = create_access_token(user_id=1, role="admin")
    now = datetime.now(timezone.utc)
    future = (now + timedelta(days=1)).isoformat()
    past = (now - timedelta(days=1)).isoformat()

    empty = integration_client.get(
        "/api/admin/system-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"from_at": future},
    )
    assert empty.status_code == 200
    assert empty.json()["total"] == 0

    filled = integration_client.get(
        "/api/admin/system-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"from_at": past, "to_at": future},
    )
    assert filled.status_code == 200
    assert filled.json()["total"] >= 1
