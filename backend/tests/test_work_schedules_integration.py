from collections.abc import Generator
from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.internship_program import InternshipProgram
from app.models.role import Role
from app.models.user import User
from app.models.work_shift import WorkShift
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def work_schedule_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(name="hr", description="HR")
        intern_role = Role(name="intern", description="Intern")
        db.add_all([hr_role, intern_role])
        db.flush()

        hr = User(
            id=1,
            code="HR0001",
            email="hr@example.com",
            password_hash="hashed",
            full_name="HR User",
            role_id=hr_role.id,
            status="active",
        )
        intern = User(
            id=2,
            code="TTS0001",
            email="intern@example.com",
            password_hash="hashed",
            full_name="Intern User",
            role_id=intern_role.id,
            status="active",
        )
        program = InternshipProgram(
            id=1,
            name="Ky thuc tap Thu 2026",
            department="IT",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=30,
            status="open",
        )
        db.add_all([hr, intern, program])
        db.flush()

        initial_shift = WorkShift(
            id=1,
            program_id=program.id,
            group_name="Nhom Frontend",
            shift_type="morning",
            start_time=time(8, 0, 0),
            end_time=time(12, 0, 0),
            days_of_week="2,3,4,5,6",
            flexible_minutes=15,
            is_active=True,
        )
        db.add(initial_shift)
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


def test_create_work_schedule_success(work_schedule_client):
    client, _ = work_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")

    payload = {
        "group_name": "Nhom Backend",
        "program_id": 1,
        "shift_type": "afternoon",
        "start_time": "13:30:00",
        "end_time": "17:30:00",
        "days_of_week": "2,4,6",
        "flexible_minutes": 20,
        "is_active": True,
    }
    response = client.post(
        "/api/hr/work-schedules",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["group_name"] == "Nhom Backend"
    assert body["shift_type"] == "afternoon"
    assert body["start_time"] == "13:30:00"
    assert body["end_time"] == "17:30:00"
    assert body["flexible_minutes"] == 20


def test_create_work_schedule_invalid_time(work_schedule_client):
    client, _ = work_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")

    # Giờ bắt đầu lớn hơn giờ kết thúc
    payload = {
        "group_name": "Nhom Loi",
        "shift_type": "morning",
        "start_time": "18:00:00",
        "end_time": "08:00:00",
        "days_of_week": "2,3,4,5,6",
    }
    response = client.post(
        "/api/hr/work-schedules",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 400
    assert "trước giờ kết thúc" in response.json()["detail"]


def test_update_work_schedule_success(work_schedule_client):
    client, _ = work_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")

    update_payload = {
        "group_name": "Nhom Frontend - Doi ca",
        "flexible_minutes": 30,
        "shift_type": "full_time",
    }
    response = client.put(
        "/api/hr/work-schedules/1",
        json=update_payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["group_name"] == "Nhom Frontend - Doi ca"
    assert body["flexible_minutes"] == 30
    assert body["shift_type"] == "full_time"


def test_list_work_schedules(work_schedule_client):
    client, _ = work_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")

    response = client.get(
        "/api/hr/work-schedules",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert body[0]["group_name"] == "Nhom Frontend"


def test_work_schedules_forbidden_for_intern(work_schedule_client):
    client, _ = work_schedule_client
    intern_token = create_access_token(user_id=2, role="intern")

    response = client.get(
        "/api/hr/work-schedules",
        headers={"Authorization": f"Bearer {intern_token}"},
    )
    assert response.status_code == 403
