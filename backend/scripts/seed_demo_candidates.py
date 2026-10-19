"""
Script tạo các hồ sơ ứng viên thực tập mới (Pending) để demo quy trình:
1. HR vào xem CV
2. HR bấm Phê duyệt hoặc Từ chối
3. Phát hành hợp đồng & sinh viên đăng nhập ký nhận
"""

import sys
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timezone

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.intern_profile import InternProfile
from app.models.document import Document
from app.utils.hash_password import hash_password

DEMO_CANDIDATES = [
    {
        "email": "hoanganh@student.ictu.edu.vn",
        "full_name": "Đỗ Hoàng Anh",
        "code": "DTC26001",
        "major": "Kỹ thuật phần mềm",
        "gpa": Decimal("3.68"),
        "phone": "0981234001",
        "cv_name": "CV_DoHoangAnh_SoftwareEng.pdf",
        "summary": "Sinh viên K20 Kỹ thuật phần mềm ICTU, thành thạo React, FastAPI, Docker. Có kinh nghiệm làm dự án đồ án tốt nghiệp xuất sắc.",
    },
    {
        "email": "thuylinh@student.ictu.edu.vn",
        "full_name": "Vũ Thùy Linh",
        "code": "DTC26002",
        "major": "Trí tuệ nhân tạo & Khoa học dữ liệu",
        "gpa": Decimal("3.82"),
        "phone": "0981234002",
        "cv_name": "CV_VuThuyLinh_AI_Data.pdf",
        "summary": "Sinh viên K20 AI & Data Science ICTU, GPA 3.82. Đạt giải Ba Olympic Tin học sinh viên, có kinh nghiệm với PyTorch, OpenCV, LLMs.",
    },
    {
        "email": "tuankiet@student.ictu.edu.vn",
        "full_name": "Phạm Tuấn Kiệt",
        "code": "DTC26003",
        "major": "An toàn thông tin",
        "gpa": Decimal("3.55"),
        "phone": "0981234003",
        "cv_name": "CV_PhamTuanKiet_Security.pdf",
        "summary": "Sinh viên K20 An toàn thông tin ICTU, am hiểu bảo mật ứng dụng Web, kiểm thử thâm nhập (Pentest OWASP) và mạng máy tính.",
    },
]

def seed_demo_candidates():
    db = SessionLocal()
    sys.stdout.reconfigure(encoding="utf-8")
    print("=== BẮT ĐẦU TẠO DỮ LIỆU ỨNG VIÊN DEMO ===")

    intern_role = db.query(Role).filter(Role.name == "intern").first()
    if not intern_role:
        print("Lỗi: Không tìm thấy vai trò 'intern'")
        return

    upload_dir = backend_dir / "uploads" / "intern_docs"
    upload_dir.mkdir(parents=True, exist_ok=True)

    created_users = []
    pwd_hash = hash_password("Intern@123")

    for cand in DEMO_CANDIDATES:
        user = db.query(User).filter(User.email == cand["email"]).first()
        if not user:
            user = User(
                email=cand["email"],
                full_name=cand["full_name"],
                code=cand["code"],
                password_hash=pwd_hash,
                role_id=intern_role.id,
                status="pending",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"+ Đã tạo tài khoản mới: {user.email} (ID: {user.id})")
        else:
            user.full_name = cand["full_name"]
            user.code = cand["code"]
            user.status = "pending"
            user.password_hash = pwd_hash
            db.commit()
            print(f"* Đã cập nhật tài khoản: {user.email} (ID: {user.id}) sang trạng thái Pending")

        # Cập nhật / tạo InternProfile
        profile = db.query(InternProfile).filter(InternProfile.user_id == user.id).first()
        if not profile:
            profile = InternProfile(
                user_id=user.id,
                status="pending",
                university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
                major=cand["major"],
                academic_year="2022 - 2026",
                gpa=cand["gpa"],
                phone_number=cand["phone"],
                address="Thành phố Thái Nguyên",
            )
            db.add(profile)
        else:
            profile.status = "pending"
            profile.major = cand["major"]
            profile.gpa = cand["gpa"]
            profile.phone_number = cand["phone"]
            profile.university = "Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)"

        db.commit()

        # Tạo file CV mẫu trên đĩa
        cv_disk_name = f"{user.id}_cv_{cand['cv_name']}"
        cv_path = upload_dir / cv_disk_name
        cv_content = (
            f"========================================================\n"
            f"          HỒ SƠ ỨNG TUYỂN THỰC TẬP DOANH NGHIỆP\n"
            f"========================================================\n\n"
            f"Họ và tên: {cand['full_name']}\n"
            f"Mã sinh viên: {cand['code']}\n"
            f"Email: {cand['email']}\n"
            f"Số điện thoại: {cand['phone']}\n"
            f"Trường: Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)\n"
            f"Chuyên ngành: {cand['major']}\n"
            f"Điểm trung bình tích lũy (GPA): {cand['gpa']}/4.0\n"
            f"Niên khóa: 2022 - 2026 (Sinh viên năm cuối)\n\n"
            f"MỤC TIÊU NGHỀ NGHIỆP:\n"
            f"{cand['summary']}\n\n"
            f"KỸ NĂNG CHUYÊN MÔN:\n"
            f"- Ngôn ngữ & Framework: Python, JavaScript, React, FastAPI, Node.js, SQL.\n"
            f"- Công cụ & Hệ thống: Git, Docker, Postman, Linux, VSCode.\n"
            f"- Kỹ năng mềm: Làm việc nhóm, giao tiếp, tự nghiên cứu tài liệu kỹ thuật.\n\n"
            f"CAM KẾT:\n"
            f"Em cam kết dành toàn bộ thời gian thực tập theo đúng kế hoạch của Doanh nghiệp,\n"
            f"chấp hành nghiêm túc quy chế bảo mật thông tin và nội quy làm việc.\n\n"
            f"Thái Nguyên, ngày {datetime.now(timezone.utc).strftime('%d/%m/%Y')}\n"
            f"Người làm đơn\n"
            f"{cand['full_name']}\n"
        )
        cv_path.write_text(cv_content, encoding="utf-8")

        # Tạo / cập nhật Document record
        doc = (
            db.query(Document)
            .filter(Document.user_id == user.id, Document.doc_type == "cv")
            .first()
        )
        if not doc:
            doc = Document(
                user_id=user.id,
                doc_type="cv",
                file_name=cand["cv_name"],
                file_path=str(cv_path),
                status="pending",
            )
            db.add(doc)
        else:
            doc.file_name = cand["cv_name"]
            doc.file_path = str(cv_path)
            doc.status = "pending"
            doc.review_note = None

        db.commit()

        created_users.append({
            "id": user.id,
            "name": cand["full_name"],
            "email": cand["email"],
            "code": cand["code"],
            "major": cand["major"],
            "gpa": str(cand["gpa"]),
            "cv": cand["cv_name"],
        })

    db.close()
    print("=== HOÀN TẤT TẠO ỨNG VIÊN DEMO THÀNH CÔNG ===")
    return created_users

if __name__ == "__main__":
    seed_demo_candidates()
