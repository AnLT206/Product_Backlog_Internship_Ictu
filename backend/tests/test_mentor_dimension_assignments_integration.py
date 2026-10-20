"""Tests tích hợp cho phân công Mentor theo Khối / Lớp / Khóa / Ban (1-N & N-N)."""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_group import InternProfileDepartment
from app.models.mentor_intern import MentorIntern
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def dimension_test_setup() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        hr_role = Role(id=1, name="hr", description="HR")
        intern_role = Role(id=2, name="intern", description="Intern")
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([hr_role, intern_role, mentor_role, admin_role])
        db.flush()

        # Users
        hr_user = User(
            id=1, code="HR0001", email="hr@example.com",
            password_hash="pwd", full_name="HR Manager",
            role_id=hr_role.id, status="active"
        )
        mentor_1 = User(
            id=2, code="MT0001", email="mentor1@example.com",
            password_hash="pwd", full_name="Mentor Alpha",
            role_id=mentor_role.id, status="active"
        )
        mentor_2 = User(
            id=3, code="MT0002", email="mentor2@example.com",
            password_hash="pwd", full_name="Mentor Beta",
            role_id=mentor_role.id, status="active"
        )
        mentor_3 = User(
            id=4, code="MT0003", email="mentor3@example.com",
            password_hash="pwd", full_name="Mentor Gamma",
            role_id=mentor_role.id, status="active"
        )

        # Interns
        intern_1 = User(
            id=10, code="TTS0001", email="intern1@example.com",
            password_hash="pwd", full_name="Intern A",
            role_id=intern_role.id, status="active"
        )
        intern_2 = User(
            id=11, code="TTS0002", email="intern2@example.com",
            password_hash="pwd", full_name="Intern B",
            role_id=intern_role.id, status="active"
        )
        intern_3 = User(
            id=12, code="TTS0003", email="intern3@example.com",
            password_hash="pwd", full_name="Intern C",
            role_id=intern_role.id, status="active"
        )

        dept_se = Department(id=1, name="Ban Kỹ thuật Phần mềm")
        dept_ai = Department(id=2, name="Ban AI & R&D")

        db.add_all([hr_user, mentor_1, mentor_2, mentor_3, intern_1, intern_2, intern_3, dept_se, dept_ai])
        db.flush()

        # Intern Profiles với Khối, Lớp, Khóa
        p1 = InternProfile(
            user_id=10, major="Kỹ thuật phần mềm", class_name="K20-KTPM01",
            academic_year="Khóa 20 (2020-2024)", status="approved"
        )
        p2 = InternProfile(
            user_id=11, major="Kỹ thuật phần mềm", class_name="K20-KTPM01",
            academic_year="Khóa 20 (2020-2024)", status="approved"
        )
        p3 = InternProfile(
            user_id=12, major="An toàn thông tin", class_name="K21-ATTT01",
            academic_year="Khóa 21 (2021-2025)", status="approved"
        )
        db.add_all([p1, p2, p3])
        db.flush()

        # Ban (Departments)
        db.add_all([
            InternProfileDepartment(intern_profile_id=p1.id, department_id=dept_se.id),
            InternProfileDepartment(intern_profile_id=p2.id, department_id=dept_se.id),
            InternProfileDepartment(intern_profile_id=p3.id, department_id=dept_ai.id),
        ])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def _hr_token() -> str:
    return create_access_token(user_id=1, role="hr")


def test_get_dimensions_summary(dimension_test_setup):
    """Kiểm tra API tổng hợp 4 chiều: Khối, Lớp, Khóa, Ban."""
    client, _ = dimension_test_setup
    token = _hr_token()

    res = client.get(
        "/api/hr/mentor-assignments/dimensions-summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_interns"] == 3
    assert data["total_assigned"] == 0
    assert data["total_unassigned"] == 3

    # Kiểm tra danh sách Khối (majors)
    major_names = [m["value"] for m in data["majors"]]
    assert "Kỹ thuật phần mềm" in major_names
    assert "An toàn thông tin" in major_names

    # Kiểm tra danh sách Lớp (classes)
    class_names = [c["value"] for c in data["classes"]]
    assert "K20-KTPM01" in class_names
    assert "K21-ATTT01" in class_names

    # Kiểm tra danh sách Khóa (intakes)
    intake_names = [i["value"] for i in data["intakes"]]
    assert "Khóa 20 (2020-2024)" in intake_names

    # Kiểm tra danh sách Ban (departments)
    dept_names = [d["value"] for d in data["departments"]]
    assert "Ban Kỹ thuật Phần mềm" in dept_names
    assert "Ban AI & R&D" in dept_names


