from collections.abc import Generator
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def allowance_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(name="hr", description="HR")
        intern_role = Role(name="intern", description="Intern")
        db.add_all([hr_role, intern_role])
        db.flush()

        hr = User(
            id=1,
            code="HR0001",
            email="hr@example.com",
            password_hash="hashed",
            full_name="HR User",
            role_id=hr_role.id,
            status="active",
        )
        intern = User(
            id=10,
            code="TTS0010",
            email="intern10@example.com",
            password_hash="hashed",
            full_name="Intern Nguyen Van A",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([hr, intern])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, session_factory
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_hr_create_allowance_auto_calc(allowance_client):
    client, _ = allowance_client
    hr_token = create_access_token(user_id=1, role="hr")

    payload = {
        "intern_id": 10,
        "period": "2026-10",
        "base_amount": 4400000.0,
        "actual_work_days": 20.0,
        "bonus": 200000.0,
        "deduction": 50000.0,
        "payment_status": "unpaid",
        "note": "Phụ cấp tháng 10",
    }
    response = client.post(
        "/api/hr/allowances",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["intern_id"] == 10
    assert body["period"] == "2026-10"
    assert body["intern_name"] == "Intern Nguyen Van A"
    # Công thức: (4400000 / 22) * 20 + 200000 - 50000 = 4000000 + 150000 = 4150000
    assert float(body["total_amount"]) == 4150000.0


def test_hr_create_allowance_duplicate_period(allowance_client):
    client, _ = allowance_client
    hr_token = create_access_token(user_id=1, role="hr")

    payload = {
        "intern_id": 10,
        "period": "2026-10",
        "base_amount": 3000000.0,
        "actual_work_days": 22.0,
    }
    # Lần 1 thành công
    res1 = client.post("/api/hr/allowances", json=payload, headers={"Authorization": f"Bearer {hr_token}"})
    assert res1.status_code == 201

    # Lần 2 bị trùng period
    res2 = client.post("/api/hr/allowances", json=payload, headers={"Authorization": f"Bearer {hr_token}"})
    assert res2.status_code == 400
    assert "đã tồn tại" in res2.json()["detail"]


def test_hr_update_allowance_status_and_payment(allowance_client):
    client, _ = allowance_client
    hr_token = create_access_token(user_id=1, role="hr")

    create_res = client.post(
        "/api/hr/allowances",
        json={
            "intern_id": 10,
            "period": "2026-11",
            "base_amount": 2200000.0,
            "actual_work_days": 22.0,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    allowance_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/hr/allowances/{allowance_id}",
        json={
            "payment_status": "paid",
            "payment_date": "2026-11-30",
            "note": "Đã chuyển khoản thành công",
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["payment_status"] == "paid"
    assert updated["payment_date"] == "2026-11-30"
    assert updated["note"] == "Đã chuyển khoản thành công"


def test_hr_list_allowances_filter(allowance_client):
    client, _ = allowance_client
    hr_token = create_access_token(user_id=1, role="hr")

    # Tạo 1 bản ghi
    client.post(
        "/api/hr/allowances",
        json={
            "intern_id": 10,
            "period": "2026-09",
            "base_amount": 2000000.0,
            "actual_work_days": 20.0,
        },
        headers={"Authorization": f"Bearer {hr_token}"},
    )

    response = client.get(
        "/api/hr/allowances?period=2026-09",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["period"] == "2026-09"


def test_intern_forbidden_hr_allowance_endpoints(allowance_client):
    client, _ = allowance_client
    intern_token = create_access_token(user_id=10, role="intern")

    response = client.get(
        "/api/hr/allowances",
        headers={"Authorization": f"Bearer {intern_token}"},
    )
    assert response.status_code == 403
