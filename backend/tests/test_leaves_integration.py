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
        hr_role = Role(name="hr", description="HR")
        db.add_all([intern_role, hr_role])
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
                User(
                    id=11,
                    code="TTS0002",
                    email="other@example.com",
                    password_hash="x",
                    full_name="Intern Two",
                    role_id=intern_role.id,
                    status="active",
                ),
                User(
                    id=1,
                    code="HR0001",
                    email="hr@example.com",
                    password_hash="x",
                    full_name="HR User",
                    role_id=hr_role.id,
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


def test_intern_submits_leave_and_lists_only_own(leave_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"}
    created = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-01",
            "end_date": "2026-07-02",
            "reason": "Khám sức khỏe",
        },
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "pending"
    assert body["reason"] == "Khám sức khỏe"

    other_headers = {"Authorization": f"Bearer {create_access_token(user_id=11, role='intern')}"}
    other_created = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-03",
            "end_date": "2026-07-03",
            "reason": "Việc riêng",
        },
        headers=other_headers,
    )
    assert other_created.status_code == 201

    listed = leave_client.get("/api/leaves", headers=headers)
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 1
    assert rows[0]["reason"] == "Khám sức khỏe"


def test_leave_rejects_invalid_range_and_wrong_role(leave_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"}
    bad = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-05",
            "end_date": "2026-07-01",
            "reason": "Sai ngày",
        },
        headers=headers,
    )
    assert bad.status_code == 422

    missing = leave_client.get("/api/leaves")
    assert missing.status_code == 401

    hr_headers = {"Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"}
    forbidden = leave_client.post(
        "/api/leaves",
        json={
            "start_date": "2026-07-01",
            "end_date": "2026-07-01",
            "reason": "HR không được nộp",
        },
        headers=hr_headers,
    )
    assert forbidden.status_code == 403
