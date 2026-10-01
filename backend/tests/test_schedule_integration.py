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
from app.models.role import Role
from app.models.schedule import Schedule
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def schedule_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        intern_role = Role(name="intern", description="Intern")
        hr_role = Role(name="hr", description="HR")
        db.add_all([intern_role, hr_role])
        db.flush()
        intern = User(
            id=10,
            code="TTS0001",
            email="intern@example.com",
            password_hash="x",
            full_name="Intern One",
            role_id=intern_role.id,
            status="active",
        )
        other = User(
            id=11,
            code="TTS0002",
            email="other@example.com",
            password_hash="x",
            full_name="Intern Two",
            role_id=intern_role.id,
            status="active",
        )
        hr = User(
            id=1,
            code="HR0001",
            email="hr@example.com",
            password_hash="x",
            full_name="HR User",
            role_id=hr_role.id,
            status="active",
        )
        db.add_all([intern, other, hr])
        db.flush()
        db.add_all(
            [
                Schedule(
                    user_id=intern.id,
                    title="Tuan 1",
                    description="Onboarding",
                    start_date=date(2026, 6, 1),
                    end_date=date(2026, 6, 5),
                    location="Phong A",
                ),
                Schedule(
                    user_id=other.id,
                    title="Lich nguoi khac",
                    start_date=date(2026, 6, 8),
                    end_date=date(2026, 6, 12),
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_intern_sees_only_own_schedule(schedule_client):
    client, _ = schedule_client
    token = create_access_token(user_id=10, role="intern")
    response = client.get("/api/schedules", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Tuan 1"
    assert body[0]["start_date"] == "2026-06-01"
    assert body[0]["location"] == "Phong A"


def test_schedule_requires_intern_token(schedule_client):
    client, _ = schedule_client
    missing = client.get("/api/schedules")
    assert missing.status_code == 401

    hr_token = create_access_token(user_id=1, role="hr")
    forbidden = client.get("/api/schedules", headers={"Authorization": f"Bearer {hr_token}"})
    assert forbidden.status_code == 403
