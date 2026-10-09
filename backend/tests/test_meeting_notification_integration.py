from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
import jwt
from fastapi.testclient import TestClient
from fastapi import WebSocketDisconnect
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.core.config import Settings
from app.core.database import Base
from app.main import app
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.services.email_service import EmailService
from app.core.config import get_settings
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def meeting_client(tmp_path) -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'meeting-notifications.db'}",
        connect_args={"check_same_thread": False},
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

    import app.api.activity_log_filter as activity_filter
    import app.core.database as database

    original_session_local = database.SessionLocal
    original_activity_session_local = activity_filter.SessionLocal
    database.SessionLocal = session_factory
    activity_filter.SessionLocal = session_factory
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, session_factory
    app.dependency_overrides.clear()
    database.SessionLocal = original_session_local
    activity_filter.SessionLocal = original_activity_session_local
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


def test_create_meeting_sends_well_formed_email_with_schedule_details(
    meeting_client,
):
    client, _ = meeting_client
    hr_token = create_access_token(user_id=1, role="hr")
    smtp_settings = Settings(
        smtp_host="smtp.example.com",
        smtp_port=587,
        smtp_username="mailer@example.com",
        smtp_password="test-password",
        smtp_from_email="mailer@example.com",
        smtp_from_name="ICTU Internship",
        smtp_use_tls=True,
    )
    payload = {
        "title": "Buoi huong dan Onboarding",
        "description": "Huong dan quy trinh thuc tap",
        "start_time": "2026-10-15T09:00:00",
        "end_time": "2026-10-15T10:30:00",
        "meeting_link": "https://meet.example.com/onboarding",
        "intern_ids": [10],
    }

    with (
        patch(
            "app.services.email_service.get_settings",
            return_value=smtp_settings,
        ),
        patch("app.services.email_service.smtplib.SMTP") as smtp_factory,
    ):
        smtp = smtp_factory.return_value.__enter__.return_value
        response = client.post(
            "/api/hr/meetings",
            json=payload,
            headers={"Authorization": f"Bearer {hr_token}"},
        )

    assert response.status_code == 201
    smtp_factory.assert_called_once_with(
        "smtp.example.com",
        587,
        timeout=10,
    )
    smtp.starttls.assert_called_once_with()
    smtp.login.assert_called_once_with("mailer@example.com", "test-password")
    smtp.send_message.assert_called_once()

    email_message = smtp.send_message.call_args.args[0]
    assert email_message["To"] == "intern10@example.com"
    assert email_message["From"] == "ICTU Internship <mailer@example.com>"
    assert email_message["Subject"] == (
        "[ICTU Internship] Thông báo lịch họp: Buoi huong dan Onboarding"
    )
    assert email_message.get_content_type() == "text/plain"
    assert email_message.get_content_charset() == "utf-8"
    email_body = email_message.get_content()
    assert "15/10/2026 09:00" in email_body
    assert "15/10/2026 10:30" in email_body
    assert "Buoi huong dan Onboarding" in email_body
    assert "https://meet.example.com/onboarding" in email_body
    assert "HR Linh Chi" in email_body


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


def test_notifications_are_scoped_to_current_user(meeting_client):
    client, session_factory = meeting_client
    with session_factory() as db:
        notification = Notification(
            user_id=11,
            title="Thông báo riêng",
            body="Chỉ dành cho thực tập sinh khác.",
            is_read=False,
        )
        db.add(notification)
        db.commit()
        notification_id = notification.id

    headers = {
        "Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"
    }
    list_response = client.get("/api/notifications", headers=headers)
    assert list_response.status_code == 200
    assert all(item["user_id"] == 10 for item in list_response.json()["items"])

    update_response = client.patch(
        f"/api/notifications/{notification_id}/read",
        headers=headers,
    )
    assert update_response.status_code == 404
    with session_factory() as db:
        assert db.get(Notification, notification_id).is_read is False


