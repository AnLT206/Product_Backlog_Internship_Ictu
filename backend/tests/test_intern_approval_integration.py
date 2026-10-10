from collections.abc import Generator

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


@pytest.fixture
def integration_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
        db.add_all([hr_role, intern_role])
        db.flush()
        db.add(
            User(
                id=1,
                email="hr@example.com",
                password_hash="not-used-in-this-test",
                full_name="HR User",
                role_id=hr_role.id,
                status="active",
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_approve_pending_intern_activates_database_account(integration_client):
    client, session_factory = integration_client
    password = "Secret123"
    register_payload = {
        "full_name": "Nguyen Van Intern",
        "email": "pending.intern@example.com",
        "password": password,
        "confirm_password": password,
        "university": "ICTU",
        "major": "CNTT",
    }
    hr_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
    }

    register_response = client.post(
        "/api/auth/register",
        json=register_payload,
    )

    assert register_response.status_code == 201
    registered = register_response.json()
    assert registered["status"] == "pending"

    with session_factory() as db:
        pending_user = (
            db.query(User)
            .filter(User.email == register_payload["email"])
            .one()
        )
        assert pending_user.status == "pending"
        assert pending_user.role.name == "intern"
        assert pending_user.intern_profile is not None
        intern_id = pending_user.id

    approve_response = client.post(
        f"/api/hr/interns/{intern_id}/approve",
        headers=hr_headers,
    )

    assert approve_response.status_code == 200
    approved = approve_response.json()
    assert approved == {
        "id": registered["id"],
        "email": register_payload["email"],
        "full_name": register_payload["full_name"],
        "role": "intern",
        "status": "active",
        "phone_number": None,
    }

    with session_factory() as db:
        user = db.query(User).filter(User.id == intern_id).one()
        profile = db.query(InternProfile).filter(InternProfile.user_id == intern_id).one()
        assert user.status == "active"
        assert user.role.name == "intern"
        assert profile.university == "ICTU"
        assert profile.major == "CNTT"

    login_response = client.post(
        "/api/auth/login",
        json={"email": register_payload["email"], "password": password},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["status"] == "active"


def test_reject_pending_intern_updates_status_and_persists(integration_client):
    client, session_factory = integration_client
    password = "SecretPassword123"
    register_payload = {
        "full_name": "Tran Thi Ung Vien",
        "email": "rejected.intern@example.com",
        "password": password,
        "confirm_password": password,
        "university": "ICTU",
        "major": "CNTT",
    }
    hr_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
    }

    register_response = client.post(
        "/api/auth/register",
        json=register_payload,
    )
    assert register_response.status_code == 201
    registered = register_response.json()
    intern_id = registered["id"]

    reject_note = "CV chua dap ung du tieu chi thuc tap dot nay"
    reject_response = client.post(
        f"/api/hr/interns/{intern_id}/reject",
        json={"note": reject_note},
        headers=hr_headers,
    )

    assert reject_response.status_code == 200
    rejected_body = reject_response.json()
    assert rejected_body["id"] == intern_id
    assert rejected_body["status"] == "rejected"

    with session_factory() as db:
        user = db.query(User).filter(User.id == intern_id).one()
        profile = db.query(InternProfile).filter(InternProfile.user_id == intern_id).one()
        assert profile.status == "rejected"
        assert user.status == "inactive"

    # Kiem tra danh sach get interns tra ve status rejected
    list_response = client.get(
        "/api/hr/interns",
        headers=hr_headers,
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    matched = next((i for i in items if i["id"] == intern_id), None)
    assert matched is not None
    assert matched["status"] == "rejected"


def test_rejected_intern_can_login_and_reapply_with_new_cv(integration_client):
    import io
    client, session_factory = integration_client
    password = "SecretPassword123"
    register_payload = {
        "full_name": "Vu Tien Dung",
        "email": "reapply.intern@example.com",
        "password": password,
        "confirm_password": password,
        "university": "ICTU",
        "major": "CNTT",
    }
    hr_headers = {
        "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
    }

    # 1. Dang ky
    reg_res = client.post("/api/auth/register", json=register_payload)
    assert reg_res.status_code == 201
    intern_id = reg_res.json()["id"]

    # 2. HR Tu choi
    client.post(
        f"/api/hr/interns/{intern_id}/reject",
        json={"note": "Chua dat tieu chi"},
        headers=hr_headers,
    )

    # 3. Ung vien bi tu choi van dang nhap duoc de xem ket qua & nop lai CV
    login_res = client.post(
        "/api/auth/login",
        json={"email": register_payload["email"], "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    intern_headers = {"Authorization": f"Bearer {token}"}

    # 4. Kiem tra /api/auth/me van tra ve thong tin ung vien
    me_res = client.get("/api/auth/me", headers=intern_headers)
    assert me_res.status_code == 200
    assert me_res.json()["profile_status"] == "rejected"

    # 5. Ung vien nop lai CV moi (file docx hoac pdf)
    cv_file = io.BytesIO(b"%PDF-1.4 Mock CV Content")
    upload_res = client.post(
        "/api/intern/documents/upload?doc_type=cv",
        headers=intern_headers,
        files={"file": ("CV_Moi_Cap_Nhat.pdf", cv_file, "application/pdf")},
    )
    assert upload_res.status_code == 201
    assert upload_res.json()["file_name"] == "CV_Moi_Cap_Nhat.pdf"

    # 6. Kiem tra sau khi nop lai CV, trang thai user va profile chuyen thanh pending de HR xet duyet lai
    with session_factory() as db:
        user = db.query(User).filter(User.id == intern_id).one()
        profile = db.query(InternProfile).filter(InternProfile.user_id == intern_id).one()
        assert profile.status == "pending"
        assert user.status == "pending"

    # 7. HR xem lai danh sach thay ung vien o trang thai pending
    list_res = client.get("/api/hr/interns", headers=hr_headers)
    items = list_res.json()["items"]
    matched = next((i for i in items if i["id"] == intern_id), None)
    assert matched is not None
    assert matched["status"] == "pending"
    assert matched["has_cv"] is True