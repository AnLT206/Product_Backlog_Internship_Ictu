from collections.abc import Generator

import bcrypt
import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.database import Base
from app.main import app
from app.models import Department, InternProfile, Role, User, UserProfile
from app.utils.authenticate_login import verify_access_token


@pytest.fixture
def integration_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_register_hashes_password_then_login_returns_valid_jwt(integration_client):
    client, session_factory = integration_client
    plain_password = "Secret123"
    register_payload = {
        "full_name": "Nguyen Van A",
        "email": "intern@example.com",
        "password": plain_password,
        "confirm_password": plain_password,
    }

    register_response = client.post("/api/auth/register", json=register_payload)

    assert register_response.status_code == 201
    registered_user = register_response.json()

    with session_factory() as db:
        user = db.query(User).filter(User.email == register_payload["email"]).one()
        assert user.password_hash != plain_password
        assert user.password_hash.startswith("$2")
        assert bcrypt.checkpw(
            plain_password.encode(), user.password_hash.encode()
        )

    login_response = client.post(
        "/api/auth/login",
        json={"email": register_payload["email"], "password": plain_password},
    )

    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["token_type"] == "bearer"
    assert login_data["user"]["id"] == registered_user["id"]
    assert login_data["user"]["status"] == "pending"

    token = login_data["access_token"]
    assert verify_access_token(token) == jwt.decode(
        token,
        get_settings().jwt_secret_key,
        algorithms=[get_settings().jwt_algorithm],
    )


def test_login_with_wrong_password_returns_401(integration_client):
    client, _ = integration_client
    register_payload = {
        "full_name": "Nguyen Van B",
        "email": "wrong-password@example.com",
        "password": "Correct123",
        "confirm_password": "Correct123",
    }
    client.post("/api/auth/register", json=register_payload)

    response = client.post(
        "/api/auth/login",
        json={
            "email": register_payload["email"],
            "password": "Wrong123",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Email hoặc mật khẩu không đúng."