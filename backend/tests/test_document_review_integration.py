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
from app.models.notification import Notification
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
        hr_role = Role(name="hr", description="Human Resources")
        intern_role = Role(name="intern", description="Intern")
        db.add_all([hr_role, intern_role])
        db.flush()
        db.add(
            User(
                id=1,
                email="hr@example.com",
                password_hash="x",
                full_name="HR User",
                role_id=hr_role.id,
                status="active",
            )
        )
        db.add(
            User(
                id=2,
                email="intern@example.com",
                password_hash="x",
                full_name="Intern User",
                role_id=intern_role.id,
                status="pending",
            )
        )
        db.flush()
        db.add(
            Document(
                id=10,
                user_id=2,
                doc_type="cv",
                file_name="cv.pdf",
                file_path="/uploads/cv.pdf",
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


def test_reject_document_notifies_intern(integration_client):
    client, session_factory = integration_client
    headers = {
        "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
    }

    response = client.post(
        "/api/hr/documents/10/review",
        json={"status": "rejected", "review_note": "CV thiếu thông tin"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "rejected"
    assert body["review_note"] == "CV thiếu thông tin"

    with session_factory() as db:
        notes = db.query(Notification).filter(Notification.user_id == 2).all()
        assert len(notes) == 1
        assert "từ chối" in notes[0].title.lower() or "Từ chối" in notes[0].title
        assert "CV thiếu thông tin" in notes[0].body
