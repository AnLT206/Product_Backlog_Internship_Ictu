from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.document import Document
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


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
        db.add(
            User(
                id=2,
                email="intern@example.com",
                password_hash="x",
                full_name="Intern User",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.flush()
        db.add(
            Document(
                id=20,
                user_id=2,
                doc_type="contract",
                file_name="hop_dong.pdf",
                file_path="/tmp/hop_dong.pdf",
                status="pending",
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


def test_intern_confirm_contract_sets_confirmed_at(integration_client):
    client, session_factory = integration_client
    headers = {
        "Authorization": f"Bearer {create_access_token(user_id=2, role='intern')}"
    }

    response = client.post("/api/intern/contract/confirm", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"
    assert body["confirmed_at"] is not None

    with session_factory() as db:
        doc = db.query(Document).filter(Document.id == 20).one()
        assert doc.confirmed_at is not None
        assert doc.status == "approved"

    second = client.post("/api/intern/contract/confirm", headers=headers)
    assert second.status_code == 404
