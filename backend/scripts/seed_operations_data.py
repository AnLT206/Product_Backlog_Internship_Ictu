"""
Seed full operational data for HR, Mentor, and Intern operations:
- Interns & InternProfiles
- ProgramMembers (assigned to mentor id=4)
- InternTasks
- InternReports
- InternEvaluations
- InternAttendances
- InternContractRecords
- UniversityReports
"""

import sys
from datetime import datetime
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.intern_task import InternTask
from app.models.intern_report import InternReport
from app.models.intern_evaluation import InternEvaluation
from app.models.intern_attendance import InternAttendance
from app.models.intern_contract_record import InternContractRecord
from app.models.university_report import UniversityReport
from app.utils.hash_password import hash_password

def seed_all():
    db = SessionLocal()
    try:
        intern_role = db.query(Role).filter(Role.name == "intern").first()
        mentor = db.query(User).filter(User.email == "mentor@ictu.edu.vn").first()
        hr = db.query(User).filter(User.email == "hr@ictu.edu.vn").first()
        program = db.query(InternshipProgram).first()

        if not intern_role or not mentor:
            print("Missing intern role or mentor")
            return

        intern_data = [
            ("TTS0001", "tts01@student.ictu.edu.vn", "Hoàng Anh TTS", "pending", "Khoa CNTT", "Công nghệ thông tin", "0912345001", 3.2),
            ("TTS0002", "binh.nv@ictu.edu.vn", "Nguyễn Văn Bình", "active", "Khoa CNTT", "Công nghệ thông tin", "0912345002", 3.6),
            ("TTS0003", "dung.vu@ictu.edu.vn", "Dũng Vũ", "active", "Khoa KTPM", "Kỹ thuật phần mềm", "0912345003", 3.8),
            ("TTS0004", "nam.lh@ictu.edu.vn", "Lê Hoàng Nam", "active", "Khoa ATTT", "An toàn thông tin", "0912345004", 3.5),
            ("TTS0005", "trang.pm@ictu.edu.vn", "Phạm Minh Trang", "active", "Khoa HTTT", "Hệ thống thông tin", "0912345005", 3.7),
            ("TTS0006", "an.nv@ictu.edu.vn", "Nguyễn Văn An", "pending", "Khoa KTPM", "Kỹ thuật phần mềm", "0912345006", 3.3),
        ]

        created_interns = []
        for code, email, name, status, uni, major, phone, gpa in intern_data:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = db.query(User).filter(User.code == code).first()
            if not user:
                user = User(
                    code=code,
                    email=email,
                    password_hash=hash_password("User@123"),
                    full_name=name,
                    role_id=intern_role.id,
                    status=status
                )
                db.add(user)
                db.flush()
            else:
                user.full_name = name
                user.status = status
                user.code = code
                db.flush()

            # Profile
            profile = db.query(InternProfile).filter(InternProfile.user_id == user.id).first()
            if not profile:
                profile = InternProfile(
                    user_id=user.id,
                    status="approved" if status == "active" else "pending",
                    phone_number=phone,
                    university="ĐH Công nghệ Thông tin & TT (ICTU)",
                    major=major,
                    gpa=gpa,
                )
                db.add(profile)
            created_interns.append(user)

        db.flush()

        # Program members
        if program:
            for intern in created_interns:
                pm = db.query(ProgramMember).filter(
                    ProgramMember.program_id == program.id,
                    ProgramMember.intern_user_id == intern.id
                ).first()
                if not pm:
                    pm = ProgramMember(
                        program_id=program.id,
                        intern_user_id=intern.id,
                        mentor_user_id=mentor.id
                    )
                    db.add(pm)

        db.flush()

        # Seed Tasks for intern TTS0002 and TTS0003
        an = created_interns[1]
        dung = created_interns[2]

        if db.query(InternTask).count() == 0:
            tasks = [
                InternTask(
                    mentor_id=mentor.id,
                    intern_id=an.id,
                    title="Phát triển REST API Quản lý Hồ sơ Thực tập sinh",
                    description="Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.",
                    due_at="2026-10-02",
                    priority="high",
                    status="doing",
                    progress=70
                ),
                InternTask(
                    mentor_id=mentor.id,
                    intern_id=an.id,
                    title="Nghiên cứu tài liệu Software Specification v2.1",
                    description="Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.",
                    due_at="2026-09-24",
                    priority="medium",
                    status="done",
                    progress=100
                ),
                InternTask(
                    mentor_id=mentor.id,
                    intern_id=dung.id,
                    title="Viết Unit Test cho Service Chấm công & Phụ cấp",
                    description="Bao phủ 85% coverage các kịch bản chuẩn ngày công và phụ cấp theo quy chế.",
                    due_at="2026-10-05",
                    priority="high",
                    status="todo",
                    progress=20
                )
            ]
            db.add_all(tasks)

        # Seed Reports
        if db.query(InternReport).count() == 0:
            reports = [
                InternReport(
                    mentor_id=mentor.id,
                    intern_id=an.id,
                    week_title="Báo cáo Tuần 07 - Tích hợp JWT & Role-based Access",
                    period="16/09/2026 - 22/09/2026",
                    submitted_at="22/09/2026 17:30",
                    tasks_done="Hoàn thành module Auth, refresh token, phân quyền middleware cho 4 roles (admin, hr, mentor, intern).",
                    issues="Gặp lỗi CORS khi gọi từ Vite port 5173, đã cấu hình CORSMiddleware xử lý triệt để.",
                    self_assessment="Tốt (8.5/10)",
                    mentor_feedback="Code clean, tuân thủ đúng clean architecture. Tiếp tục tối ưu error handling.",
                    score=9.0,
                    status="reviewed"
                ),
                InternReport(
                    mentor_id=mentor.id,
                    intern_id=dung.id,
                    week_title="Báo cáo Tuần 08 - Kiểm thử Docker & Nginx Reverse Proxy",
                    period="23/09/2026 - 29/09/2026",
                    submitted_at="29/09/2026 21:15",
                    tasks_done="Đóng gói Docker multi-stage build cho Frontend, Nginx static serve và backend uvicorn.",
                    issues="Cần tối ưu thời gian build bundle của Vite.",
                    self_assessment="Xuất sắc (9.0/10)",
                    mentor_feedback=None,
                    score=None,
                    status="pending"
                )
            ]
            db.add_all(reports)

        # Seed Evaluations
        for intern in created_interns:
            ev = db.query(InternEvaluation).filter(InternEvaluation.intern_id == intern.id).first()
            if not ev:
                ev = InternEvaluation(
                    mentor_id=mentor.id,
                    intern_id=intern.id,
                    attendance_score=9.0,
                    tech_score=9.2 if intern.code in ["TTS0002", "TTS0003"] else 8.5,
                    report_score=8.8,
                    final_score=9.0 if intern.code in ["TTS0002", "TTS0003"] else 8.4,
                    letter_grade="A" if intern.code in ["TTS0002", "TTS0003"] else "B+",
                    mentor_note="Thái độ học hỏi chủ động, kỹ năng lập trình tốt, nắm bắt nhanh quy trình Agile/Scrum.",
                    status="verified"
                )
                db.add(ev)

        # Seed Attendances
        for intern in created_interns:
            att = db.query(InternAttendance).filter(InternAttendance.intern_id == intern.id).first()
            if not att:
                is_full = intern.code in ["TTS0002", "TTS0004"]
                att = InternAttendance(
                    intern_id=intern.id,
                    month="09/2026",
                    standard_days=22,
                    actual_days=22 if is_full else 21,
                    late_days=0 if is_full else 1,
                    leave_days=0,
                    allowance=2500000 if is_full else 2380000,
                    status="approved" if is_full else "pending",
                    status_label="Đã duyệt chi trả" if is_full else "Chờ duyệt phụ cấp"
                )
                db.add(att)

        # Seed Contract Records
        for i, intern in enumerate(created_interns[:5]):
            code = f"HĐTT-2026-00{i+1}"
            con = db.query(InternContractRecord).filter(InternContractRecord.contract_code == code).first()
            if not con:
                signed_all = i < 3
                con = InternContractRecord(
                    intern_id=intern.id,
                    contract_code=code,
                    doc_type="Thỏa thuận thực tập 3 bên & NDA",
                    signed_intern=True,
                    signed_company=True,
                    signed_ictu=signed_all,
                    cert=f"ICTU-CA Verified (2{8-i}/09)",
                    status="completed" if signed_all else "pending",
                    status_label="Đã hoàn tất ký số 3 bên" if signed_all else "Chờ ICTU ký số"
                )
                db.add(con)

        # Seed University Reports
        if db.query(UniversityReport).count() == 0:
            u_reports = [
                UniversityReport(
                    code="BC-TN-2026-ICTU",
                    title="Báo cáo tiếp nhận Thực tập sinh Kỳ 1 (2026-2027)",
                    target="Phòng Quản lý Đào tạo & Khoa CNTT - ICTU",
                    submit_date="05/08/2026",
                    total_students=15,
                    signer="Trần Thị Mai (HR Manager)",
                    cert="ICTU-CA e-Seal #99482",
                    status="sent",
                    status_label="Đã tiếp nhận & Lưu kho"
                ),
                UniversityReport(
                    code="BC-GK-2026-ICTU",
                    title="Báo cáo tiến độ & Đánh giá năng lực giữa kỳ (Tuần 06)",
                    target="Khoa Công nghệ Thông tin & Khoa KTPM - ICTU",
                    submit_date="15/09/2026",
                    total_students=15,
                    signer="Lê Tuấn Hùng (Tech Lead / Mentor)",
                    cert="ICTU-CA e-Seal #99831",
                    status="sent",
                    status_label="Đã thẩm tra xong"
                ),
                UniversityReport(
                    code="BC-DIEM-2026-ICTU",
                    title="Bảng điểm tổng hợp Đánh giá Học phần Thực tập Tốt nghiệp",
                    target="Phòng Đào tạo Đại học ICTU (Cổng edusoft.ictu.edu.vn)",
                    submit_date="Chưa chốt (Dự kiến 25/10/2026)",
                    total_students=15,
                    signer="Hội đồng Doanh nghiệp & Mentor",
                    cert="Chờ ký số cuối kỳ",
                    status="pending",
                    status_label="Đang tổng hợp tuần 8/12"
                ),
                UniversityReport(
                    code="BC-KS-2026-ICTU",
                    title="Phiếu khảo sát mức độ hài lòng của Doanh nghiệp về SV ICTU",
                    target="Trung tâm Hợp tác Doanh nghiệp & Khởi nghiệp ICTU",
                    submit_date="20/09/2026",
                    total_students=15,
                    signer="Ban Giám đốc & HR",
                    cert="ICTU-CA e-Seal #99620",
                    status="sent",
                    status_label="Đã hoàn tất gửi"
                )
            ]
            db.add_all(u_reports)

        db.commit()
        print("Successfully seeded all operational DB records!")

    except Exception as e:
        db.rollback()
        print("Error during seed:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
