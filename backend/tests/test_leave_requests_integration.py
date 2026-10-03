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
def leave_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        intern_role = Role(name="intern", description="Intern")
        db.add(intern_role)
        db.flush()
        db.add_all(
            [
                User(
                    id=10,
                    code="TTS0001",
                    email="intern@example.com",
                    password_hash="x",
                    full_name="Intern One",
                    role_id=intern_role.id,
                    status="active",
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def _headers(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def test_intern_create_leave_request_success(leave_client: TestClient) -> None:
    response = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-01",
            "end_date": "2026-07-03",
            "reason": "Nghỉ việc cá nhân",
        },
        headers=_headers(10, "intern"),
    )

    assert response.status_code in (200, 201)
    assert response.json()["status"] == "pending"
    assert response.json()["start_date"] == "2026-07-01"
    assert response.json()["end_date"] == "2026-07-03"


def test_create_leave_request_invalid_date(leave_client: TestClient) -> None:
    response = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-03",
            "end_date": "2026-07-01",
            "reason": "Sai khoảng thời gian",
        },
        headers=_headers(10, "intern"),
    )

    assert response.status_code in (400, 422)
    assert response.json()["detail"]


def test_create_leave_request_empty_fields(leave_client: TestClient) -> None:
    response = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "",
            "end_date": "",
            "reason": "",
        },
        headers=_headers(10, "intern"),
    )

    assert response.status_code in (400, 422)
    assert response.json()["detail"]
