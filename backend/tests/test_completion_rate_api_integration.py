"""Tests tích hợp cho API GET /api/hr/analytics/completion-rate và GET /api/hr/stats/completion-rate (US-33)."""

from collections.abc import Generator
from datetime import date

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
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def analytics_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        # Tạo roles
        intern_role = Role(id=1, name="intern", description="Intern")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([intern_role, hr_role, mentor_role, admin_role])
        db.flush()

        # Tạo users
        hr_user = User(
            id=100,
            code="HR0001",
            email="hr@example.com",
            password_hash="hash",
            full_name="Nguyễn Thị HR",
            role_id=hr_role.id,
            status="active",
        )
        mentor_user = User(
            id=101,
            code="MEN0001",
            email="mentor@example.com",
            password_hash="hash",
            full_name="Trần Văn Mentor",
            role_id=mentor_role.id,
            status="active",
        )
        admin_user = User(
            id=102,
            code="ADM0001",
            email="admin@example.com",
            password_hash="hash",
            full_name="Lê Admin",
            role_id=admin_role.id,
            status="active",
        )
        db.add_all([hr_user, mentor_user, admin_user])
        db.flush()

        # Tạo 2 đợt thực tập
        # Đợt 1 (cũ hơn): Kỳ Thu 2025
        prog1 = InternshipProgram(
            id=1,
            name="Kỳ thực tập Thu 2025",
            department="Công nghệ Thông tin",
            start_date=date(2025, 9, 1),
            end_date=date(2025, 12, 31),
            status="closed",
            max_interns=50,
        )
        # Đợt 2 (mới hơn): Kỳ Hè 2026
        prog2 = InternshipProgram(
            id=2,
            name="Kỳ thực tập Hè 2026",
            department="Kỹ thuật Phần mềm",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 9, 30),
            status="open",
            max_interns=50,
        )
        db.add_all([prog1, prog2])
        db.flush()

        # Kỳ 1: 4 TTS (3 completed, 1 dropped_out) -> completion_rate = 75.0%
        prog1_statuses = ["completed", "completed", "completed", "dropped_out"]
        for idx, st in enumerate(prog1_statuses, start=10):
            u = User(
                id=idx,
                code=f"TTS{idx:04d}",
                email=f"intern{idx}@example.com",
                password_hash="hash",
                full_name=f"Thực tập sinh {idx}",
                role_id=intern_role.id,
                status="active",
            )
            db.add(u)
            db.flush()
            db.add(
                ProgramMember(
                    program_id=1,
                    intern_user_id=u.id,
                    mentor_user_id=101,
                    status=st,
                )
            )

        # Kỳ 2: 10 TTS (4 in_progress, 3 completed, 2 dropped_out, 1 failed) -> completion_rate = 30.0%
        prog2_statuses = (
            ["in_progress"] * 4 + ["completed"] * 3 + ["dropped_out"] * 2 + ["failed"] * 1
        )
        for idx, st in enumerate(prog2_statuses, start=20):
            u = User(
                id=idx,
                code=f"TTS{idx:04d}",
                email=f"intern{idx}@example.com",
                password_hash="hash",
                full_name=f"Thực tập sinh {idx}",
                role_id=intern_role.id,
                status="active",
            )
            db.add(u)
            db.flush()
            db.add(
                ProgramMember(
                    program_id=2,
                    intern_user_id=u.id,
                    mentor_user_id=101,
                    status=st,
                )
            )

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


