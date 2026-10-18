"""Tests tích hợp cho API POST /api/hr/programs/assign-groups

Hỗ trợ gán hàng loạt thực tập sinh vào một chương trình hoặc nhóm cụ thể.
"""

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
import app.models as _models  # noqa: F401
from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.internship_group import (
    InternProfileDepartment,
    InternProfileGroup,
    InternshipGroup,
)
from app.models.internship_program import InternshipProgram
from app.models.mentor_intern import MentorIntern
from app.models.program_member import ProgramMember
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
        mentor_role = Role(id=3, name="mentor", description="Mentor")
        admin_role = Role(id=4, name="admin", description="Admin")
        db.add_all([hr_role, intern_role, mentor_role, admin_role])
        db.flush()

        # 2. Departments
        dept_it = Department(id=1, name="Công nghệ thông tin", description="IT Dept")
        dept_hr = Department(id=2, name="Nhân sự", description="HR Dept")
        db.add_all([dept_it, dept_hr])
        db.flush()

        # 3. Programs
        prog_open = InternshipProgram(
            id=1,
            name="Kỳ Thực Tập CNTT K2026",
            department="Công nghệ thông tin",
            description="Kỳ mở",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 12, 31),
            max_interns=5,
            status="open",
        )
        prog_closed = InternshipProgram(
            id=2,
            name="Kỳ Thực Tập Đã Đóng",
            department="Công nghệ thông tin",
            description="Kỳ đóng",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 5, 31),
            max_interns=10,
            status="closed",
        )
        db.add_all([prog_open, prog_closed])
        db.flush()

        # 4. Groups
        grp_open = InternshipGroup(
            id=1,
            name="Nhóm Backend Python",
            code="GRP-PY-26",
            department_id=1,
            program_id=1,
            max_members=4,
            status="active",
        )
        grp_closed = InternshipGroup(
            id=2,
            name="Nhóm Đã Đóng",
            code="GRP-CLS-26",
            department_id=1,
            max_members=5,
            status="closed",
        )
        db.add_all([grp_open, grp_closed])
        db.flush()

        # 5. Users
        hr_user = User(
            id=1,
            code="HR001",
            email="hr@example.com",
            password_hash="pwd",
            full_name="HR Manager",
            role_id=hr_role.id,
            status="active",
        )
        mentor_user = User(
            id=2,
            code="MT001",
            email="mentor@example.com",
            password_hash="pwd",
            full_name="Mentor Hoàng",
            role_id=mentor_role.id,
            status="active",
        )
        tts1 = User(
            id=10,
            code="TTS010",
            email="tts10@example.com",
            password_hash="pwd",
            full_name="Nguyễn Văn A",
            role_id=intern_role.id,
            status="active",
        )
        tts2 = User(
            id=11,
            code="TTS011",
            email="tts11@example.com",
            password_hash="pwd",
            full_name="Trần Thị B",
            role_id=intern_role.id,
            status="active",
        )
        tts3 = User(
            id=12,
            code="TTS012",
            email="tts12@example.com",
            password_hash="pwd",
            full_name="Lê Văn C",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([hr_user, mentor_user, tts1, tts2, tts3])
        db.flush()

        # 6. Intern Profiles
        p1 = InternProfile(id=1, user_id=tts1.id, status="approved", university="HUST")
        p2 = InternProfile(id=2, user_id=tts2.id, status="approved", university="VNU")
        p3 = InternProfile(id=3, user_id=tts3.id, status="approved", university="PTIT")
        db.add_all([p1, p2, p3])
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def _get_auth_header(user_id: int, role_name: str) -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role_name)
    return {"Authorization": f"Bearer {token}"}


