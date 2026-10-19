"""Tests tích hợp cho chức năng HR gán TTS và Mentor vào kỳ thực tập."""

from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.mentor_intern import MentorIntern
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def client_and_db() -> Generator[tuple[TestClient, sessionmaker], None, None]:
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

        # HR user (id=1)
        db.add(
            User(
                id=1,
                code="HR-01",
                email="hr@ictu.edu.vn",
                password_hash="x",
                full_name="HR Manager",
                role_id=hr_role.id,
                status="active",
            )
        )
        # Mentor 1 (id=2), Mentor 2 (id=3)
        db.add_all([
            User(
                id=2,
                code="MEN-01",
                email="mentor1@ictu.edu.vn",
                password_hash="x",
                full_name="Mentor Tran Quan",
                role_id=mentor_role.id,
                status="active",
            ),
            User(
                id=3,
                code="MEN-02",
                email="mentor2@ictu.edu.vn",
                password_hash="x",
                full_name="Mentor Pham Huong",
                role_id=mentor_role.id,
                status="active",
            ),
        ])
        # Interns: id=10, 11, 12
        db.add_all([
            User(
                id=10,
                code="TTS-01",
                email="tts1@ictu.edu.vn",
                password_hash="x",
                full_name="Nguyen Van An",
                role_id=intern_role.id,
                status="active",
            ),
            User(
                id=11,
                code="TTS-02",
                email="tts2@ictu.edu.vn",
                password_hash="x",
                full_name="Le Hoang Nam",
                role_id=intern_role.id,
                status="active",
            ),
            User(
                id=12,
                code="TTS-03",
                email="tts3@ictu.edu.vn",
                password_hash="x",
                full_name="Tran Thi Mai",
                role_id=intern_role.id,
                status="active",
            ),
        ])
        db.flush()

        # Intern profiles
        db.add_all([
            InternProfile(
                user_id=10,
                university="ICTU",
                major="Kỹ thuật phần mềm",
                phone_number="0987654321",
                status="approved",
            ),
            InternProfile(
                user_id=11,
                university="ICTU",
                major="Hệ thống thông tin",
                phone_number="0987654322",
                status="approved",
            ),
            InternProfile(
                user_id=12,
                university="ICTU",
                major="An toàn thông tin",
                phone_number="0987654323",
                status="approved",
            ),
        ])

        # Program 1: open, max 5 TTS
        db.add(
            InternshipProgram(
                id=1,
                name="Kỳ thực tập Hè 2026",
                department="Công nghệ thông tin",
                description="Kỳ thực tập chính khóa",
                start_date=date(2026, 6, 1),
                end_date=date(2026, 8, 31),
                max_interns=5,
                status="open",
            )
        )
        # Program 2: closed
        db.add(
            InternshipProgram(
                id=2,
                name="Kỳ thực tập Xuân 2026",
                department="Phần mềm",
                description="Kỳ đã đóng",
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31),
                max_interns=2,
                status="closed",
            )
        )
        db.commit()

    def override_get_db():
        with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, session_factory
    app.dependency_overrides.clear()


def test_assign_tts_and_mentor_to_program_success(client_and_db):
    client, session_factory = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # HR gán TTS 10 và 11 vào kỳ 1 cùng Mentor 2
    res = client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10, 11], "mentor_id": 2},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["program_id"] == 1
    assert data["assigned_count"] == 2
    assert data["intern_ids"] == [10, 11]
    assert data["mentor_id"] == 2

    # Kiểm tra trong DB
    with session_factory() as db:
        members = db.query(ProgramMember).filter_by(program_id=1).all()
        assert len(members) == 2
        assert {m.intern_user_id for m in members} == {10, 11}
        assert all(m.mentor_user_id == 2 for m in members)

        # Kiểm tra đồng bộ InternProfile & MentorIntern
        prof10 = db.query(InternProfile).filter_by(user_id=10).first()
        prof11 = db.query(InternProfile).filter_by(user_id=11).first()
        assert prof10.mentor_id == 2
        assert prof11.mentor_id == 2

        mi = db.query(MentorIntern).filter_by(mentor_id=2).all()
        assert len(mi) == 2


def test_list_program_members(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Gán TTS 10 với Mentor 2
    client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10], "mentor_id": 2},
        headers=headers,
    )

    # Lấy danh sách thành viên của kỳ 1
    res = client.get("/api/hr/programs/1/members", headers=headers)
    assert res.status_code == 200
    members = res.json()
    assert len(members) == 1
    assert members[0]["intern_user_id"] == 10
    assert members[0]["intern_name"] == "Nguyen Van An"
    assert members[0]["intern_email"] == "tts1@ictu.edu.vn"
    assert members[0]["mentor_user_id"] == 2
    assert members[0]["mentor_name"] == "Mentor Tran Quan"
    assert members[0]["status"] == "in_progress"


def test_update_program_member_mentor(client_and_db):
    client, session_factory = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Gán ban đầu TTS 10 với Mentor 2
    client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10], "mentor_id": 2},
        headers=headers,
    )

    # HR đổi Mentor sang Mentor 3
    res = client.put(
        "/api/hr/programs/1/members/10",
        json={"mentor_id": 3},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mentor_user_id"] == 3
    assert data["mentor_name"] == "Mentor Pham Huong"

    with session_factory() as db:
        pm = db.query(ProgramMember).filter_by(program_id=1, intern_user_id=10).first()
        assert pm.mentor_user_id == 3
        prof = db.query(InternProfile).filter_by(user_id=10).first()
        assert prof.mentor_id == 3


def test_remove_program_member(client_and_db):
    client, session_factory = client_and_db
    token = create_access_token(user_id=1, role="hr")
    headers = {"Authorization": f"Bearer {token}"}

    # Gán TTS 10 vào kỳ 1
    client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [10], "mentor_id": 2},
        headers=headers,
    )

    # Gỡ TTS 10 khỏi kỳ 1
    res = client.delete("/api/hr/programs/1/members/10", headers=headers)
    assert res.status_code == 204

    # Kiểm tra danh sách còn 0
    list_res = client.get("/api/hr/programs/1/members", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0


def test_permission_denied_for_intern(client_and_db):
    client, _ = client_and_db
    token = create_access_token(user_id=10, role="intern")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/hr/programs/1/assign",
        json={"intern_ids": [11], "mentor_id": 2},
        headers=headers,
    )
    assert res.status_code == 403
