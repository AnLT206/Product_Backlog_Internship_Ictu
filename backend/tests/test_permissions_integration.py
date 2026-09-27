from collections.abc import Generator

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db, require_permission
from app.core.database import Base
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.services.permission_service import PermissionService
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401

# Router thử nghiệm kiểm tra dynamic permission middleware
perm_mock_router = APIRouter(prefix="/test-permissions", tags=["test"])


@perm_mock_router.get("/approve-action")
def handle_approve_action(user: User = Depends(require_permission("interns_approve"))):
    return {"message": "Success", "user": user.email}


app.include_router(perm_mock_router)


@pytest.fixture
def perm_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        admin_role = Role(id=1, name="admin", description="Admin")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        intern_role = Role(id=4, name="intern", description="Intern")
        db.add_all([admin_role, hr_role, mentor_role, intern_role])
        db.flush()

        # Seed permissions and default mappings in SQLite
        PermissionService(db).seed_defaults_if_needed()

        # Admin user (id=1)
        db.add(
            User(
                id=1,
                email="admin_perm@example.com",
                password_hash="x",
                full_name="Admin Perm",
                role_id=admin_role.id,
                status="active",
            )
        )
        # HR user (id=2)
        db.add(
            User(
                id=2,
                email="hr_perm@example.com",
                password_hash="x",
                full_name="HR Perm",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Intern user (id=3)
        db.add(
            User(
                id=3,
                email="intern_perm@example.com",
                password_hash="x",
                full_name="Intern Perm",
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



# ── SCRUM-20: Test Ma trận phân quyền (Permission Matrix API) ────────────────

def test_admin_get_permission_matrix(perm_client):
    client, _ = perm_client
    token = create_access_token(user_id=1, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/admin/permissions", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert "roles" in data
    assert "modules" in data
    assert "matrix" in data

    # 4 roles
    role_keys = [r["key"] for r in data["roles"]]
    assert "admin" in role_keys
    assert "hr" in role_keys
    assert "mentor" in role_keys
    assert "intern" in role_keys

    # 26 permissions
    assert len(data["modules"]) == 26
    mod_keys = [m["key"] for m in data["modules"]]
    assert "interns_approve" in mod_keys
    assert "auth_login" in mod_keys

    # Default matrix check
    matrix = data["matrix"]
    assert matrix["admin"]["admin_users"] is True
    assert matrix["hr"]["interns_approve"] is True
    assert matrix["hr"]["admin_users"] is False


def test_admin_update_permission_matrix(perm_client):
    client, _ = perm_client
    token = create_access_token(user_id=1, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    # Bỏ quyền interns_approve của HR
    update_payload = {
        "matrix": {
            "hr": {
                "interns_approve": False,
            }
        }
    }
    update_res = client.put(
        "/api/admin/permissions",
        json=update_payload,
        headers=headers,
    )
    assert update_res.status_code == 200

    # Lấy lại ma trận để xác nhận đã lưu vào DB
    get_res = client.get("/api/admin/permissions", headers=headers)
    assert get_res.json()["matrix"]["hr"]["interns_approve"] is False


def test_admin_update_single_role_permissions(perm_client):
    client, _ = perm_client
    token = create_access_token(user_id=1, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    # Cấp chỉ 2 quyền cho HR (id=2)
    response = client.put(
        "/api/admin/roles/2/permissions",
        json={"permission_keys": ["auth_login", "stats_view"]},
        headers=headers,
    )
    assert response.status_code == 200

    get_res = client.get("/api/admin/permissions", headers=headers)
    hr_matrix = get_res.json()["matrix"]["hr"]
    assert hr_matrix["auth_login"] is True
    assert hr_matrix["stats_view"] is True
    assert hr_matrix["interns_approve"] is False


# ── SCRUM-19: Test Dynamic Permission Middleware ─────────────────────────────

def test_dynamic_permission_middleware_flow(perm_client):
    client, _ = perm_client
    admin_token = create_access_token(user_id=1, role="admin")
    hr_token = create_access_token(user_id=2, role="hr")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # 1. Ban đầu HR có quyền interns_approve -> Được phép gọi
    res1 = client.get("/test-permissions/approve-action", headers=hr_headers)
    assert res1.status_code == 200
    assert res1.json()["message"] == "Success"

    # 2. Admin thu hồi quyền interns_approve của HR
    client.put(
        "/api/admin/permissions",
        json={"matrix": {"hr": {"interns_approve": False}}},
        headers=admin_headers,
    )

    # 3. HR gọi lại ngay lập tức -> BỊ CHẶN ĐỘNG 403 Forbidden!
    res2 = client.get("/test-permissions/approve-action", headers=hr_headers)
    assert res2.status_code == 403
    assert "thiếu quyền: interns_approve" in res2.json()["detail"]

    # 4. Admin cấp lại quyền interns_approve cho HR
    client.put(
        "/api/admin/permissions",
        json={"matrix": {"hr": {"interns_approve": True}}},
        headers=admin_headers,
    )

    # 5. HR gọi lại -> Được phép 200 OK trở lại!
    res3 = client.get("/test-permissions/approve-action", headers=hr_headers)
    assert res3.status_code == 200


def test_admin_bypasses_dynamic_permission_check(perm_client):
    client, _ = perm_client
    admin_token = create_access_token(user_id=1, role="admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin luôn được phép truy cập
    res = client.get("/test-permissions/approve-action", headers=admin_headers)
    assert res.status_code == 200


# ── Quyền truy cập API phân quyền ────────────────────────────────────────────

def test_non_admin_cannot_access_permission_matrix(perm_client):
    client, _ = perm_client
    hr_token = create_access_token(user_id=2, role="hr")
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    res_get = client.get("/api/admin/permissions", headers=hr_headers)
    assert res_get.status_code == 403

    res_put = client.put(
        "/api/admin/permissions",
        json={"matrix": {}},
        headers=hr_headers,
    )
    assert res_put.status_code == 403


def test_unauthenticated_cannot_access_permissions(perm_client):
    client, _ = perm_client
    res = client.get("/api/admin/permissions")
    assert res.status_code == 401
