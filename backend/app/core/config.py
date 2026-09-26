from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# ─── Hằng số upload file ─────────────────────────────────────────────────────
# Định nghĩa 1 lần duy nhất ở đây — import ở bất kỳ service/route nào cần.
# Không hardcode rải rác trong từng hàm.
#
# Spec §2.2: "File upload: PDF/DOC/DOCX; max 5MB (thống nhất team)"
# Task hiện tại giới hạn: PDF và DOCX (không bao gồm DOC).
# Nếu nhóm quyết định thêm DOC, chỉ cần sửa 2 set dưới đây.

MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5 MB tính bằng byte

ALLOWED_EXTENSIONS: frozenset[str] = frozenset({".pdf", ".docx"})

# MIME type tương ứng — kiểm tra cả header Content-Type lẫn magic bytes
# để tránh giả mạo đuôi file.
ALLOWED_MIME_TYPES: frozenset[str] = frozenset({
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
})


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ICTU Internship"
    app_env: str = "development"
    debug: bool = True

    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "ictu_internship"
    db_user: str = "ictu"
    db_password: str = "ictu"

    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
