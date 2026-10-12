"""Tests tích hợp cho câu truy vấn tính toán số lượng TTS theo trạng thái và tỷ lệ hoàn thành (US-33)."""

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
from app.services.program_service import ProgramService
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def stats_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        # Roles
        intern_role = Role(id=1, name="intern", description="Intern")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([intern_role, hr_role, mentor_role, admin_role])
        db.flush()

        # HR (id=100)
        db.add(
            User(
                id=100,
                code="HR0001",
                email="hr@example.com",
                password_hash="hash",
                full_name="Nguyễn Thị HR",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Mentor (id=101)
        db.add(
            User(
                id=101,
                code="MEN0001",
                email="mentor@example.com",
                password_hash="hash",
                full_name="Trần Văn Mentor",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Admin (id=102)
        db.add(
            User(
                id=102,
                code="ADM0001",
                email="admin@example.com",
                password_hash="hash",
                full_name="Lê Admin",
                role_id=admin_role.id,
                status="active",
            )
        )

        # 2 Kỳ thực tập
        # Kỳ 1 (cũ hơn): Thu 2025
        prog1 = InternshipProgram(
            id=1,
            name="Kỳ thực tập Thu 2025",
            department="Công nghệ Thông tin",
            start_date=date(2025, 9, 1),
            end_date=date(2025, 12, 31),
            status="closed",
            max_interns=50,
        )
        # Kỳ 2 (mới hơn): Hè 2026
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

        # Tạo 10 TTS trong Kỳ 2 (Hè 2026):
        # 4 in_progress, 3 completed, 2 dropped_out, 1 failed
        status_distribution = (
            ["in_progress"] * 4 + ["completed"] * 3 + ["dropped_out"] * 2 + ["failed"] * 1
        )
        for idx, st in enumerate(status_distribution, start=1):
            intern_user = User(
                id=idx,
                code=f"TTS{idx:04d}",
                email=f"intern{idx}@example.com",
                password_hash="hash",
                full_name=f"Thực tập sinh {idx}",
                role_id=intern_role.id,
                status="active",
            )
            db.add(intern_user)
            db.flush()
            member = ProgramMember(
                program_id=2,
                intern_user_id=intern_user.id,
                mentor_user_id=101,
                status=st,
            )
            db.add(member)

        # Tạo 4 TTS trong Kỳ 1 (Thu 2025):
        # 3 completed, 1 dropped_out
        prog1_statuses = ["completed", "completed", "completed", "dropped_out"]
        for idx, st in enumerate(prog1_statuses, start=20):
            intern_user = User(
                id=idx,
                code=f"TTS{idx:04d}",
                email=f"intern{idx}@example.com",
                password_hash="hash",
                full_name=f"Thực tập sinh {idx}",
                role_id=intern_role.id,
                status="active",
            )
            db.add(intern_user)
            db.flush()
            member = ProgramMember(
                program_id=1,
                intern_user_id=intern_user.id,
                mentor_user_id=101,
                status=st,
            )
            db.add(member)

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


def test_query_status_counts_full_breakdown_service(stats_client):
    """Kiểm tra câu truy vấn tính toán số lượng thực tập sinh theo 4 trạng thái trên service."""
    _, session_factory = stats_client

    with session_factory() as db:
        service = ProgramService(db)
        # Truy vấn cho Kỳ 2 (Hè 2026)
        res = service.get_completion_stats(program_id=2)

        s = res.summary
        assert s.total == 10
        assert s.in_progress == 4
        assert s.completed == 3
        assert s.dropped_out == 2
        assert s.failed == 1
        assert s.not_completed == 3  # 2 dropped_out + 1 failed
        assert s.completion_rate == 30.0  # 3 / 10 = 30%
        assert s.dropout_rate == 20.0     # 2 / 10 = 20%
        assert s.failure_rate == 10.0     # 1 / 10 = 10%
        assert s.in_progress_rate == 40.0 # 4 / 10 = 40%

        # So sánh với đợt trước (Kỳ 1)
        assert res.previous_period is not None
        assert res.previous_period.id == 1
        assert res.previous_period.name == "Kỳ thực tập Thu 2025"
        assert res.previous_period.total == 4
        assert res.previous_period.completed == 3
        assert res.previous_period.completion_rate == 75.0  # 3 / 4 = 75%


def test_query_status_counts_global_service(stats_client):
    """Kiểm tra câu truy vấn tính toán tổng hợp toàn bộ các kỳ khi không truyền program_id."""
    _, session_factory = stats_client

    with session_factory() as db:
        service = ProgramService(db)
        res = service.get_completion_stats(program_id=None)

        s = res.summary
        # Tổng 10 (kỳ 2) + 4 (kỳ 1) = 14
        assert s.total == 14
        assert s.completed == 6      # 3 + 3
        assert s.in_progress == 4    # 4 + 0
        assert s.dropped_out == 3    # 2 + 1
        assert s.failed == 1         # 1 + 0
        assert s.not_completed == 4  # 3 + 1
        assert s.completion_rate == round((6 / 14) * 100, 2)

        # Danh sách programs
        assert len(res.programs) == 2
        p2 = next(p for p in res.programs if p.id == 2)
        assert p2.total == 10
        assert p2.completed == 3
        assert p2.in_progress == 4
        assert p2.completion_rate == 30.0

        p1 = next(p for p in res.programs if p.id == 1)
        assert p1.total == 4
        assert p1.completed == 3
        assert p1.completion_rate == 75.0


def test_query_status_counts_empty_program_safe_division(stats_client):
    """Kiểm tra xử lý an toàn khi kỳ thực tập chưa có TTS nào (không chia cho 0)."""
    _, session_factory = stats_client

    with session_factory() as db:
        empty_prog = InternshipProgram(
            id=99,
            name="Kỳ thực tập Rỗng 2027",
            department="Phòng R&D",
            start_date=date(2027, 1, 1),
            end_date=date(2027, 4, 30),
            status="open",
            max_interns=30,
        )
        db.add(empty_prog)
        db.commit()

        service = ProgramService(db)
        res = service.get_completion_stats(program_id=99)
        assert res.summary.total == 0
        assert res.summary.completed == 0
        assert res.summary.completion_rate == 0.0
        assert res.summary.dropout_rate == 0.0
        assert res.summary.failure_rate == 0.0
        assert res.summary.in_progress_rate == 0.0


def test_query_status_counts_non_existent_program_404(stats_client):
    """Truy vấn với program_id không tồn tại ném lỗi 404."""
    client, _ = stats_client

    response = client.get(
        "/api/hr/programs/completion-stats?program_id=99999",
        headers=_auth(100, "hr"),
    )
    assert response.status_code == 404
    assert "Không tìm thấy kỳ thực tập" in response.json()["detail"]


def test_api_endpoints_both_routes_work(stats_client):
    """Kiểm tra cả 2 route API /api/hr/programs/completion-stats và /api/hr/analytics/completion-rate."""
    client, _ = stats_client

    # 1. Route /api/hr/programs/completion-stats
    resp1 = client.get("/api/hr/programs/completion-stats", headers=_auth(100, "hr"))
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "summary" in data1
    assert data1["summary"]["total"] == 14
    assert data1["summary"]["completed"] == 6

    # 2. Route /api/hr/analytics/completion-rate
    resp2 = client.get("/api/hr/analytics/completion-rate", headers=_auth(102, "admin"))
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["summary"]["total"] == 14


def test_api_security_permissions(stats_client):
    """Kiểm tra phân quyền: không token (401), role intern/mentor (403), role hr/admin (200)."""
    client, _ = stats_client

    url = "/api/hr/programs/completion-stats"

    # Không token
    assert client.get(url).status_code == 401

    # Intern
    assert client.get(url, headers=_auth(1, "intern")).status_code == 403

    # Mentor
    assert client.get(url, headers=_auth(101, "mentor")).status_code == 403

    # HR & Admin
    assert client.get(url, headers=_auth(100, "hr")).status_code == 200
    assert client.get(url, headers=_auth(102, "admin")).status_code == 200
