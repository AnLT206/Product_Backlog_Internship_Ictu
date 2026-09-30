# -*- coding: utf-8 -*-
"""
Script chuẩn hóa và làm sạch toàn bộ dữ liệu CSDL theo yêu cầu:
- 1 Admin: admin@ictu.edu.vn (System Admin)
- 1 HR: hr@ictu.edu.vn (Trần Thị Mai)
- 2 Mentor:
    1. mentor@ictu.edu.vn (Trần Hoàng Quân - Kỹ thuật phần mềm)
    2. mentor2@ictu.edu.vn (Phạm Quốc Hướng - Kiểm thử chất lượng)
- 2 TTS (active):
    1. intern@ictu.edu.vn / TTS0001 (Nguyễn Văn Bình)
    2. tts02@student.ictu.edu.vn / TTS0002 (Lê Hoàng Nam)
- 1 Ứng viên (pending):
    1. ungvien@ictu.edu.vn / TTS0003 (Nguyễn Văn An)
"""

from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.intern_task import InternTask
from app.models.intern_report import InternReport
from app.models.intern_evaluation import InternEvaluation
from app.models.intern_attendance import InternAttendance
from app.models.intern_contract_record import InternContractRecord
from app.models.university_report import UniversityReport
from app.models.department import Department
from app.utils.hash_password import hash_password

