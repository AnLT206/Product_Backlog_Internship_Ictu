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
        hr_role = Role(name="hr", description="Human Resources")
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([hr_role, mentor_role])
        db.flush()
        db.add(
            User(
                id=1,
                email="hr@example.com",
                password_hash="not-used-in-this-test",
                full_name="HR User",
                role_id=hr_role.id,
                status="active",
            )
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


def test_create_mentor_then_list_contains_new_mentor(integration_client):
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "full_name": "Nguyen Van Mentor",
        "email": "new.mentor@example.com",
        "password": "Secret1",
        "phone_number": "0912345678",
        "position": "Software Engineering Mentor",
    }

    create_response = integration_client.post(
        "/api/hr/mentors",
        json=payload,
        headers=headers,
    )

    assert create_response.status_code == 201
    created_mentor = create_response.json()
    assert created_mentor["email"] == payload["email"]
    assert created_mentor["full_name"] == payload["full_name"]
    assert created_mentor["phone_number"] == payload["phone_number"]
    assert created_mentor["position"] == payload["position"]
    assert created_mentor["role"] == "mentor"

    list_response = integration_client.get(
        "/api/hr/mentors",
        headers=headers,
    )

    assert list_response.status_code == 200
    mentors = list_response.json()
    assert any(
        mentor["id"] == created_mentor["id"]
        and mentor["email"] == payload["email"]
        and mentor["full_name"] == payload["full_name"]
        for mentor in mentors
    )