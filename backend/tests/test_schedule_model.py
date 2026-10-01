from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.role import Role
from app.models.schedule import Schedule
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


def test_schedules_table_links_to_users(db_session: Session):
    columns = {col["name"] for col in inspect(db_session.get_bind()).get_columns("schedules")}
    assert {
        "id",
        "user_id",
        "title",
        "description",
        "start_date",
        "end_date",
        "location",
    } <= columns

    foreign_keys = inspect(db_session.get_bind()).get_foreign_keys("schedules")
    assert any(fk["referred_table"] == "users" and "user_id" in fk["constrained_columns"] for fk in foreign_keys)

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
    row = Schedule(
        user_id=user.id,
        title="Onboarding",
        description="Làm quen dự án",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 5),
        location="Phòng CNTT",
    )
    db_session.add(row)
    db_session.commit()

    loaded = db_session.query(Schedule).filter(Schedule.user_id == user.id).one()
    assert loaded.user.email == "intern@example.com"
    assert loaded.title == "Onboarding"
    assert loaded.start_date == date(2026, 6, 1)
