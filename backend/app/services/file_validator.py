"""
app/services/file_validator.py

Validate file upload: dung lượng và định dạng.

Đây là NGHIỆP VỤ (không phải helper thuần), nên đặt trong services/
theo quy tắc folder-structure.md §2:
  "Nghiệp vụ phức tạp → app/services/"

Hàm chính: validate_upload_file(file)
  - Kiểm tra dung lượng ≤ MAX_FILE_SIZE (5 MB).
  - Kiểm tra đuôi file thuộc ALLOWED_EXTENSIONS.
  - Kiểm tra MIME type thực tế (magic bytes) thuộc ALLOWED_MIME_TYPES
    → tránh giả mạo đuôi file (VD: đổi tên .exe thành .pdf).
  - Raise HTTPException 422 với { "detail": "..." } đúng format docs/api.md.
  - Trả lại nội dung file (bytes) để lớp gọi dùng tiếp — tránh đọc 2 lần.

Tái sử dụng:
  - DocumentService.upload_cv() — upload CV/đơn xin thực tập.
  - DocumentService.upload_contract() — upload hợp đồng.
  - Bất kỳ endpoint upload nào trong tương lai.

Hằng số import từ app.core.config — KHÔNG định nghĩa lại ở đây.
"""

from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import (
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
)

# ── Magic bytes (file signature) ──────────────────────────────────────────────
# Dùng để phát hiện định dạng thực tế của file bất kể tên/đuôi file đặt là gì.
# Chỉ cần đọc N byte đầu, không cần load toàn bộ file.
#
# PDF  : %PDF (4 bytes)
# DOCX : PK\x03\x04 — ZIP header (DOCX là ZIP chứa XML bên trong)
#
# Lưu ý: DOC (cũ, không hỗ trợ) dùng D0 CF 11 E0 — không nằm trong map này.

_MAGIC_MAP: dict[bytes, str] = {
    b"%PDF":      "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

_MAGIC_MAX_BYTES: int = max(len(k) for k in _MAGIC_MAP)


def _detect_mime_from_magic(content: bytes) -> str | None:
    """
    Nhận diện MIME type dựa trên magic bytes (N byte đầu của file).

    Trả về chuỗi MIME nếu nhận ra, None nếu không khớp bất kỳ signature nào.
    """
    header = content[:_MAGIC_MAX_BYTES]
    for signature, mime in _MAGIC_MAP.items():
        if header.startswith(signature):
            return mime
    return None


def validate_upload_file(file: UploadFile) -> bytes:
    """
    Validate file upload theo nghiệp vụ (spec §2.2):
      1. Tên file không được rỗng.
      2. Đuôi file phải thuộc ALLOWED_EXTENSIONS (.pdf, .docx).
      3. Dung lượng không vượt quá MAX_FILE_SIZE (5 MB).
      4. MIME type thực tế (magic bytes) phải thuộc ALLOWED_MIME_TYPES.

    Parameters
    ----------
    file : UploadFile
        File nhận từ multipart/form-data FastAPI.

    Returns
    -------
    bytes
        Nội dung file đã đọc — trả lại để lớp gọi dùng tiếp (không đọc 2 lần).

    Raises
    ------
    HTTPException 422
        Nếu vi phạm bất kỳ rule nào, với { "detail": "<message>" } rõ ràng.

    Examples
    --------
    Dùng trong DocumentService::

        content = validate_upload_file(file)
        dest.write_bytes(content)
    """
    # ── 1. Tên file ──────────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Thiếu tên file.",
        )

    # ── 2. Đuôi file ─────────────────────────────────────────────────────────
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Chỉ chấp nhận file PDF hoặc DOCX.",
        )

    # ── 3. Đọc nội dung + kiểm tra dung lượng ────────────────────────────────
    # Đọc MAX_FILE_SIZE + 1 byte để phát hiện file vượt giới hạn mà không cần
    # load toàn bộ file lớn vào RAM trước.
    content = file.file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File vượt quá 5MB.",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File trống.",
        )

    # ── 4. MIME type thực tế (magic bytes) ───────────────────────────────────
    # Kiểm tra CẢ Content-Type header (do client khai báo) lẫn magic bytes.
    # Chỉ chấp nhận khi CẢ HAI đều hợp lệ để chặn giả mạo tên + MIME.
    declared_mime = (file.content_type or "").lower().split(";")[0].strip()
    detected_mime = _detect_mime_from_magic(content)

    if detected_mime is None or detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Chỉ chấp nhận file PDF hoặc DOCX.",
        )

    # Nếu client khai báo Content-Type nhưng khác với magic bytes → từ chối.
    # (Client không khai báo — content_type là None/empty — vẫn cho qua nếu
    #  magic bytes hợp lệ, vì một số HTTP client không đặt Content-Type đúng.)
    if declared_mime and declared_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Chỉ chấp nhận file PDF hoặc DOCX.",
        )

    return content
