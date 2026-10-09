from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.document import Document
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


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
        admin_role = Role(name="admin", description="Administrator")
        intern_role = Role(name="intern", description="Intern")
        mentor_role = Role(name="mentor", description="Mentor")
        db.add_all([hr_role, admin_role, intern_role, mentor_role])
        db.flush()

        # HR user (id=1)
        db.add(
            User(
                id=1,
                email="hr@example.com",
                password_hash="x",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Admin user (id=2)
        db.add(
            User(
                id=2,
                email="admin@example.com",
                password_hash="x",
                full_name="System Admin",
                role_id=admin_role.id,
                status="active",
            )
        )
        # Mentor user (id=3)
        db.add(
            User(
                id=3,
                email="mentor@example.com",
                password_hash="x",
                full_name="Mentor User",
                role_id=mentor_role.id,
                status="active",
            )
        )
        # Intern user 1 with documents (id=10)
        db.add(
            User(
                id=10,
                email="intern1@example.com",
                password_hash="x",
                full_name="Nguyễn Văn A",
                role_id=intern_role.id,
                status="pending",
            )
        )
        db.add(
            InternProfile(
                user_id=10,
                university="ICTU",
                major="CNTT",
            )
        )
        # Intern user 2 without documents (id=11)
        db.add(
            User(
                id=11,
                email="intern2@example.com",
                password_hash="x",
                full_name="Trần Thị B",
                role_id=intern_role.id,
                status="pending",
            )
        )
        # Active intern user (id=12)
        db.add(
            User(
                id=12,
                email="active_intern@example.com",
                password_hash="x",
                full_name="Active Intern",
                role_id=intern_role.id,
                status="active",
            )
        )
        db.flush()


        # Documents for intern 1 (id=10)
        db.add_all(
            [
                Document(
                    id=101,
                    user_id=10,
                    doc_type="cv",
                    file_name="cv_intern1.pdf",
                    file_path="/uploads/cv_intern1.pdf",
                    status="pending",
                    created_at=datetime(2026, 9, 1, 10, 0, 0),
                ),
                Document(
                    id=102,
                    user_id=10,
                    doc_type="application",
                    file_name="don_xin_tt.docx",
                    file_path="/uploads/don_xin_tt.docx",
                    status="pending",
                    created_at=datetime(2026, 9, 2, 11, 0, 0),
                ),
                Document(
                    id=103,
                    user_id=10,
                    doc_type="contract",
                    file_name="hop_dong.pdf",
                    file_path="/uploads/hop_dong.pdf",
                    status="approved",
                    review_note="Đã duyệt hợp đồng",
                    created_at=datetime(2026, 9, 3, 14, 0, 0),
                ),
            ]
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


def test_hr_get_all_documents_of_intern(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/10/documents", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 3
    doc_types = [d["doc_type"] for d in docs]
    assert "cv" in doc_types
    assert "application" in doc_types
    assert "contract" in doc_types


def test_hr_get_documents_filtered_by_status(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Filter status=pending (tài liệu cần duyệt)
    response = client.get("/api/hr/interns/10/documents?status=pending", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 2
    for d in docs:
        assert d["status"] == "pending"

    # Filter status=approved
    response = client.get("/api/hr/interns/10/documents?status=approved", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["doc_type"] == "contract"
    assert docs[0]["review_note"] == "Đã duyệt hợp đồng"


def test_hr_get_documents_filtered_by_doc_type(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/10/documents?doc_type=cv", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["doc_type"] == "cv"
    assert docs[0]["file_name"] == "cv_intern1.pdf"


def test_admin_can_get_intern_documents(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=2, role="admin")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/10/documents", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 3


def test_alias_endpoint_under_hr_documents(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/documents/intern/10", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 3


def test_intern_without_documents_returns_empty_list(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/11/documents", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert docs == []


def test_non_existent_intern_returns_404(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/999/documents", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy hồ sơ thực tập sinh."


def test_user_not_intern_role_returns_404(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # ID 3 is a Mentor, not an Intern
    response = client.get("/api/hr/interns/3/documents", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Không tìm thấy hồ sơ thực tập sinh."


def test_intern_role_cannot_access_endpoint(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=12, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/10/documents", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Bạn không có quyền thực hiện thao tác này."


def test_mentor_role_cannot_access_endpoint(integration_client):
    client, _ = integration_client
    token = create_access_token(user_id=3, role="mentor")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/hr/interns/10/documents", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Bạn không có quyền thực hiện thao tác này."


def test_unauthenticated_request_returns_401(integration_client):
    client, _ = integration_client
    response = client.get("/api/hr/interns/10/documents")
    assert response.status_code == 401


def test_intern_can_get_my_documents(integration_client):
    client, session_factory = integration_client
    with session_factory() as db:
        db.add(
            Document(
                id=201,
                user_id=12,
                doc_type="cv",
                file_name="cv_active.pdf",
                file_path="/uploads/cv_active.pdf",
                status="pending",
                created_at=datetime(2026, 10, 3, 10, 0, 0),
            )
        )
        db.commit()

    token = create_access_token(user_id=12, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/intern/documents", headers=headers)
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["file_name"] == "cv_active.pdf"

    # Filter by doc_type=cv
    response_cv = client.get("/api/intern/documents?doc_type=cv", headers=headers)
    assert response_cv.status_code == 200
    docs_cv = response_cv.json()
    assert len(docs_cv) == 1
    assert docs_cv[0]["doc_type"] == "cv"


def test_intern_preview_staged_document_docx(integration_client):
    import io, zipfile
    client, _ = integration_client
    token = create_access_token(user_id=12, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    docx_buffer = io.BytesIO()
    with zipfile.ZipFile(docx_buffer, "w") as z:
        xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Nguyễn Văn A - CV Ứng Tuyển</w:t></w:r></w:p>
            <w:p><w:r><w:t>Mục tiêu nghề nghiệp: Frontend Developer</w:t></w:r></w:p>
          </w:body>
        </w:document>"""
        z.writestr("word/document.xml", xml)
    docx_buffer.seek(0)

    response = client.post(
        "/api/intern/documents/preview-file",
        headers=headers,
        files={"file": ("Bai2CNXh.docx", docx_buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["extension"] == "docx"
    assert data["total_paragraphs"] == 2
    assert "Nguyễn Văn A - CV Ứng Tuyển" in data["paragraphs"]
    assert "Mục tiêu nghề nghiệp: Frontend Developer" in data["paragraphs"]


def test_view_document_docx_raw(integration_client, tmp_path):
    import zipfile
    client, session_factory = integration_client

    sample_docx = tmp_path / "test_cv.docx"
    with zipfile.ZipFile(sample_docx, "w") as z:
        xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Kỹ năng: React, FastAPI, Docker</w:t></w:r></w:p>
          </w:body>
        </w:document>"""
        z.writestr("word/document.xml", xml)

    with session_factory() as db:
        db.add(
            Document(
                id=301,
                user_id=12,
                doc_type="cv",
                file_name="test_cv.docx",
                file_path=str(sample_docx),
                status="pending",
                created_at=datetime(2026, 10, 3, 11, 0, 0),
            )
        )
        db.commit()

    token = create_access_token(user_id=12, role="intern")
    # Test query param token as well as header
    response = client.get(f"/api/documents/301/view?token={token}&raw=true")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 301
    assert data["file_name"] == "test_cv.docx"
    assert "Kỹ năng: React, FastAPI, Docker" in data["paragraphs"]



