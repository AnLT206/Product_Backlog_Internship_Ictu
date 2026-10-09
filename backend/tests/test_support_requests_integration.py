"""Tests tích hợp cho Tiếp nhận và Xử lý Yêu cầu Hỗ trợ từ Thực tập sinh (Task 5)."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.role import Role
from app.models.support_request import SupportRequest
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def support_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        intern_role = Role(id=1, name="intern", description="Intern")
        hr_role = Role(id=2, name="hr", description="HR")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([intern_role, hr_role, mentor_role, admin_role])
        db.flush()

        # Intern 1 (id=1)
        db.add(
            User(
                id=1,
                code="TTS0001",
                email="intern1@example.com",
                password_hash="hash",
                full_name="Intern One",
                role_id=intern_role.id,
                status="active",
            )
        )
        # Intern 2 (id=2)
        db.add(
            User(
                id=2,
                code="TTS0002",
                email="intern2@example.com",
                password_hash="hash",
                full_name="Intern Two",
                role_id=intern_role.id,
                status="active",
            )
        )
        # HR (id=3)
        db.add(
            User(
                id=3,
                code="HR0001",
                email="hr1@example.com",
                password_hash="hash",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Mentor (id=4)
        db.add(
            User(
                id=4,
                code="MT0001",
                email="mentor1@example.com",
                password_hash="hash",
                full_name="Mentor One",
                role_id=mentor_role.id,
                status="active",
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


def test_intern_create_support_request_success(support_client):
    client, session_factory = support_client
    payload = {
        "title": "Hỗ trợ cấp máy tính thực tập",
        "content": "Em hiện chưa có máy tính cá nhân để thực hiện công việc dự án, xin công ty hỗ trợ thiết bị.",
        "category": "workspace",
        "document_type": "internship_confirmation",
        "priority": "high",
    }
    response = client.post(
        "/api/support-requests",
        json=payload,
        headers=_auth(1, "intern"),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == payload["title"]
    assert data["content"] == payload["content"]
    assert data["category"] == "workspace"
    assert data["document_type"] == payload["document_type"]
    assert data["priority"] == "high"
    assert data["status"] == "pending"
    assert data["user_id"] == 1
    assert data["user_code"] == "TTS0001"
    assert data["user_full_name"] == "Intern One"
    assert data["response_note"] is None


def test_support_request_invalid_document_type(support_client):
    client, _ = support_client
    response = client.post(
        "/api/support-requests",
        json={
            "title": "Xin giấy xác nhận",
            "content": "Em cần giấy xác nhận để nộp cho trường.",
            "category": "procedure",
            "document_type": "invalid_type",
        },
        headers=_auth(1, "intern"),
    )
    assert response.status_code == 400


def test_create_support_request_validation(support_client):
    client, _ = support_client

    # Tiêu đề quá ngắn (< 3 ký tự)
    res1 = client.post(
        "/api/support-requests",
        json={"title": "Ab", "content": "Nội dung cần hỗ trợ chi tiết."},
        headers=_auth(1, "intern"),
    )
    assert res1.status_code == 422

    # Nội dung quá ngắn (< 5 ký tự)
    res2 = client.post(
        "/api/support-requests",
        json={"title": "Hỗ trợ tài khoản", "content": "123"},
        headers=_auth(1, "intern"),
    )
    assert res2.status_code == 422

    # Khoảng trắng thuần túy
    res3 = client.post(
        "/api/support-requests",
        json={"title": "   ", "content": "Nội dung hợp lệ."},
        headers=_auth(1, "intern"),
    )
    assert res3.status_code == 422


def test_create_support_request_forbidden_for_mentor(support_client):
    client, _ = support_client
    # Mentor không có quyền gửi support request qua endpoint dành cho TTS
    response = client.post(
        "/api/support-requests",
        json={"title": "Yêu cầu từ mentor", "content": "Mentor cần hỗ trợ trang thiết bị."},
        headers=_auth(4, "mentor"),
    )
    assert response.status_code == 403


def test_create_support_request_unauthorized(support_client):
    client, _ = support_client
    response = client.post(
        "/api/support-requests",
        json={"title": "Tiêu đề", "content": "Nội dung"},
    )
    assert response.status_code == 401


def test_intern_list_my_support_requests(support_client):
    client, _ = support_client

    # Tạo 2 yêu cầu cho intern 1
    client.post(
        "/api/support-requests",
        json={"title": "Yêu cầu 1", "content": "Chi tiết yêu cầu 1", "category": "technical"},
        headers=_auth(1, "intern"),
    )
    client.post(
        "/api/support-requests",
        json={"title": "Yêu cầu 2", "content": "Chi tiết yêu cầu 2", "category": "procedure"},
        headers=_auth(1, "intern"),
    )

    # Tạo 1 yêu cầu cho intern 2
    client.post(
        "/api/support-requests",
        json={"title": "Yêu cầu của intern 2", "content": "Chi tiết yêu cầu khác"},
        headers=_auth(2, "intern"),
    )

    # Intern 1 xem danh sách của mình
    res = client.get("/api/support-requests/my", headers=_auth(1, "intern"))
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    assert all(item["user_id"] == 1 for item in items)


def test_hr_list_all_support_requests_with_filters(support_client):
    client, _ = support_client

    client.post(
        "/api/support-requests",
        json={"title": "Lỗi phần mềm VPN", "content": "Em không thể kết nối vào mạng nội bộ công ty.", "category": "technical"},
        headers=_auth(1, "intern"),
    )
    client.post(
        "/api/support-requests",
        json={"title": "Xin giấy xác nhận thực tập", "content": "Em cần giấy xác nhận nộp cho trường đại học.", "category": "procedure"},
        headers=_auth(2, "intern"),
    )

    # HR xem tất cả
    res = client.get("/api/hr/support-requests", headers=_auth(3, "hr"))
    assert res.status_code == 200
    all_items = res.json()
    assert len(all_items) >= 2

    # Lọc theo category
    res_tech = client.get(
        "/api/hr/support-requests?category=technical",
        headers=_auth(3, "hr"),
    )
    assert res_tech.status_code == 200
    tech_items = res_tech.json()
    assert len(tech_items) == 1
    assert tech_items[0]["category"] == "technical"


def test_hr_and_admin_list_support_requests_by_status(support_client):
    client, session_factory = support_client
    with session_factory() as db:
        db.add(
            User(
                id=5,
                code="AD0001",
                email="admin@example.com",
                password_hash="hash",
                full_name="Admin User",
                role_id=4,
                status="active",
            )
        )
        db.add_all(
            [
                SupportRequest(
                    user_id=1,
                    title=f"Request {request_status}",
                    content="Support request details.",
                    category="technical",
                    status=request_status,
                )
                for request_status in (
                    "pending",
                    "in_progress",
                    "resolved",
                    "rejected",
                )
            ]
        )
        db.commit()

    hr_response = client.get(
        "/api/hr/support-requests?status=in_progress",
        headers=_auth(3, "hr"),
    )
    assert hr_response.status_code == 200
    assert len(hr_response.json()) == 1
    assert hr_response.json()[0]["status"] == "in_progress"

    admin_response = client.get(
        "/api/hr/support-requests?status=rejected",
        headers=_auth(5, "admin"),
    )
    assert admin_response.status_code == 200
    assert len(admin_response.json()) == 1
    assert admin_response.json()[0]["status"] == "rejected"

    all_response = client.get(
        "/api/hr/support-requests",
        headers=_auth(3, "hr"),
    )
    assert all_response.status_code == 200
    assert {item["status"] for item in all_response.json()} == {
        "pending",
        "in_progress",
        "resolved",
        "rejected",
    }


@pytest.mark.parametrize(
    ("user_id", "role"),
    [(1, "intern"), (4, "mentor")],
)
def test_non_hr_users_cannot_list_all_support_requests(
    support_client, user_id, role
):
    client, _ = support_client
    response = client.get(
        "/api/hr/support-requests",
        headers=_auth(user_id, role),
    )
    assert response.status_code == 403


def test_hr_support_request_list_requires_authentication(support_client):
    client, _ = support_client
    response = client.get("/api/hr/support-requests")
    assert response.status_code == 401


def test_hr_support_request_pagination_and_category_filters(support_client):
    client, session_factory = support_client
    with session_factory() as db:
        db.add_all(
            [
                SupportRequest(
                    user_id=1,
                    title="Technical request one",
                    content="Details for technical request one.",
                    category="technical",
                    status="pending",
                ),
                SupportRequest(
                    user_id=2,
                    title="Technical request two",
                    content="Details for technical request two.",
                    category="technical",
                    status="resolved",
                ),
                SupportRequest(
                    user_id=1,
                    title="Procedure request",
                    content="Details for procedure request.",
                    category="procedure",
                    status="pending",
                ),
            ]
        )
        db.commit()

    response = client.get(
        "/api/hr/support-requests?category=technical&limit=1&offset=1",
        headers=_auth(3, "hr"),
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["category"] == "technical"


def test_hr_view_all_support_requests_success(support_client):
    client, _ = support_client
    create_response = client.post(
        "/api/support-requests",
        json={
            "title": "Xin giấy xác nhận thực tập",
            "content": "Em cần giấy xác nhận để nộp cho trường.",
            "category": "procedure",
            "document_type": "internship_confirmation",
        },
        headers=_auth(1, "intern"),
    )
    assert create_response.status_code == 201

    response = client.get("/api/support-requests", headers=_auth(3, "hr"))
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_hr_update_support_request_in_progress(support_client):
    client, _ = support_client

    create_res = client.post(
        "/api/support-requests",
        json={"title": "Hỗ trợ thẻ ra vào", "content": "Thẻ ra vào văn phòng của em bị hỏng chip."},
        headers=_auth(1, "intern"),
    )
    req_id = create_res.json()["id"]

    # HR chuyển sang in_progress
    update_res = client.patch(
        f"/api/support-requests/{req_id}",
        json={"status": "in_progress", "response_note": "Bộ phận HR đã tiếp nhận và đang cấp lại thẻ."},
        headers=_auth(3, "hr"),
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "in_progress"
    assert data["response_note"] == "Bộ phận HR đã tiếp nhận và đang cấp lại thẻ."
    assert data["responder_id"] == 3
    assert data["responder_name"] == "HR Manager"
    assert data["resolved_at"] is None


def test_hr_update_support_request_resolved(support_client):
    client, _ = support_client

    create_res = client.post(
        "/api/support-requests",
        json={"title": "Xin nghỉ phép 1 ngày", "content": "Em xin phép nghỉ ngày mai để thi chứng chỉ."},
        headers=_auth(1, "intern"),
    )
    req_id = create_res.json()["id"]

    # HR duyệt resolved
    update_res = client.patch(
        f"/api/support-requests/{req_id}",
        json={"status": "resolved", "response_note": "Đã duyệt đơn nghỉ phép của em."},
        headers=_auth(3, "hr"),
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None
    assert data["response_note"] == "Đã duyệt đơn nghỉ phép của em."


@pytest.mark.parametrize(
    ("decision_status", "response_note"),
    [
        ("resolved", "Đã duyệt yêu cầu hỗ trợ."),
        ("rejected", "Yêu cầu chưa đủ điều kiện xử lý."),
    ],
)
def test_hr_respond_to_support_request_persists_final_decision(
    support_client, decision_status, response_note
):
    client, session_factory = support_client
    create_response = client.post(
        "/api/support-requests",
        json={
            "title": "Yêu cầu cần HR phản hồi",
            "content": "Em cần HR xem xét và phản hồi yêu cầu này.",
            "category": "procedure",
        },
        headers=_auth(1, "intern"),
    )
    request_id = create_response.json()["id"]

    response = client.put(
        f"/api/hr/support-requests/{request_id}/respond",
        json={"status": decision_status, "response_note": response_note},
        headers=_auth(3, "hr"),
    )

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == decision_status
    assert response_data["response_note"] == response_note
    assert response_data["responder_id"] == 3
    assert response_data["responder_name"] == "HR Manager"
    assert response_data["resolved_at"] is not None

    with session_factory() as db:
        persisted_request = db.get(SupportRequest, request_id)
        assert persisted_request is not None
        assert persisted_request.status == decision_status
        assert persisted_request.response_note == response_note
        assert persisted_request.responder_id == 3
        assert persisted_request.resolved_at is not None


def test_respond_to_missing_support_request_returns_404(support_client):
    client, _ = support_client
    response = client.put(
        "/api/hr/support-requests/99999/respond",
        json={"status": "resolved", "response_note": "Đã xử lý."},
        headers=_auth(3, "hr"),
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("user_id", "role"),
    [(1, "intern"), (4, "mentor")],
)
def test_non_hr_users_cannot_respond_to_support_request(
    support_client, user_id, role
):
    client, _ = support_client
    response = client.put(
        "/api/hr/support-requests/1/respond",
        json={"status": "resolved", "response_note": "Đã xử lý."},
        headers=_auth(user_id, role),
    )
    assert response.status_code == 403


def test_respond_to_support_request_requires_authentication(support_client):
    client, _ = support_client
    response = client.put(
        "/api/hr/support-requests/1/respond",
        json={"status": "resolved", "response_note": "Đã xử lý."},
    )
    assert response.status_code == 401


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "resolved"},
        {"status": "resolved", "response_note": "   "},
        {"status": "resolved", "response_note": "x" * 1001},
        {"status": "in_progress", "response_note": "Đang xử lý."},
        {"status": "approved", "response_note": "Đã duyệt."},
    ],
)
def test_respond_to_support_request_validates_final_status_and_note(
    support_client, payload
):
    client, _ = support_client
    response = client.put(
        "/api/hr/support-requests/1/respond",
        json=payload,
        headers=_auth(3, "hr"),
    )
    assert response.status_code == 422


def test_support_request_end_to_end_hr_resolution_visible_to_intern(support_client):
    client, _ = support_client
    intern_headers = _auth(1, "intern")
    hr_headers = _auth(3, "hr")
    response_note = "Đã duyệt yêu cầu và sẽ gửi giấy xác nhận trong tuần này."

    create_response = client.post(
        "/api/support-requests",
        json={
            "title": "Xin giấy xác nhận thực tập",
            "content": "Em cần giấy xác nhận để hoàn thiện hồ sơ tại trường.",
            "category": "procedure",
            "document_type": "internship_confirmation",
            "priority": "high",
        },
        headers=intern_headers,
    )
    assert create_response.status_code == 201
    created_request = create_response.json()
    request_id = created_request["id"]
    assert created_request["status"] == "pending"
    assert created_request["response_note"] is None

    hr_list_response = client.get("/api/support-requests", headers=hr_headers)
    assert hr_list_response.status_code == 200
    hr_request = next(
        item for item in hr_list_response.json() if item["id"] == request_id
    )
    assert hr_request["user_id"] == 1
    assert hr_request["status"] == "pending"

    update_response = client.patch(
        f"/api/support-requests/{request_id}",
        json={"status": "resolved", "response_note": response_note},
        headers=hr_headers,
    )
    assert update_response.status_code == 200
    updated_request = update_response.json()
    assert updated_request["status"] == "resolved"
    assert updated_request["response_note"] == response_note
    assert updated_request["responder_id"] == 3
    assert updated_request["responder_name"] == "HR Manager"
    assert updated_request["resolved_at"] is not None

    intern_list_response = client.get(
        "/api/support-requests/my",
        headers=intern_headers,
    )
    assert intern_list_response.status_code == 200
    visible_request = next(
        item for item in intern_list_response.json() if item["id"] == request_id
    )
    assert visible_request["status"] == "resolved"
    assert visible_request["response_note"] == response_note
    assert visible_request["responder_name"] == "HR Manager"


def test_intern_forbidden_to_update_support_request(support_client):
    client, _ = support_client

    create_res = client.post(
        "/api/support-requests",
        json={"title": "Yêu cầu hợp lệ", "content": "Nội dung cần hỗ trợ"},
        headers=_auth(1, "intern"),
    )
    req_id = create_res.json()["id"]

    # TTS không được tự update trạng thái
    update_res = client.patch(
        f"/api/support-requests/{req_id}",
        json={"status": "resolved", "response_note": "Tự duyệt"},
        headers=_auth(1, "intern"),
    )
    assert update_res.status_code == 403


def test_update_non_existent_support_request_404(support_client):
    client, _ = support_client

    res = client.patch(
        "/api/support-requests/99999",
        json={"status": "resolved", "response_note": "Không tồn tại"},
        headers=_auth(3, "hr"),
    )
    assert res.status_code == 404
    assert "Không tìm thấy yêu cầu hỗ trợ" in res.json()["detail"]


def test_support_request_document_type_round_trips(support_client):
    _, session_factory = support_client

    with session_factory() as db:
        request = SupportRequest(
            user_id=1,
            title="Xin giấy xác nhận thực tập",
            content="Em cần giấy xác nhận để nộp cho trường.",
            category="procedure",
            document_type="internship_confirmation",
        )
        db.add(request)
        db.commit()
        request_id = request.id

    with session_factory() as db:
        loaded_request = db.get(SupportRequest, request_id)
        assert loaded_request is not None
        assert loaded_request.document_type == "internship_confirmation"


def test_support_request_document_type_defaults_to_none(support_client):
    _, session_factory = support_client

    with session_factory() as db:
        request = SupportRequest(
            user_id=1,
            title="Yêu cầu hỗ trợ thủ tục",
            content="Em cần hướng dẫn hoàn thiện hồ sơ.",
            category="procedure",
        )
        db.add(request)
        db.commit()
        request_id = request.id

    with session_factory() as db:
        loaded_request = db.get(SupportRequest, request_id)
        assert loaded_request is not None
        assert loaded_request.document_type is None
