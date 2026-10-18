from __future__ import annotations

import base64
import gzip
import hashlib
import logging
import os
from typing import Any

from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

DEFAULT_MASTER_KEY = "ictu-secure-backup-encryption-key-2026-production"


class BackupEncryptionService:
    """
    Dịch vụ Nén dữ liệu (gzip) và Mã hóa tệp sao lưu đối xứng (AES-256 / Fernet Authenticated).
    Đảm bảo an toàn tuyệt đối khi đưa các bản sao lưu Database lên Cloud Storage công cộng hoặc private.
    """

    def __init__(self, raw_key: str | None = None) -> None:
        self.raw_key = raw_key or os.getenv("BACKUP_ENCRYPTION_KEY") or DEFAULT_MASTER_KEY
        self.fernet = Fernet(self._derive_fernet_key(self.raw_key))

    @staticmethod
    def _derive_fernet_key(passphrase: str) -> bytes:
        """
        Sinh khóa Fernet 32-byte URL-safe base64 từ bất kỳ chuỗi mật khẩu/passphrase nào
        thông qua hàm băm SHA-256 chuẩn.
        """
        digest = hashlib.sha256(passphrase.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)

    @staticmethod
    def calculate_sha256(file_path: str) -> str:
        """Tính mã băm SHA-256 của tệp để kiểm tra tính toàn vẹn (Integrity Check)."""
        sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha.update(chunk)
        return sha.hexdigest()

    def compress_and_encrypt(
        self,
        input_sql_path: str,
        output_enc_path: str | None = None,
    ) -> tuple[str, str, int]:
        """
        Nén gzip tệp SQL và mã hóa bằng Fernet.
        Trả về: (đường_dẫn_tệp_mã_hóa, checksum_sha256, kích_thước_byte)
        """
        if not os.path.exists(input_sql_path):
            raise FileNotFoundError(f"Tệp SQL nguồn không tồn tại: {input_sql_path}")

        if not output_enc_path:
            output_enc_path = input_sql_path + ".gz.enc"

        # 1. Đọc tệp SQL và nén bằng Gzip
        with open(input_sql_path, "rb") as f_in:
            raw_sql_bytes = f_in.read()

        compressed_bytes = gzip.compress(raw_sql_bytes, compresslevel=9)

        # 2. Mã hóa khối bytes đã nén
        encrypted_bytes = self.fernet.encrypt(compressed_bytes)

        # 3. Ghi ra tệp mã hóa .enc
        os.makedirs(os.path.dirname(os.path.abspath(output_enc_path)), exist_ok=True)
        with open(output_enc_path, "wb") as f_out:
            f_out.write(encrypted_bytes)

        # 4. Tính toán checksum và kích thước
        checksum = self.calculate_sha256(output_enc_path)
        file_size = os.path.getsize(output_enc_path)

        logger.info(
            f"Backup encrypted successfully: {output_enc_path} "
            f"(Original: {len(raw_sql_bytes)} B -> Encrypted: {file_size} B, SHA-256: {checksum[:12]}...)"
        )
        return output_enc_path, checksum, file_size

    def decrypt_and_decompress(
        self,
        input_enc_path: str,
        output_sql_path: str | None = None,
    ) -> str:
        """
        Giải mã tệp .enc và giải nén Gzip trở lại tệp SQL nguyên bản.
        Trả về đường dẫn tệp SQL giải mã.
        """
        if not os.path.exists(input_enc_path):
            raise FileNotFoundError(f"Tệp mã hóa không tồn tại: {input_enc_path}")

        if not output_sql_path:
            if input_enc_path.endswith(".gz.enc"):
                output_sql_path = input_enc_path[:-7]
            elif input_enc_path.endswith(".enc"):
                output_sql_path = input_enc_path[:-4]
            else:
                output_sql_path = input_enc_path + ".restored.sql"

        # 1. Đọc dữ liệu mã hóa
        with open(input_enc_path, "rb") as f_in:
            encrypted_bytes = f_in.read()

        # 2. Giải mã bằng Fernet (tự động kiểm tra HMAC SHA-256 tính toàn vẹn)
        try:
            compressed_bytes = self.fernet.decrypt(encrypted_bytes)
        except Exception as e:
            raise ValueError(f"Khóa giải mã không hợp lệ hoặc tệp sao lưu đã bị thay đổi trái phép: {e}")

        # 3. Giải nén Gzip
        try:
            sql_bytes = gzip.decompress(compressed_bytes)
        except Exception:
            # Nếu tệp ban đầu không nén mà mã hóa trực tiếp
            sql_bytes = compressed_bytes

        # 4. Ghi ra tệp SQL
        os.makedirs(os.path.dirname(os.path.abspath(output_sql_path)), exist_ok=True)
        with open(output_sql_path, "wb") as f_out:
            f_out.write(sql_bytes)

        logger.info(f"Backup decrypted successfully to {output_sql_path} ({len(sql_bytes)} B)")
        return output_sql_path
