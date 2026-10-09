# -*- coding: utf-8 -*-
"""
Script chuẩn hóa và làm sạch toàn bộ dữ liệu CSDL theo yêu cầu:
1. 1 Admin: admin@ictu.edu.vn (Admin@123)
2. 1 HR: hr@ictu.edu.vn (Hr@123)
3. 2 Mentors:
   - mentor@ictu.edu.vn (Trần Hoàng Quân, Dept KTPM)
   - mentor2@ictu.edu.vn (Phạm Quốc Hướng, Dept QA/QC)
4. 5 Tài khoản TTS (với 5 bộ dữ liệu khác nhau, sạch và chuẩn):
   - TTS 1: intern@ictu.edu.vn (Nguyễn Văn An, ĐH ICTU, CNTT, GPA 3.65) - Có mentor Quân, 2 tasks, báo cáo, chấm công, đánh giá, hợp đồng.
   - TTS 2: tts02@student.ictu.edu.vn (Lê Hoàng Nam, ĐH ICTU, KTPM, GPA 3.55) - Có mentor Hướng, 2 tasks, báo cáo, chấm công, đánh giá, hợp đồng.
   - TTS 3: tts03@student.ictu.edu.vn (Trần Thị Mai Phương, ĐH ICTU, HTTT, GPA 3.72) - Có mentor Quân, 2 tasks, báo cáo, chấm công, đánh giá, hợp đồng.
   - TTS 4: tts04@student.ictu.edu.vn (Hoàng Minh Đức, ĐH ICTU, ATTT, GPA 3.60) - Có mentor Hướng, 2 tasks, báo cáo, chấm công, đánh giá, hợp đồng.
   - TTS 5: tts05@student.ictu.edu.vn (Vũ Hải Yến, ĐH ICTU, KHMT, GPA 3.80) - Vừa được HR duyệt, cấp quyền TTS, DỮ LIỆU ĐANG TRỐNG, chờ phân công mentor và giao việc!
5. 1 Ứng viên:
   - ungvien@ictu.edu.vn (Nguyễn Thu Hà, status: pending) - Luồng ứng viên độc lập, chờ HR duyệt.
6. Nhật ký hệ thống (System Logs):
   - Lưu lại lịch sử hoạt động có ngày giờ [YYYY-MM-DD HH:mm:ss] ở cuối.
"""

from datetime import datetime, date
from sqlalchemy import text
from app.core.database import SessionLocal, engine
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
from app.models.document import Document
from app.models.system_log import SystemLog
from app.utils.hash_password import hash_password


