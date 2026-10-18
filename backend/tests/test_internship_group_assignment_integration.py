"""Tests tích hợp cho quan hệ n-n giữa Intern_Profiles và Internship_Groups/Departments

và các chức năng phân công TTS vào chương trình/nhóm theo phòng ban cho HR.
"""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
import app.models as _models  # noqa: F401
from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_group import (
    InternProfileDepartment,
    InternProfileGroup,
    InternshipGroup,
)
from app.models.internship_program import InternshipProgram
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token


@pytest.fixture
def db_session_and_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        # 1. Roles
        hr_role = Role(id=1, name="hr", description="HR")
        intern_role = Role(id=2, name="intern", description="Intern")
        admin_role = Role(id=3, name="admin", description="Admin")
        mentor_role = Role(id=4, name="mentor", description="Mentor")
        db.add_all([hr_role, intern_role, admin_role, mentor_role])
        db.flush()

        # 2. Departments
        it_dept = Department(id=1, name="Phòng Công nghệ thông tin", description="Phòng IT")
        hr_dept = Department(id=2, name="Phòng Nhân sự", description="Phòng HR")
        db.add_all([it_dept, hr_dept])
        db.flush()

        # 3. Internship Program
        program = InternshipProgram(
            id=1,
            name="Kỳ Thực Tập Mùa Thu 2026",
            department="Phòng Công nghệ thông tin",
            description="Chương trình đào tạo thực tập sinh",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=50,
            status="open",
        )
        db.add(program)
        db.flush()

        # 4. Users
        hr_user = User(
            id=1,
            code="HR001",
            email="hr@example.com",
            password_hash="hashed_pw",
            full_name="Nguyễn HR",
            role_id=hr_role.id,
            status="active",
        )
        tts_user1 = User(
            id=2,
            code="TTS001",
            email="tts1@example.com",
            password_hash="hashed_pw",
            full_name="Trần Thực Tập 1",
            role_id=intern_role.id,
            status="active",
        )
        tts_user2 = User(
            id=3,
            code="TTS002",
            email="tts2@example.com",
            password_hash="hashed_pw",
            full_name="Lê Thực Tập 2",
            role_id=intern_role.id,
            status="active",
        )
        tts_user3 = User(
            id=4,
            code="TTS003",
            email="tts3@example.com",
            password_hash="hashed_pw",
            full_name="Phạm Thực Tập 3",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([hr_user, tts_user1, tts_user2, tts_user3])
        db.flush()

        # 5. Intern Profiles
        p1 = InternProfile(
            id=1,
            user_id=tts_user1.id,
            status="approved",
            university="Đại học Bách Khoa",
            major="Khoa học máy tính",
        )
        p2 = InternProfile(
            id=2,
            user_id=tts_user2.id,
            status="approved",
            university="Đại học Công nghệ",
            major="Kỹ thuật phần mềm",
        )
        p3 = InternProfile(
            id=3,
            user_id=tts_user3.id,
            status="approved",
            university="Học viện Bưu chính Viễn thông",
            major="An toàn thông tin",
        )
        db.add_all([p1, p2, p3])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def _get_auth_header(email: str, role_name: str, user_id: int) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role_name)
    return {"Authorization": f"Bearer {token}"}



