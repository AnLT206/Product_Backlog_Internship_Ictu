from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from app.schemas.hrm_sync import HrmPersonnelItem


class HrmDataMapper:
    """
    Xử lý chuyển đổi dữ liệu (Data Mapping) từ các hệ thống HRM bên thứ 3 (FastHRM, ERP, Excel, Webhook).
    Chuẩn hóa email, họ tên, số điện thoại VN, số CCCD, ngày sinh, chức danh và phân loại vai trò.
    """

    ROLE_KEYWORDS_MAP: dict[str, str] = {
        # Mentor
        "mentor": "mentor",
        "huong_dan": "mentor",
        "huấn luyện viên": "mentor",
        "huan luyen vien": "mentor",
        "người hướng dẫn": "mentor",
        "nguoi huong dan": "mentor",
        "giảng viên hướng dẫn": "mentor",
        "giang vien huong dan": "mentor",
        "tech lead": "mentor",
        "lead developer": "mentor",
        "team lead": "mentor",
        "supervisor": "mentor",
        "tutor": "mentor",
        "chuyên viên hướng dẫn": "mentor",
        "chuyen vien huong dan": "mentor",
        # HR
        "hr": "hr",
        "nhân sự": "hr",
        "nhan su": "hr",
        "quản lý nhân sự": "hr",
        "quan ly nhan su": "hr",
        "tuyển dụng": "hr",
        "tuyen dung": "hr",
        "recruiter": "hr",
        "talent acquisition": "hr",
        "hr specialist": "hr",
        "cán bộ quản lý": "hr",
        "can bo quan ly": "hr",
        # Intern
        "intern": "intern",
        "thực tập sinh": "intern",
        "thuc tap sinh": "intern",
        "tts": "intern",
        "sinh viên": "intern",
        "sinh vien": "intern",
        "trainee": "intern",
        "ứng viên": "intern",
        "ung vien": "intern",
        # Admin
        "admin": "admin",
        "quản trị viên": "admin",
        "quan tri vien": "admin",
        "administrator": "admin",
    }

    STATUS_MAP: dict[str, str] = {
        "active": "active",
        "hoat_dong": "active",
        "hoạt động": "active",
        "đang làm việc": "active",
        "dang lam viec": "active",
        "1": "active",
        "true": "active",
        "enabled": "active",
        "inactive": "inactive",
        "nghi_viec": "inactive",
        "nghỉ việc": "inactive",
        "tạm dừng": "inactive",
        "tam dung": "inactive",
        "0": "inactive",
        "false": "inactive",
        "disabled": "inactive",
        "pending": "pending",
        "chờ duyệt": "pending",
        "cho duyet": "pending",
        "đang xử lý": "pending",
    }

    @staticmethod
    def normalize_email(val: Any) -> str:
        if not val or not isinstance(val, str):
            raise ValueError("Email không được để trống.")
        clean_email = val.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise ValueError(f"Định dạng email '{val}' không hợp lệ.")
        return clean_email

    @staticmethod
    def normalize_name(val: Any) -> str:
        if not val or not isinstance(val, str):
            raise ValueError("Họ và tên không được để trống.")
        # Chuẩn hóa khoảng trắng thừa và Title Case
        words = [w for w in val.strip().split() if w]
        if not words:
            raise ValueError("Họ và tên không hợp lệ.")
        return " ".join(words)

    @staticmethod
    def normalize_phone(val: Any) -> str | None:
        if not val:
            return None
        raw = str(val).strip()
        # Loại bỏ các ký tự phân tách: khoảng trắng, dấu chấm, dấu gạch ngang, ngoặc đơn
        digits = re.sub(r"[^\d+]", "", raw)
        if digits.startswith("+84"):
            digits = "0" + digits[3:]
        elif digits.startswith("84") and len(digits) >= 11:
            digits = "0" + digits[2:]

        # Kiểm tra độ dài số điện thoại VN (10 số, bắt đầu bằng 0)
        if re.match(r"^0\d{9}$", digits):
            return digits
        # Cho phép lưu số có 9-11 chữ số nếu có trường hợp đặc biệt
        if 9 <= len(digits) <= 12 and digits.isdigit():
            return digits
        return digits if digits else None

    @staticmethod
    def normalize_cccd(val: Any) -> str | None:
        if not val:
            return None
        raw = str(val).strip()
        digits = re.sub(r"[^\d]", "", raw)
        # CCCD Việt Nam 12 số, CMND cũ 9 số
        if len(digits) in (9, 12):
            return digits
        return digits if digits else None

    @staticmethod
    def normalize_dob(val: Any) -> date | None:
        if not val:
            return None
        if isinstance(val, date) and not isinstance(val, datetime):
            return val
        if isinstance(val, datetime):
            return val.date()

        raw = str(val).strip()
        if not raw:
            return None

        # Hỗ trợ nhiều định dạng ngày phổ biến
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%Y/%m/%d",
            "%d.%m.%Y",
            "%Y%m%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%fZ",
        ]
        for fmt in formats:
            try:
                # Cắt chuỗi nếu có phần giờ ISO
                date_part = raw.split("T")[0] if "T" in raw else raw
                return datetime.strptime(date_part, fmt.split("T")[0]).date()
            except ValueError:
                continue

        return None

    @classmethod
    def normalize_role(cls, val: Any) -> str:
        if not val or not isinstance(val, str):
            return "mentor"
        clean = val.strip().lower()
        # Kiểm tra trực tiếp
        if clean in ("mentor", "hr", "intern", "admin"):
            return clean

        # Tra cứu theo từ điển từ khóa
        for keyword, mapped_role in cls.ROLE_KEYWORDS_MAP.items():
            if keyword in clean:
                return mapped_role

        return "mentor"

    @classmethod
    def normalize_status(cls, val: Any) -> str:
        if not val or not isinstance(val, str):
            return "active"
        clean = str(val).strip().lower()
        return cls.STATUS_MAP.get(clean, "active")

    @classmethod
    def map_record(cls, raw: dict[str, Any]) -> HrmPersonnelItem:
        """
        Ánh xạ một dictionary dữ liệu thô bất kỳ sang HrmPersonnelItem chuẩn.
        Hỗ trợ nhiều alias tên cột từ FastHRM, ERP, Excel, Google Sheets.
        """
        # 1. Email (bắt buộc)
        raw_email = (
            raw.get("email")
            or raw.get("mail")
            or raw.get("work_email")
            or raw.get("user_email")
            or raw.get("Email")
            or raw.get("EMAIL")
        )
        email = cls.normalize_email(raw_email)

        # 2. Họ và tên (bắt buộc)
        raw_name = (
            raw.get("full_name")
            or raw.get("name")
            or raw.get("fullname")
            or raw.get("ho_ten")
            or raw.get("ho_va_ten")
            or raw.get("Full Name")
            or raw.get("FullName")
        )
        # Hỗ trợ ghép first_name và last_name
        if not raw_name and (raw.get("first_name") or raw.get("last_name")):
            raw_name = f"{raw.get('last_name', '')} {raw.get('first_name', '')}".strip()
        full_name = cls.normalize_name(raw_name)

        # 3. Mã nhân sự / Mã TTS
        raw_code = (
            raw.get("employee_code")
            or raw.get("code")
            or raw.get("emp_id")
            or raw.get("staff_id")
            or raw.get("ma_nv")
            or raw.get("ma_tts")
            or raw.get("id_nv")
            or raw.get("Code")
        )
        employee_code = str(raw_code).strip() if raw_code else f"HRM{abs(hash(email)) % 1000000:06d}"

        # 4. Số điện thoại
        raw_phone = (
            raw.get("phone")
            or raw.get("phone_number")
            or raw.get("mobile")
            or raw.get("tel")
            or raw.get("sdt")
            or raw.get("dien_thoai")
        )
        phone = cls.normalize_phone(raw_phone)

        # 5. Vai trò
        raw_role = (
            raw.get("role")
            or raw.get("vai_tro")
            or raw.get("chuc_vu")
            or raw.get("position")
            or raw.get("user_type")
        )
        role = cls.normalize_role(raw_role)

        # 6. Phòng ban
        raw_dept = (
            raw.get("department_name")
            or raw.get("department")
            or raw.get("phong_ban")
            or raw.get("bo_phan")
            or raw.get("dept")
            or raw.get("don_vi")
        )
        department_name = str(raw_dept).strip() if raw_dept else None

        # 7. Vị trí / Chức danh công việc
        raw_pos = (
            raw.get("position")
            or raw.get("chuc_danh")
            or raw.get("vi_tri")
            or raw.get("title")
            or raw.get("job_title")
        )
        position = str(raw_pos).strip() if raw_pos else None

        # 8. Trạng thái
        raw_status = raw.get("status") or raw.get("trang_thai") or raw.get("state")
        status = cls.normalize_status(raw_status)

        # 9. Số CCCD / CMND
        raw_cccd = (
            raw.get("cccd")
            or raw.get("cmnd")
            or raw.get("id_card")
            or raw.get("citizen_id")
            or raw.get("so_cccd")
        )
        cccd = cls.normalize_cccd(raw_cccd)

        # 10. Ngày sinh
        raw_dob = (
            raw.get("dob")
            or raw.get("date_of_birth")
            or raw.get("ngay_sinh")
            or raw.get("birthdate")
        )
        dob = cls.normalize_dob(raw_dob)

        # 11. Trường Đại học & Chuyên ngành (dành cho TTS)
        university = (
            raw.get("university")
            or raw.get("truong_dai_hoc")
            or raw.get("truong")
        )
        major = (
            raw.get("major")
            or raw.get("chuyen_nganh")
            or raw.get("nganh_hoc")
        )

        return HrmPersonnelItem(
            employee_code=employee_code,
            full_name=full_name,
            email=email,
            phone=phone,
            role=role,
            department_name=department_name,
            position=position,
            status=status,
            cccd=cccd,
            dob=dob,
            university=str(university).strip() if university else None,
            major=str(major).strip() if major else None,
        )

    @classmethod
    def map_batch(
        cls, raw_list: list[dict[str, Any]]
    ) -> tuple[list[HrmPersonnelItem], list[dict[str, Any]]]:
        """
        Chuyển đổi danh sách bản ghi thô thành danh sách HrmPersonnelItem.
        Trả về: (danh_sách_thành_công, danh_sách_lỗi_kèm_nguyên_nhân).
        """
        valid_items: list[HrmPersonnelItem] = []
        errors: list[dict[str, Any]] = []

        for idx, item in enumerate(raw_list):
            try:
                mapped = cls.map_record(item)
                valid_items.append(mapped)
            except Exception as e:
                errors.append({
                    "index": idx,
                    "raw_data": item,
                    "error": str(e),
                })

        return valid_items, errors
