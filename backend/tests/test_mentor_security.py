from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.main import app
from app.models.user import User
from app.utils.authenticate_login import create_access_token


MENTOR_ENDPOINTS = [
    pytest.param(
        "get",
        "/api/hr/mentors",
        None,
        id="list-mentors",
    ),
    pytest.param(
        "post",
        "/api/hr/mentors",
        {
            "full_name": "Nguyen Van Mentor",
            "email": "mentor@example.com",
            "password": "Secret1",
        },
        id="create-mentor",
    ),
]


def _request(client: TestClient, method: str, url: str, json: dict | None = None):
    return client.request(method, url, json=json)


@pytest.fixture
def client():
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def ordinary_user_db():
    ordinary_user = MagicMock(spec=User)
    ordinary_user.id = 10
    ordinary_user.status = "active"
    ordinary_user.role.name = "intern"

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = ordinary_user
    app.dependency_overrides[get_db] = lambda: db
    return db


@pytest.mark.parametrize("method,url,payload", MENTOR_ENDPOINTS)
def test_mentor_endpoints_require_token(client, method, url, payload):
    response = _request(client, method, url, payload)

    assert response.status_code == 401


@pytest.mark.parametrize("method,url,payload", MENTOR_ENDPOINTS)
def test_mentor_endpoints_reject_ordinary_user(
    client,
    ordinary_user_db,
    method,
    url,
    payload,
):
    token = create_access_token(user_id=10, role="intern")

    response = client.request(
        method,
        url,
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403