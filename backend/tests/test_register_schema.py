import pytest
from pydantic import ValidationError

from app.schemas.auth import InternRegisterRequest


def _base(**overrides):
    data = {
        "full_name": "Nguyen Van A",
        "email": "a@example.com",
        "password": "Secret1",
        "confirm_password": "Secret1",
    }
    data.update(overrides)
    return data


def test_register_valid_minimal():
    payload = InternRegisterRequest(**_base())
    assert payload.email == "a@example.com"
    assert payload.full_name == "Nguyen Van A"


def test_register_normalizes_email_and_name():
    payload = InternRegisterRequest(
        **_base(full_name="  Nguyen   Van  A  ", email="A@Example.COM")
    )
    assert payload.full_name == "Nguyen Van A"
    assert payload.email == "a@example.com"


def test_register_password_too_short():
    with pytest.raises(ValidationError) as exc:
        InternRegisterRequest(**_base(password="12345", confirm_password="12345"))
    assert "password" in str(exc.value).lower() or "6" in str(exc.value)


def test_register_password_mismatch():
    with pytest.raises(ValidationError) as exc:
        InternRegisterRequest(**_base(confirm_password="Other12"))
    assert "không khớp" in str(exc.value)


def test_register_invalid_email():
    with pytest.raises(ValidationError):
        InternRegisterRequest(**_base(email="not-an-email"))


def test_register_invalid_phone():
    with pytest.raises(ValidationError):
        InternRegisterRequest(**_base(phone_number="123"))


def test_register_valid_phone():
    payload = InternRegisterRequest(**_base(phone_number="0912345678"))
    assert payload.phone_number == "0912345678"


def test_register_has_no_role_field():
    """TTS register không cho chọn role — HR/mentor không đăng ký qua API này."""
    assert "role" not in InternRegisterRequest.model_fields