def test_get_completion_rate_analytics_global_success(analytics_client):
    """GET /api/hr/analytics/completion-rate không truyền program_id trả về toàn bộ KPI và danh sách đợt."""
    client, _ = analytics_client

    response = client.get("/api/hr/analytics/completion-rate", headers=_auth(100, "hr"))
    assert response.status_code == 200
    data = response.json()

    # Kiểm tra các keys chính
    assert "kpis" in data
    assert "summary" in data
    assert "comparison" in data
    assert "programs" in data

    # Kiểm tra summary tổng thể (10 + 4 = 14 TTS)
    summary = data["summary"]
    assert summary["total"] == 14
    assert summary["completed"] == 6      # 3 + 3
    assert summary["in_progress"] == 4    # 4 + 0
    assert summary["dropped_out"] == 3    # 2 + 1
    assert summary["failed"] == 1         # 1 + 0
    assert summary["not_completed"] == 4  # 3 + 1
    assert summary["completion_rate"] == round((6 / 14) * 100, 2)

    # Kiểm tra thẻ KPIs
    kpis = data["kpis"]
    assert isinstance(kpis, list)
    kpi_map = {item["key"]: item for item in kpis}
    assert kpi_map["total"]["value"] == 14
    assert kpi_map["completed"]["value"] == 6
    assert kpi_map["completed"]["rate"] == round((6 / 14) * 100, 2)
    assert kpi_map["in_progress"]["value"] == 4
    assert kpi_map["in_progress"]["rate"] == round((4 / 14) * 100, 2)
    assert kpi_map["not_completed"]["value"] == 4
    assert kpi_map["not_completed"]["rate"] == round((4 / 14) * 100, 2)

    # Kiểm tra danh sách programs (sắp xếp theo start_date giảm dần: prog2 trước prog1)
    programs = data["programs"]
    assert len(programs) == 2
    assert programs[0]["id"] == 2
    assert programs[0]["name"] == "Kỳ thực tập Hè 2026"
    assert programs[0]["total"] == 10
    assert programs[0]["completed"] == 3
    assert programs[0]["in_progress"] == 4
    assert programs[0]["dropped_out"] == 2
    assert programs[0]["failed"] == 1
    assert programs[0]["not_completed"] == 3
    assert programs[0]["completion_rate"] == 30.0

    assert programs[1]["id"] == 1
    assert programs[1]["name"] == "Kỳ thực tập Thu 2025"
    assert programs[1]["total"] == 4
    assert programs[1]["completed"] == 3
    assert programs[1]["completion_rate"] == 75.0


def test_get_completion_rate_analytics_by_program_id(analytics_client):
    """GET /api/hr/analytics/completion-rate?program_id=2 trả về thống kê riêng đợt 2 và so sánh với đợt 1."""
    client, _ = analytics_client

    response = client.get("/api/hr/analytics/completion-rate?program_id=2", headers=_auth(100, "hr"))
    assert response.status_code == 200
    data = response.json()

    # Summary riêng đợt 2
    summary = data["summary"]
    assert summary["total"] == 10
    assert summary["completed"] == 3
    assert summary["in_progress"] == 4
    assert summary["dropped_out"] == 2
    assert summary["failed"] == 1
    assert summary["not_completed"] == 3
    assert summary["completion_rate"] == 30.0

    # Comparison với đợt trước (đợt 1 có completion_rate = 75.0%)
    # diff = 30.0 - 75.0 = -45.0
    comp = data["comparison"]
    assert comp["diff"] == -45.0
    assert comp["trend"] == "down"
    assert comp["arrow"] == "↓"
    assert "-45.0%" in comp["text"]
    assert comp["current_rate"] == 30.0
    assert comp["previous_rate"] == 75.0

    # Previous period
    prev = data["previous_period"]
    assert prev is not None
    assert prev["id"] == 1
    assert prev["name"] == "Kỳ thực tập Thu 2025"
    assert prev["completion_rate"] == 75.0

    # Danh sách programs chỉ chứa đợt được chọn
    assert len(data["programs"]) == 1
    assert data["programs"][0]["id"] == 2


