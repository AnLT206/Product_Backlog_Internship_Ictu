import bcrypt


def hash_password(plain_password: str) -> str:
    if not isinstance(plain_password, str) or not plain_password.strip():
        raise ValueError("Mật khẩu không được rỗng.")

    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not isinstance(plain_password, str) or not plain_password:
        return False

    if not isinstance(hashed_password, str) or not hashed_password:
        return False

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except ValueError:
        return False
