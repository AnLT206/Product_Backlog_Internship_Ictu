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


@pytest.fixture
def integration_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_approve_pending_intern_activates_database_account(integration_client):
    client, session_factory = integration_client
    password = "Secret123"
    register_payload = {
        "full_name": "Nguyen Van Intern",
        "email": "pending.intern@example.com",
        "password": password,
        "confirm_password": password,
        "university": "ICTU",
        "major": "CNTT",
    }
    hr_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
    }

    register_response = client.post(
        "/api/auth/register",
        json=register_payload,
    )

    assert register_response.status_code == 201
    registered = register_response.json()
    assert registered["status"] == "pending"

    with session_factory() as db:
        pending_user = (
            db.query(User)
            .filter(User.email == register_payload["email"])
            .one()
        )
        assert pending_user.status == "pending"
        assert pending_user.role.name == "intern"
        assert pending_user.intern_profile is not None
        intern_id = pending_user.id

    approve_response = client.post(
        f"/api/hr/interns/{intern_id}/approve",
        headers=hr_headers,
    )

    assert approve_response.status_code == 200
    approved = approve_response.json()
    assert approved == {
        "id": registered["id"],
        "email": register_payload["email"],
        "full_name": register_payload["full_name"],
        "role": "intern",
        "status": "active",
        "phone_number": None,
    }

    with session_factory() as db:
        user = db.query(User).filter(User.id == intern_id).one()
        profile = db.query(InternProfile).filter(InternProfile.user_id == intern_id).one()
        assert user.status == "active"
        assert user.role.name == "intern"
        assert profile.university == "ICTU"
        assert profile.major == "CNTT"

    login_response = client.post(
        "/api/auth/login",
        json={"email": register_payload["email"], "password": password},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["status"] == "active"