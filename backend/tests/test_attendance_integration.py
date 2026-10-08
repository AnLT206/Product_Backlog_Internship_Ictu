"""Tests tích hợp cho Quản lý chấm công check-in / check-out (Tasks 3, 4)."""

from collections.abc import Generator
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.attendance import Attendance
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.work_shift import WorkShift
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def attendance_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
        admin_role = Role(id=3, name="admin", description="Admin")
        db.add_all([hr_role, intern_role, admin_role])
        db.flush()

        # HR user (id=1)
        db.add(
            User(
                id=1,
                code="HR0001",
                email="hr@example.com",
                password_hash="x",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Intern 1 (id=10)
        db.add(
            User(
                id=10,
                code="TTS0001",
                email="intern1@example.com",
                password_hash="x",
                full_name="Intern One",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Intern 2 (id=20)
        db.add(
            User(
                id=20,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="x",
                full_name="Intern Two",
                role_id=intern_role.id,
                status="active",
            )
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


# ── Check-in Tests (Task 4 & Task 3) ─────────────────────────────────────────

def test_intern_check_in_success(attendance_client):
    client, _ = attendance_client
    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/intern/attendance/check-in",
        json={"note": "Đi làm đúng giờ"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 10
    assert data["user_code"] == "TTS0001"
    assert data["work_date"] == str(datetime.now().date())
    assert data["check_in_at"] is not None
    assert data["check_out_at"] is None
    assert data["total_hours"] is None
    assert data["status"] == "present"
    assert data["note"] == "Đi làm đúng giờ"


def test_intern_duplicate_check_in_rejected(attendance_client):
    client, _ = attendance_client
    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    # Lần 1: Thành công
    res1 = client.post("/api/intern/attendance/check-in", headers=headers)
    assert res1.status_code == 201

    # Lần 2: Bị từ chối vì đã check-in trong ngày (Task 3: Ràng buộc UNIQUE)
    res2 = client.post("/api/intern/attendance/check-in", headers=headers)
    assert res2.status_code == 400
    assert "đã check-in ngày hôm nay rồi" in res2.json()["detail"]


# ── Check-out Tests & Tính tổng thời gian (Task 4) ───────────────────────────

def test_intern_check_out_before_check_in_rejected(attendance_client):
    client, _ = attendance_client
    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    # Cố gắng check-out khi chưa check-in
    response = client.post("/api/intern/attendance/check-out", headers=headers)
    assert response.status_code == 400
    assert "chưa check-in hôm nay" in response.json()["detail"]


def test_intern_check_out_success_and_calculates_total_hours(attendance_client):
    client, session_factory = attendance_client

    # Giả lập bản ghi check-in cách đây 8 tiếng
    today = datetime.now().date()
    eight_hours_ago = datetime.now() - timedelta(hours=8)
    with session_factory() as db:
        att = Attendance(
            user_id=10,
            work_date=today,
            check_in_at=eight_hours_ago,
            status="present",
        )
        db.add(att)
        db.commit()

    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/intern/attendance/check-out",
        json={"note": "Hoàn thành ca làm việc"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["check_out_at"] is not None
    assert data["total_hours"] is not None
    assert data["total_hours"] >= 7.9  # Khoảng ~8 tiếng
    assert "Hoàn thành ca làm việc" in data["note"]


def test_intern_duplicate_check_out_rejected(attendance_client):
    client, session_factory = attendance_client

    # Check-in trước
    today = datetime.now().date()
    with session_factory() as db:
        att = Attendance(
            user_id=10,
            work_date=today,
            check_in_at=datetime.now() - timedelta(hours=4),
            status="present",
        )
        db.add(att)
        db.commit()

    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    # Check-out lần 1: Thành công
    res1 = client.post("/api/intern/attendance/check-out", headers=headers)
    assert res1.status_code == 200

    # Check-out lần 2: Bị từ chối
    res2 = client.post("/api/intern/attendance/check-out", headers=headers)
    assert res2.status_code == 400
    assert "đã check-out ngày hôm nay rồi" in res2.json()["detail"]


def test_attendance_status_with_new_work_schedule(attendance_client, monkeypatch):
    client, session_factory = attendance_client
    today = datetime.now().date()

    with session_factory() as db:
        program = InternshipProgram(
            name="Attendance status test program",
            department="IT",
            start_date=today,
            end_date=today,
            max_interns=1,
            status="open",
        )
        db.add(program)
        db.flush()
        db.add(ProgramMember(program_id=program.id, intern_user_id=10))
        db.add(
            WorkShift(
                program_id=program.id,
                group_name="Attendance status test group",
                shift_type="full_time",
                start_time=time(8, 0),
                end_time=time(17, 0),
                days_of_week=str(today.isoweekday()),
                flexible_minutes=0,
                is_active=True,
            )
        )
        db.commit()

    class FrozenDateTime(datetime):
        current = datetime.combine(today, time(8, 15))

        @classmethod
        def now(cls, tz=None):
            return cls.current

    monkeypatch.setattr("app.services.attendance_service.datetime", FrozenDateTime)
    headers = {
        "Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"
    }

    check_in_response = client.post(
        "/api/intern/attendance/check-in",
        headers=headers,
    )
    assert check_in_response.status_code == 201
    check_in_data = check_in_response.json()

    FrozenDateTime.current = datetime.combine(today, time(16, 45))
    check_out_response = client.post(
        "/api/intern/attendance/check-out",
        headers=headers,
    )
    assert check_out_response.status_code == 200
    check_out_data = check_out_response.json()

    assert (
        check_in_data["status"],
        check_out_data["status"],
    ) == ("late", "early_leave")


# ── Lịch sử & Trạng thái Chấm công ──────────────────────────────────────────

def test_get_today_attendance_status(attendance_client):
    client, _ = attendance_client
    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    # Trước khi check-in
    res_before = client.get("/api/intern/attendance/today", headers=headers)
    assert res_before.status_code == 200
    assert res_before.json()["checked_in"] is False
    assert res_before.json()["checked_out"] is False

    # Check-in
    client.post("/api/intern/attendance/check-in", headers=headers)

    # Sau khi check-in
    res_after = client.get("/api/intern/attendance/today", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["checked_in"] is True
    assert res_after.json()["checked_out"] is False

    # Check-out
    client.post("/api/intern/attendance/check-out", headers=headers)

    # Sau khi check-out
    res_final = client.get("/api/intern/attendance/today", headers=headers)
    assert res_final.status_code == 200
    assert res_final.json()["checked_in"] is True
    assert res_final.json()["checked_out"] is True


def test_intern_attendance_history(attendance_client):
    client, session_factory = attendance_client

    with session_factory() as db:
        # 2 ngày chấm công trong quá khứ
        d1 = date(2026, 9, 20)
        d2 = date(2026, 9, 21)
        a1 = Attendance(user_id=10, work_date=d1, check_in_at=datetime(2026, 9, 20, 8, 0), check_out_at=datetime(2026, 9, 20, 17, 0), total_hours=Decimal("9.00"))
        a2 = Attendance(user_id=10, work_date=d2, check_in_at=datetime(2026, 9, 21, 8, 30), check_out_at=datetime(2026, 9, 21, 17, 30), total_hours=Decimal("9.00"))
        # Bản ghi của Intern khác (id=20)
        a3 = Attendance(user_id=20, work_date=d1, check_in_at=datetime(2026, 9, 20, 8, 0))
        db.add_all([a1, a2, a3])
        db.commit()

    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/intern/attendance", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    for item in data["items"]:
        assert item["user_id"] == 10


def test_hr_list_all_attendance(attendance_client):
    client, session_factory = attendance_client

    with session_factory() as db:
        d = date(2026, 9, 25)
        a1 = Attendance(user_id=10, work_date=d, check_in_at=datetime(2026, 9, 25, 8, 0))
        a2 = Attendance(user_id=20, work_date=d, check_in_at=datetime(2026, 9, 25, 8, 15))
        db.add_all([a1, a2])
        db.commit()

    hr_token = create_access_token(user_id=1, role="hr")
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # HR xem tất cả
    res_all = client.get("/api/hr/attendance", headers=hr_headers)
    assert res_all.status_code == 200
    assert res_all.json()["total"] == 2

    # HR lọc theo intern_id
    res_filter = client.get("/api/hr/attendance?intern_id=10", headers=hr_headers)
    assert res_filter.status_code == 200
    assert res_filter.json()["total"] == 1
    assert res_filter.json()["items"][0]["user_id"] == 10


def test_intern_cannot_access_hr_attendance(attendance_client):
    client, _ = attendance_client
    intern_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern_token}"}

    response = client.get("/api/hr/attendance", headers=headers)
    assert response.status_code == 403


def test_unauthenticated_attendance_requests_rejected(attendance_client):
    client, _ = attendance_client
    assert client.post("/api/intern/attendance/check-in").status_code == 401
    assert client.post("/api/intern/attendance/check-out").status_code == 401
    assert client.get("/api/intern/attendance").status_code == 401
    assert client.get("/api/hr/attendance").status_code == 401
