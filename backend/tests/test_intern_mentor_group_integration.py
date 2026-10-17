"""Tests tích hợp cho API xem thông tin Mentor và Nhóm thực tập kết hợp Cache (SCRUM-240, SCRUM-241)."""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.cache import ttl_cache
from app.core.database import Base
from app.main import app
from app.models.department import Department
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def portal_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    # Dọn sạch cache trước mỗi test
    ttl_cache.clear()

    with session_factory() as db:
        role_intern = Role(id=1, name="intern", description="Intern")
        role_mentor = Role(id=2, name="mentor", description="Mentor")
        role_admin = Role(id=3, name="admin", description="Admin")
        db.add_all([role_intern, role_mentor, role_admin])
        db.flush()

        dept = Department(id=1, name="Trung tâm Công nghệ AI", description="R&D AI & Software")
        db.add(dept)
        db.flush()

        # Mentor User (id=10)
        mentor_user = User(
            id=10,
            code="MEN001",
            email="mentor@company.com",
            password_hash="hashed",
            full_name="Nguyễn Văn Mentor",
            role_id=role_mentor.id,
            status="active",
        )
        db.add(mentor_user)
        db.flush()

        mentor_profile = UserProfile(
            user_id=10,
            department_id=dept.id,
            phone_number="0988776655",
            position="Senior AI Engineer",
        )
        db.add(mentor_profile)

        # Intern 1 - User chính test (id=101)
        intern1 = User(
            id=101,
            code="TTS001",
            email="intern1@company.com",
            password_hash="hashed",
            full_name="Lê Tâm An",
            role_id=role_intern.id,
            status="active",
        )
        # Intern 2 - Bạn cùng nhóm (id=102)
        intern2 = User(
            id=102,
            code="TTS002",
            email="intern2@company.com",
            password_hash="hashed",
            full_name="Trần Văn Bình",
            role_id=role_intern.id,
            status="active",
        )
        # Intern 3 - Chưa được phân nhóm (id=103)
        intern3 = User(
            id=103,
            code="TTS003",
            email="intern3@company.com",
            password_hash="hashed",
            full_name="Hoàng Thị Cúc",
            role_id=role_intern.id,
            status="active",
        )
        db.add_all([intern1, intern2, intern3])
        db.flush()

        # Chương trình thực tập
        program = InternshipProgram(
            id=1,
            name="Thực tập sinh Phát triển Hệ thống Web & AI K2026",
            department="Trung tâm Công nghệ AI",
            description="Chương trình đào tạo thực tế cho sinh viên ICTU",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=20,
            is_deleted=False,
        )
        db.add(program)
        db.flush()

        # Gán intern1 và intern2 vào program cùng mentor_user (id=10)
        pm1 = ProgramMember(
            program_id=program.id,
            intern_user_id=intern1.id,
            mentor_user_id=mentor_user.id,
            status="in_progress",
        )
        pm2 = ProgramMember(
            program_id=program.id,
            intern_user_id=intern2.id,
            mentor_user_id=mentor_user.id,
            status="in_progress",
        )
        db.add_all([pm1, pm2])
        db.commit()

    def override_get_db():
        with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        yield tc, session_factory
    app.dependency_overrides.clear()
    ttl_cache.clear()


def _auth(user_id: int, role: str = "intern") -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def test_get_my_mentor_and_group_success(portal_client):
    """Test SCRUM-240: TTS xem thành công thông tin mentor và nhóm bạn cùng thực tập."""
    client, _ = portal_client
    resp = client.get("/api/intern/my-mentor-and-group", headers=_auth(101))
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "assigned"
    assert data["mentor"] is not None
    assert data["mentor"]["full_name"] == "Nguyễn Văn Mentor"
    assert data["mentor"]["email"] == "mentor@company.com"
    assert data["mentor"]["phone_number"] == "0988776655"
    assert data["mentor"]["department"] == "Trung tâm Công nghệ AI"

    assert data["group"] is not None
    assert data["group"]["id"] == 1
    assert "Web & AI" in data["group"]["name"]
    assert data["group"]["total_members"] == 2

    members = data["group"]["members"]
    assert len(members) == 2
    my_entry = next((m for m in members if m["is_me"]), None)
    peer_entry = next((m for m in members if not m["is_me"]), None)
    assert my_entry is not None
    assert my_entry["full_name"] == "Lê Tâm An"
    assert peer_entry is not None
    assert peer_entry["full_name"] == "Trần Văn Bình"


def test_get_mentor_group_frontend_alias(portal_client):
    """Test alias endpoint /api/intern/mentor-group mà frontend InternMentorGroupSection gọi."""
    client, _ = portal_client
    resp = client.get("/api/intern/mentor-group", headers=_auth(101))
    assert resp.status_code == 200
    assert resp.json()["status"] == "assigned"
    assert resp.json()["mentor"]["full_name"] == "Nguyễn Văn Mentor"


def test_cache_hit_and_miss_optimization(portal_client):
    """Test SCRUM-241: Tối ưu hóa cache truy vấn - Lần đầu MISS, lần hai HIT, tốc độ phản hồi cực nhanh."""
    client, _ = portal_client

    # Lần 1: Cache MISS
    resp1 = client.get("/api/intern/my-mentor-and-group", headers=_auth(101))
    assert resp1.status_code == 200
    assert resp1.headers["x-cache"] == "MISS"

    # Lần 2: Cache HIT
    resp2 = client.get("/api/intern/my-mentor-and-group", headers=_auth(101))
    assert resp2.status_code == 200
    assert resp2.headers["x-cache"] == "HIT"
    assert resp2.json() == resp1.json()

    # Bỏ qua cache khi use_cache=False
    resp3 = client.get("/api/intern/my-mentor-and-group?use_cache=false", headers=_auth(101))
    assert resp3.status_code == 200
    assert resp3.headers["x-cache"] == "MISS"


def test_cache_invalidation_endpoint(portal_client):
    """Test endpoint xóa cache khi cần làm mới dữ liệu."""
    client, _ = portal_client

    # Gọi để nạp vào cache
    client.get("/api/intern/my-mentor-and-group", headers=_auth(101))
    assert ttl_cache.get("intern_mentor_group:101") is not None

    # Invalidate cache
    inv_resp = client.post("/api/intern/my-mentor-and-group/invalidate-cache", headers=_auth(101))
    assert inv_resp.status_code == 200
    assert ttl_cache.get("intern_mentor_group:101") is None

    # Lần tiếp theo phải là MISS
    next_resp = client.get("/api/intern/my-mentor-and-group", headers=_auth(101))
    assert next_resp.headers["x-cache"] == "MISS"


def test_unassigned_intern_graceful_response(portal_client):
    """Test trường hợp TTS chưa được phân mentor hay nhóm -> không crash 500 mà trả về trạng thái thân thiện."""
    client, _ = portal_client
    resp = client.get("/api/intern/my-mentor-and-group", headers=_auth(103))
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "unassigned"
    assert data["mentor"] is None
    assert data["group"] is None
    assert "chưa được phân bổ" in data["message"].lower()


def test_unauthorized_access_rejected(portal_client):
    """Test bảo mật: Không đăng nhập bị từ chối 401."""
    client, _ = portal_client
    resp = client.get("/api/intern/my-mentor-and-group")
    assert resp.status_code in (401, 403)