def run_clean_and_seed():
    db = SessionLocal()
    try:
        print("[1] Đảm bảo cấu trúc cột description trong system_logs...")
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE system_logs ADD COLUMN description VARCHAR(500) NULL"))
                conn.commit()
                print("  -> Đã thêm cột description vào bảng system_logs.")
            except Exception:
                # Đã có cột
                pass

        print("[2] Làm sạch dữ liệu phụ thuộc cũ...")
        db.query(SystemLog).delete()
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

        print("[3] Thiết lập Roles & Departments...")
        roles = {r.name: r for r in db.query(Role).all()}
        admin_role = roles.get("admin")
        hr_role = roles.get("hr")
        mentor_role = roles.get("mentor")
        intern_role = roles.get("intern")

        if not admin_role or not hr_role or not mentor_role or not intern_role:
            raise RuntimeError("Thiếu các roles cần thiết trong CSDL.")

        dept_sw = db.query(Department).filter(Department.id == 1).first()
        if not dept_sw:
            dept_sw = Department(
                id=1,
                name="Kỹ thuật phần mềm (Software Engineering)",
                description="Phát triển Backend, Frontend, Cloud & DevOps",
            )
            db.add(dept_sw)

        dept_qa = db.query(Department).filter(Department.id == 2).first()
        if not dept_qa:
            dept_qa = Department(
                id=2,
                name="Kiểm thử chất lượng (QA/QC)",
                description="Kiểm thử tự động và đảm bảo chất lượng hệ thống",
            )
            db.add(dept_qa)
        db.commit()

        print("[4] Khởi tạo các tài khoản nhân sự quản trị...")
        # 1 Admin
        admin = User(
            id=1,
            code="AD0001",
            email="admin@ictu.edu.vn",
            password_hash=hash_password("Admin@123"),
            full_name="Quản trị viên Hệ thống (Admin)",
            role_id=admin_role.id,
            status="active",
        )
        db.add(admin)

        # 1 HR
        hr = User(
            id=2,
            code="HR0001",
            email="hr@ictu.edu.vn",
            password_hash=hash_password("Hr@123"),
            full_name="Trần Thị Mai (HR Manager)",
            role_id=hr_role.id,
            status="active",
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
            status="active",
        )
        db.add(mentor1)

        mentor2 = User(
            id=4,
            code="MT0002",
            email="mentor2@ictu.edu.vn",
            password_hash=hash_password("Mentor@123"),
            full_name="Phạm Quốc Hướng",
            role_id=mentor_role.id,
            status="active",
        )
        db.add(mentor2)

        print("[5] Khởi tạo 5 tài khoản TTS và 1 tài khoản Ứng viên...")
        # TTS 1 (đã có sẵn)
        tts1 = User(
            id=5,
            code="TTS0001",
            email="intern@ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Nguyễn Văn An",
            role_id=intern_role.id,
            status="active",
        )
        db.add(tts1)

        # TTS 2 ("Lê Hoàng Nam")
        tts2 = User(
            id=6,
            code="TTS0002",
            email="tts02@student.ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Lê Hoàng Nam",
            role_id=intern_role.id,
            status="active",
        )
        db.add(tts2)

        # Ứng viên (pending - luồng ứng viên độc lập)
        applicant = User(
            id=7,
            code="UV0001",
            email="ungvien@ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Nguyễn Thu Hà",
            role_id=intern_role.id,
            status="pending",
        )
        db.add(applicant)

        # TTS 3 (mới tạo 1)
        tts3 = User(
            id=8,
            code="TTS0003",
            email="tts03@student.ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Trần Thị Mai Phương",
            role_id=intern_role.id,
            status="active",
        )
        db.add(tts3)

        # TTS 4 (mới tạo 2)
        tts4 = User(
            id=9,
            code="TTS0004",
            email="tts04@student.ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Hoàng Minh Đức",
            role_id=intern_role.id,
            status="active",
        )
        db.add(tts4)

        # TTS 5 (mới tạo 3 - Vừa được HR duyệt, DỮ LIỆU ĐANG TRỐNG, chờ phân công mentor và giao việc)
        tts5 = User(
            id=10,
            code="TTS0005",
            email="tts05@student.ictu.edu.vn",
            password_hash=hash_password("Intern@123"),
            full_name="Vũ Hải Yến",
            role_id=intern_role.id,
            status="active",
        )
        db.add(tts5)
        db.commit()

        print("[6] Tạo UserProfiles và InternProfiles...")
        # Profiles cho Mentors và HR
        db.add(UserProfile(user_id=mentor1.id, position="Senior Tech Lead", phone_number="0988.111.222", department_id=1))
        db.add(UserProfile(user_id=mentor2.id, position="QA Lead Engineer", phone_number="0988.333.444", department_id=2))
        db.add(UserProfile(user_id=hr.id, position="HR Manager", phone_number="0988.555.666", department_id=1))

        # InternProfiles cho 5 TTS và 1 Ứng viên
        db.add(InternProfile(
            user_id=tts1.id,
            status="approved",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="Công nghệ thông tin",
            academic_year="2022 - 2026",
            gpa=3.65,
            phone_number="0912.345.001",
        ))

        db.add(InternProfile(
            user_id=tts2.id,
            status="approved",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="Kỹ thuật phần mềm",
            academic_year="2022 - 2026",
            gpa=3.55,
            phone_number="0912.345.002",
        ))

        db.add(InternProfile(
            user_id=applicant.id,
            status="pending",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="Công nghệ thông tin",
            academic_year="2022 - 2026",
            gpa=3.45,
            phone_number="0987.654.321",
        ))

        db.add(InternProfile(
            user_id=tts3.id,
            status="approved",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="Hệ thống thông tin",
            academic_year="2023 - 2027",
            gpa=3.72,
            phone_number="0912.345.003",
        ))

        db.add(InternProfile(
            user_id=tts4.id,
            status="approved",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="An toàn thông tin",
            academic_year="2022 - 2026",
            gpa=3.60,
            phone_number="0912.345.004",
        ))

        db.add(InternProfile(
            user_id=tts5.id,
            status="approved",
            university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
            major="Khoa học máy tính",
            academic_year="2023 - 2027",
            gpa=3.80,
            phone_number="0912.345.005",
        ))
        db.commit()

        print("[7] Thiết lập các Kỳ thực tập (Internship Programs)...")
        prog1 = db.query(InternshipProgram).filter(InternshipProgram.id == 1).first()
        if not prog1:
            prog1 = InternshipProgram(id=1, name="Kỳ thực tập Mùa Thu 2026 (Batch 01)", semester="Q1/2026", max_interns=25, status="closed")
            db.add(prog1)

        prog2 = db.query(InternshipProgram).filter(InternshipProgram.id == 2).first()
        if not prog2:
            prog2 = InternshipProgram(id=2, name="Chương trình Thực tập Công nghệ Số & AI - Đợt 2/2026", semester="Q2/2026", max_interns=25, status="closed")
            db.add(prog2)

        prog3 = db.query(InternshipProgram).filter(InternshipProgram.id == 3).first()
        if not prog3:
            prog3 = InternshipProgram(id=3, name="Kỳ thực tập Kỹ thuật Phần mềm & AI Doanh nghiệp 2026", semester="Q3/2026", max_interns=30, status="open")
            db.add(prog3)
        else:
            prog3.status = "open"
        db.commit()

        print("[8] Phân bổ Mentor và thành viên kỳ thực tập...")
        # TTS 1 & TTS 3 phân công cho Mentor 1 (Trần Hoàng Quân)
        # TTS 2 & TTS 4 phân công cho Mentor 2 (Phạm Quốc Hướng)
        # TTS 5: CHƯA PHÂN CÔNG MENTOR (mentor_user_id=None) - Đúng yêu cầu chờ HR phân công!
        db.add(ProgramMember(program_id=prog3.id, intern_user_id=tts1.id, mentor_user_id=mentor1.id))
        db.add(ProgramMember(program_id=prog3.id, intern_user_id=tts2.id, mentor_user_id=mentor2.id))
        db.add(ProgramMember(program_id=prog3.id, intern_user_id=tts3.id, mentor_user_id=mentor1.id))
        db.add(ProgramMember(program_id=prog3.id, intern_user_id=tts4.id, mentor_user_id=mentor2.id))
        db.add(ProgramMember(program_id=prog3.id, intern_user_id=tts5.id, mentor_user_id=None))
        db.commit()

        print("[9] Khởi tạo Nhiệm vụ (Sprint Tasks) cho các TTS đã có Mentor...")
        # TTS 1 (Nguyễn Văn An)
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            title="Phát triển REST API Quản lý Hồ sơ Thực tập sinh",
            description="Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.",
            due_at="2026-10-15",
            priority="high",
            status="doing",
            progress=75,
        ))
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            title="Nghiên cứu tài liệu Software Specification v2.1",
            description="Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.",
            due_at="2026-09-24",
            priority="medium",
            status="done",
            progress=100,
        ))

        # TTS 2 (Lê Hoàng Nam)
        db.add(InternTask(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            title="Thiết kế kịch bản Kiểm thử tự động (Automation Testing)",
            description="Xây dựng bộ test suite hồi quy End-to-End cho các API luồng xác thực và phân quyền.",
            due_at="2026-10-18",
            priority="high",
            status="doing",
            progress=60,
        ))
        db.add(InternTask(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            title="Xây dựng bộ Test Suite hồi quy End-to-End với PyTest",
            description="Kiểm thử tích hợp các endpoint phân quyền Role-Based Access Control.",
            due_at="2026-09-28",
            priority="medium",
            status="done",
            progress=100,
        ))

        # TTS 3 (Trần Thị Mai Phương)
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts3.id,
            title="Thiết kế và tối ưu hóa giao diện người dùng Responsive",
            description="Xây dựng Layout và Theme chuẩn UI/UX theo Design System của ICTU.",
            due_at="2026-10-01",
            priority="high",
            status="done",
            progress=100,
        ))
        db.add(InternTask(
            mentor_id=mentor1.id,
            intern_id=tts3.id,
            title="Tích hợp luồng nộp báo cáo tuần và điểm danh trực tuyến",
            description="Kết nối giao diện nộp báo cáo tuần với REST API Backend.",
            due_at="2026-10-20",
            priority="medium",
            status="doing",
            progress=80,
        ))

        # TTS 4 (Hoàng Minh Đức)
        db.add(InternTask(
            mentor_id=mentor2.id,
            intern_id=tts4.id,
            title="Rà soát lỗ hổng bảo mật Web API theo chuẩn OWASP Top 10",
            description="Phân tích kiểm thử xâm nhập lỗ hổng bảo mật API và kiểm tra header CORS.",
            due_at="2026-10-22",
            priority="high",
            status="doing",
            progress=40,
        ))
        db.add(InternTask(
            mentor_id=mentor2.id,
            intern_id=tts4.id,
            title="Cấu hình kiểm tra Header CORS và Rate Limiting",
            description="Bảo đảm an toàn mạng và giới hạn số lượng request bất thường.",
            due_at="2026-09-30",
            priority="medium",
            status="done",
            progress=100,
        ))
        # TTS 5 (Vũ Hải Yến) KHÔNG CÓ TASK NÀO (TRỐNG)
        db.commit()

        print("[10] Khởi tạo Báo cáo tuần (Weekly Reports)...")
        db.add(InternReport(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            week_title="Báo cáo Tuần 07 - Tích hợp JWT & Role-based Access",
            period="16/09/2026 - 22/09/2026",
            submitted_at="22/09/2026 17:30",
            tasks_done="Hoàn thành module Auth, refresh token, phân quyền middleware cho các roles.",
            issues="Đã cấu hình CORSMiddleware xử lý triệt để lỗi cross-origin.",
            self_assessment="Tốt (8.5/10)",
            mentor_feedback="Mã nguồn rõ ràng, xử lý bảo mật tốt.",
            score=9.0,
            status="graded",
        ))

        db.add(InternReport(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            week_title="Báo cáo Tuần 07 - Kiểm thử tích hợp hệ thống",
            period="16/09/2026 - 22/09/2026",
            submitted_at="22/09/2026 17:45",
            tasks_done="Hoàn thành bộ test suite hồi quy với PyTest, độ bao phủ 88%.",
            issues="Cần tối ưu thời gian chạy test fixture.",
            self_assessment="Khá (8.0/10)",
            mentor_feedback="Độ bao phủ test tốt, cần bổ sung thêm edge cases.",
            score=8.5,
            status="graded",
        ))

        db.add(InternReport(
            mentor_id=mentor1.id,
            intern_id=tts3.id,
            week_title="Báo cáo Tuần 07 - Hoàn thiện UI Dashboard",
            period="16/09/2026 - 22/09/2026",
            submitted_at="22/09/2026 18:00",
            tasks_done="Hoàn thiện toàn bộ các component giao diện người dùng theo chuẩn responsive.",
            issues="Không có khó khăn lớn.",
            self_assessment="Xuất sắc (9.5/10)",
            mentor_feedback="Giao diện chuyên nghiệp, tuân thủ chặt chẽ design system.",
            score=9.5,
            status="graded",
        ))

        db.add(InternReport(
            mentor_id=mentor2.id,
            intern_id=tts4.id,
            week_title="Báo cáo Tuần 07 - Báo cáo an ninh và kiểm thử thâm nhập",
            period="16/09/2026 - 22/09/2026",
            submitted_at="22/09/2026 18:15",
            tasks_done="Phát hiện và vá 2 điểm yếu bảo mật trong cấu hình CORS và cookie flags.",
            issues="Cần bổ sung thêm công cụ quét tự động trong pipeline CI.",
            self_assessment="Tốt (8.8/10)",
            mentor_feedback="Báo cáo chi tiết, phát hiện được các điểm yếu bảo mật tiềm ẩn.",
            score=8.8,
            status="graded",
        ))
        db.commit()

        print("[11] Khởi tạo Bảng điểm Đánh giá năng lực cuối kỳ...")
        db.add(InternEvaluation(
            mentor_id=mentor1.id,
            intern_id=tts1.id,
            attendance_score=9.5,
            tech_score=9.0,
            report_score=9.0,
            final_score=9.2,
            letter_grade="A",
            mentor_note="Sinh viên nắm vững kiến thức backend, chủ động hoàn thành các Sprint đúng hạn.",
            status="verified",
        ))

        db.add(InternEvaluation(
            mentor_id=mentor2.id,
            intern_id=tts2.id,
            attendance_score=9.0,
            tech_score=8.5,
            report_score=8.5,
            final_score=8.7,
            letter_grade="B+",
            mentor_note="Thực hiện kiểm thử cẩn thận, có tư duy logic tốt.",
            status="verified",
        ))

        db.add(InternEvaluation(
            mentor_id=mentor1.id,
            intern_id=tts3.id,
            attendance_score=9.5,
            tech_score=9.5,
            report_score=9.5,
            final_score=9.5,
            letter_grade="A",
            mentor_note="Kỹ năng frontend xuất sắc, giao diện người dùng đẹp và tương tác mượt mà.",
            status="verified",
        ))

        db.add(InternEvaluation(
            mentor_id=mentor2.id,
            intern_id=tts4.id,
            attendance_score=8.5,
            tech_score=9.0,
            report_score=8.8,
            final_score=8.8,
            letter_grade="A",
            mentor_note="Nắm vững các nguyên tắc an ninh bảo mật, giải quyết vấn đề hiệu quả.",
            status="verified",
        ))
        db.commit()

        print("[12] Khởi tạo Chấm công & Phụ cấp...")
        db.add(InternAttendance(
            intern_id=tts1.id,
            month="10/2026",
            standard_days=22,
            actual_days=22,
            late_days=0,
            leave_days=0,
            allowance=2500000,
            base_allowance=2000000,
            lunch_allowance=500000,
            status="approved",
            status_label="Đã duyệt chi phụ cấp",
        ))

        db.add(InternAttendance(
            intern_id=tts2.id,
            month="10/2026",
            standard_days=22,
            actual_days=21,
            late_days=0,
            leave_days=1,
            allowance=2400000,
            base_allowance=1900000,
            lunch_allowance=500000,
            status="approved",
            status_label="Đã duyệt chi phụ cấp",
        ))

        db.add(InternAttendance(
            intern_id=tts3.id,
            month="10/2026",
            standard_days=22,
            actual_days=22,
            late_days=0,
            leave_days=0,
            allowance=2500000,
            base_allowance=2000000,
            lunch_allowance=500000,
            status="approved",
            status_label="Đã duyệt chi phụ cấp",
        ))

        db.add(InternAttendance(
            intern_id=tts4.id,
            month="10/2026",
            standard_days=22,
            actual_days=20,
            late_days=2,
            leave_days=0,
            allowance=2300000,
            base_allowance=1800000,
            lunch_allowance=500000,
            status="approved",
            status_label="Đã duyệt chi phụ cấp",
        ))
        db.commit()

        print("[13] Khởi tạo Hợp đồng tiếp nhận số...")
        for tts_user in [tts1, tts2, tts3, tts4]:
            db.add(InternContractRecord(
                intern_id=tts_user.id,
                contract_code=f"HD-{tts_user.code}-2026",
                doc_type="Thỏa thuận thực tập 3 bên & NDA",
                signed_intern=True,
                signed_company=True,
                signed_ictu=True,
                cert="ICTU-CA Verified (Chữ ký số hợp lệ)",
                status="completed",
                status_label="Đã hoàn tất ký 3 bên",
                start_date="01/10/2026",
                end_date="31/12/2026",
                allowance="2.500.000 đ/tháng",
                department="Trung tâm Phát triển Phần mềm ICTU",
            ))
        db.commit()

        print("[13.5] Khởi tạo tài liệu CV cho Ứng viên và các TTS...")
        db.query(Document).delete()
        # CV ứng viên (pending - luồng ứng viên chờ duyệt)
        db.add(Document(
            user_id=applicant.id,
            doc_type="cv",
            file_name="CV_NguyenThuHa_CNTT.pdf",
            file_path="uploads/cv/CV_NguyenThuHa_CNTT.pdf",
            status="pending",
        ))
        # CV cho 4 TTS chính thức (approved)
        db.add(Document(
            user_id=tts1.id,
            doc_type="cv",
            file_name="CV_NguyenVanAn_CNTT.pdf",
            file_path="uploads/cv/CV_NguyenVanAn_CNTT.pdf",
            status="approved",
        ))
        db.add(Document(
            user_id=tts2.id,
            doc_type="cv",
            file_name="CV_LeHoangNam_KTPM.pdf",
            file_path="uploads/cv/CV_LeHoangNam_KTPM.pdf",
            status="approved",
        ))
        db.add(Document(
            user_id=tts3.id,
            doc_type="cv",
            file_name="CV_TranThiMaiPhuong_HTTT.pdf",
            file_path="uploads/cv/CV_TranThiMaiPhuong_HTTT.pdf",
            status="approved",
        ))
        db.add(Document(
            user_id=tts4.id,
            doc_type="cv",
            file_name="CV_HoangMinhDuc_ATTT.pdf",
            file_path="uploads/cv/CV_HoangMinhDuc_ATTT.pdf",
            status="approved",
        ))
        db.commit()

        print("[14] Khởi tạo Nhật ký hệ thống (System Logs) chuẩn kèm ngày giờ [YYYY-MM-DD HH:mm:ss] ở cuối...")
        logs_data = [
            (admin.id, "admin", "CREATE", "POST", "/api/admin/users", "admin/users", 201, "Admin tạo mới tài khoản cán bộ quản trị [2026-10-09 08:00:00]"),
            (admin.id, "admin", "UPDATE", "PUT", "/api/admin/roles/matrix", "admin/roles", 200, "Admin cập nhật ma trận phân quyền RBAC [2026-10-09 08:30:15]"),
            (hr.id, "hr", "CREATE", "POST", "/api/hr/programs", "hr/programs", 201, "HR tạo mới kỳ thực tập Kỹ thuật Phần mềm & AI Doanh nghiệp 2026 [2026-10-09 09:15:20]"),
            (applicant.id, "intern", "CREATE", "POST", "/api/documents/upload", "documents/upload", 201, "Tải lên / cập nhật tài liệu hồ sơ [2026-10-09 10:20:45]"),
            (hr.id, "hr", "UPDATE", "POST", "/api/hr/interns/10/approve", "hr/interns", 200, "HR phê duyệt tiếp nhận hồ sơ thực tập sinh [2026-10-09 11:05:10]"),
            (hr.id, "hr", "UPDATE", "POST", "/api/hr/assign-mentor", "hr/assign-mentor", 200, "HR phân công Mentor phụ trách thực tập sinh [2026-10-09 13:40:22]"),
            (hr.id, "hr", "UPDATE", "POST", "/api/hr/assign-mentor", "hr/assign-mentor", 200, "HR phân công Mentor phụ trách thực tập sinh [2026-10-09 13:45:00]"),
            (mentor1.id, "mentor", "CREATE", "POST", "/api/mentor/tasks", "mentor/tasks", 201, "Mentor giao nhiệm vụ Sprint cho thực tập sinh [2026-10-09 14:15:30]"),
            (mentor2.id, "mentor", "CREATE", "POST", "/api/mentor/tasks", "mentor/tasks", 201, "Mentor giao nhiệm vụ Sprint cho thực tập sinh [2026-10-09 14:20:10]"),
            (tts1.id, "intern", "CREATE", "POST", "/api/intern/reports", "intern/reports", 201, "Thực tập sinh nộp báo cáo tuần [2026-10-09 17:00:00]"),
            (tts2.id, "intern", "CREATE", "POST", "/api/intern/reports", "intern/reports", 201, "Thực tập sinh nộp báo cáo tuần [2026-10-09 17:15:00]"),
            (mentor1.id, "mentor", "UPDATE", "POST", "/api/mentor/reports/1/grade", "mentor/reports", 200, "Mentor chấm điểm và phản hồi báo cáo tuần [2026-10-09 18:30:45]"),
            (mentor2.id, "mentor", "UPDATE", "POST", "/api/mentor/reports/2/grade", "mentor/reports", 200, "Mentor chấm điểm và phản hồi báo cáo tuần [2026-10-09 18:45:20]"),
            (hr.id, "hr", "CREATE", "POST", "/api/hr/contracts", "hr/contracts", 201, "HR tạo / phát hành hợp đồng tiếp nhận thực tập [2026-10-09 19:10:00]"),
            (tts1.id, "intern", "UPDATE", "POST", "/api/contracts/sign", "contracts/sign", 200, "Thực tập sinh ký hợp đồng thực tập số [2026-10-09 20:00:15]"),
        ]

        for user_id, role, action, method, path, res, sc, desc in logs_data:
            db.add(SystemLog(
                user_id=user_id,
                role=role,
                action=action,
                method=method,
                path=path,
                resource=res,
                ip_address="192.168.1.10",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
                status_code=sc,
                description=desc,
                created_at=datetime.strptime(desc.split("[")[-1].rstrip("]"), "%Y-%m-%d %H:%M:%S"),
            ))
        db.commit()

        print("[✓] THÀNH CÔNG: Đã làm sạch và chuẩn hóa toàn bộ dữ liệu CSDL hệ thống!")
        print("  - Admin: admin@ictu.edu.vn (Admin@123)")
        print("  - HR: hr@ictu.edu.vn (Hr@123)")
        print("  - Mentors: mentor@ictu.edu.vn (Trần Hoàng Quân), mentor2@ictu.edu.vn (Phạm Quốc Hướng)")
        print("  - 5 TTS: TTS1 (Nguyễn Văn An), TTS2 (Lê Hoàng Nam), TTS3 (Trần Thị Mai Phương), TTS4 (Hoàng Minh Đức), TTS5 (Vũ Hải Yến - Trống)")
        print("  - 1 Ứng viên: ungvien@ictu.edu.vn (Nguyễn Thu Hà - Pending)")

    except Exception as e:
        db.rollback()
        print(f"[!] Lỗi khi thực hiện seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_clean_and_seed()
