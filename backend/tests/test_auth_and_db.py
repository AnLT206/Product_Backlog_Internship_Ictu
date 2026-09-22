import os

import pymysql
import pytest
from authenticate_login import (
    authenticate_login,
    create_access_token,
    verify_access_token,
)
from hash_password import hash_password, verify_password


def test_hash_and_verify_password():
    hashed = hash_password("Secret123!")
    assert hashed != "Secret123!"
    assert verify_password("Secret123!", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_hash_password_rejects_empty():
    with pytest.raises(ValueError):
        hash_password("   ")


def test_create_and_verify_access_token():
    token = create_access_token(1, "intern")
    payload = verify_access_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["role"] == "intern"


def test_authenticate_login_success():
    password = "Secret123!"
    password_hash = hash_password(password)
    token = authenticate_login(password, 7, "intern", password_hash)
    assert token is not None
    payload = verify_access_token(token)
    assert payload["sub"] == "7"
    assert payload["role"] == "intern"


def test_authenticate_login_wrong_password():
    password_hash = hash_password("Secret123!")
    token = authenticate_login("wrong", 7, "intern", password_hash)
    assert token is None


def test_mysql_schema_and_connection():
    try:
        connection = pymysql.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "ictu"),
            password=os.getenv("DB_PASSWORD", "ictu"),
            database=os.getenv("DB_NAME", "ictu_internship"),
            charset="utf8mb4",
            connect_timeout=5,
        )
    except pymysql.MySQLError as exc:
        pytest.skip(f"MySQL chưa sẵn sàng: {exc}")

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
                """,
                (os.getenv("DB_NAME", "ictu_internship"),),
            )
            tables = {row[0] for row in cursor.fetchall()}
        assert {"roles", "users", "intern_profiles"}.issubset(tables)
    finally:
        connection.close()
