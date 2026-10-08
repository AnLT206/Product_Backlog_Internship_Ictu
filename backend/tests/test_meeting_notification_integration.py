from collections.abc import Generator
from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.services.email_service import EmailService
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def meeting_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([hr_role, intern_role, mentor_role])
        db.flush()

        hr = User(
            id=1,
            code="HR0001",
            email="hr@example.com",
            password_hash="hashed",
            full_name="HR Linh Chi",
            role_id=hr_role.id,
            status="active",
        )
        intern1 = User(
            id=10,
            code="TTS0010",
            email="intern10@example.com",
            password_hash="hashed",
            full_name="TTS Hoang Nam",
            role_id=intern_role.id,
            status="active",
        )
        intern2 = User(
            id=11,
            code="TTS0011",
            email="intern11@example.com",
            password_hash="hashed",
            full_name="TTS Mai Anh",
            role_id=intern_role.id,
            status="active",
        )
        mentor = User(
            id=2,
            code="MT0002",
            email="mentor@example.com",
            password_hash="hashed",
            full_name="Mentor Minh Anh",
            role_id=mentor_role.id,
            status="active",
        )
        db.add_all([hr, mentor, intern1, intern2])
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


def test_create_meeting_triggers_email_notification(meeting_client):
    client, _ = meeting_client
    hr_token = create_access_token(user_id=1, role="hr")

    payload = {
        "title": "Hop Kickoff Du an Thuc tap",
        "description": "Pho bien quy che va giao viec tuan 1",
        "start_time": "2026-10-15T09:00:00",
        "end_time": "2026-10-15T10:30:00",
        "meeting_link": "https://meet.google.com/abc-xyz-123",
        "intern_ids": [10, 11],
    }

    with patch.object(EmailService, "send_email", return_value=True) as mock_send:
        response = client.post(
            "/api/hr/meetings",
            json=payload,
            headers={"Authorization": f"Bearer {hr_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["meeting_link"] == payload["meeting_link"]
        assert len(data["attendees"]) == 2

        # Kiểm tra email được gửi cho cả 2 intern qua background task
        assert mock_send.call_count == 2
        called_emails = [call.args[0] for call in mock_send.call_args_list]
        assert "intern10@example.com" in called_emails
        assert "intern11@example.com" in called_emails

        # Kiểm tra nội dung email có chứa chi tiết lịch họp (SCRUM-179)
        first_call_body = mock_send.call_args_list[0].args[2]
        assert "Hop Kickoff Du an Thuc tap" in first_call_body
        assert "https://meet.google.com/abc-xyz-123" in first_call_body
        assert "HR Linh Chi" in first_call_body


@pytest.mark.parametrize(
    ("host_id", "host_role", "host_name"),
    [(1, "hr", "HR Linh Chi"), (2, "mentor", "Mentor Minh Anh")],
)
def test_create_meeting_creates_in_app_notifications_for_attendees(
    meeting_client, host_id, host_role, host_name
):
    client, session_factory = meeting_client
    token = create_access_token(user_id=host_id, role=host_role)

    with patch.object(EmailService, "send_email", return_value=True):
        response = client.post(
            "/api/hr/meetings",
            json={
                "title": "Lich huong dan tu dong",
                "description": "Lich moi cho thuc tap sinh",
                "start_time": "2026-10-15T09:00:00",
                "end_time": "2026-10-15T10:00:00",
                "intern_ids": [10],
            },
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 201
    assert response.json()["host_name"] == host_name
    with session_factory() as db:
        notifications = db.query(Notification).filter(Notification.user_id == 10).all()
        assert len(notifications) == 1
        assert "Lich huong dan tu dong" in notifications[0].title
        assert notifications[0].is_read is False


def test_notification_read_state_persists_after_reloading_list(meeting_client):
    client, session_factory = meeting_client
    intern_token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {intern_token}"}

    with session_factory() as db:
        notification = Notification(
            user_id=10,
            title="Lich moi",
            body="Ban co mot lich moi.",
            is_read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        notification_id = notification.id

    initial_response = client.get("/api/notifications", headers=headers)
    assert initial_response.status_code == 200

    mark_read_response = client.patch(
        f"/api/notifications/{notification_id}/read",
        headers=headers,
    )
    assert mark_read_response.status_code == 200

    reloaded_response = client.get("/api/notifications", headers=headers)
    assert reloaded_response.status_code == 200
    notifications = reloaded_response.json()
    if isinstance(notifications, dict):
        notifications = notifications["items"]
    reloaded_notification = next(
        item for item in notifications if item["id"] == notification_id
    )
    assert reloaded_notification["is_read"] is True


def test_create_meeting_invalid_time(meeting_client):
    client, _ = meeting_client
    hr_token = create_access_token(user_id=1, role="hr")

    payload = {
        "title": "Lich loi",
        "start_time": "2026-10-15T11:00:00",
        "end_time": "2026-10-15T09:00:00",
        "intern_ids": [10],
    }
    response = client.post(
        "/api/hr/meetings",
        json=payload,
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 400
    assert "trước thời gian kết thúc" in response.json()["detail"]


def test_list_meetings_for_intern(meeting_client):
    client, _ = meeting_client
    hr_token = create_access_token(user_id=1, role="hr")
    intern_token = create_access_token(user_id=10, role="intern")

    # HR tạo 1 cuộc họp có intern 10
    with patch.object(EmailService, "send_email", return_value=True):
        client.post(
            "/api/hr/meetings",
            json={
                "title": "Hop 1-1 danh gia tien do",
                "start_time": "2026-10-20T14:00:00",
                "end_time": "2026-10-20T15:00:00",
                "meeting_link": "Phong hop B2",
                "intern_ids": [10],
            },
            headers={"Authorization": f"Bearer {hr_token}"},
        )

    # Intern 10 xem danh sách cuộc họp của mình
    res = client.get("/api/meetings", headers={"Authorization": f"Bearer {intern_token}"})
    assert res.status_code == 200
    meetings = res.json()
    assert len(meetings) == 1
    assert meetings[0]["title"] == "Hop 1-1 danh gia tien do"


def test_intern_forbidden_to_create_meeting(meeting_client):
    client, _ = meeting_client
    intern_token = create_access_token(user_id=10, role="intern")

    response = client.post(
        "/api/hr/meetings",
        json={
            "title": "Intern tu tao hop",
            "start_time": "2026-10-20T14:00:00",
            "end_time": "2026-10-20T15:00:00",
            "intern_ids": [11],
        },
        headers={"Authorization": f"Bearer {intern_token}"},
    )
    assert response.status_code == 403
