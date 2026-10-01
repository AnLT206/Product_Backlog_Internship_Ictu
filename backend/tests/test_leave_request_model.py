from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.leave_request import LeaveRequest
from app.models.role import Role
from app.models.user import User
import app.models as _models  # noqa: F401


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)
    with session_factory() as db:
        yield db
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_leave_request_stores_period_reason_and_status(db_session: Session):
    columns = {col["name"] for col in inspect(db_session.get_bind()).get_columns("leave_requests")}
    assert {"user_id", "start_date", "end_date", "reason", "status"} <= columns

    foreign_keys = inspect(db_session.get_bind()).get_foreign_keys("leave_requests")
    assert any(fk["referred_table"] == "users" for fk in foreign_keys)

    role = Role(name="intern", description="Intern")
    db_session.add(role)
    db_session.flush()
    user = User(
        code="TTS0001",
        email="intern@example.com",
        password_hash="x",
        full_name="Intern One",
        role_id=role.id,
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    row = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 2),
        reason="Khám sức khỏe",
    )
    db_session.add(row)
    db_session.commit()

    loaded = db_session.query(LeaveRequest).one()
    assert loaded.status == "pending"
    assert loaded.reason == "Khám sức khỏe"
    assert loaded.user.email == "intern@example.com"
