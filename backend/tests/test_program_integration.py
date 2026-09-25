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
        db.add(hr_role)
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


def test_programs_crud_flow(integration_client):
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Thuc tap Soft Dev 2026",
        "department": "Cong nghe thong tin",
        "description": "Chuong trinh TTS ky he",
        "start_date": "2026-06-01",
        "end_date": "2026-08-31",
    }

    create_response = integration_client.post(
        "/api/hr/programs",
        json=payload,
        headers=headers,
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == payload["name"]
    assert created["department"] == payload["department"]
    program_id = created["id"]

    list_response = integration_client.get("/api/hr/programs", headers=headers)
    assert list_response.status_code == 200
    assert any(item["id"] == program_id for item in list_response.json())

    get_response = integration_client.get(
        f"/api/hr/programs/{program_id}",
        headers=headers,
    )
    assert get_response.status_code == 200
    assert get_response.json()["name"] == payload["name"]

    update_response = integration_client.put(
        f"/api/hr/programs/{program_id}",
        json={"description": "Cap nhat mo ta"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["description"] == "Cap nhat mo ta"

    delete_response = integration_client.delete(
        f"/api/hr/programs/{program_id}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    missing = integration_client.get(
        f"/api/hr/programs/{program_id}",
        headers=headers,
    )
    assert missing.status_code == 404
