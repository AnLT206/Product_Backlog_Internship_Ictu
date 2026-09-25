import pytest
from pydantic import ValidationError

from app.schemas.intern import InternCreateRequest


def _base(**overrides):
    data = {
        "full_name": "Tran Thi B",
        "email": "b@example.com",
        "password": "Secret1",
    }
    data.update(overrides)
    return data


def test_hr_create_intern_valid_email():
    payload = InternCreateRequest(**_base(email="  B@Example.COM "))
    assert payload.email == "b@example.com"


def test_hr_create_intern_rejects_invalid_email():
    with pytest.raises(ValidationError):
        InternCreateRequest(**_base(email="not-an-email"))


def test_hr_create_intern_rejects_empty_email():
    with pytest.raises(ValidationError):
        InternCreateRequest(**_base(email=""))
