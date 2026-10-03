from collections.abc import Generator
from datetime import date

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.role import Role
from app.models.user import User
from app.models.weekly_report import WeeklyReport
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


def test_weekly_report_stores_content_week_and_attachment(db_session: Session):
    columns = {col["name"] for col in inspect(db_session.get_bind()).get_columns("weekly_reports")}
    assert {"user_id", "content", "attachment_path", "week_number", "start_date", "end_date"} <= columns

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
    report = WeeklyReport(
        user_id=user.id,
        week_number=1,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 7),
        title="Bao cao tuan 1",
        content="Da hoan thanh module dang nhap.",
        attachment_path="uploads/reports/tuan-1.pdf",
    )
    db_session.add(report)
    db_session.commit()

    loaded = db_session.query(WeeklyReport).one()
    assert loaded.content.startswith("Da hoan thanh")
    assert loaded.attachment_path == "uploads/reports/tuan-1.pdf"
    assert loaded.start_date == date(2026, 6, 1)
    assert loaded.user.id == user.id