class TestHRProgramsAssignGroupsAPI:
    """Kiểm tra chức năng POST /api/hr/programs/assign-groups."""

    def test_assign_batch_to_program_only(self, db_session_and_client):
        """Gán hàng loạt TTS vào một chương trình cụ thể (program_id)."""
        client, session_factory = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "program_id": 1,
            "intern_ids": [10, 11],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["program_id"] == 1
        assert data["program_name"] == "Kỳ Thực Tập CNTT K2026"
        assert data["group_id"] is None
        assert data["assigned_count"] == 2
        assert set(data["intern_ids"]) == {10, 11}

        # Kiểm tra ProgramMember trong database
        with session_factory() as db:
            members = db.query(ProgramMember).filter(ProgramMember.program_id == 1).all()
            assert len(members) == 2
            member_user_ids = {m.intern_user_id for m in members}
            assert member_user_ids == {10, 11}

    def test_assign_batch_to_group_only(self, db_session_and_client):
        """Gán hàng loạt TTS vào một nhóm cụ thể (group_id)."""
        client, session_factory = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "group_id": 1,
            "intern_ids": [10, 12],
            "role": "member",
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["group_id"] == 1
        assert data["group_name"] == "Nhóm Backend Python"
        assert data["department_id"] == 1
        assert data["department_name"] == "Công nghệ thông tin"
        assert data["assigned_count"] == 2

        # Kiểm tra bảng trung gian intern_profile_groups và intern_profile_departments
        with session_factory() as db:
            group_members = (
                db.query(InternProfileGroup)
                .filter(InternProfileGroup.group_id == 1, InternProfileGroup.status == "active")
                .all()
            )
            assert len(group_members) == 2
            p_ids = {gm.intern_profile_id for gm in group_members}
            assert p_ids == {1, 3}  # tts1 (p1) và tts3 (p3)

            # Đồng bộ phòng ban
            dept_members = db.query(InternProfileDepartment).filter(InternProfileDepartment.department_id == 1).all()
            assert len(dept_members) >= 2

    def test_assign_batch_to_both_program_and_group_with_mentor(self, db_session_and_client):
        """Gán hàng loạt TTS vào cả chương trình và nhóm, kèm phân công Mentor."""
        client, session_factory = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "program_id": 1,
            "group_id": 1,
            "intern_ids": [10, 11, 12],
            "mentor_id": 2,
            "role": "leader",
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["program_id"] == 1
        assert data["group_id"] == 1
        assert data["mentor_id"] == 2
        assert data["assigned_count"] == 3

        with session_factory() as db:
            # Kiểm tra ProgramMember có mentor_id
            prog_members = db.query(ProgramMember).filter(ProgramMember.program_id == 1).all()
            assert len(prog_members) == 3
            assert all(pm.mentor_user_id == 2 for pm in prog_members)

            # Kiểm tra InternProfile.mentor_id
            profiles = db.query(InternProfile).filter(InternProfile.id.in_([1, 2, 3])).all()
            assert all(p.mentor_id == 2 for p in profiles)

            # Kiểm tra MentorIntern
            mi_records = db.query(MentorIntern).filter(MentorIntern.mentor_id == 2).all()
            assert len(mi_records) == 3

    def test_assign_using_intern_profile_ids(self, db_session_and_client):
        """Hỗ trợ gán bằng danh sách intern_profile_ids."""
        client, _ = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "group_id": 1,
            "intern_profile_ids": [1, 2],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["assigned_count"] == 2
        assert set(data["intern_profile_ids"]) == {1, 2}

    def test_missing_both_program_id_and_group_id(self, db_session_and_client):
        """Báo lỗi khi không cung cấp cả program_id và group_id."""
        client, _ = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "intern_ids": [10],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 422
        assert "program_id hoặc group_id" in res.text

    def test_missing_interns_list(self, db_session_and_client):
        """Báo lỗi khi không cung cấp danh sách TTS."""
        client, _ = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "program_id": 1,
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 422
        assert "danh sách thực tập sinh" in res.text

    def test_closed_program_rejected(self, db_session_and_client):
        """Không thể gán TTS vào kỳ thực tập đã đóng."""
        client, _ = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "program_id": 2,  # prog_closed
            "intern_ids": [10],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 400
        assert "Kỳ thực tập đã đóng" in res.json()["detail"]

    def test_closed_group_rejected(self, db_session_and_client):
        """Không thể gán TTS vào nhóm đã đóng."""
        client, _ = db_session_and_client
        headers = _get_auth_header(1, "hr")

        payload = {
            "group_id": 2,  # grp_closed
            "intern_ids": [10],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 400
        assert "Nhóm thực tập đã đóng" in res.json()["detail"]

    def test_program_capacity_limit(self, db_session_and_client):
        """Kiểm tra vượt quá số lượng tối đa của kỳ thực tập (max_interns)."""
        client, session_factory = db_session_and_client
        headers = _get_auth_header(1, "hr")

        # Đặt max_interns = 1 cho kỳ 1
        with session_factory() as db:
            prog = db.query(InternshipProgram).filter(InternshipProgram.id == 1).first()
            prog.max_interns = 1
            db.commit()

        payload = {
            "program_id": 1,
            "intern_ids": [10, 11],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 400
        assert "vượt quá giới hạn tối đa của kỳ thực tập" in res.json()["detail"]

    def test_group_capacity_limit(self, db_session_and_client):
        """Kiểm tra vượt quá số lượng tối đa của nhóm (max_members)."""
        client, session_factory = db_session_and_client
        headers = _get_auth_header(1, "hr")

        # Đặt max_members = 1 cho nhóm 1
        with session_factory() as db:
            grp = db.query(InternshipGroup).filter(InternshipGroup.id == 1).first()
            grp.max_members = 1
            db.commit()

        payload = {
            "group_id": 1,
            "intern_ids": [10, 11],
        }
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=headers)
        assert res.status_code == 400
        assert "vượt quá giới hạn tối đa của nhóm" in res.json()["detail"]

    def test_unauthorized_access(self, db_session_and_client):
        """Kiểm tra phân quyền: TTS hoặc người dùng chưa đăng nhập không có quyền."""
        client, _ = db_session_and_client
        tts_headers = _get_auth_header(10, "intern")

        payload = {
            "program_id": 1,
            "intern_ids": [10],
        }
        # Thực tập sinh gọi -> 403 Forbidden
        res = client.post("/api/hr/programs/assign-groups", json=payload, headers=tts_headers)
        assert res.status_code == 403

        # Chưa đăng nhập -> 401 Unauthorized
        res_no_auth = client.post("/api/hr/programs/assign-groups", json=payload)
        assert res_no_auth.status_code == 401