class TestInternshipGroupSchemaAndRelations:
    """Kiểm tra cấu trúc schema database và quan hệ n-n trong ORM."""

    def test_database_tables_and_columns_exist(self, db_session_and_client):
        _, session_factory = db_session_and_client
        with session_factory() as db:
            engine = db.get_bind()
            inspector = inspect(engine)
            tables = inspector.get_table_names()

            assert "intern_profiles" in tables
            assert "internship_groups" in tables
            assert "intern_profile_groups" in tables
            assert "intern_profile_departments" in tables

            # Kiểm tra cột bảng internship_groups
            ig_cols = {col["name"]: col for col in inspector.get_columns("internship_groups")}
            assert "name" in ig_cols
            assert "department_id" in ig_cols
            assert "program_id" in ig_cols
            assert "max_members" in ig_cols
            assert "status" in ig_cols

            # Kiểm tra cột bảng intern_profile_groups
            ipg_cols = {col["name"]: col for col in inspector.get_columns("intern_profile_groups")}
            assert "intern_profile_id" in ipg_cols
            assert "group_id" in ipg_cols
            assert "role" in ipg_cols
            assert "status" in ipg_cols
            assert "assigned_at" in ipg_cols

            # Kiểm tra cột bảng intern_profile_departments
            ipd_cols = {col["name"]: col for col in inspector.get_columns("intern_profile_departments")}
            assert "intern_profile_id" in ipd_cols
            assert "department_id" in ipd_cols
            assert "assigned_at" in ipd_cols

    def test_orm_many_to_many_relationships(self, db_session_and_client):
        """Kiểm tra quan hệ ORM giữa InternProfile, InternshipGroup và Department."""
        _, session_factory = db_session_and_client
        with session_factory() as db:
            group1 = InternshipGroup(
                name="Nhóm Backend Python",
                code="GRP-PY-01",
                department_id=1,
                program_id=1,
                max_members=10,
            )
            group2 = InternshipGroup(
                name="Nhóm Frontend React",
                code="GRP-REACT-01",
                department_id=1,
                max_members=10,
            )
            db.add_all([group1, group2])
            db.flush()

            p1 = db.query(InternProfile).filter(InternProfile.id == 1).first()
            p2 = db.query(InternProfile).filter(InternProfile.id == 2).first()

            # Gán TTS 1 vào cả group 1 và group 2 (n-n)
            # Gán TTS 2 vào group 1
            ipg1 = InternProfileGroup(intern_profile_id=p1.id, group_id=group1.id, role="leader")
            ipg2 = InternProfileGroup(intern_profile_id=p1.id, group_id=group2.id, role="member")
            ipg3 = InternProfileGroup(intern_profile_id=p2.id, group_id=group1.id, role="member")
            db.add_all([ipg1, ipg2, ipg3])

            # Gán TTS 1 vào Department 1
            ipd1 = InternProfileDepartment(intern_profile_id=p1.id, department_id=1)
            db.add(ipd1)
            db.commit()

        # Kiểm tra truy vấn ORM hai chiều
        with session_factory() as db:
            p1_loaded = db.query(InternProfile).filter(InternProfile.id == 1).first()
            assert len(p1_loaded.groups) == 2
            group_names = {g.name for g in p1_loaded.groups}
            assert "Nhóm Backend Python" in group_names
            assert "Nhóm Frontend React" in group_names
            assert len(p1_loaded.departments) == 1
            assert p1_loaded.departments[0].name == "Phòng Công nghệ thông tin"

            # Kiểm tra từ phía Group
            g1_loaded = db.query(InternshipGroup).filter(InternshipGroup.name == "Nhóm Backend Python").first()
            assert len(g1_loaded.intern_profiles) == 2
            intern_names = {ip.user.full_name for ip in g1_loaded.intern_profiles}
            assert "Trần Thực Tập 1" in intern_names
            assert "Lê Thực Tập 2" in intern_names


