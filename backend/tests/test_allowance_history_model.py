from collections.abc import Generator
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.role import Role
from app.models.user import User
import app.models as _models  # noqa: F401


@pytest.fixture
def allowance_session() -> Generator[sessionmaker, None, None]:
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
        db.add_all([hr_role, intern_role])
        db.flush()
        db.add_all(
            [
                User(
                    id=1,
                    code="HR0001",
                    email="hr@example.com",
                    password_hash="x",
                    full_name="HR Manager",
                    role_id=hr_role.id,
                    status="active",
                ),
                User(
                    id=10,
                    code="TTS0001",
                    email="intern@example.com",
                    password_hash="x",
                    full_name="Intern One",
                    role_id=intern_role.id,
                    status="active",
                ),
            ]
        )
        db.commit()

    yield session_factory

    Base.metadata.drop_all(engine)
    engine.dispose()


def test_multiple_allowances_for_same_intern_and_period(allowance_session):
    from app.models.allowance_history import AllowanceHistory

    with allowance_session() as db:
        db.add_all(
            [
                AllowanceHistory(
                    intern_id=10,
                    period="2026-09",
                    allowance_type="meal",
                    amount=Decimal("100000.00"),
                ),
                AllowanceHistory(
                    intern_id=10,
                    period="2026-09",
                    allowance_type="transport",
                    amount=Decimal("200000.00"),
                ),
            ]
        )
        db.commit()

        records = db.query(AllowanceHistory).filter_by(intern_id=10).all()
        assert len(records) == 2
        assert {record.allowance_type for record in records} == {"meal", "transport"}


def test_amount_round_trips_as_decimal(allowance_session):
    from app.models.allowance_history import AllowanceHistory

    with allowance_session() as db:
        record = AllowanceHistory(
            intern_id=10,
            period="2026-09",
            amount=Decimal("1500000.50"),
        )
        db.add(record)
        db.commit()

        loaded = db.get(AllowanceHistory, record.id)
        assert loaded is not None
        assert loaded.amount == Decimal("1500000.50")
        assert isinstance(loaded.amount, Decimal)


def test_created_by_can_be_null(allowance_session):
    from app.models.allowance_history import AllowanceHistory

    with allowance_session() as db:
        record = AllowanceHistory(
            intern_id=10,
            period="2026-09",
            amount=Decimal("0.00"),
            created_by=None,
        )
        db.add(record)
        db.commit()

        loaded = db.get(AllowanceHistory, record.id)
        assert loaded is not None
        assert loaded.created_by is None


def test_negative_amount_is_rejected(allowance_session):
    from app.models.allowance_history import AllowanceHistory

    with allowance_session() as db:
        db.add(
            AllowanceHistory(
                intern_id=10,
                period="2026-09",
                amount=Decimal("-1.00"),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
