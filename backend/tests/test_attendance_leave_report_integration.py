from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def report_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(id=1, name="hr", description="HR")
        intern_role = Role(id=2, name="intern", description="Intern")
        db.add_all([hr_role, intern_role])
        db.flush()
        intern_one = User(
            id=10,
            code="TTS0001",
            email="intern1@example.com",
            password_hash="x",
            full_name="Intern One",
            role_id=intern_role.id,
            status="active",
        )
        intern_two = User(
            id=20,
            code="TTS0002",
            email="intern2@example.com",
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
            full_name="HR Manager",
            role_id=hr_role.id,
            status="active",
        )
        db.add_all([hr, intern_one, intern_two])
        db.flush()

        morning = datetime(2026, 6, 1, 8, 30)
        db.add_all(
            [
                Attendance(
                    user_id=10,
                    work_date=morning.date(),
                    check_in_at=morning,
                    status="present",
                ),
                Attendance(
                    user_id=10,
                    work_date=datetime(2026, 6, 2).date(),
                    check_in_at=datetime(2026, 6, 2, 8, 30),
                    status="present",
                ),
                Attendance(
                    user_id=10,
                    work_date=datetime(2026, 6, 3).date(),
                    check_in_at=datetime(2026, 6, 3, 9, 15),
                    status="late",
                ),
                Attendance(
                    user_id=10,
                    work_date=datetime(2026, 6, 4).date(),
                    check_in_at=datetime(2026, 6, 4, 8, 30),
                    status="absent",
                ),
                Attendance(
                    user_id=10,
                    work_date=datetime(2026, 6, 5).date(),
                    check_in_at=datetime(2026, 6, 5, 8, 30),
                    status="absent",
                ),
                LeaveRequest(
                    user_id=10,
                    start_date=datetime(2026, 6, 4).date(),
                    end_date=datetime(2026, 6, 4).date(),
                    reason="Nghỉ có phép",
                    status="approved",
                ),
                LeaveRequest(
                    user_id=20,
                    start_date=datetime(2026, 6, 6).date(),
                    end_date=datetime(2026, 6, 7).date(),
                    reason="Nghỉ 2 ngày không chấm công",
                    status="approved",
                ),
            ]
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    import app.api.activity_log_filter as activity_filter
    import app.core.database as database

    original_session_local = database.SessionLocal
    database.SessionLocal = session_factory
    activity_filter.SessionLocal = session_factory

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    database.SessionLocal = original_session_local
    activity_filter.SessionLocal = original_session_local
    Base.metadata.drop_all(engine)
    engine.dispose()


def _hr_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"}


def test_hr_attendance_leave_report_joins_both_tables(report_client):
    client, _ = report_client
    response = client.get("/api/hr/attendance/report", headers=_hr_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["totals"] == {
        "present_days": 2,
        "late_days": 1,
        "authorized_leave_days": 3,
        "unauthorized_leave_days": 1,
    }

    by_id = {item["intern_id"]: item for item in body["items"]}
    assert by_id[10]["present_days"] == 2
    assert by_id[10]["late_days"] == 1
    assert by_id[10]["authorized_leave_days"] == 1
    assert by_id[10]["unauthorized_leave_days"] == 1
    assert by_id[20]["authorized_leave_days"] == 2
    assert by_id[20]["present_days"] == 0


def test_hr_attendance_leave_report_filters_intern_and_dates(report_client):
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance/report",
        params={"intern_id": 10, "from_date": "2026-06-01", "to_date": "2026-06-03"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["intern_id"] == 10
    assert item["present_days"] == 2
    assert item["late_days"] == 1
    assert item["authorized_leave_days"] == 0
    assert item["unauthorized_leave_days"] == 0


def test_attendance_leave_report_requires_hr(report_client):
    client, _ = report_client
    missing = client.get("/api/hr/attendance/report")
    assert missing.status_code == 401

    intern_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"
    }
    forbidden = client.get("/api/hr/attendance/report", headers=intern_headers)
    assert forbidden.status_code == 403