def test_notification_websocket_rejects_invalid_expired_and_inactive_users(
    meeting_client,
):
    client, session_factory = meeting_client
    settings = get_settings()
    expired_token = jwt.encode(
        {
            "sub": "10",
            "role": "intern",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    for token in ("not-a-jwt", expired_token):
        with pytest.raises(WebSocketDisconnect) as disconnect:
            with client.websocket_connect("/api/notifications/ws") as websocket:
                websocket.send_json({"type": "authenticate", "token": token})
                websocket.receive_json()
        assert disconnect.value.code == 4401

    with session_factory() as db:
        intern = db.get(User, 10)
        intern.status = "inactive"
        db.commit()

    with pytest.raises(WebSocketDisconnect) as disconnect:
        with client.websocket_connect("/api/notifications/ws") as websocket:
            websocket.send_json(
                {
                    "type": "authenticate",
                    "token": create_access_token(user_id=10, role="intern"),
                }
            )
            websocket.receive_json()
    assert disconnect.value.code == 4401


def test_notification_websocket_sends_only_to_the_notification_user(
    meeting_client,
):
    client, _ = meeting_client
    intern10_token = create_access_token(user_id=10, role="intern")
    intern11_token = create_access_token(user_id=11, role="intern")

    with (
        client.websocket_connect("/api/notifications/ws") as intern10_socket,
        client.websocket_connect("/api/notifications/ws") as intern11_socket,
    ):
        intern10_socket.send_json(
            {"type": "authenticate", "token": intern10_token}
        )
        intern11_socket.send_json(
            {"type": "authenticate", "token": intern11_token}
        )
        assert intern10_socket.receive_json() == {"type": "authenticated"}
        assert intern11_socket.receive_json() == {"type": "authenticated"}

        with patch.object(EmailService, "send_email", return_value=True):
            client.post(
                "/api/hr/meetings",
                json={
                    "title": "Chi gui cho TTS 10",
                    "start_time": "2026-10-15T09:00:00",
                    "end_time": "2026-10-15T10:00:00",
                    "intern_ids": [10],
                },
                headers={
                    "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
                },
            )
            intern10_notification = intern10_socket.receive_json()

            client.post(
                "/api/hr/meetings",
                json={
                    "title": "Chi gui cho TTS 11",
                    "start_time": "2026-10-16T09:00:00",
                    "end_time": "2026-10-16T10:00:00",
                    "intern_ids": [11],
                },
                headers={
                    "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
                },
            )
            intern11_notification = intern11_socket.receive_json()

    assert intern10_notification["user_id"] == 10
    assert intern10_notification["title"] == "Lịch họp: Chi gui cho TTS 10"
    assert set(intern10_notification) == {
        "id", "user_id", "title", "body", "is_read", "created_at"
    }
    assert intern11_notification["user_id"] == 11
    assert intern11_notification["title"] == "Lịch họp: Chi gui cho TTS 11"


def test_notification_websocket_supports_multiple_connections_and_disconnect(
    meeting_client,
):
    from app.services.notification_connection_manager import notification_connection_manager

    client, _ = meeting_client
    token = create_access_token(user_id=10, role="intern")

    with (
        client.websocket_connect("/api/notifications/ws") as first_socket,
        client.websocket_connect("/api/notifications/ws") as second_socket,
    ):
        auth_message = {"type": "authenticate", "token": token}
        first_socket.send_json(auth_message)
        assert first_socket.receive_json() == {"type": "authenticated"}
        second_socket.send_json(auth_message)
        assert second_socket.receive_json() == {"type": "authenticated"}
        assert notification_connection_manager.connection_count(10) == 2

        with patch.object(EmailService, "send_email", return_value=True):
            client.post(
                "/api/hr/meetings",
                json={
                    "title": "Ca hai ket noi",
                    "start_time": "2026-10-15T09:00:00",
                    "end_time": "2026-10-15T10:00:00",
                    "intern_ids": [10],
                },
                headers={
                    "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
                },
            )
            assert first_socket.receive_json()["title"] == "Lịch họp: Ca hai ket noi"
            assert second_socket.receive_json()["title"] == "Lịch họp: Ca hai ket noi"

            first_socket.close()

            client.post(
                "/api/hr/meetings",
                json={
                    "title": "Chi con ket noi thu hai",
                    "start_time": "2026-10-16T09:00:00",
                    "end_time": "2026-10-16T10:00:00",
                    "intern_ids": [10],
                },
                headers={
                    "Authorization": f"Bearer {create_access_token(user_id=1, role='hr')}"
                },
            )
            assert second_socket.receive_json()["title"] == (
                "Lịch họp: Chi con ket noi thu hai"
            )
            assert notification_connection_manager.connection_count(10) == 1

    assert notification_connection_manager.connection_count(10) == 0


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