class TestHRAssignInternshipGroupAPI:
    """Kiểm tra toàn bộ luồng API quản lý nhóm và phân công TTS cho HR."""

    def test_hr_create_internship_group(self, db_session_and_client):
        client, _ = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        payload = {
            "name": "Nhóm AI & Data Engineering",
            "code": "GRP-AI-01",
            "department_id": 1,
            "program_id": 1,
            "description": "Nghiên cứu mô hình ngôn ngữ và dữ liệu lớn",
            "max_members": 5,
        }
        res = client.post("/api/hr/internship-groups", json=payload, headers=hr_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["id"] is not None
        assert data["name"] == "Nhóm AI & Data Engineering"
        assert data["department_id"] == 1
        assert data["department_name"] == "Phòng Công nghệ thông tin"
        assert data["program_id"] == 1
        assert data["program_name"] == "Kỳ Thực Tập Mùa Thu 2026"
        assert data["current_members_count"] == 0

    def test_hr_list_internship_groups_with_filters(self, db_session_and_client):
        client, session_factory = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        with session_factory() as db:
            g1 = InternshipGroup(name="Nhóm IT 1", department_id=1, program_id=1, max_members=10)
            g2 = InternshipGroup(name="Nhóm HR 1", department_id=2, max_members=10)
            db.add_all([g1, g2])
            db.commit()

        # Lọc theo department_id=1
        res = client.get("/api/hr/internship-groups?department_id=1", headers=hr_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert all(g["department_id"] == 1 for g in data)

    def test_hr_assign_interns_to_group_and_auto_sync_department(self, db_session_and_client):
        """HR phân công thực tập sinh vào nhóm và hệ thống tự động lưu quan hệ n-n."""
        client, session_factory = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        with session_factory() as db:
            group = InternshipGroup(
                id=10,
                name="Nhóm Web Fullstack",
                code="GRP-WEB-01",
                department_id=1,
                program_id=1,
                max_members=5,
            )
            db.add(group)
            db.commit()

        # Phân công TTS 1 và TTS 2 vào group 10
        assign_payload = {
            "group_id": 10,
            "intern_profile_ids": [1, 2],
            "role": "member",
        }
        res = client.post("/api/hr/internship-groups/assign-interns", json=assign_payload, headers=hr_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["group_id"] == 10
        assert data["assigned_count"] == 2
        assert set(data["assigned_intern_profile_ids"]) == {1, 2}

        # Kiểm tra chi tiết nhóm
        res_detail = client.get("/api/hr/internship-groups/10", headers=hr_headers)
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["current_members_count"] == 2
        members = detail_data["members"]
        assert len(members) == 2
        member_pids = {m["intern_profile_id"] for m in members}
        assert member_pids == {1, 2}

        # Kiểm tra tự động liên kết quan hệ n-n giữa InternProfile và Department
        res_overview = client.get("/api/hr/interns/1/groups", headers=hr_headers)
        assert res_overview.status_code == 200
        overview_data = res_overview.json()
        assert overview_data["intern_profile_id"] == 1
        assert len(overview_data["groups"]) == 1
        assert overview_data["groups"][0]["group_name"] == "Nhóm Web Fullstack"
        assert len(overview_data["departments"]) == 1
        assert overview_data["departments"][0]["department_name"] == "Phòng Công nghệ thông tin"

    def test_hr_assign_interns_by_user_ids(self, db_session_and_client):
        """Phân công bằng user_ids (intern_ids)."""
        client, session_factory = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        with session_factory() as db:
            group = InternshipGroup(
                id=20,
                name="Nhóm Mobile App",
                code="GRP-MOB-01",
                department_id=1,
                max_members=10,
            )
            db.add(group)
            db.commit()

        # Dùng intern_ids = [tts_user3.id] (id=4, profile_id=3)
        res = client.post(
            "/api/hr/internship-groups/20/assign-interns",
            json={"intern_ids": [4], "role": "leader"},
            headers=hr_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["assigned_count"] == 1
        assert data["assigned_intern_profile_ids"] == [3]

    def test_group_capacity_exceeded(self, db_session_and_client):
        """Kiểm tra báo lỗi khi số lượng TTS vượt quá max_members."""
        client, session_factory = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        with session_factory() as db:
            group = InternshipGroup(
                id=30,
                name="Nhóm Giới Hạn Nhỏ",
                code="GRP-TINY-01",
                max_members=1,
            )
            db.add(group)
            db.commit()

        res = client.post(
            "/api/hr/internship-groups/30/assign-interns",
            json={"intern_profile_ids": [1, 2]},
            headers=hr_headers,
        )
        assert res.status_code == 400
        assert "đạt số lượng tối đa" in res.json()["detail"]

    def test_hr_remove_intern_from_group(self, db_session_and_client):
        """HR xoá TTS khỏi nhóm."""
        client, session_factory = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        with session_factory() as db:
            group = InternshipGroup(id=40, name="Nhóm Cần Xoá TTS", max_members=10)
            db.add(group)
            db.flush()
            ipg = InternProfileGroup(intern_profile_id=1, group_id=40)
            db.add(ipg)
            db.commit()

        res = client.delete("/api/hr/internship-groups/40/interns/1", headers=hr_headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

        # Xác nhận thành viên đã được xoá
        res_detail = client.get("/api/hr/internship-groups/40", headers=hr_headers)
        assert res_detail.json()["current_members_count"] == 0

    def test_hr_assign_interns_directly_to_department(self, db_session_and_client):
        """HR phân công TTS trực tiếp vào phòng ban (quan hệ n-n)."""
        client, _ = db_session_and_client
        hr_headers = _get_auth_header("hr@example.com", "hr", 1)

        payload = {
            "department_id": 2,
            "intern_profile_ids": [1, 2],
        }
        res = client.post("/api/hr/departments/assign-interns", json=payload, headers=hr_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["department_id"] == 2
        assert data["department_name"] == "Phòng Nhân sự"
        assert data["assigned_count"] == 2

    def test_unauthorized_access_forbidden(self, db_session_and_client):
        """Người dùng không có quyền HR/Admin không thể thao tác."""
        client, _ = db_session_and_client
        intern_headers = _get_auth_header("tts1@example.com", "intern", 2)

        res = client.post(
            "/api/hr/internship-groups",
            json={"name": "Nhóm Bất Hợp Pháp"},
            headers=intern_headers,
        )
        assert res.status_code == 403
