from collections.abc import Generator
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models import InternProfile, Role, User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def search_test_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(name="hr", description="Human Resources")
        intern_role = Role(name="intern", description="Intern")
        admin_role = Role(name="admin", description="Admin")
        db.add_all([hr_role, intern_role, admin_role])
        db.flush()

        # HR user (id=1)
        db.add(
            User(
                id=1,
                email="hr@example.com",
                password_hash="mock_hash",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Intern user for forbidden test (id=2)
        db.add(
            User(
                id=2,
                email="intern_self@example.com",
                password_hash="mock_hash",
                full_name="Intern Self",
                role_id=intern_role.id,
                status="active",
            )
        )

        # 3 test interns with different universities, majors, and statuses
        user_a = User(
            id=10,
            email="nguyenvana@ictu.edu.vn",
            password_hash="mock_hash",
            full_name="Nguyen Van A",
            role_id=intern_role.id,
            status="pending",
        )
        user_b = User(
            id=11,
            email="tranthib@hust.edu.vn",
            password_hash="mock_hash",
            full_name="Tran Thi B",
            role_id=intern_role.id,
            status="active",
        )
        user_c = User(
            id=12,
            email="lequangc@ictu.edu.vn",
            password_hash="mock_hash",
            full_name="Le Quang C",
            role_id=intern_role.id,
            status="inactive",
        )
        db.add_all([user_a, user_b, user_c])
        db.flush()

        profile_a = InternProfile(
            user_id=10,
            phone_number="0987654321",
            dob=date(2002, 5, 10),
            gender="male",
            university="ICTU",
            major="Cong nghe thong tin",
            academic_year="K20",
            gpa=Decimal("3.50"),
            address="Thai Nguyen",
        )
        profile_b = InternProfile(
            user_id=11,
            phone_number="0912345678",
            dob=date(2003, 8, 20),
            gender="female",
            university="HUST",
            major="Khoa hoc may tinh",
            academic_year="K65",
            gpa=Decimal("3.80"),
            address="Ha Noi",
        )
        profile_c = InternProfile(
            user_id=12,
            phone_number="0933445566",
            dob=date(2002, 11, 1),
            gender="male",
            university="ICTU",
            major="He thong thong tin",
            academic_year="K20",
            gpa=Decimal("2.90"),
            address="Thai Nguyen",
        )
        db.add_all([profile_a, profile_b, profile_c])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_list_interns_unauthorized(search_test_client):
    """Không có token -> 401."""
    response = search_test_client.get("/api/hr/interns")
    assert response.status_code == 401


def test_list_interns_forbidden_for_intern_role(search_test_client):
    """Role intern gọi API HR -> 403."""
    token = create_access_token(user_id=2, role="intern")
    response = search_test_client.get(
        "/api/hr/interns",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_list_interns_success_default(search_test_client):
    """HR lấy danh sách mặc định -> trả về đủ 3 TTS (bỏ qua HR)."""
    token = create_access_token(user_id=1, role="hr")
    response = search_test_client.get(
        "/api/hr/interns",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4  # intern_self + user_a, user_b, user_c
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert len(data["items"]) == 4


def test_search_by_keyword_name_and_email(search_test_client):
    """Tìm kiếm text theo họ tên hoặc email."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Tìm "Nguyen" -> ra "Nguyen Van A"
    res1 = search_test_client.get("/api/hr/interns?q=Nguyen", headers=headers)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["total"] == 1
    assert d1["items"][0]["full_name"] == "Nguyen Van A"

    # Tìm email "hust.edu.vn" -> ra "Tran Thi B"
    res2 = search_test_client.get("/api/hr/interns?q=hust.edu.vn", headers=headers)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["total"] == 1
    assert d2["items"][0]["email"] == "tranthib@hust.edu.vn"


def test_filter_by_university_dropdown(search_test_client):
    """Lọc theo trường đại học."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    res = search_test_client.get("/api/hr/interns?university=ICTU", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    names = [item["full_name"] for item in data["items"]]
    assert "Nguyen Van A" in names
    assert "Le Quang C" in names


def test_filter_by_major_dropdown(search_test_client):
    """Lọc theo chuyên ngành."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    res = search_test_client.get("/api/hr/interns?major=Khoa hoc may tinh", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["full_name"] == "Tran Thi B"


def test_filter_by_status_dropdown(search_test_client):
    """Lọc theo trạng thái hồ sơ: pending, active, inactive."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    res_pending = search_test_client.get("/api/hr/interns?status=pending", headers=headers)
    assert res_pending.status_code == 200
    assert res_pending.json()["total"] == 1
    assert res_pending.json()["items"][0]["full_name"] == "Nguyen Van A"

    res_inactive = search_test_client.get("/api/hr/interns?status=inactive", headers=headers)
    assert res_inactive.status_code == 200
    assert res_inactive.json()["total"] == 1
    assert res_inactive.json()["items"][0]["full_name"] == "Le Quang C"


def test_combined_filters(search_test_client):
    """Kết hợp tìm kiếm text và các bộ lọc dropdown."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Tìm keyword 'Nguyen', trường 'ICTU', trạng thái 'pending'
    res = search_test_client.get(
        "/api/hr/interns?q=Nguyen&university=ICTU&status=pending",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["full_name"] == "Nguyen Van A"

    # Tìm keyword 'Nguyen' nhưng trạng thái 'active' -> Không khớp (total = 0)
    res_empty = search_test_client.get(
        "/api/hr/interns?q=Nguyen&status=active",
        headers=headers,
    )
    assert res_empty.status_code == 200
    assert res_empty.json()["total"] == 0
    assert len(res_empty.json()["items"]) == 0


def test_pagination(search_test_client):
    """Kiểm tra phân trang page & page_size."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    res_p1 = search_test_client.get("/api/hr/interns?page=1&page_size=2", headers=headers)
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    assert d1["total"] == 4
    assert d1["total_pages"] == 2
    assert len(d1["items"]) == 2

    res_p2 = search_test_client.get("/api/hr/interns?page=2&page_size=2", headers=headers)
    assert res_p2.status_code == 200
    d2 = res_p2.json()
    assert len(d2["items"]) == 2
    assert d1["items"][0]["id"] != d2["items"][0]["id"]


def test_filter_options_endpoint(search_test_client):
    """Kiểm tra endpoint trả về danh sách trường và ngành cho dropdown."""
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    res = search_test_client.get("/api/hr/interns/filter-options", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "HUST" in data["universities"]
    assert "ICTU" in data["universities"]
    assert "Cong nghe thong tin" in data["majors"]
    assert "Khoa hoc may tinh" in data["majors"]
    assert "He thong thong tin" in data["majors"]
    assert data["statuses"] == ["pending", "active", "inactive"]
