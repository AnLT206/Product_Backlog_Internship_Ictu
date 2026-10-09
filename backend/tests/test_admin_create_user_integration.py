from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models import InternProfile, Role, User, UserProfile
from app.utils.authenticate_login import create_access_token
from app.utils.hash_password import verify_password
import app.models as _models  # noqa: F401


@pytest.fixture
def admin_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(name="admin", description="Administrator")
        hr_role = Role(name="hr", description="Human Resources")
        mentor_role = Role(name="mentor", description="Mentor")
        intern_role = Role(name="intern", description="Intern")
        db.add_all([admin_role, hr_role, mentor_role, intern_role])
        db.flush()

        # Admin user (id=1)
        db.add(
            User(
                id=1,
                email="admin@example.com",
                password_hash="mock_hash",
                full_name="Admin Master",
                role_id=admin_role.id,
                status="active",
            )
        )
        # Regular HR user (id=2)
        db.add(
            User(
                id=2,
                email="hr@example.com",
                password_hash="mock_hash",
                full_name="HR Staff",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Existing user to test duplicate email (id=3)
        db.add(
            User(
                id=3,
                email="exists@example.com",
                password_hash="mock_hash",
                full_name="Existing Person",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    client.db_factory = session_factory
    yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_create_user_unauthorized(admin_client):
    """Không có token -> 401."""
    res1 = admin_client.post("/api/admin/users", json={})
    assert res1.status_code == 401

    res2 = admin_client.post("/api/users", json={})
    assert res2.status_code == 401


def test_create_user_forbidden_for_non_admin(admin_client):
    """Role không phải admin (vd: hr) -> 403."""
    hr_token = create_access_token(user_id=2, role="hr")
    payload = {
        "email": "newuser@example.com",
        "password": "Password@123",
        "full_name": "New User",
        "role": "hr",
    }
    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert res.status_code == 403


def test_admin_create_hr_user_hashes_password(admin_client):
    """Admin tạo tài khoản HR -> mật khẩu được hash bcrypt, không lưu plain text."""
    admin_token = create_access_token(user_id=1, role="admin")
    plain_password = "SecretPassword@123"
    payload = {
        "email": "hr_manager@ictu.edu.vn",
        "password": plain_password,
        "full_name": "Tran Van HR",
        "role": "hr",
        "status": "active",
    }

    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "hr_manager@ictu.edu.vn"
    assert data["full_name"] == "Tran Van HR"
    assert data["role"] == "hr"
    assert data["status"] == "active"
    assert "password" not in data
    assert "password_hash" not in data

    # Kiểm tra trực tiếp trong DB
    with admin_client.db_factory() as db:
        user_in_db = db.query(User).filter(User.email == "hr_manager@ictu.edu.vn").first()
        assert user_in_db is not None
        assert user_in_db.password_hash != plain_password
        assert user_in_db.password_hash.startswith("$2b$") or user_in_db.password_hash.startswith("$2a$")
        assert verify_password(plain_password, user_in_db.password_hash) is True

        # Kiểm tra user_profiles được tạo
        user_prof = db.query(UserProfile).filter(UserProfile.user_id == user_in_db.id).first()
        assert user_prof is not None


def test_admin_create_intern_user_creates_intern_profile(admin_client):
    """Admin tạo tài khoản intern -> tự động tạo intern_profiles."""
    admin_token = create_access_token(user_id=1, role="admin")
    payload = {
        "email": "new_intern@ictu.edu.vn",
        "password": "Password@123",
        "full_name": "Le Intern",
        "role": "intern",
        "status": "pending",
    }

    res = admin_client.post(
        "/api/users",  # Test endpoint /api/users
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "intern"
    assert data["status"] == "pending"

    with admin_client.db_factory() as db:
        user_in_db = db.query(User).filter(User.email == "new_intern@ictu.edu.vn").first()
        assert user_in_db is not None
        intern_prof = db.query(InternProfile).filter(InternProfile.user_id == user_in_db.id).first()
        assert intern_prof is not None


def test_admin_create_user_duplicate_email(admin_client):
    """Tạo user với email đã tồn tại -> 409 Conflict."""
    admin_token = create_access_token(user_id=1, role="admin")
    payload = {
        "email": "exists@example.com",
        "password": "Password@123",
        "full_name": "Duplicate Tester",
        "role": "mentor",
    }

    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 409
    assert "Email đã được sử dụng" in res.json()["detail"]


def test_admin_create_user_invalid_role(admin_client):
    """Role không hợp lệ -> 422 Unprocessable Entity."""
    admin_token = create_access_token(user_id=1, role="admin")
    payload = {
        "email": "superman@example.com",
        "password": "Password@123",
        "full_name": "Super Man",
        "role": "superadmin",
    }

    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 422


def test_admin_cannot_create_admin_user(admin_client):
    """Admin không thể tạo tài khoản admin -> 422 Unprocessable Entity."""
    admin_token = create_access_token(user_id=1, role="admin")
    payload = {
        "email": "another_admin@ictu.edu.vn",
        "password": "Password@123",
        "full_name": "Another Admin",
        "role": "admin",
    }

    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 422


def test_admin_create_user_short_password(admin_client):
    """Mật khẩu dưới 6 ký tự -> 422."""
    admin_token = create_access_token(user_id=1, role="admin")
    payload = {
        "email": "shortpass@example.com",
        "password": "123",
        "full_name": "Short Pass",
        "role": "mentor",
    }

    res = admin_client.post(
        "/api/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 422


def test_login_with_created_user_succeeds(admin_client):
    """User được admin tạo có thể đăng nhập ngay qua /api/auth/login."""
    admin_token = create_access_token(user_id=1, role="admin")
    email = "mentor_auto@ictu.edu.vn"
    password = "MentorSecure@2026"

    # 1. Admin tạo mentor
    res_create = admin_client.post(
        "/api/admin/users",
        json={
            "email": email,
            "password": password,
            "full_name": "Mentor Auto",
            "role": "mentor",
            "status": "active",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_create.status_code == 201

    # 2. Mentor dùng email và password đăng nhập
    res_login = admin_client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == email
    assert login_data["user"]["role"] == "mentor"
