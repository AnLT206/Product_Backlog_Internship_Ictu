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
from app.models.evaluation import Evaluation
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.leave_request import LeaveRequest
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def eval_report_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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

        # Tạo 3 TTS thuộc các trường và đợt khác nhau
        intern1 = User(
            id=10,
            code="TTS0001",
            email="intern1@example.com",
            password_hash="x",
            full_name="Nguyễn Văn A",
            role_id=intern_role.id,
            status="active",
        )
        intern2 = User(
            id=20,
            code="TTS0002",
            email="intern2@example.com",
            password_hash="x",
            full_name="Trần Thị B",
            role_id=intern_role.id,
            status="active",
        )
        intern3 = User(
            id=30,
            code="TTS0003",
            email="intern3@example.com",
            password_hash="x",
            full_name="Lê Văn C",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([hr, admin, mentor, intern1, intern2, intern3])
        db.flush()

        # Hồ sơ TTS: trường đại học
        p1 = InternProfile(
            user_id=10,
            university="Đại học CNTT & TT (ICTU)",
            major="Công nghệ phần mềm",
            academic_year="K19",
        )
        p2 = InternProfile(
            user_id=20,
            university="Đại học CNTT & TT (ICTU)",
            major="Khoa học máy tính",
            academic_year="K19",
        )
        p3 = InternProfile(
            user_id=30,
            university="Đại học Bách Khoa Hà Nội",
            major="Kỹ thuật máy tính",
            academic_year="K65",
        )
        db.add_all([p1, p2, p3])

        # Đợt thực tập
        prog1 = InternshipProgram(
            id=1,
            name="Đợt 1 - Hè 2026",
            department="CNTT",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 8, 31),
        )
        prog2 = InternshipProgram(
            id=2,
            name="Đợt 2 - Thu 2026",
            department="CNTT",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 11, 30),
        )
        db.add_all([prog1, prog2])
        db.flush()

        # Phân đợt
        db.add_all(
            [
                ProgramMember(program_id=1, intern_user_id=10, mentor_user_id=3),
                ProgramMember(program_id=1, intern_user_id=20, mentor_user_id=3),
                ProgramMember(program_id=2, intern_user_id=30, mentor_user_id=3),
            ]
        )

        # Đánh giá:
        # Intern 1: skill 9, attitude 9 -> final 9.0 (Xuất sắc)
        # Intern 2: skill 8, attitude 8 -> final 8.0 (Giỏi)
        # Intern 3: Chưa đánh giá
        eval1 = Evaluation(
            intern_id=10,
            mentor_id=3,
            skill_score=9,
            attitude_score=9,
            comment="Rất xuất sắc",
        )
        eval2 = Evaluation(
            intern_id=20,
            mentor_id=3,
            skill_score=8,
            attitude_score=8,
            comment="Hoàn thành tốt",
        )
        db.add_all([eval1, eval2])

        # Chấm công & Nghỉ phép cho intern 1:
        # 2 ngày present, 1 ngày late, 1 ngày absent có phép
        db.add_all(
            [
                Attendance(
                    user_id=10,
                    work_date=date(2026, 6, 1),
                    check_in_at=datetime(2026, 6, 1, 8, 30),
                    status="present",
                ),
                Attendance(
                    user_id=10,
                    work_date=date(2026, 6, 2),
                    check_in_at=datetime(2026, 6, 2, 8, 30),
                    status="present",
                ),
                Attendance(
                    user_id=10,
                    work_date=date(2026, 6, 3),
                    check_in_at=datetime(2026, 6, 3, 9, 15),
                    status="late",
                ),
                Attendance(
                    user_id=10,
                    work_date=date(2026, 6, 4),
                    check_in_at=datetime(2026, 6, 4, 8, 30),
                    status="absent",
                ),
                LeaveRequest(
                    user_id=10,
                    start_date=date(2026, 6, 4),
                    end_date=date(2026, 6, 4),
                    reason="Bị ốm",
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


# ── Integration Tests: GET /api/hr/evaluations/summary ───────────────────────

def test_get_final_evaluations_summary_success(eval_report_client):
    """Kiểm tra tổng hợp báo cáo cuối kỳ: điểm số, xếp loại và chuyên cần."""
    client, _ = eval_report_client
    response = client.get("/api/hr/evaluations/summary", headers=_hr_headers())
    assert response.status_code == 200
    body = response.json()

    assert body["total_interns"] == 3
    assert body["evaluated_count"] == 2
    assert body["unevaluated_count"] == 1
    assert body["average_score"] == 8.5  # (9.0 + 8.0) / 2

    # Phân bố xếp loại
    dist = body["grade_distribution"]
    assert dist["Xuất sắc"] == 1
    assert dist["Giỏi"] == 1
    assert dist["Chưa đánh giá"] == 1

    by_id = {item["intern_id"]: item for item in body["items"]}

    # Kiểm tra Intern 1
    it1 = by_id[10]
    assert it1["skill_score"] == 9
    assert it1["attitude_score"] == 9
    assert it1["final_score"] == 9.0
    assert it1["grade"] == "Xuất sắc"
    assert it1["is_evaluated"] is True
    assert it1["university"] == "Đại học CNTT & TT (ICTU)"
    assert it1["program_name"] == "Đợt 1 - Hè 2026"
    assert it1["present_days"] == 2
    assert it1["late_days"] == 1
    assert it1["authorized_leave_days"] == 1
    assert it1["unauthorized_leave_days"] == 0
    assert it1["total_working_days"] == 3
    assert it1["attendance_rate"] == 75.0  # (2 + 1) / 4 = 75%

    # Kiểm tra Intern 2
    it2 = by_id[20]
    assert it2["final_score"] == 8.0
    assert it2["grade"] == "Giỏi"
    assert it2["is_evaluated"] is True

    # Kiểm tra Intern 3 (chưa đánh giá)
    it3 = by_id[30]
    assert it3["final_score"] is None
    assert it3["grade"] == "Chưa đánh giá"
    assert it3["is_evaluated"] is False

    # Thống kê theo trường đại học
    by_uni = {u["university"]: u for u in body["by_university"]}
    assert "Đại học CNTT & TT (ICTU)" in by_uni
    assert by_uni["Đại học CNTT & TT (ICTU)"]["intern_count"] == 2
    assert by_uni["Đại học CNTT & TT (ICTU)"]["evaluated_count"] == 2
    assert by_uni["Đại học CNTT & TT (ICTU)"]["average_score"] == 8.5

    assert "Đại học Bách Khoa Hà Nội" in by_uni
    assert by_uni["Đại học Bách Khoa Hà Nội"]["intern_count"] == 1
    assert by_uni["Đại học Bách Khoa Hà Nội"]["evaluated_count"] == 0


def test_filter_by_university(eval_report_client):
    """Lọc danh sách báo cáo theo trường đại học."""
    client, _ = eval_report_client
    response = client.get(
        "/api/hr/evaluations/summary",
        params={"university": "Bách Khoa"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_interns"] == 1
    assert body["items"][0]["intern_id"] == 30
    assert body["items"][0]["university"] == "Đại học Bách Khoa Hà Nội"


def test_filter_by_program(eval_report_client):
    """Lọc danh sách báo cáo theo đợt thực tập."""
    client, _ = eval_report_client
    response = client.get(
        "/api/hr/evaluations/summary",
        params={"program_id": 1},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_interns"] == 2
    intern_ids = {it["intern_id"] for it in body["items"]}
    assert intern_ids == {10, 20}


def test_filter_by_batch_id_alias(eval_report_client):
    """Lọc theo bí danh batch_id."""
    client, _ = eval_report_client
    response = client.get(
        "/api/hr/evaluations/summary",
        params={"batch_id": 2},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_interns"] == 1
    assert body["items"][0]["intern_id"] == 30


def test_filter_by_grade(eval_report_client):
    """Lọc theo xếp loại."""
    client, _ = eval_report_client
    response = client.get(
        "/api/hr/evaluations/summary",
        params={"grade": "Xuất sắc"},
        headers=_hr_headers(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_interns"] == 1
    assert body["items"][0]["intern_id"] == 10
    assert body["items"][0]["grade"] == "Xuất sắc"


def test_filter_program_not_found_404(eval_report_client):
    """Lọc theo đợt không tồn tại trả về 404."""
    client, _ = eval_report_client
    response = client.get(
        "/api/hr/evaluations/summary",
        params={"program_id": 9999},
        headers=_hr_headers(),
    )
    assert response.status_code == 404


def test_admin_allowed_access(eval_report_client):
    """Admin có quyền xem báo cáo tổng hợp cuối kỳ."""
    client, _ = eval_report_client
    response = client.get("/api/hr/evaluations/summary", headers=_admin_headers())
    assert response.status_code == 200


def test_forbidden_for_intern_and_mentor(eval_report_client):
    """TTS và Mentor bị chặn quyền truy cập."""
    client, _ = eval_report_client
    unauth = client.get("/api/hr/evaluations/summary")
    assert unauth.status_code == 401

    intern_h = {"Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"}
    forbidden_intern = client.get("/api/hr/evaluations/summary", headers=intern_h)
    assert forbidden_intern.status_code == 403

    mentor_h = {"Authorization": f"Bearer {create_access_token(user_id=3, role='mentor')}"}
    forbidden_mentor = client.get("/api/hr/evaluations/summary", headers=mentor_h)
    assert forbidden_mentor.status_code == 403


def test_final_report_alias_endpoint(eval_report_client):
    """Endpoint bí danh /api/hr/evaluations/final-report hoạt động đồng bộ."""
    client, _ = eval_report_client
    response = client.get("/api/hr/evaluations/final-report", headers=_hr_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["total_interns"] == 3
