from collections.abc import Generator
from datetime import date, timedelta, time

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
from app.models.weekly_work_schedule import WeeklyWorkSchedule
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def weekly_schedule_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(name="admin", description="Admin")
        hr_role = Role(name="hr", description="HR")
        intern_role = Role(name="intern", description="Intern")
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([admin_role, hr_role, intern_role, mentor_role])
        db.flush()

        hr = User(
            id=1,
            code="HR0001",
            email="hr@ictu.edu.vn",
            password_hash="hashed",
            full_name="Nguyễn Văn HR",
            role_id=hr_role.id,
            status="active",
        )
        intern = User(
            id=2,
            code="TTS0001",
            email="tts@ictu.edu.vn",
            password_hash="hashed",
            full_name="Trần Thị TTS",
            role_id=intern_role.id,
            status="active",
        )
        mentor = User(
            id=3,
            code="GV0001",
            email="mentor@ictu.edu.vn",
            password_hash="hashed",
            full_name="Lê Văn Mentor",
            role_id=mentor_role.id,
            status="active",
        )
        db.add_all([hr, intern, mentor])
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


def test_create_and_list_weekly_schedules(weekly_schedule_client):
    client, _ = weekly_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")

    today = date.today()
    session_date = today + timedelta(days=5)

    payload = {
        "user_id": 2,
        "role": "intern",
        "session_date": session_date.isoformat(),
        "shift_name": "Ca Sáng (08:00 - 12:00)",
        "start_time": "08:00:00",
        "end_time": "12:00:00",
        "location": "P.302 – Trung tâm Phần mềm & AI ICTU",
        "notes": "Họp sprint và làm việc theo nhóm",
        "status": "scheduled",
    }

    resp = client.post(
        "/api/hr/weekly-schedules",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["user_id"] == 2
    assert data["role"] == "intern"
    assert data["user_name"] == "Trần Thị TTS"
    assert data["is_editable"] is True
    assert data["days_until_session"] == 5

    # List schedules
    list_resp = client.get(
        "/api/hr/weekly-schedules?role=intern",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert len(list_data) == 1
    assert list_data[0]["shift_name"] == "Ca Sáng (08:00 - 12:00)"


def test_3days_lock_rule_for_editing(weekly_schedule_client):
    """
    Quy tắc nghiệp vụ: HR chỉ được phép chỉnh sửa trước 3 ngày tính đến ngày làm việc.
    Sau thời gian đó (< 3 ngày), API trả về HTTP 400 và không cho phép chỉnh sửa.
    """
    client, session_factory = weekly_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")
    today = date.today()

    with session_factory() as db:
        # Schedule 1: 5 ngày nữa (>= 3 ngày -> HỢP LỆ)
        sched_far = WeeklyWorkSchedule(
            user_id=2,
            role="intern",
            session_date=today + timedelta(days=5),
            shift_name="Ca Chiều",
            start_time=time(13, 0, 0),
            end_time=time(17, 0, 0),
            location="P.302",
            status="scheduled",
            created_by_id=1,
        )
        # Schedule 2: 2 ngày nữa (< 3 ngày -> BỊ KHÓA CHỈNH SỬA)
        sched_near = WeeklyWorkSchedule(
            user_id=2,
            role="intern",
            session_date=today + timedelta(days=2),
            shift_name="Ca Sáng",
            start_time=time(8, 0, 0),
            end_time=time(12, 0, 0),
            location="P.302",
            status="scheduled",
            created_by_id=1,
        )
        db.add_all([sched_far, sched_near])
        db.commit()
        far_id = sched_far.id
        near_id = sched_near.id

    # 1. Sửa ca cách 5 ngày -> THÀNH CÔNG (200)
    update_far = client.put(
        f"/api/hr/weekly-schedules/{far_id}",
        json={"shift_name": "Ca Chiều (Đã cập nhật)", "notes": "Đổi phòng họp P.305"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert update_far.status_code == 200
    assert update_far.json()["shift_name"] == "Ca Chiều (Đã cập nhật)"

    # 2. Sửa ca cách 2 ngày -> BỊ CHẶN (400) với thông báo rõ ràng
    update_near = client.put(
        f"/api/hr/weekly-schedules/{near_id}",
        json={"shift_name": "Cố tình sửa ca gần ngày"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert update_near.status_code == 400
    assert "trước ít nhất 3 ngày" in update_near.json()["detail"]

    # 3. Thử đổi ngày của ca cách 5 ngày về thành ngày mai (cách 1 ngày) -> BỊ CHẶN (400)
    move_to_near = client.put(
        f"/api/hr/weekly-schedules/{far_id}",
        json={"session_date": (today + timedelta(days=1)).isoformat()},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert move_to_near.status_code == 400
    assert "ít nhất 3 ngày" in move_to_near.json()["detail"]


def test_delete_weekly_schedule(weekly_schedule_client):
    client, session_factory = weekly_schedule_client
    hr_token = create_access_token(user_id=1, role="hr")
    today = date.today()

    with session_factory() as db:
        sched = WeeklyWorkSchedule(
            user_id=3,
            role="mentor",
            session_date=today + timedelta(days=4),
            shift_name="Ca Mentor",
            start_time=time(9, 0, 0),
            end_time=time(11, 0, 0),
            status="scheduled",
            created_by_id=1,
        )
        db.add(sched)
        db.commit()
        sched_id = sched.id

    del_resp = client.delete(
        f"/api/hr/weekly-schedules/{sched_id}",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert del_resp.status_code == 200
    assert "thành công" in del_resp.json()["message"]


def test_intern_and_mentor_view_own_schedules(weekly_schedule_client):
    client, session_factory = weekly_schedule_client
    today = date.today()

    with session_factory() as db:
        sched_intern = WeeklyWorkSchedule(
            user_id=2,
            role="intern",
            session_date=today + timedelta(days=4),
            shift_name="Ca Sáng TTS",
            start_time=time(8, 0, 0),
            end_time=time(12, 0, 0),
            status="scheduled",
            created_by_id=1,
        )
        sched_mentor = WeeklyWorkSchedule(
            user_id=3,
            role="mentor",
            session_date=today + timedelta(days=4),
            shift_name="Ca Hướng Dẫn Mentor",
            start_time=time(14, 0, 0),
            end_time=time(16, 0, 0),
            status="scheduled",
            created_by_id=1,
        )
        db.add_all([sched_intern, sched_mentor])
        db.commit()

    intern_token = create_access_token(user_id=2, role="intern")
    mentor_token = create_access_token(user_id=3, role="mentor")

    # Intern calls intern endpoint
    res_intern = client.get(
        "/api/intern/weekly-schedules",
        headers={"Authorization": f"Bearer {intern_token}"},
    )
    assert res_intern.status_code == 200
    items_intern = res_intern.json()
    assert len(items_intern) == 1
    assert items_intern[0]["shift_name"] == "Ca Sáng TTS"
    assert items_intern[0]["role"] == "intern"

    # Mentor calls mentor endpoint
    res_mentor = client.get(
        "/api/mentor/weekly-schedules",
        headers={"Authorization": f"Bearer {mentor_token}"},
    )
    assert res_mentor.status_code == 200
    items_mentor = res_mentor.json()
    assert len(items_mentor) == 1
    assert items_mentor[0]["shift_name"] == "Ca Hướng Dẫn Mentor"
    assert items_mentor[0]["role"] == "mentor"

    # Intern cannot access HR management endpoint
    res_forbidden = client.get(
        "/api/hr/weekly-schedules",
        headers={"Authorization": f"Bearer {intern_token}"},
    )
    assert res_forbidden.status_code == 403