def test_get_completion_rate_analytics_first_period_comparison(analytics_client):
    """GET cho đợt đầu tiên nhất (program_id=1) không có đợt trước để so sánh."""
    client, _ = analytics_client

    response = client.get("/api/hr/analytics/completion-rate?program_id=1", headers=_auth(100, "hr"))
    assert response.status_code == 200
    data = response.json()

    assert data["previous_period"] is None
    assert data["comparison"]["has_previous"] is False
    assert data["comparison"]["diff"] == 0.0
    assert data["comparison"]["trend"] == "same"
    assert data["comparison"]["arrow"] == "→"
    assert "Chưa có" in data["comparison"]["text"]


def test_get_completion_rate_analytics_filter_department(analytics_client):
    """Lọc theo department trả về kết quả chính xác."""
    client, _ = analytics_client

    response = client.get(
        "/api/hr/analytics/completion-rate?department=Công nghệ Thông tin",
        headers=_auth(100, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["programs"]) == 1
    assert data["programs"][0]["name"] == "Kỳ thực tập Thu 2025"
    assert data["summary"]["total"] == 4


def test_get_completion_rate_analytics_filter_dates(analytics_client):
    """Lọc theo from_date và to_date."""
    client, _ = analytics_client

    response = client.get(
        "/api/hr/analytics/completion-rate?from_date=2026-01-01&to_date=2026-12-31",
        headers=_auth(100, "hr"),
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["programs"]) == 1
    assert data["programs"][0]["id"] == 2


def test_get_completion_rate_stats_spec_alias_route(analytics_client):
    """Kiểm tra alias route GET /api/hr/stats/completion-rate theo software spec §11.1."""
    client, _ = analytics_client

    response = client.get("/api/hr/stats/completion-rate?program_id=2", headers=_auth(102, "admin"))
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total"] == 10
    assert data["summary"]["completed"] == 3
    assert data["summary"]["completion_rate"] == 30.0


def test_get_completion_rate_analytics_404_not_found(analytics_client):
    """Truy vấn program_id không tồn tại trả về 404."""
    client, _ = analytics_client

    response = client.get("/api/hr/analytics/completion-rate?program_id=99999", headers=_auth(100, "hr"))
    assert response.status_code == 404
    assert "Không tìm thấy kỳ thực tập" in response.json()["detail"]


def test_get_completion_rate_analytics_empty_program_safe_division(analytics_client):
    """Kỳ thực tập rỗng (0 TTS) trả về 0% tỷ lệ an toàn, không bị lỗi chia cho 0."""
    client, session_factory = analytics_client

    with session_factory() as db:
        empty_prog = InternshipProgram(
            id=99,
            name="Kỳ thực tập Trống",
            department="Phòng Kỹ thuật",
            start_date=date(2027, 1, 1),
            end_date=date(2027, 4, 30),
            status="open",
            max_interns=20,
        )
        db.add(empty_prog)
        db.commit()

    response = client.get("/api/hr/analytics/completion-rate?program_id=99", headers=_auth(100, "hr"))
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total"] == 0
    assert data["summary"]["completed"] == 0
    assert data["summary"]["completion_rate"] == 0.0
    kpi_map = {item["key"]: item for item in data["kpis"]}
    assert kpi_map["total"]["value"] == 0
    assert kpi_map["completed"]["rate"] == 0.0


def test_get_completion_rate_analytics_permissions(analytics_client):
    """Kiểm tra phân quyền: 401 khi không đăng nhập, 403 cho intern/mentor, 200 cho hr/admin."""
    client, _ = analytics_client
    url = "/api/hr/analytics/completion-rate"

    # Không token -> 401
    assert client.get(url).status_code == 401

    # Intern -> 403
    assert client.get(url, headers=_auth(10, "intern")).status_code == 403

    # Mentor -> 403
    assert client.get(url, headers=_auth(101, "mentor")).status_code == 403

    # HR -> 200
    assert client.get(url, headers=_auth(100, "hr")).status_code == 200

    # Admin -> 200
    assert client.get(url, headers=_auth(102, "admin")).status_code == 200