def run_reset():
    db = SessionLocal()
    try:
        print("[1] Xóa các dữ liệu phụ thuộc cũ...")
        db.query(InternTask).delete()
        db.query(InternReport).delete()
        db.query(InternEvaluation).delete()
        db.query(InternAttendance).delete()
        db.query(InternContractRecord).delete()
        db.query(UniversityReport).delete()
        db.query(ProgramMember).delete()
        db.query(InternProfile).delete()
        db.query(UserProfile).delete()
        db.query(User).delete()
        db.commit()

        print("[2] Lấy thông tin Roles...")
        roles = {r.name: r for r in db.query(Role).all()}
        admin_role = roles["admin"]
        hr_role = roles["hr"]
        mentor_role = roles["mentor"]
        intern_role = roles["intern"]

        print("[3] Đảm bảo các phòng ban (Departments)...")
        dept_sw = db.query(Department).filter(Department.id == 1).first()
        if not dept_sw:
            dept_sw = Department(id=1, name="Kỹ thuật phần mềm (Software Engineering)", description="Phát triển Backend, Frontend, Mobile")
            db.add(dept_sw)

        dept_qa = db.query(Department).filter(Department.id == 2).first()
        if not dept_qa:
            dept_qa = Department(id=2, name="Kiểm thử chất lượng (QA/QC)", description="Kiểm thử tự động và đảm bảo chất lượng phần mềm")
            db.add(dept_qa)
        db.commit()

        print("[4] Tạo các tài khoản chuẩn...")
        # 1 Admin
        admin = User(
            id=1,
            code="AD0001",
            email="admin@ictu.edu.vn",
            password_hash=hash_password("Admin@123"),
            full_name="System Admin",
            role_id=admin_role.id,
            status="active"
        )
        db.add(admin)

        # 1 HR
        hr = User(
            id=2,
            code="HR0001",
            email="hr@ictu.edu.vn",
            password_hash=hash_password("Hr@123"),
            full_name="Trần Thị Mai",
            role_id=hr_role.id,
            status="active"
        )
        db.add(hr)

        # 2 Mentors
        mentor1 = User(
            id=3,
            code="MT0001",
            email="mentor@ictu.edu.vn",
            password_hash=hash_password("Mentor@123"),
            full_name="Trần Hoàng Quân",
            role_id=mentor_role.id,
            status="active"
        )
        db.add(mentor1)

        mentor2 = User(
            id=4,
            code="MT0002",
            email="mentor2@ictu.edu.vn",
            password_hash=hash_password("Mentor@123"),
            full_name="Phạm Quốc Hướng",
            role_id=mentor_role.id,
            status="active"
        )
        db.add(mentor2)

        # 2 TTS (active)
        tts1 = User(
            id=5,
            code="TTS0001",
            email="intern@ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Nguyễn Văn Bình",
            role_id=intern_role.id,
            status="active"
        )
        db.add(tts1)

        tts2 = User(
            id=6,
            code="TTS0002",
            email="tts02@student.ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Lê Hoàng Nam",
            role_id=intern_role.id,
            status="active"
        )
        db.add(tts2)

        # 1 Ứng viên (pending)
        applicant = User(
            id=7,
            code="TTS0003",
            email="ungvien@ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Nguyễn Văn An",
            role_id=intern_role.id,
            status="pending"
        )
        db.add(applicant)
        db.commit()

        print("[5] Tạo UserProfiles và InternProfiles...")
        # Profile cho Mentors có phòng ban
        db.add(UserProfile(user_id=mentor1.id, position="Senior Tech Lead", phone_number="0988.111.222", department_id=1))
        db.add(UserProfile(user_id=mentor2.id, position="QA Lead Engineer", phone_number="0988.333.444", department_id=2))
        db.add(UserProfile(user_id=hr.id, position="HR Manager", phone_number="0988.555.666", department_id=1))

        # Profile cho 2 TTS & 1 Ứng viên
        db.add(InternProfile(
            user_id=tts1.id,
            status="approved",
            university="ĐH Công nghệ Thông tin & TT (ICTU)",
            major="Công nghệ thông tin",
            academic_year="2022 - 2026",
            gpa=3.65,
            phone_number="0912.345.001"
        ))

        db.add(InternProfile(
            user_id=tts2.id,
            status="approved",
            university="ĐH Công nghệ Thông tin & TT (ICTU)",
            major="Kỹ thuật phần mềm",
            academic_year="2022 - 2026",
            gpa=3.50,
            phone_number="0912.345.002"
        ))

        db.add(InternProfile(
            user_id=applicant.id,
            status="pending",
            university="ĐH Công nghệ Thông tin & TT (ICTU)",
            major="Công nghệ thông tin",
            academic_year="2022 - 2026",
            gpa=3.55,
            phone_number="0987.654.321"
        ))
        db.commit()

        print("[6] Thiết lập Kỳ thực tập & Phân bổ ban đầu...")
        program = db.query(InternshipProgram).filter(InternshipProgram.id == 1).first()
        if not program:
            program = InternshipProgram(
                id=1,
                name="Chương trình Thực tập Doanh nghiệp - Đợt Mùa Thu Q3/2026 (K20, K21)",
                semester="Q3/2026",
                max_interns=30,
                status="open"
            )
            db.add(program)
            db.commit()

        # Ban đầu:
        # TTS1 (Nguyễn Văn Bình) phân công cho Mentor1 (Trần Hoàng Quân)
        # TTS2 (Lê Hoàng Nam) phân công cho Mentor2 (Phạm Quốc Hướng)
        # Ứng viên (Nguyễn Văn An) chưa có mentor
        db.add(ProgramMember(program_id=program.id, intern_user_id=tts1.id, mentor_user_id=mentor1.id))
        db.add(ProgramMember(program_id=program.id, intern_user_id=tts2.id, mentor_user_id=mentor2.id))
        db.add(ProgramMember(program_id=program.id, intern_user_id=applicant.id, mentor_user_id=None))
        db.commit()

        print("[7] Tạo dữ liệu mẫu Nhiệm vụ và Báo cáo cho 2 TTS...")
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            title="Phát triển REST API Quản lý Hồ sơ Thực tập sinh",
            description="Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.",
            due_at="2026-10-02",
            priority="high",
            status="doing",
            progress=70
        ))
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            title="Nghiên cứu tài liệu Software Specification v2.1",
            description="Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.",
            due_at="2026-09-24",
            priority="medium",
            status="done",
            progress=100
        ))
        db.add(InternTask(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            title="Thiết kế kịch bản Kiểm thử tự động (Automation Testing)",
            description="Xây dựng bộ test suite hồi quy End-to-End cho các API luồng xác thực và phân quyền.",
            due_at="2026-10-05",
            priority="high",
            status="doing",
            progress=50
        ))

        # Báo cáo
        db.add(InternReport(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            week_title="Báo cáo Tuần 07 - Tích hợp JWT & Role-based Access",
            period="16/09/2026 - 22/09/2026",
            submitted_at="22/09/2026 17:30",
            tasks_done="Hoàn thành module Auth, refresh token, phân quyền middleware cho 4 roles (admin, hr, mentor, intern).",
            issues="Gặp lỗi CORS khi gọi từ Vite port 5173, đã cấu hình CORSMiddleware xử lý triệt để.",
            self_assessment="Tốt (8.5/10)",
            mentor_feedback="Code clean, tuân thủ đúng clean architecture. Tiếp tục tối ưu error handling.",
            score=9.0,
            status="reviewed"
        ))

        # Đánh giá cuối kỳ
        db.add(InternEvaluation(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            attendance_score=9.0,
            tech_score=9.2,
            report_score=8.8,
            final_score=9.0,
            letter_grade="A",
            mentor_note="Thái độ học hỏi chủ động, kỹ năng lập trình tốt, nắm bắt nhanh quy trình Agile/Scrum.",
            status="verified"
        ))
        db.add(InternEvaluation(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            attendance_score=8.8,
            tech_score=8.5,
            report_score=8.6,
            final_score=8.6,
            letter_grade="B+",
            mentor_note="Cẩn thận, tỉ mỉ trong việc viết test case và phát hiện bug chính xác.",
            status="verified"
        ))

        # Chấm công & phụ cấp cho 2 TTS
        db.add(InternAttendance(
            intern_id=tts1.id,
            month="09/2026",
            standard_days=22,
            actual_days=22,
            late_days=0,
            leave_days=0,
            allowance=2500000,
            status="approved",
            status_label="Đã duyệt phụ cấp"
        ))
        db.add(InternAttendance(
            intern_id=tts2.id,
            month="09/2026",
            standard_days=22,
            actual_days=21,
            late_days=1,
            leave_days=0,
            allowance=2400000,
            status="approved",
            status_label="Đã duyệt phụ cấp"
        ))

        # Hợp đồng thực tập
        db.add(InternContractRecord(
            intern_id=tts1.id,
            contract_code="HDTT-2026-001",
            doc_type="Hợp đồng Thực tập & Cam kết Bảo mật (NDA)",
            signed_intern=True,
            signed_company=True,
            signed_ictu=True,
            cert="ICTU-CA Verified",
            status="completed",
            status_label="Đã hoàn tất 3 bên"
        ))
        db.add(InternContractRecord(
            intern_id=tts2.id,
            contract_code="HDTT-2026-002",
            doc_type="Hợp đồng Thực tập & Cam kết Bảo mật (NDA)",
            signed_intern=True,
            signed_company=True,
            signed_ictu=False,
            cert="ICTU-CA Pending",
            status="pending",
            status_label="Chờ xác nhận từ Trường"
        ))

        # Báo cáo gửi nhà trường
        db.add(UniversityReport(
            code="BC-NT-2026-Q3",
            title="Báo cáo Tiến độ & Kết quả Thực tập Đợt Q3/2026",
            target="Phòng Đào tạo & Ban HTDN - ĐH CNTT & TT (ICTU)",
            submit_date="28/09/2026",
            total_students=2,
            signer="Trần Thị Mai - HR Manager",
            cert="ICTU-EDUSIGN #8821",
            status="sent",
            status_label="Đã chuyển gửi"
        ))

        db.commit()
        print("✅ Hoàn tất thiết lập lại CSDL chuẩn: 1 Admin, 1 HR, 2 Mentor, 2 TTS, 1 Ứng viên!")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_reset()

