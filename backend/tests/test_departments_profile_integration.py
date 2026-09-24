from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models import Department, InternProfile, Role, User
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
        intern_role = Role(name="intern", description="Intern")
        db.add(intern_role)
        db.flush()
        user = User(
            id=1,
            email="intern@example.com",
            password_hash="not-used-in-this-test",
            full_name="Nguyen Van A",
            role_id=intern_role.id,
            status="active",
        )
        db.add(user)
        db.add(
            InternProfile(
                user_id=user.id,
                phone_number="0911111111",
                university="ICTU",
                major="CNTT",
                gender="other",
            )
        )
        db.add_all(
            [
                Department(name="Công nghệ thông tin", description="Khoa CNTT"),
                Department(name="Kinh tế", description="Khoa Kinh tế"),
            ]
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


@pytest.fixture
def auth_headers() -> dict[str, str]:
    token = create_access_token(user_id=1, role="intern")
    return {"Authorization": f"Bearer {token}"}


def test_list_departments_returns_expected_json_structure(
    integration_client,
    auth_headers,
):
    client, _ = integration_client

    response = client.get("/api/departments", headers=auth_headers)

    assert response.status_code == 200
    departments = response.json()
    assert len(departments) == 2
    assert all(
        set(department) == {"id", "name", "description"}
        and isinstance(department["id"], int)
        and isinstance(department["name"], str)
        for department in departments
    )


def test_get_and_update_my_profile_returns_expected_json_structure(
    integration_client,
    auth_headers,
):
    client, _ = integration_client

    get_response = client.get("/api/auth/me", headers=auth_headers)

    assert get_response.status_code == 200
    profile = get_response.json()
    assert profile["email"] == "intern@example.com"
    assert profile["role"] == "intern"
    assert profile["phone_number"] == "0911111111"
    assert profile["university"] == "ICTU"
    assert profile["major"] == "CNTT"
    assert {
        "id",
        "email",
        "full_name",
        "role",
        "status",
        "phone_number",
        "dob",
        "gender",
        "university",
        "major",
        "academic_year",
        "gpa",
        "address",
    } == set(profile)

    update_response = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={
            "full_name": "  Nguyen Van B  ",
            "phone_number": "0922222222",
            "major": "An toan thong tin",
            "gpa": 3.5,
        },
    )

    assert update_response.status_code == 200
    updated_profile = update_response.json()
    assert updated_profile["full_name"] == "Nguyen Van B"
    assert updated_profile["phone_number"] == "0922222222"
    assert updated_profile["major"] == "An toan thong tin"
    assert float(updated_profile["gpa"]) == 3.5

    persisted_response = client.get("/api/auth/me", headers=auth_headers)
    assert persisted_response.status_code == 200
    assert persisted_response.json()["full_name"] == "Nguyen Van B"
    assert persisted_response.json()["major"] == "An toan thong tin"