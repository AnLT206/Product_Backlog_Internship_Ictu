from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models import InternProfile, Role, User
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
        intern_role = Role(name="intern", description="Intern")
        db.add_all([hr_role, intern_role])
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


def test_hr_create_intern_creates_user_and_profile(integration_client):
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "full_name": "Tran Thi B",
        "email": "hr.created.intern@example.com",
        "password": "Secret1",
        "university": "ICTU",
        "major": "CNTT",
        "status": "pending",
    }

    response = integration_client.post(
        "/api/hr/interns",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["full_name"] == payload["full_name"]
    assert body["role"] == "intern"
    assert body["status"] == "pending"
