from collections.abc import Generator
from io import BytesIO
from pathlib import Path

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

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def report_client() -> Generator[TestClient, None, None]:
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


def _intern_headers() -> dict[str, str]:
    token = create_access_token(user_id=10, role="intern")
    return {"Authorization": f"Bearer {token}"}


def test_submit_report_without_file(report_client: TestClient):
    response = report_client.post(
        "/api/reports",
        data={
            "content": "Hoan thanh API dang nhap.",
            "week_start": "2026-06-01",
            "week_end": "2026-06-07",
        },
        headers=_intern_headers(),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["content"] == "Hoan thanh API dang nhap."
    assert body["week_start"] == "2026-06-01"
    assert body["week_end"] == "2026-06-07"
    assert body["attachment_path"] is None


def test_submit_report_with_pdf(report_client: TestClient):
    response = report_client.post(
        "/api/reports",
        data={
            "content": "Bao cao kem file.",
            "week_start": "2026-06-08",
            "week_end": "2026-06-14",
        },
        files={"file": ("bao_cao.pdf", BytesIO(b"%PDF-1.4 mock"), "application/pdf")},
        headers=_intern_headers(),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["attachment_path"]
    stored = BACKEND_ROOT / body["attachment_path"]
    assert stored.is_file()
    stored.unlink()


def test_submit_report_rejects_invalid_file_and_dates(report_client: TestClient):
    bad_file = report_client.post(
        "/api/reports",
        data={
            "content": "Bao cao sai file.",
            "week_start": "2026-06-15",
            "week_end": "2026-06-21",
        },
        files={"file": ("note.txt", BytesIO(b"hello"), "text/plain")},
        headers=_intern_headers(),
    )
    assert bad_file.status_code == 422

    bad_dates = report_client.post(
        "/api/reports",
        data={
            "content": "Bao cao sai ngay.",
            "week_start": "2026-06-21",
            "week_end": "2026-06-15",
        },
        headers=_intern_headers(),
    )
    assert bad_dates.status_code == 422


def test_submit_report_requires_intern(report_client: TestClient):
    missing = report_client.post(
        "/api/reports",
        data={
            "content": "Khong co token.",
            "week_start": "2026-06-01",
            "week_end": "2026-06-07",
        },
    )
    assert missing.status_code == 401

    hr_token = create_access_token(user_id=1, role="hr")
    forbidden = report_client.post(
        "/api/reports",
        data={
            "content": "HR khong nop bao cao.",
            "week_start": "2026-06-01",
            "week_end": "2026-06-07",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert forbidden.status_code == 403
