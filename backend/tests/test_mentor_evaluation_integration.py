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
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def evaluation_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        mentor_role = Role(name="mentor", description="Mentor")
        intern_role = Role(name="intern", description="Intern")
        db.add_all([mentor_role, intern_role])
        db.flush()
        mentor = User(
            id=2,
            code="MT0001",
            email="mentor@example.com",
            password_hash="x",
            full_name="Mentor One",
            role_id=mentor_role.id,
            status="active",
        )
        other_mentor = User(
            id=3,
            code="MT0002",
            email="other.mentor@example.com",
            password_hash="x",
            full_name="Mentor Two",
            role_id=mentor_role.id,
            status="active",
        )
        intern = User(
            id=10,
            code="TTS0001",
            email="intern@example.com",
            password_hash="x",
            full_name="Intern One",
            role_id=intern_role.id,
            status="active",
        )
        db.add_all([mentor, other_mentor, intern])
        db.flush()
        program = InternshipProgram(
            name="Ky he 2026",
            department="CNTT",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 8, 31),
        )
        db.add(program)
        db.flush()
        db.add(
            ProgramMember(
                program_id=program.id,
                intern_user_id=intern.id,
                mentor_user_id=mentor.id,
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_evaluation_table_links_intern_and_mentor():
    table = Base.metadata.tables["evaluations"]
    column_names = set(table.columns.keys())
    assert {"intern_id", "mentor_id", "skill_score", "attitude_score", "comment"} <= column_names
    referred = {fk.column.table.name for fk in table.foreign_keys}
    assert referred == {"users"}


def test_assigned_mentor_submits_final_evaluation(evaluation_client: TestClient):
    headers = {"Authorization": f"Bearer {create_access_token(user_id=2, role='mentor')}"}
    created = evaluation_client.post(
        "/api/mentor/evaluations",
        json={
            "intern_id": 10,
            "skill_score": 8,
            "attitude_score": 9,
            "comment": "Chủ động và hoàn thành tốt nhiệm vụ.",
        },
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    assert body["mentor_id"] == 2
    assert body["intern_id"] == 10
    assert body["skill_score"] == 8
    assert body["attitude_score"] == 9

    duplicate = evaluation_client.post(
        "/api/mentor/evaluations",
        json={"intern_id": 10, "skill_score": 7, "attitude_score": 7, "comment": "Lần 2"},
        headers=headers,
    )
    assert duplicate.status_code == 409


def test_evaluation_rejects_unassigned_mentor_and_bad_score(evaluation_client: TestClient):
    other_headers = {"Authorization": f"Bearer {create_access_token(user_id=3, role='mentor')}"}
    forbidden = evaluation_client.post(
        "/api/mentor/evaluations",
        json={"intern_id": 10, "skill_score": 5, "attitude_score": 5},
        headers=other_headers,
    )
    assert forbidden.status_code == 403

    headers = {"Authorization": f"Bearer {create_access_token(user_id=2, role='mentor')}"}
    invalid = evaluation_client.post(
        "/api/mentor/evaluations",
        json={"intern_id": 10, "skill_score": 11, "attitude_score": 5},
        headers=headers,
    )
    assert invalid.status_code == 422

    missing = evaluation_client.post(
        "/api/mentor/evaluations",
        json={"intern_id": 10, "skill_score": 8, "attitude_score": 8},
    )
    assert missing.status_code == 401

    intern_headers = {"Authorization": f"Bearer {create_access_token(user_id=10, role='intern')}"}
    intern_forbidden = evaluation_client.post(
        "/api/mentor/evaluations",
        json={"intern_id": 10, "skill_score": 8, "attitude_score": 8},
        headers=intern_headers,
    )
    assert intern_forbidden.status_code == 403
