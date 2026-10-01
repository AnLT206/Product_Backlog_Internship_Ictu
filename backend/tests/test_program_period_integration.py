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
def period_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(name="hr", description="HR")
        db.add(hr_role)
        db.flush()
        db.add(
            User(
                id=1,
                code="HR0001",
                email="hr@example.com",
                password_hash="x",
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


def test_hr_creates_program_then_edits_period(period_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"}
    created = period_client.post(
        "/api/hr/programs",
        json={
            "name": "Ky thuc tap he 2026",
            "department": "CNTT",
            "start_date": "2026-06-01",
            "end_date": "2026-08-31",
        },
        headers=headers,
    )
    assert created.status_code == 201
    program_id = created.json()["id"]
    assert created.json()["start_date"] == "2026-06-01"
    assert created.json()["end_date"] == "2026-08-31"

    updated = period_client.put(
        f"/api/hr/programs/{program_id}/period",
        json={"start_date": "2026-07-01", "end_date": "2026-09-30"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["start_date"] == "2026-07-01"
    assert updated.json()["end_date"] == "2026-09-30"
    assert updated.json()["name"] == "Ky thuc tap he 2026"

    detail = period_client.get(f"/api/hr/programs/{program_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["end_date"] == "2026-09-30"


def test_period_rejects_invalid_range_and_missing_program(period_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"}
    created = period_client.post(
        "/api/hr/programs",
        json={
            "name": "Ky ngan",
            "department": "CNTT",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
        },
        headers=headers,
    )
    program_id = created.json()["id"]

    invalid = period_client.put(
        f"/api/hr/programs/{program_id}/period",
        json={"start_date": "2026-08-01", "end_date": "2026-07-01"},
        headers=headers,
    )
    assert invalid.status_code == 422

    missing = period_client.put(
        "/api/hr/programs/999/period",
        json={"start_date": "2026-07-01", "end_date": "2026-08-01"},
        headers=headers,
    )
    assert missing.status_code == 404

    anonymous = period_client.put(
        f"/api/hr/programs/{program_id}/period",
        json={"start_date": "2026-07-01", "end_date": "2026-08-01"},
    )
    assert anonymous.status_code == 401
