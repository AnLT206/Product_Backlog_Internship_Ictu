from collections.abc import Generator
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.allowance_history import AllowanceHistory
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def allowance_client() -> Generator[TestClient, None, None]:
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
        db.flush()
        db.add_all(
            [
                AllowanceHistory(
                    intern_id=10,
                    period="2026-06",
                    allowance_type="meal",
                    amount=Decimal("500000.00"),
                    note="Thang 6",
                    created_by=1,
                ),
                AllowanceHistory(
                    intern_id=10,
                    period="2026-07",
                    allowance_type="transport",
                    amount=Decimal("1500000.50"),
                    created_by=1,
                ),
                AllowanceHistory(
                    intern_id=11,
                    period="2026-07",
                    allowance_type="meal",
                    amount=Decimal("100000.00"),
                    created_by=1,
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


def test_intern_lists_only_own_allowance_history(allowance_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"}
    response = allowance_client.get("/api/allowances", headers=headers)
    assert response.status_code == 200
    rows = response.json()
    assert [row["period"] for row in rows] == ["2026-07", "2026-06"]
    assert Decimal(str(rows[0]["amount"])) == Decimal("1500000.50")
    assert rows[1]["allowance_type"] == "meal"
    assert rows[1]["note"] == "Thang 6"


def test_allowance_history_requires_intern_token(allowance_client: TestClient):
    missing = allowance_client.get("/api/allowances")
    assert missing.status_code == 401

    hr_headers = {"Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"}
    forbidden = allowance_client.get("/api/allowances", headers=hr_headers)
    assert forbidden.status_code == 403
