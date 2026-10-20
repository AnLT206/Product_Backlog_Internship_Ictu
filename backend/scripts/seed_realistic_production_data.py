# -*- coding: utf-8 -*-
"""
Script làm sạch toàn bộ dữ liệu mẫu cũ và khởi tạo bộ dữ liệu thật, chuẩn hóa cho CSDL ICTU:
- 1 Admin: admin@ictu.edu.vn / Admin@123
- 1 HR: hr@ictu.edu.vn / Hr@123 (Trần Thị Mai)
- 2 Mentors:
    1. mentor@ictu.edu.vn / Mentor@123 (Trần Hoàng Quân - Senior Tech Lead KTPM)
    2. mentor2@ictu.edu.vn / Mentor@123 (Phạm Quốc Hướng - QA Lead Engineer)
- 5 Thực tập sinh chính thức (Active & Approved):
    1. intern@ictu.edu.vn / Intern@123 (Nguyễn Văn An - CNTT, K20-CNTT01)
    2. tts02@student.ictu.edu.vn / Intern@123 (Lê Hoàng Nam - KTPM, K20-KTPM01)
    3. tts03@student.ictu.edu.vn / Intern@123 (Trần Thị Mai Phương - HTTT, K21-HTTT01)
    4. tts04@student.ictu.edu.vn / Intern@123 (Hoàng Minh Đức - ATTT, K20-ATTT01)
    5. dvu14206vhd78@gmail.com / Intern@123 (Dũng Vũ - KTPM, K20-KTPM02)
- 1 Ứng viên (Pending - Chờ HR xét duyệt):
    1. ungvien@ictu.edu.vn / Intern@123 (Nguyễn Thu Hà - CNTT, K20-CNTT02)
- Kỳ thực tập chuẩn, Nhóm thực tập (Groups), Phân công Mentor (Dimensions),
  Lịch làm việc tuần (Weekly Work Schedules), Đơn nghỉ phép (Leave Requests),
  Nhiệm vụ (Tasks), Báo cáo (Reports), Chấm công (Attendance), Hợp đồng (Contracts),
  Tài liệu CV (Documents), Nhật ký (System Logs).
"""

from __future__ import annotations

import sys
from datetime import date, datetime, time, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models.department import Department
from app.models.document import Document
from app.models.intern_attendance import InternAttendance
from app.models.intern_contract_record import InternContractRecord
from app.models.intern_evaluation import InternEvaluation
from app.models.intern_profile import InternProfile
from app.models.intern_report import InternReport
from app.models.intern_task import InternTask
from app.models.internship_group import InternProfileDepartment, InternProfileGroup, InternshipGroup
from app.models.internship_program import InternshipProgram
from app.models.leave_request import LeaveRequest
from app.models.mentor_intern import MentorIntern
from app.models.notification import Notification
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.support_ticket import SupportTicket
from app.models.system_log import SystemLog
from app.models.task import Task
from app.models.university_report import UniversityReport
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.weekly_report import ReportFeedback, WeeklyReport
from app.models.weekly_work_schedule import WeeklyWorkSchedule
from app.models.work_shift import WorkShift
from app.utils.hash_password import hash_password


