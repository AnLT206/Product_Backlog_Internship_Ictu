from collections.abc import Generator
from datetime import date, datetime

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
from app.models.leave_request import LeaveRequest
from app.models.program_member import ProgramMember
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
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([hr_role, intern_role, mentor_role, admin_role])
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
        admin = User(
            id=2,
            code="AD0001",
            email="admin@example.com",
            password_hash="x",
            full_name="System Admin",
            role_id=admin_role.id,
            status="active",
        )
        mentor = User(
            id=3,
            code="MT0001",
            email="mentor@example.com",
            password_hash="x",
            full_name="Mentor One",
            role_id=mentor_role.id,
            status="active",
        )
        db.add_all([hr, admin, mentor, intern_one, intern_two])
        db.flush()

        # Tạo đợt thực tập (Internship Program)
        program1 = InternshipProgram(
            id=1,
            name="Đợt 1 - Hè 2026",
            department="Công nghệ Thông tin",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 6, 30),
            max_interns=30,
            status="open",
        )
        program2 = InternshipProgram(
            id=2,
            name="Đợt 2 - Thu 2026",
            department="Công nghệ Thông tin",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 11, 30),
            max_interns=30,
            status="open",
        )
        db.add_all([program1, program2])
        db.flush()

        # Gán intern 10 vào đợt 1, intern 20 vào đợt 2
        pm1 = ProgramMember(program_id=1, intern_user_id=10, mentor_user_id=3)
        pm2 = ProgramMember(program_id=2, intern_user_id=20, mentor_user_id=3)
        db.add_all([pm1, pm2])
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


def _admin_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=2, role='admin')}"}


# ── GET /api/hr/attendance-reports Tests ───────────────────────────────────────

def test_hr_attendance_reports_endpoint_success(report_client):
    """Kiểm tra API chuẩn GET /api/hr/attendance-reports trả về thống kê đầy đủ."""
    client, _ = report_client
    response = client.get("/api/hr/attendance-reports", headers=_hr_headers())
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
    assert by_id[10]["total_working_days"] == 3
    assert by_id[10]["attendance_rate"] == 60.0
    assert by_id[10]["program_name"] == "Đợt 1 - Hè 2026"
    assert by_id[10]["email"] == "intern1@example.com"

    assert by_id[20]["authorized_leave_days"] == 2
    assert by_id[20]["present_days"] == 0
    assert by_id[20]["program_name"] == "Đợt 2 - Thu 2026"


def test_hr_attendance_reports_filter_by_month_yyyy_mm(report_client):
    """Lọc theo tháng dạng YYYY-MM (tháng 2026-06)."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"month": "2026-06"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["month"] == "2026-06"
    assert body["from_date"] == "2026-06-01"
    assert body["to_date"] == "2026-06-30"
    assert body["total"] == 2


def test_hr_attendance_reports_filter_by_month_and_year(report_client):
    """Lọc theo tháng số và năm riêng biệt (month=6, year=2026)."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"month": "6", "year": 2026},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["month"] == "2026-06"
    assert body["from_date"] == "2026-06-01"
    assert body["to_date"] == "2026-06-30"
    assert body["total"] == 2


def test_hr_attendance_reports_filter_by_month_no_data(report_client):
    """Lọc tháng không có dữ liệu (tháng 2026-07) trả về danh sách rỗng."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"month": "2026-07"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["items"] == []
    assert body["totals"]["present_days"] == 0


def test_hr_attendance_reports_filter_by_program(report_client):
    """Lọc theo đợt thực tập (program_id=1)."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"program_id": 1},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["program_id"] == 1
    assert body["program_name"] == "Đợt 1 - Hè 2026"
    assert body["total"] == 1
    assert body["items"][0]["intern_id"] == 10
    assert body["items"][0]["present_days"] == 2


def test_hr_attendance_reports_filter_by_batch_id_alias(report_client):
    """Lọc theo bí danh batch_id."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"batch_id": 2},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["program_id"] == 2
    assert body["total"] == 1
    assert body["items"][0]["intern_id"] == 20


def test_hr_attendance_reports_filter_by_month_and_program_combined(report_client):
    """Kết hợp bộ lọc cả tháng và đợt thực tập."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"program_id": 1, "month": "2026-06"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["program_id"] == 1
    assert body["month"] == "2026-06"
    assert body["total"] == 1
    assert body["items"][0]["intern_id"] == 10


def test_hr_attendance_reports_program_not_found_404(report_client):
    """Lọc theo program_id không tồn tại trả về 404."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"program_id": 9999},
        headers=_hr_headers(),
    )
    assert response.status_code == 404
    assert "Không tìm thấy đợt thực tập" in response.json()["detail"]


def test_hr_attendance_reports_invalid_month_400(report_client):
    """Lọc với định dạng tháng sai trả về 400 Bad Request."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"month": "invalid-month"},
        headers=_hr_headers(),
    )
    assert response.status_code == 400


def test_hr_attendance_reports_invalid_date_range_400(report_client):
    """Khoảng ngày from_date > to_date trả về 400."""
    client, _ = report_client
    response = client.get(
        "/api/hr/attendance-reports",
        params={"from_date": "2026-06-10", "to_date": "2026-06-01"},
        headers=_hr_headers(),
    )
    assert response.status_code == 400


def test_hr_attendance_reports_admin_allowed(report_client):
    """Admin cũng có quyền xem báo cáo chuyên cần."""
    client, _ = report_client
    response = client.get("/api/hr/attendance-reports", headers=_admin_headers())
    assert response.status_code == 200


def test_attendance_reports_requires_hr_or_admin(report_client):
    """Chặn TTS và Mentor truy cập, yêu cầu đăng nhập."""
    client, _ = report_client
    missing = client.get("/api/hr/attendance-reports")
    assert missing.status_code == 401

    intern_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"
    }
    forbidden_intern = client.get("/api/hr/attendance-reports", headers=intern_headers)
    assert forbidden_intern.status_code == 403

    mentor_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=3, role='mentor')}"
    }
    forbidden_mentor = client.get("/api/hr/attendance-reports", headers=mentor_headers)
    assert forbidden_mentor.status_code == 403


# ── Legacy /api/hr/attendance/report Tests (Backward Compatibility) ───────────

def test_legacy_hr_attendance_leave_report_joins_both_tables(report_client):
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


def test_legacy_hr_attendance_leave_report_filters_intern_and_dates(report_client):
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