def test_batch_assign_by_class_1_to_n(dimension_test_setup):
    """Kiểm tra phân công 1 Mentor cho toàn bộ Lớp (Quan hệ 1-N)."""
    client, session_factory = dimension_test_setup
    token = _hr_token()

    # Phân công Mentor Alpha (id=2) làm Mentor chính cho cả lớp K20-KTPM01
    payload = {
        "dimension_type": "class",
        "dimension_value": "K20-KTPM01",
        "mentor_ids": [2],
        "role_type": "primary",
        "assignment_mode": "append",
    }
    res = client.post(
        "/api/hr/mentor-assignments/batch-by-dimension",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["affected_interns"] == 2

    # Kiểm tra DB: intern 10 & 11 đã có mentor_id=2 trong InternProfile và MentorIntern
    with session_factory() as db:
        p1 = db.query(InternProfile).filter(InternProfile.user_id == 10).one()
        p2 = db.query(InternProfile).filter(InternProfile.user_id == 11).one()
        assert p1.mentor_id == 2
        assert p2.mentor_id == 2

        mi_records = db.query(MentorIntern).filter(MentorIntern.mentor_id == 2).all()
        assert len(mi_records) == 2
        for r in mi_records:
            assert r.role_type == "primary"
            assert r.dimension_type == "class"
            assert r.dimension_value == "K20-KTPM01"


def test_batch_assign_by_department_n_to_n_co_mentoring(dimension_test_setup):
    """Kiểm tra phân công nhiều Mentor cho Ban (Quan hệ N-N Co-mentoring)."""
    client, session_factory = dimension_test_setup
    token = _hr_token()

    # 1. Gán Mentor 1 làm primary cho Ban Kỹ thuật phần mềm
    client.post(
        "/api/hr/mentor-assignments/batch-by-dimension",
        json={
            "dimension_type": "department",
            "dimension_value": "Ban Kỹ thuật Phần mềm",
            "mentor_ids": [2],
            "role_type": "primary",
            "assignment_mode": "append",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # 2. Gán tiếp Mentor 2 & 3 làm Mentor kỹ thuật và Cố vấn (N-N) cho cùng Ban
    res_tech = client.post(
        "/api/hr/mentor-assignments/batch-by-dimension",
        json={
            "dimension_type": "department",
            "dimension_value": "Ban Kỹ thuật Phần mềm",
            "mentor_ids": [3],
            "role_type": "technical",
            "assignment_mode": "append",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_tech.status_code == 200

    res_adv = client.post(
        "/api/hr/mentor-assignments/batch-by-dimension",
        json={
            "dimension_type": "department",
            "dimension_value": "Ban Kỹ thuật Phần mềm",
            "mentor_ids": [4],
            "role_type": "advisor",
            "assignment_mode": "append",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_adv.status_code == 200

    # Lấy danh sách TTS theo Ban xem có đủ 3 Mentor hay không
    res_list = client.get(
        "/api/hr/mentor-assignments/by-dimension?dimension_type=department&dimension_value=Ban%20K%E1%BB%B9%20thu%E1%BA%ADt%20Ph%E1%BA%A7n%20m%E1%BB%81m",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total"] == 2

    # Mỗi TTS trong Ban có 3 Mentor (Primary, Technical, Advisor) -> Quan hệ N-N
    intern1_item = [i for i in list_data["interns"] if i["id"] == 10][0]
    assert len(intern1_item["mentors"]) == 3
    roles = {m["role_type"] for m in intern1_item["mentors"]}
    assert roles == {"primary", "technical", "advisor"}


def test_matrix_assign_and_unassign_role(dimension_test_setup):
    """Kiểm tra phân công ma trận N-N và hủy phân công theo vai trò."""
    client, session_factory = dimension_test_setup
    token = _hr_token()

    # Phân công ma trận: Mentor 2 & 3 gán cho Intern 10 & 12 vai trò co_mentor
    matrix_payload = {
        "mentor_ids": [2, 3],
        "intern_ids": [10, 12],
        "role_type": "co_mentor",
        "assignment_mode": "append",
    }
    res = client.post(
        "/api/hr/mentor-assignments/matrix",
        json=matrix_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["affected_interns"] == 2

    with session_factory() as db:
        co_mentors = db.query(MentorIntern).filter(MentorIntern.role_type == "co_mentor").all()
        assert len(co_mentors) == 4  # 2 mentors * 2 interns

    # Hủy vai trò co_mentor của Mentor 2 khỏi Intern 10
    del_res = client.request(
        "DELETE",
        "/api/hr/mentor-assignments/role",
        json={"mentor_id": 2, "intern_id": 10, "role_type": "co_mentor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200

    with session_factory() as db:
        remaining = (
            db.query(MentorIntern)
            .filter(
                MentorIntern.mentor_id == 2,
                MentorIntern.intern_id == 10,
                MentorIntern.role_type == "co_mentor",
            )
            .first()
        )
        assert remaining is None