def run_seed_realistic():
    db: Session = SessionLocal()
    try:
        print("[1/14] Dọn dẹp dữ liệu cũ theo thứ tự ràng buộc khóa ngoại...")
        # Xóa các bảng phụ thuộc nhóm & phân công
        db.query(InternProfileGroup).delete()
        db.query(InternProfileDepartment).delete()
        db.query(InternshipGroup).delete()
        db.query(MentorIntern).delete()
        db.query(ProgramMember).delete()
        db.query(WeeklyWorkSchedule).delete()
        db.query(LeaveRequest).delete()
        db.query(Document).delete()
        db.query(ReportFeedback).delete()
        db.query(WeeklyReport).delete()
        db.query(InternReport).delete()
        db.query(Task).delete()
        db.query(InternTask).delete()
        db.query(InternEvaluation).delete()
        db.query(InternAttendance).delete()
        db.query(InternContractRecord).delete()
        db.query(UniversityReport).delete()
        db.query(SupportTicket).delete()
        db.query(SystemLog).delete()
        db.query(Notification).delete()
        db.query(InternProfile).delete()
        db.query(UserProfile).delete()
        db.query(User).delete()
        db.query(InternshipProgram).delete()
        db.commit()
        print("  -> Đã làm sạch toàn bộ dữ liệu mẫu cũ.")

        print("[2/14] Thiết lập các vai trò (Roles) chuẩn...")
        roles_data = [
            ("admin", "Quản trị viên toàn quyền hệ thống"),
            ("hr", "Cán bộ quản lý nhân sự & điều phối thực tập sinh"),
            ("mentor", "Người hướng dẫn chuyên môn và đánh giá thực tập sinh"),
            ("intern", "Thực tập sinh & ứng viên tham gia chương trình thực tập"),
        ]
        roles_dict: dict[str, Role] = {}
        for r_name, r_desc in roles_data:
            role_obj = db.query(Role).filter(Role.name == r_name).first()
            if not role_obj:
                role_obj = Role(name=r_name, description=r_desc)
                db.add(role_obj)
                db.flush()
            roles_dict[r_name] = role_obj
        db.commit()

        print("[3/14] Thiết lập danh mục Phòng ban chuyên môn (Departments)...")
        depts_data = [
            (1, "Kỹ thuật phần mềm (Software Engineering)", "Trung tâm Nghiên cứu & Phát triển Hệ thống Phần mềm Doanh nghiệp, Web, Mobile và Cloud Services"),
            (2, "Kiểm thử & Đảm bảo chất lượng (QA/QC)", "Bộ phận Kiểm thử tự động Automation Test, CI/CD, Bảo mật phần mềm và Đảm bảo tiêu chuẩn chất lượng"),
            (3, "Trí tuệ nhân tạo & Khoa học dữ liệu (AI & Data Science)", "Nghiên cứu ứng dụng Machine Learning, Deep Learning, Xử lý ảnh Computer Vision và Hệ thống gợi ý"),
            (4, "An toàn thông tin & Mạng máy tính (Cyber Security)", "Phòng An ninh mạng, Pentest, Phòng thủ hệ thống và Giám sát an toàn thông tin SOC"),
        ]
        for d_id, d_name, d_desc in depts_data:
            d_obj = db.query(Department).filter(Department.id == d_id).first()
            if not d_obj:
                d_obj = Department(id=d_id, name=d_name, description=d_desc)
                db.add(d_obj)
            else:
                d_obj.name = d_name
                d_obj.description = d_desc
        db.commit()

        print("[4/14] Khởi tạo tài khoản Quản trị, HR và Mentors...")
        # 1 Admin
        admin = User(
            id=1,
            code="AD0001",
            email="admin@ictu.edu.vn",
            password_hash=hash_password("Admin@123"),
            full_name="Quản trị viên Hệ thống (Admin)",
            role_id=roles_dict["admin"].id,
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
            role_id=roles_dict["hr"].id,
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
            role_id=roles_dict["mentor"].id,
            status="active",
        )
        db.add(mentor1)

        mentor2 = User(
            id=4,
            code="MT0002",
            email="mentor2@ictu.edu.vn",
            password_hash=hash_password("Mentor@123"),
            full_name="Phạm Quốc Hướng",
            role_id=roles_dict["mentor"].id,
            status="active",
        )
        db.add(mentor2)
        db.commit()

        # UserProfiles cho Mentors & HR
        db.add(UserProfile(user_id=mentor1.id, position="Senior Tech Lead", phone_number="0988.111.222", department_id=1))
        db.add(UserProfile(user_id=mentor2.id, position="QA Lead Engineer", phone_number="0988.333.444", department_id=2))
        db.add(UserProfile(user_id=hr.id, position="HR Manager", phone_number="0988.555.666", department_id=1))
        db.commit()

        print("[5/14] Khởi tạo 5 Thực tập sinh chính thức và 1 Ứng viên...")
        tts_list_data = [
            (5, "TTS0001", "intern@ictu.edu.vn", "Nguyễn Văn An", "active", "approved", "Công nghệ thông tin", "K20-CNTT01", 3.65, "0912.345.001"),
            (6, "TTS0002", "tts02@student.ictu.edu.vn", "Lê Hoàng Nam", "active", "approved", "Kỹ thuật phần mềm", "K20-KTPM01", 3.55, "0912.345.002"),
            (7, "UV0001", "ungvien@ictu.edu.vn", "Nguyễn Thu Hà", "pending", "pending", "Công nghệ thông tin", "K20-CNTT02", 3.45, "0987.654.321"),
            (8, "TTS0003", "tts03@student.ictu.edu.vn", "Trần Thị Mai Phương", "active", "approved", "Hệ thống thông tin", "K21-HTTT01", 3.72, "0912.345.003"),
            (9, "TTS0004", "tts04@student.ictu.edu.vn", "Hoàng Minh Đức", "active", "approved", "An toàn thông tin", "K20-ATTT01", 3.60, "0912.345.004"),
            (24, "TTS0005", "dvu14206vhd78@gmail.com", "Dũng Vũ", "active", "approved", "Kỹ thuật phần mềm", "K20-KTPM02", 3.68, "0912.345.005"),
        ]

        user_objects: dict[int, User] = {}
        intern_prof_objects: dict[int, InternProfile] = {}

        for u_id, u_code, u_email, u_name, u_status, prof_status, u_major, u_class, u_gpa, u_phone in tts_list_data:
            u_obj = User(
                id=u_id,
                code=u_code,
                email=u_email,
                password_hash=hash_password("Intern@123"),
                full_name=u_name,
                role_id=roles_dict["intern"].id,
                status=u_status,
            )
            db.add(u_obj)
            user_objects[u_id] = u_obj

            ip_obj = InternProfile(
                user_id=u_id,
                status=prof_status,
                university="Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)",
                major=u_major,
                academic_year="2022 - 2026",
                class_name=u_class,
                gpa=u_gpa,
                phone_number=u_phone,
            )
            db.add(ip_obj)
            intern_prof_objects[u_id] = ip_obj

        db.commit()

        print("[6/14] Thiết lập Kỳ thực tập thực tế (Internship Programs)...")
        prog1 = InternshipProgram(
            id=1,
            name="Kỳ thực tập Kỹ thuật Phần mềm & AI Doanh nghiệp 2026",
            department="Kỹ thuật phần mềm (Software Engineering)",
            description="Chương trình đào tạo chuyên sâu Frontend (React/Vite), Backend (FastAPI/Python), kiến trúc Microservices và quy trình Scrum.",
            start_date=date(2026, 7, 1),
            end_date=date(2026, 10, 31),
            max_interns=40,
            max_mentors=10,
            status="open",
        )
        db.add(prog1)

        prog2 = InternshipProgram(
            id=2,
            name="Chương trình Thực tập Chuyển đổi Số ICTU - Đợt 1/2026",
            department="Trí tuệ nhân tạo & Dữ liệu (AI & Data)",
            description="Chương trình nghiên cứu và phát triển giải pháp Trí tuệ nhân tạo & Khoa học dữ liệu ứng dụng chuyển đổi số.",
            start_date=date(2026, 1, 5),
            end_date=date(2026, 4, 30),
            max_interns=30,
            max_mentors=6,
            status="closed",
        )
        db.add(prog2)
        db.commit()

        print("[7/14] Thiết lập Nhóm thực tập theo Phòng ban (Internship Groups)...")
        group_dev = InternshipGroup(
            id=1,
            name="Nhóm Kỹ thuật Phần mềm (Software Dev)",
            code="GRP-KTPM01",
            department_id=1,
            program_id=prog1.id,
            description="Nhóm chuyên trách kiến trúc Microservices, RESTful API FastAPI và giao diện người dùng React/Vite.",
            max_members=20,
            status="active",
        )
        db.add(group_dev)

        group_qa = InternshipGroup(
            id=2,
            name="Nhóm Kiểm thử & Đảm bảo chất lượng (QA/QC)",
            code="GRP-QA01",
            department_id=2,
            program_id=prog1.id,
            description="Nhóm kiểm thử tự động Automation Testing, tích hợp CI/CD và kiểm thử hồi quy bảo mật hệ thống.",
            max_members=20,
            status="active",
        )
        db.add(group_qa)
        db.commit()

        # Gán thành viên vào Nhóm và Phòng ban qua InternProfile
        # Nhóm Dev: TTS 5 (leader), TTS 6 (member), TTS 8 (member), TTS 24 (member)
        # Nhóm QA: TTS 9 (leader)
        group_assignments = [
            (5, group_dev.id, "leader", 1),
            (6, group_dev.id, "member", 1),
            (8, group_dev.id, "member", 1),
            (24, group_dev.id, "member", 1),
            (9, group_qa.id, "leader", 2),
        ]
        for u_id, g_id, g_role, d_id in group_assignments:
            ip_id = intern_prof_objects[u_id].id
            db.add(InternProfileGroup(
                intern_profile_id=ip_id,
                group_id=g_id,
                role=g_role,
                status="active",
            ))
            db.add(InternProfileDepartment(
                intern_profile_id=ip_id,
                department_id=d_id,
            ))
        db.commit()

        print("[8/14] Phân công Mentor (ProgramMember, InternProfile, MentorIntern)...")
        # Mentor 1 (Trần Hoàng Quân - KTPM) -> Phụ trách: TTS 5 (An), TTS 8 (Phương), TTS 24 (Dũng)
        # Mentor 2 (Phạm Quốc Hướng - QA) -> Phụ trách: TTS 6 (Nam), TTS 9 (Đức)
        mentor_assignments = [
            (5, mentor1.id, "primary", "major", "Công nghệ thông tin"),
            (8, mentor1.id, "primary", "major", "Hệ thống thông tin"),
            (24, mentor1.id, "primary", "major", "Kỹ thuật phần mềm"),
            (6, mentor2.id, "primary", "major", "Kỹ thuật phần mềm"),
            (9, mentor2.id, "primary", "major", "An toàn thông tin"),
        ]

        for intern_id, m_id, r_type, dim_type, dim_val in mentor_assignments:
            # 1. ProgramMember
            db.add(ProgramMember(
                program_id=prog1.id,
                intern_user_id=intern_id,
                mentor_user_id=m_id,
                status="in_progress",
            ))
            # 2. InternProfile
            intern_prof_objects[intern_id].mentor_id = m_id
            # 3. MentorIntern
            db.add(MentorIntern(
                mentor_id=m_id,
                intern_id=intern_id,
                role_type=r_type,
                dimension_type=dim_type,
                dimension_value=dim_val,
                assigned_by_id=hr.id,
            ))
        db.commit()

        print("[9/14] Khởi tạo Nhiệm vụ Sprint (Sprint Tasks) có tiến độ thực tế...")
        tasks_data = [
            # TTS 5 (Nguyễn Văn An - Mentor Quân)
            (mentor1.id, 5, "Thiết kế REST API Quản lý Nhóm Thực tập sinh", "Phát triển các endpoint /api/hr/internship-groups và xử lý gán thành viên theo phòng ban.", "2026-10-25", "high", "doing", 75),
            (mentor1.id, 5, "Nghiên cứu tài liệu Thiết kế Kiến trúc Clean Architecture", "Đọc hiểu luồng xử lý Service Layer, Repository Pattern và chuẩn hóa DTO Schemas.", "2026-10-10", "medium", "done", 100),

            # TTS 6 (Lê Hoàng Nam - Mentor Hướng)
            (mentor2.id, 6, "Thiết kế kịch bản Kiểm thử tự động (Automation Testing)", "Xây dựng bộ test suite hồi quy End-to-End cho các API luồng xác thực và phân quyền RBAC.", "2026-10-26", "high", "doing", 60),
            (mentor2.id, 6, "Kiểm thử tải & Hiệu năng API với Locust / PyTest", "Đo lường thời gian đáp ứng và thông lượng truy cập của các module nghiệp vụ.", "2026-10-12", "medium", "done", 100),

            # TTS 8 (Trần Thị Mai Phương - Mentor Quân)
            (mentor1.id, 8, "Tối ưu hóa Truy vấn Cơ sở Dữ liệu & Indexing", "Phân tích Execution Plan, tạo Index tối ưu cho các bảng giao dịch chấm công và báo cáo.", "2026-10-28", "high", "doing", 70),
            (mentor1.id, 8, "Xây dựng Dashboard Báo cáo Tiến độ Đợt Thực tập", "Hiển thị biểu đồ phân bổ chuyên ngành, tỉ lệ hoàn thành nhiệm vụ và cảnh báo hạn chót.", "2026-10-14", "medium", "done", 100),

            # TTS 9 (Hoàng Minh Đức - Mentor Hướng)
            (mentor2.id, 9, "Rà soát Lỗ hổng Bảo mật Web theo tiêu chuẩn OWASP", "Kiểm tra các rủi ro Injection, Broken Authentication và rò rỉ dữ liệu qua API.", "2026-10-29", "high", "doing", 50),
            (mentor2.id, 9, "Triển khai Mã hóa Dữ liệu Sao lưu Cơ sở Dữ liệu", "Tích hợp thuật toán AES-256-Fernet và checksum SHA-256 cho bản ghi sao lưu hệ thống.", "2026-10-15", "medium", "done", 100),

            # TTS 24 (Dũng Vũ - Mentor Quân)
            (mentor1.id, 24, "Phát triển Phân hệ Chấm công và Quét mã QR", "Xây dựng tính năng check-in/check-out thời gian thực với định vị và ghi nhận lịch sử.", "2026-10-30", "high", "doing", 80),
            (mentor1.id, 24, "Tích hợp Giao thức Realtime Sync WebSocket/SSE", "Đồng bộ tức thời các thay đổi dữ liệu bảng điều khiển giữa HR, Mentor và TTS.", "2026-10-16", "medium", "done", 100),
        ]

        for m_id, i_id, title, desc, due, prio, st, prog in tasks_data:
            db.add(InternTask(
                mentor_id=m_id,
                intern_id=i_id,
                title=title,
                description=desc,
                due_at=due,
                priority=prio,
                status=st,
                progress=prog,
            ))
            # Đồng bộ cho bảng tasks (TaskService & /api/mentor/tasks)
            due_dt = datetime.strptime(due + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            db.add(Task(
                mentor_id=m_id,
                intern_id=i_id,
                title=title,
                description=desc,
                status=st,
                progress=prog,
                due_at=due_dt,
            ))
        db.commit()

        print("[10/14] Khởi tạo Báo cáo tuần & Đánh giá của Mentor...")
        reports_data = [
            (mentor1.id, 5, "Báo cáo Tuần 11 - Hoàn thiện Module Quản lý Nhóm", "14/10/2026 - 20/10/2026", "20/10/2026 17:30", "Đã viết xong CRUD nhóm thực tập, mapping quan hệ N-N với intern_profiles.", "Cần tối ưu cache để giảm query N+1.", "Tốt (8.8/10)", 9.0, "Bài làm rất tốt, code sạch sẽ, nắm vững kiến thức backend."),
            (mentor2.id, 6, "Báo cáo Tuần 11 - Xây dựng Suite Test Tự động", "14/10/2026 - 20/10/2026", "20/10/2026 17:45", "Viết hoàn chỉnh 15 test cases tích hợp cho luồng phân quyền và phê duyệt.", "Test chạy trên CI thỉnh thoảng bị timeout.", "Khá (8.2/10)", 8.5, "Kiểm thử bao phủ tốt các ca biên, tiếp tục phát huy."),
            (mentor1.id, 8, "Báo cáo Tuần 11 - Phân tích Hiệu năng Truy vấn", "14/10/2026 - 20/10/2026", "20/10/2026 17:15", "Tạo composite index cho bảng mentor_interns, giảm 65% thời gian query.", "Không có vướng mắc.", "Xuất sắc (9.2/10)", 9.2, "Kỹ năng tối ưu SQL rất chắc chắn, tài liệu giải trình rõ ràng."),
            (mentor2.id, 9, "Báo cáo Tuần 11 - Báo cáo Rà soát An ninh Phần mềm", "14/10/2026 - 20/10/2026", "20/10/2026 17:50", "Kiểm thử mã hóa AES-256 cho file backup, phát hiện 1 lỗ hổng CSRF nhỏ.", "Đã vá lỗ hổng với CORS middleware.", "Tốt (8.7/10)", 8.8, "Tư duy bảo mật tốt, đề xuất giải pháp vá lỗi kịp thời."),
            (mentor1.id, 24, "Báo cáo Tuần 11 - Module Chấm công & Lịch làm việc", "14/10/2026 - 20/10/2026", "20/10/2026 18:00", "Hoàn thành API weekly-schedules, hỗ trợ khóa lịch trước 3 ngày theo quy chế.", "Cần test thêm với múi giờ GMT+7.", "Xuất sắc (9.0/10)", 9.0, "Tiến độ rất nhanh, giao diện và API đồng bộ mượt mà."),
        ]

        for m_id, i_id, w_title, period, sub_at, t_done, issues, self_a, score, mentor_fb in reports_data:
            rep = InternReport(
                mentor_id=m_id,
                intern_id=i_id,
                week_title=w_title,
                period=period,
                submitted_at=sub_at,
                tasks_done=t_done,
                issues=issues,
                self_assessment=self_a,
                status="reviewed",
                score=score,
                mentor_feedback=mentor_fb,
            )
            db.add(rep)

            # Đồng bộ cho bảng weekly_reports (WeeklyReportService)
            wr = WeeklyReport(
                user_id=i_id,
                program_id=prog1.id,
                week_number=11,
                start_date=date(2026, 10, 14),
                end_date=date(2026, 10, 20),
                title=w_title,
                content=t_done,
                difficulties=issues,
                next_week_plan="Tiếp tục hoàn thiện các tính năng sprint tuần tới.",
                status="approved",
            )
            db.add(wr)
            db.flush()

            # Phản hồi đánh giá báo cáo tuần
            db.add(ReportFeedback(
                report_id=wr.id,
                mentor_id=m_id,
                score=score,
                comment=mentor_fb,
            ))

            # Đánh giá tổng hợp InternEvaluation
            db.add(InternEvaluation(
                mentor_id=m_id,
                intern_id=i_id,
                attendance_score=score,
                tech_score=score,
                report_score=score,
                final_score=score,
                letter_grade="A" if score >= 8.5 else "B+",
                mentor_note=mentor_fb,
                status="verified",
            ))
        db.commit()

        print("[11/14] Khởi tạo Bảng Chấm công và Hợp đồng thực tập số...")
        for i_id in [5, 6, 8, 9, 24]:
            user_obj = user_objects[i_id]
            # Chấm công tháng 10/2026
            db.add(InternAttendance(
                intern_id=i_id,
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

            # Hợp đồng tiếp nhận 3 bên
            db.add(InternContractRecord(
                intern_id=i_id,
                contract_code=f"HD-{user_obj.code}-2026",
                doc_type="Thỏa thuận thực tập 3 bên & Bảo mật thông tin (NDA)",
                signed_intern=True,
                signed_company=True,
                signed_ictu=True,
                cert="ICTU-CA Verified (Chữ ký số hợp lệ)",
                status="completed",
                status_label="Đã hoàn tất ký 3 bên",
                start_date="01/07/2026",
                end_date="31/10/2026",
                allowance="2.500.000 đ/tháng",
                department="Trung tâm Phần mềm & AI ICTU",
            ))
        db.commit()

        print("[12/14] Khởi tạo Hồ sơ Tài liệu & CV...")
        # 1 CV Ứng viên pending (chờ HR duyệt trên Dashboard)
        db.add(Document(
            user_id=7,
            doc_type="cv",
            file_name="CV_NguyenThuHa_CNTT.pdf",
            file_path="uploads/cv/CV_NguyenThuHa_CNTT.pdf",
            status="pending",
        ))

        # CV của các TTS chính thức đã được phê duyệt
        cv_files = [
            (5, "CV_NguyenVanAn_CNTT.pdf"),
            (6, "CV_LeHoangNam_KTPM.pdf"),
            (8, "CV_TranThiMaiPhuong_HTTT.pdf"),
            (9, "CV_HoangMinhDuc_ATTT.pdf"),
            (24, "CV_DungVu_KTPM.pdf"),
        ]
        for u_id, f_name in cv_files:
            db.add(Document(
                user_id=u_id,
                doc_type="cv",
                file_name=f_name,
                file_path=f"uploads/cv/{f_name}",
                status="approved",
            ))
        db.commit()

        print("[13/14] Khởi tạo Nhóm thực tập (Internship Groups), Cấu hình Ca (Work Shifts) & Lịch làm việc tuần...")
        # Đảm bảo nhóm thực tập
        g1 = db.query(InternshipGroup).filter(InternshipGroup.code == "GRP-KTPM01").first()
        if not g1:
            g1 = InternshipGroup(
                name="Nhóm Kỹ thuật Phần mềm (Software Dev)",
                code="GRP-KTPM01",
                department_id=1,
                program_id=1,
                leader_user_id=3,
                description="Nhóm chuyên trách Frontend React & Backend FastAPI",
                max_members=20,
                status="active",
            )
            db.add(g1)
            db.commit()
            db.refresh(g1)
        else:
            g1.program_id = 1
            g1.leader_user_id = 3
            db.commit()

        g2 = db.query(InternshipGroup).filter(InternshipGroup.code == "GRP-QA01").first()
        if not g2:
            g2 = InternshipGroup(
                name="Nhóm Kiểm thử & Đảm bảo chất lượng (QA/QC)",
                code="GRP-QA01",
                department_id=2,
                program_id=1,
                leader_user_id=4,
                description="Nhóm kiểm thử tự động Automation Testing và CI/CD",
                max_members=20,
                status="active",
            )
            db.add(g2)
            db.commit()
            db.refresh(g2)
        else:
            g2.program_id = 1
            g2.leader_user_id = 4
            db.commit()

        # Đảm bảo phân công thành viên TTS vào nhóm
        for u_id in [5, 6, 8, 24]:
            p = db.query(InternProfile).filter(InternProfile.user_id == u_id).first()
            if p:
                has_g = db.query(InternProfileGroup).filter(InternProfileGroup.intern_profile_id == p.id, InternProfileGroup.group_id == g1.id).first()
                if not has_g:
                    db.add(InternProfileGroup(intern_profile_id=p.id, group_id=g1.id, role="leader" if u_id == 5 else "member", status="active"))
                has_d = db.query(InternProfileDepartment).filter(InternProfileDepartment.intern_profile_id == p.id, InternProfileDepartment.department_id == 1).first()
                if not has_d:
                    db.add(InternProfileDepartment(intern_profile_id=p.id, department_id=1))
        p9 = db.query(InternProfile).filter(InternProfile.user_id == 9).first()
        if p9:
            has_g = db.query(InternProfileGroup).filter(InternProfileGroup.intern_profile_id == p9.id, InternProfileGroup.group_id == g2.id).first()
            if not has_g:
                db.add(InternProfileGroup(intern_profile_id=p9.id, group_id=g2.id, role="leader", status="active"))
            has_d = db.query(InternProfileDepartment).filter(InternProfileDepartment.intern_profile_id == p9.id, InternProfileDepartment.department_id == 2).first()
            if not has_d:
                db.add(InternProfileDepartment(intern_profile_id=p9.id, department_id=2))
        db.commit()

        # 1. Cấu hình ca làm việc chuẩn cho kỳ thực tập (SCRUM-172, SCRUM-173: Chuẩn 40 giờ/tuần)
        db.query(WorkShift).delete()
        s1 = WorkShift(
            program_id=1,
            group_id=None,
            group_name="Ca Sáng tiêu chuẩn (08:00 - 12:00)",
            shift_type="morning",
            start_time=time(8, 0, 0),
            end_time=time(12, 0, 0),
            days_of_week="2,3,4,5,6",
            flexible_minutes=15,
            is_active=True,
        )
        s2 = WorkShift(
            program_id=1,
            group_id=None,
            group_name="Ca Chiều tiêu chuẩn (13:30 - 17:30)",
            shift_type="afternoon",
            start_time=time(13, 30, 0),
            end_time=time(17, 30, 0),
            days_of_week="2,3,4,5,6",
            flexible_minutes=15,
            is_active=True,
        )
        db.add_all([s1, s2])
        db.commit()

        # 2. Sinh lịch thực tập thật theo nhóm cho toàn bộ TTS và Mentor (cả tháng 10/2026)
        db.query(WeeklyWorkSchedule).delete()
        db.commit()
        from app.services.weekly_schedule_service import WeeklyScheduleService
        WeeklyScheduleService(db).generate_schedules_from_group_shifts(
            program_id=1,
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, 31),
            created_by_id=hr.id,
        )

        # Đơn xin nghỉ phép mẫu
        db.add(LeaveRequest(
            user_id=5,
            request_code="NP-2026-001",
            intern_id=5,
            intern_name="Nguyễn Văn An",
            intern_code="TTS0001",
            intern_email="intern@ictu.edu.vn",
            leave_type="Nghỉ học môn thi tốt nghiệp",
            start_date="24/10/2026",
            end_date="24/10/2026",
            session="Ca sáng (08:00 - 12:00)",
            duration="0.5 ngày",
            reason="Trùng lịch thi kết thúc học phần chuyên đề tại trường Đại học ICTU",
            created_date="20/10/2026",
            status="pending",
            status_label="Chờ duyệt",
            approver="Chờ duyệt",
        ))

        db.add(LeaveRequest(
            user_id=6,
            request_code="NP-2026-002",
            intern_id=6,
            intern_name="Lê Hoàng Nam",
            intern_code="TTS0002",
            intern_email="tts02@student.ictu.edu.vn",
            leave_type="Khám sức khỏe định kỳ",
            start_date="15/10/2026",
            end_date="15/10/2026",
            session="Ca chiều (13:30 - 17:30)",
            duration="0.5 ngày",
            reason="Đi khám mắt định kỳ tại Bệnh viện Trường Đại học Y - Dược",
            created_date="14/10/2026",
            status="approved",
            status_label="Đã duyệt",
            approver="Trần Thị Mai (HR Manager)",
            feedback="Đã phê duyệt, chú ý giữ gìn sức khỏe và sắp xếp hoàn thành task tồn đọng.",
            reviewed_at="14/10/2026 15:30",
        ))
        db.commit()

        print("[14/14] Khởi tạo Nhật ký hệ thống (System Logs) chuẩn xác...")
        logs_data = [
            (admin.id, "admin", "CREATE", "POST", "/api/admin/users", "admin/users", 201, "Admin khởi tạo tài khoản cán bộ quản trị hệ thống [2026-10-18 08:00:00]"),
            (hr.id, "hr", "CREATE", "POST", "/api/hr/programs", "hr/programs", 201, "HR công bố Kỳ thực tập Kỹ thuật Phần mềm & AI Doanh nghiệp 2026 [2026-10-18 08:45:00]"),
            (hr.id, "hr", "CREATE", "POST", "/api/hr/internship-groups", "hr/internship-groups", 201, "HR thành lập Nhóm Kỹ thuật Phần mềm (Software Dev) [2026-10-18 09:15:00]"),
            (hr.id, "hr", "CREATE", "POST", "/api/hr/internship-groups", "hr/internship-groups", 201, "HR thành lập Nhóm Kiểm thử & Đảm bảo chất lượng (QA/QC) [2026-10-18 09:30:00]"),
            (hr.id, "hr", "UPDATE", "POST", "/api/hr/assign-mentor", "hr/assign-mentor", 200, "HR phân công Mentor Trần Hoàng Quân phụ trách nhóm KTPM [2026-10-18 10:00:00]"),
            (hr.id, "hr", "UPDATE", "POST", "/api/hr/assign-mentor", "hr/assign-mentor", 200, "HR phân công Mentor Phạm Quốc Hướng phụ trách nhóm QA/QC [2026-10-18 10:15:00]"),
            (mentor1.id, "mentor", "CREATE", "POST", "/api/mentor/tasks", "mentor/tasks", 201, "Mentor Trần Hoàng Quân giao nhiệm vụ Sprint cho Nguyễn Văn An [2026-10-18 11:00:00]"),
            (user_objects[5].id, "intern", "CREATE", "POST", "/api/intern/reports", "intern/reports", 201, "TTS Nguyễn Văn An nộp báo cáo tuần 11 [2026-10-20 17:30:00]"),
            (mentor1.id, "mentor", "UPDATE", "POST", "/api/mentor/reports/1/grade", "mentor/reports", 200, "Mentor Trần Hoàng Quân chấm điểm báo cáo tuần (9.0/10) [2026-10-20 18:30:00]"),
        ]

        for u_id, role, action, method, path, res, sc, desc in logs_data:
            db.add(SystemLog(
                user_id=u_id,
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

        print("\n=======================================================")
        print("✓ HOÀN TẤT KHỞI TẠO DỮ LIỆU THẬT THÀNH CÔNG 100%!")
        print("=======================================================")
        print("Tài khoản hệ thống sẵn sàng:")
        print("  1. Admin:   admin@ictu.edu.vn          / Admin@123")
        print("  2. HR:      hr@ictu.edu.vn             / Hr@123     (Trần Thị Mai)")
        print("  3. Mentor:  mentor@ictu.edu.vn         / Mentor@123 (Trần Hoàng Quân)")
        print("  4. Mentor2: mentor2@ictu.edu.vn        / Mentor@123 (Phạm Quốc Hướng)")
        print("  5. TTS 1:   intern@ictu.edu.vn         / Intern@123 (Nguyễn Văn An - K20-CNTT01)")
        print("  6. TTS 2:   tts02@student.ictu.edu.vn  / Intern@123 (Lê Hoàng Nam - K20-KTPM01)")
        print("  7. TTS 3:   tts03@student.ictu.edu.vn  / Intern@123 (Trần Thị Mai Phương - K21-HTTT01)")
        print("  8. TTS 4:   tts04@student.ictu.edu.vn  / Intern@123 (Hoàng Minh Đức - K20-ATTT01)")
        print("  9. TTS 5:   dvu14206vhd78@gmail.com    / Intern@123 (Dũng Vũ - K20-KTPM02)")
        print(" 10. Ứng viên: ungvien@ictu.edu.vn       / Intern@123 (Nguyễn Thu Hà - Pending)")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"[!] Lỗi trong quá trình khởi tạo dữ liệu: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed_realistic()
