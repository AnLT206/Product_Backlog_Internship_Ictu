"""Tests tích hợp cho Báo cáo tuần & Phản hồi của Mentor (Tasks 8, 9)."""

from collections.abc import Generator
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.weekly_report import ReportFeedback, WeeklyReport
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
        intern_role = Role(id=1, name="intern", description="Intern")
        mentor_role = Role(id=2, name="mentor", description="Mentor")
        hr_role = Role(id=3, name="hr", description="HR")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([intern_role, mentor_role, hr_role, admin_role])
        db.flush()

        # Intern 1 (id=1)
        db.add(
            User(
                id=1,
                code="TTS0001",
                email="intern1@example.com",
                password_hash="hash",
                full_name="Intern One",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Intern 2 (id=2)
        db.add(
            User(
                id=2,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="hash",
                full_name="Intern Two",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Mentor 1 (id=3)
        db.add(
            User(
                id=3,
                code="MT0001",
                email="mentor1@example.com",
                password_hash="hash",
                full_name="Mentor One",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Mentor 2 (id=5)
        db.add(
            User(
                id=5,
                code="MT0002",
                email="mentor2@example.com",
                password_hash="hash",
                full_name="Mentor Two",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Admin (id=4)
        db.add(
            User(
                id=4,
                code="AD0001",
                email="admin1@example.com",
                password_hash="hash",
                full_name="Admin System",
                role_id=admin_role.id,
                status="active",
            )
        )

        prog = InternshipProgram(
            id=1,
            name="Kỳ Thực tập Mùa Thu 2026",
            department="Công nghệ Thông tin",
            description="Kỳ thực tập",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=60),
            max_interns=10,
            status="open",
        )
        db.add(prog)
        db.flush()

        # Intern 1 được gán cho Mentor 1
        db.add(ProgramMember(program_id=1, intern_user_id=1, mentor_user_id=3))
        # Intern 2 được gán cho Mentor 2
        db.add(ProgramMember(program_id=1, intern_user_id=2, mentor_user_id=5))

        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def _auth(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def test_intern_submit_weekly_report_success(report_client):
    client, session_factory = report_client

    payload = {
        "week_number": 1,
        "start_date": str(date.today() - timedelta(days=7)),
        "end_date": str(date.today()),
        "title": "Báo cáo tiến độ tuần 1",
        "content": "Hoàn thành tìm hiểu kiến trúc dự án và setup môi trường Docker.",
        "difficulties": "Lần đầu cấu hình Docker compose có chút bỡ ngỡ.",
        "next_week_plan": "Bắt tay vào code module nhiệm vụ.",
        "program_id": 1,
    }
    response = client.post(
        "/api/intern/weekly-reports",
        json=payload,
        headers=_auth(1, "intern"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["week_number"] == 1
    assert data["title"] == payload["title"]
    assert data["status"] == "submitted"
    assert data["user_id"] == 1
    assert data["user_name"] == "Intern One"
    assert data["program_name"] == "Kỳ Thực tập Mùa Thu 2026"
    assert len(data["feedbacks"]) == 0


def test_intern_submit_duplicate_week_report_fails_409(report_client):
    client, _ = report_client

    payload = {
        "week_number": 1,
        "start_date": str(date.today() - timedelta(days=7)),
        "end_date": str(date.today()),
        "title": "Báo cáo tuần 1",
        "content": "Nội dung báo cáo chi tiết tuần 1.",
        "program_id": 1,
    }
    res1 = client.post("/api/intern/weekly-reports", json=payload, headers=_auth(1, "intern"))
    assert res1.status_code == 201

    res2 = client.post("/api/intern/weekly-reports", json=payload, headers=_auth(1, "intern"))
    assert res2.status_code == 409
    assert "Bạn đã nộp báo cáo cho tuần 1 rồi" in res2.json()["detail"]


def test_intern_submit_report_validation_errors(report_client):
    client, _ = report_client

    # end_date < start_date
    res1 = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today()),
            "end_date": str(date.today() - timedelta(days=1)),
            "title": "Báo cáo lỗi ngày",
            "content": "Nội dung hợp lệ trên 10 ký tự.",
        },
        headers=_auth(1, "intern"),
    )
    assert res1.status_code == 422

    # content quá ngắn (< 10 ký tự)
    res2 = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=6)),
            "title": "Báo cáo",
            "content": "Ngắn",
        },
        headers=_auth(1, "intern"),
    )
    assert res2.status_code == 422


def test_intern_list_my_weekly_reports(report_client):
    client, _ = report_client

    for w in [1, 2]:
        client.post(
            "/api/intern/weekly-reports",
            json={
                "week_number": w,
                "start_date": str(date.today() - timedelta(days=14 - w * 7)),
                "end_date": str(date.today() - timedelta(days=7 - w * 7)),
                "title": f"Báo cáo tuần {w}",
                "content": f"Chi tiết công việc của tuần số {w}.",
                "program_id": 1,
            },
            headers=_auth(1, "intern"),
        )

    res = client.get("/api/intern/weekly-reports", headers=_auth(1, "intern"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert data["items"][0]["week_number"] == 2  # Sắp xếp tuần mới nhất trước


def test_intern_get_my_weekly_report_by_id(report_client):
    client, _ = report_client

    create_res = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo xem chi tiết",
            "content": "Nội dung báo cáo chi tiết.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )
    rep_id = create_res.json()["id"]

    res = client.get(f"/api/intern/weekly-reports/{rep_id}", headers=_auth(1, "intern"))
    assert res.status_code == 200
    assert res.json()["id"] == rep_id


def test_mentor_list_reports_of_assigned_interns(report_client):
    client, _ = report_client

    # Intern 1 nộp báo cáo (Mentor 1 quản lý)
    client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo Intern 1",
            "content": "Nội dung công việc Intern 1 hoàn thành.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )

    # Intern 2 nộp báo cáo (Mentor 1 KHÔNG quản lý)
    client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo Intern 2",
            "content": "Nội dung công việc Intern 2 hoàn thành.",
            "program_id": 1,
        },
        headers=_auth(2, "intern"),
    )

    # Mentor 1 xem danh sách báo cáo
    res = client.get("/api/mentor/reports", headers=_auth(3, "mentor"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["user_id"] == 1


def test_mentor_view_own_intern_reports_success(report_client):
    client, _ = report_client
    client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo Intern A",
            "content": "Nội dung báo cáo của Intern A tuần này.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )

    response = client.get(
        "/api/mentor/reports",
        params={"intern_id": 1},
        headers=_auth(3, "mentor"),
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["user_id"] == 1


def test_mentor_view_other_intern_reports_forbidden(report_client):
    client, _ = report_client
    client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo Intern B",
            "content": "Nội dung báo cáo của Intern B tuần này.",
            "program_id": 1,
        },
        headers=_auth(2, "intern"),
    )

    response = client.get(
        "/api/mentor/reports",
        params={"intern_id": 2},
        headers=_auth(3, "mentor"),
    )

    assert response.status_code == 403


def test_mentor_add_feedback_to_own_intern_report_success(report_client):
    client, _ = report_client

    create_res = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo chờ feedback",
            "content": "Hoàn thành nghiên cứu các tài liệu yêu cầu.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )
    rep_id = create_res.json()["id"]

    # Mentor gửi phản hồi và chấm điểm
    fb_res = client.post(
        f"/api/mentor/reports/{rep_id}/feedback",
        json={"score": 9.5, "comment": "Báo cáo rõ ràng, tiến độ tốt. Cố gắng phát huy!"},
        headers=_auth(3, "mentor"),
    )
    assert fb_res.status_code == 200
    data = fb_res.json()
    assert data["status"] == "reviewed"
    assert len(data["feedbacks"]) == 1
    fb = data["feedbacks"][0]
    assert float(fb["score"]) == 9.5
    assert fb["comment"] == "Báo cáo rõ ràng, tiến độ tốt. Cố gắng phát huy!"
    assert fb["mentor_name"] == "Mentor One"


def test_mentor_add_feedback_to_other_intern_report_forbidden(report_client):
    client, _ = report_client

    # Intern 2 nộp báo cáo và do Mentor 2 quản lý
    create_res = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo Intern 2",
            "content": "Công việc của TTS không thuộc Mentor 1.",
            "program_id": 1,
        },
        headers=_auth(2, "intern"),
    )
    rep_id = create_res.json()["id"]

    # Mentor 1 cố tình phản hồi báo cáo của Intern 2 -> 403 Forbidden
    fb_res = client.post(
        f"/api/mentor/reports/{rep_id}/feedback",
        json={"score": 8.0, "comment": "Nhận xét trái quyền."},
        headers=_auth(3, "mentor"),
    )
    assert fb_res.status_code == 403
    assert "chỉ có thể phản hồi báo cáo của thực tập sinh do mình phụ trách" in fb_res.json()["detail"]


def test_intern_cannot_call_mentor_feedback_endpoint(report_client):
    client, _ = report_client

    create_res = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo tuần",
            "content": "Nội dung báo cáo chi tiết.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )
    rep_id = create_res.json()["id"]

    # TTS tự gọi endpoint feedback -> 403
    fb_res = client.post(
        f"/api/mentor/reports/{rep_id}/feedback",
        json={"score": 10.0, "comment": "Tự chấm điểm 10."},
        headers=_auth(1, "intern"),
    )
    assert fb_res.status_code == 403


def test_feedback_score_validation(report_client):
    client, _ = report_client

    create_res = client.post(
        "/api/intern/weekly-reports",
        json={
            "week_number": 1,
            "start_date": str(date.today() - timedelta(days=7)),
            "end_date": str(date.today()),
            "title": "Báo cáo kiểm tra điểm",
            "content": "Nội dung báo cáo tuần hợp lệ.",
            "program_id": 1,
        },
        headers=_auth(1, "intern"),
    )
    rep_id = create_res.json()["id"]

    # Điểm vượt quá 10.0
    res = client.post(
        f"/api/mentor/reports/{rep_id}/feedback",
        json={"score": 10.5, "comment": "Điểm vượt ngưỡng."},
        headers=_auth(3, "mentor"),
    )
    assert res.status_code == 422
