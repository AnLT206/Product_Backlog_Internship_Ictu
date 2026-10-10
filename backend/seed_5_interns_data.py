import sys
from datetime import datetime
from decimal import Decimal
from sqlalchemy import text
from app.core.database import engine

def seed_5_interns():
    print("Connecting to database...")
    with engine.connect() as conn:
        # 1. Update program_members for User 10
        print("1. Updating program_members for User 10...")
        pm10 = conn.execute(text("SELECT id, mentor_user_id FROM program_members WHERE intern_user_id = 10;")).fetchone()
        if pm10:
            conn.execute(text("UPDATE program_members SET mentor_user_id = 3 WHERE intern_user_id = 10;"))
        else:
            conn.execute(text("INSERT INTO program_members (program_id, intern_user_id, mentor_user_id, created_at) VALUES (3, 10, 3, NOW());"))
        
        # 2. Seed intern_tasks for all 5 interns
        print("2. Seeding intern_tasks...")
        # Check existing tasks
        user_tasks = {
            5: [
                ("Phát triển REST API Quản lý Hồ sơ Thực tập sinh", "Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.", "2026-10-15", "high", "doing", 75, 3),
                ("Nghiên cứu tài liệu Software Specification v2.1", "Đọc hiểu luồng sequence diagram và quy tắc phân quyền JWT.", "2026-09-24", "medium", "done", 100, 3),
                ("Thiết kế CSDL & Migration Alembic cho RBAC", "Tạo các migration script và quan hệ bảng permissions, roles, user_roles.", "2026-10-05", "high", "done", 100, 3),
            ],
            6: [
                ("Thiết kế kịch bản Kiểm thử tự động (Automation Testing)", "Xây dựng automation test suites cho module Auth & User Profile.", "2026-10-18", "high", "doing", 60, 4),
                ("Xây dựng bộ Test Suite hồi quy End-to-End với PyTest", "Viết 15 kịch bản kiểm thử API hồi quy xác thực và phân quyền RBAC.", "2026-09-28", "medium", "done", 100, 4),
                ("Viết kịch bản kiểm thử tải với Locust cho Cổng HR", "Giả lập 200 CCU đồng thời truy vấn danh sách TTS và xuất báo cáo.", "2026-10-25", "medium", "doing", 45, 4),
            ],
            8: [
                ("Thiết kế và tối ưu hóa giao diện người dùng Responsive", "Chuẩn hóa bảng màu ICTU Design System và CSS Mobile-first.", "2026-10-01", "high", "done", 100, 3),
                ("Tích hợp luồng nộp báo cáo tuần và điểm danh trực tuyến", "Kết nối API FastAPI nộp file đính kèm và kiểm tra ca làm việc.", "2026-10-20", "medium", "doing", 80, 3),
                ("Xây dựng dashboard biểu đồ thống kê năng suất TTS với Chart.js", "Trực quan hóa tỷ lệ hoàn thành Sprint và biểu đồ chuyên cần tháng.", "2026-10-22", "high", "doing", 70, 3),
            ],
            9: [
                ("Rà soát lỗ hổng bảo mật Web API theo chuẩn OWASP Top 10", "Kiểm tra lỗi SQL Injection, Broken Object Level Auth và XSS.", "2026-10-22", "high", "doing", 40, 4),
                ("Cấu hình kiểm tra Header CORS và Rate Limiting", "Áp dụng Slowapi giới hạn 60 requests/phút trên API xác thực.", "2026-09-30", "medium", "done", 100, 4),
                ("Thiết lập quét mã nguồn tự động với SonarQube & Trivy", "Cấu hình pipeline CI/CD tự động phân tích tĩnh lỗ hổng Docker image.", "2026-10-26", "medium", "doing", 55, 4),
            ],
            10: [
                ("Nghiên cứu mô hình ngôn ngữ lớn (LLM) và kỹ thuật RAG", "Tìm hiểu mô hình Llama-3 và cơ chế Retrieval-Augmented Generation.", "2026-10-19", "high", "doing", 70, 3),
                ("Huấn luyện thử nghiệm pipeline embedding vector với ChromaDB", "Vector hóa toàn bộ cẩm nang hướng dẫn thực tập và FAQ quy chế ICTU.", "2026-10-02", "medium", "done", 100, 3),
                ("Xây dựng Chatbot hỏi đáp chính sách thực tập nội bộ ICTU", "Tích hợp prompt template và stream câu trả lời kèm nguồn trích dẫn.", "2026-10-24", "high", "doing", 50, 3),
            ],
        }

        for uid, tlist in user_tasks.items():
            for title, desc, due, prio, stat, prog, mentor in tlist:
                row = conn.execute(text("SELECT id FROM intern_tasks WHERE intern_id = :uid AND title = :title;"), {"uid": uid, "title": title}).fetchone()
                if not row:
                    conn.execute(
                        text("""INSERT INTO intern_tasks (intern_id, mentor_id, title, description, due_at, priority, status, progress, created_at)
                                VALUES (:uid, :mid, :title, :desc, :due, :prio, :stat, :prog, NOW());"""),
                        {"uid": uid, "mid": mentor, "title": title, "desc": desc, "due": due, "prio": prio, "stat": stat, "prog": prog}
                    )
                else:
                    conn.execute(
                        text("""UPDATE intern_tasks SET progress = :prog, status = :stat, priority = :prio, due_at = :due, description = :desc, mentor_id = :mid
                                WHERE id = :id;"""),
                        {"prog": prog, "stat": stat, "prio": prio, "due": due, "desc": desc, "mid": mentor, "id": row[0]}
                    )

        # 3. Seed intern_attendances for Month 10/2026
        print("3. Seeding intern_attendances...")
        attendances = {
            5: {"month": "10/2026", "std": 22, "act": 22, "late": 0, "leave": 0, "allowance": 2500000, "bonus": 500000, "reason": "Xuất sắc hoàn thành Sprint 1", "status": "approved", "label": "Đã duyệt chi trả"},
            6: {"month": "10/2026", "std": 22, "act": 21, "late": 0, "leave": 1, "allowance": 2400000, "bonus": 500000, "reason": "Hoàn thành tốt Test Suites E2E", "status": "approved", "label": "Đã duyệt chi trả"},
            8: {"month": "10/2026", "std": 22, "act": 22, "late": 0, "leave": 0, "allowance": 2500000, "bonus": 700000, "reason": "Thiết kế UI Dashboard xuất sắc", "status": "approved", "label": "Đã duyệt chi trả"},
            9: {"month": "10/2026", "std": 22, "act": 20, "late": 2, "leave": 0, "allowance": 2300000, "bonus": 500000, "reason": "Phát hiện và vá lỗi OWASP Top 10", "status": "approved", "label": "Đã duyệt chi trả"},
            10: {"month": "10/2026", "std": 22, "act": 22, "late": 0, "leave": 0, "allowance": 2500000, "bonus": 600000, "reason": "Nghiên cứu pipeline AI RAG hiệu quả", "status": "approved", "label": "Đã duyệt chi trả"},
        }
        for uid, a in attendances.items():
            row = conn.execute(text("SELECT id FROM intern_attendances WHERE intern_id = :uid AND month = :m;"), {"uid": uid, "m": a["month"]}).fetchone()
            lunch = a["act"] * 30000
            if not row:
                conn.execute(
                    text("""INSERT INTO intern_attendances (intern_id, month, standard_days, actual_days, late_days, leave_days,
                            base_allowance, lunch_allowance, bonus_amount, bonus_reason, deduction_amount, allowance, status, status_label, created_at)
                            VALUES (:uid, :m, :std, :act, :late, :leave, :base, :lunch, :bonus, :reason, 0, :allowance, :status, :label, NOW());"""),
                    {"uid": uid, "m": a["month"], "std": a["std"], "act": a["act"], "late": a["late"], "leave": a["leave"],
                     "base": a["allowance"], "lunch": lunch, "bonus": a["bonus"], "reason": a["reason"], "allowance": a["allowance"], "status": a["status"], "label": a["label"]}
                )
            else:
                conn.execute(
                    text("""UPDATE intern_attendances SET standard_days = :std, actual_days = :act, late_days = :late, leave_days = :leave,
                            base_allowance = :base, lunch_allowance = :lunch, bonus_amount = :bonus, bonus_reason = :reason, allowance = :allowance, status = :status, status_label = :label
                            WHERE id = :id;"""),
                    {"std": a["std"], "act": a["act"], "late": a["late"], "leave": a["leave"], "base": a["allowance"], "lunch": lunch,
                     "bonus": a["bonus"], "reason": a["reason"], "allowance": a["allowance"], "status": a["status"], "label": a["label"], "id": row[0]}
                )

        # 4. Seed intern_reports
        print("4. Seeding intern_reports...")
        reports = {
            5: ("Báo cáo Tuần 07 - Tích hợp JWT & Role-based Access", "16/09/2026 - 22/09/2026", "28/09/2026 16:45",
                "Đã hoàn thành thiết kế migration Alembic, xây dựng router FastAPI và viết 8 unit test đạt tỷ lệ pass 100%.",
                "Mã nguồn rõ ràng, xử lý bảo mật tốt.", 9.0, "graded", 3),
            6: ("Báo cáo Tuần 07 - Kiểm thử tích hợp hệ thống", "16/09/2026 - 22/09/2026", "28/09/2026 16:30",
                "Xây dựng xong bộ kịch bản kiểm thử API tích hợp tự động với PyTest, kiểm tra phân quyền RBAC và token JWT.",
                "Độ bao phủ test tốt, cần bổ sung thêm edge cases.", 8.5, "graded", 4),
            8: ("Báo cáo Tuần 07 - Hoàn thiện UI Dashboard", "16/09/2026 - 22/09/2026", "28/09/2026 17:00",
                "Thiết kế toàn bộ layout chuẩn Enterprise, tích hợp responsive cho giao diện máy tính bảng và điện thoại di động.",
                "Giao diện chuyên nghiệp, tuân thủ chặt chẽ design system.", 9.5, "graded", 3),
            9: ("Báo cáo Tuần 07 - Báo cáo an ninh và kiểm thử thâm nhập", "16/09/2026 - 22/09/2026", "28/09/2026 17:15",
                "Thực hiện quét bảo mật Web API, phát hiện lỗi header thiếu CSP và xử lý phân quyền chặt chẽ các endpoint.",
                "Báo cáo chi tiết, phát hiện được các điểm yếu bảo mật tiềm ẩn.", 8.8, "graded", 4),
            10: ("Báo cáo Tuần 07 - Nghiên cứu pipeline RAG và Vector Embedding", "16/09/2026 - 22/09/2026", "28/09/2026 16:50",
                "Tìm hiểu kiến trúc mô hình LLM, vector hóa văn bản cẩm nang thực tập với ChromaDB và xây dựng luồng truy xuất tri thức.",
                "Nắm bắt công nghệ mới rất nhanh, mô hình chạy thực nghiệm tốt.", 9.3, "graded", 3),
        }
        for uid, (title, period, sub_at, done, fb, score, stat, mid) in reports.items():
            row = conn.execute(text("SELECT id FROM intern_reports WHERE intern_id = :uid AND week_title = :title;"), {"uid": uid, "title": title}).fetchone()
            if not row:
                conn.execute(
                    text("""INSERT INTO intern_reports (intern_id, mentor_id, week_title, period, submitted_at, tasks_done, issues, self_assessment, mentor_feedback, score, status, created_at)
                            VALUES (:uid, :mid, :title, :period, :sub_at, :done, 'Không có', 'Tốt', :fb, :score, :stat, NOW());"""),
                    {"uid": uid, "mid": mid, "title": title, "period": period, "sub_at": sub_at, "done": done, "fb": fb, "score": score, "stat": stat}
                )
            else:
                conn.execute(
                    text("""UPDATE intern_reports SET mentor_id = :mid, period = :period, submitted_at = :sub_at, tasks_done = :done, mentor_feedback = :fb, score = :score, status = :stat
                            WHERE id = :id;"""),
                    {"mid": mid, "period": period, "sub_at": sub_at, "done": done, "fb": fb, "score": score, "stat": stat, "id": row[0]}
                )

        # 5. Seed intern_contract_records
        print("5. Seeding intern_contract_records...")
        contracts = {
            5: ("HD-TTS0001-2026", "Thỏa thuận thực tập 3 bên & NDA", 1, 1, 1, "completed", "Đã hoàn tất ký số 3 bên", "3.000.000 đ/tháng", "Trung tâm Phát triển Phần mềm ICTU"),
            6: ("HD-TTS0002-2026", "Thỏa thuận thực tập 3 bên & NDA", 1, 1, 1, "completed", "Đã hoàn tất ký số 3 bên", "2.900.000 đ/tháng", "Phòng Đảm bảo Chất lượng Phần mềm (QA Lab)"),
            8: ("HD-TTS0003-2026", "Thỏa thuận thực tập 3 bên & NDA", 1, 1, 1, "completed", "Đã hoàn tất ký số 3 bên", "3.200.000 đ/tháng", "Trung tâm Dữ liệu & Hệ thống Thông tin"),
            9: ("HD-TTS0004-2026", "Thỏa thuận thực tập 3 bên & NDA", 1, 1, 1, "completed", "Đã hoàn tất ký số 3 bên", "2.800.000 đ/tháng", "Trung tâm An toàn Thông tin & Tác chiến mạng"),
            10: ("HD-TTS0005-2026", "Thỏa thuận thực tập 3 bên & NDA", 1, 1, 1, "completed", "Đã hoàn tất ký số 3 bên", "3.100.000 đ/tháng", "Phòng Nghiên cứu Trí tuệ Nhân tạo ICTU AI Lab"),
        }
        for uid, (code, doc, s_intern, s_comp, s_ictu, stat, lbl, allow, dept) in contracts.items():
            row = conn.execute(text("SELECT id FROM intern_contract_records WHERE intern_id = :uid;"), {"uid": uid}).fetchone()
            if not row:
                conn.execute(
                    text("""INSERT INTO intern_contract_records (intern_id, contract_code, doc_type, signed_intern, signed_company, signed_ictu, status, status_label, allowance, department, cert, created_at)
                            VALUES (:uid, :code, :doc, :si, :sc, :su, :stat, :lbl, :allow, :dept, 'ICTU-CA Verified (28/09)', NOW());"""),
                    {"uid": uid, "code": code, "doc": doc, "si": s_intern, "sc": s_comp, "su": s_ictu, "stat": stat, "lbl": lbl, "allow": allow, "dept": dept}
                )
            else:
                conn.execute(
                    text("""UPDATE intern_contract_records SET contract_code = :code, doc_type = :doc, signed_intern = :si, signed_company = :sc, signed_ictu = :su,
                            status = :stat, status_label = :lbl, allowance = :allow, department = :dept, cert = 'ICTU-CA Verified (28/09)'
                            WHERE id = :id;"""),
                    {"code": code, "doc": doc, "si": s_intern, "sc": s_comp, "su": s_ictu, "stat": stat, "lbl": lbl, "allow": allow, "dept": dept, "id": row[0]}
                )

        # 6. Seed intern_evaluations
        print("6. Seeding intern_evaluations...")
        evals = {
            5: (9.5, 9.2, 9.0, 9.2, "A", "verified", "Hoàn thành xuất sắc nhiệm vụ Backend API.", 3),
            6: (9.0, 8.5, 8.5, 8.7, "B+", "verified", "Chăm chỉ, hoàn thành tốt các bài kiểm thử tự động.", 4),
            8: (9.8, 9.5, 9.5, 9.5, "A", "verified", "Kỹ năng UI/UX và tư duy hệ thống rất xuất sắc.", 3),
            9: (8.8, 8.9, 8.8, 8.8, "A", "verified", "Nắm vững nguyên lý bảo mật hệ thống và an toàn thông tin mạng.", 4),
            10: (9.5, 9.2, 9.2, 9.3, "A", "verified", "Tư duy nghiên cứu AI xuất sắc, triển khai ứng dụng thực tế nhanh.", 3),
        }
        for uid, (att_s, tech_s, rep_s, fin_s, grade, stat, note, mid) in evals.items():
            row = conn.execute(text("SELECT id FROM intern_evaluations WHERE intern_id = :uid;"), {"uid": uid}).fetchone()
            if not row:
                conn.execute(
                    text("""INSERT INTO intern_evaluations (intern_id, mentor_id, attendance_score, tech_score, report_score, final_score, letter_grade, mentor_note, status, created_at)
                            VALUES (:uid, :mid, :att, :tech, :rep, :fin, :grd, :note, :stat, NOW());"""),
                    {"uid": uid, "mid": mid, "att": att_s, "tech": tech_s, "rep": rep_s, "fin": fin_s, "grd": grade, "note": note, "stat": stat}
                )
            else:
                conn.execute(
                    text("""UPDATE intern_evaluations SET mentor_id = :mid, attendance_score = :att, tech_score = :tech, report_score = :rep,
                            final_score = :fin, letter_grade = :grd, mentor_note = :note, status = :stat
                            WHERE id = :id;"""),
                    {"mid": mid, "att": att_s, "tech": tech_s, "rep": rep_s, "fin": fin_s, "grd": grade, "note": note, "stat": stat, "id": row[0]}
                )

        # 7. Seed leave_requests
        print("7. Seeding leave_requests...")
        leaves = [
            ("NP-001", 5, "TTS", "TTS0001", "intern@ictu.edu.vn", "Nghỉ thi học phần", "2026-09-25", "2026-09-25", "Buổi chiều (13:30 - 17:30)", "0.5 ngày", "Thi kết thúc học phần Cơ sở dữ liệu nâng cao tại trường ĐH CNTT & TT (ICTU).", "24/09/2026", "approved", "Đã duyệt", "Hr", "Đã duyệt nghỉ phép. Chúc sinh viên thi tốt."),
            ("NP-002", 8, "Trần Thị Mai Phương", "TTS0003", "tts03@student.ictu.edu.vn", "Nghỉ tham gia hoạt động Đoàn trường", "2026-09-12", "2026-09-12", "Cả ngày (08:15 - 17:30)", "1.0 ngày", "Tham gia hỗ trợ ngày hội Chào tân sinh viên K24 của Đoàn Thanh niên ICTU.", "10/09/2026", "approved", "Đã duyệt", "Hr", "Đã duyệt nghỉ phép tham gia công tác Đoàn."),
            ("NP-003", 9, "Hoàng Minh Đức", "TTS0004", "tts04@student.ictu.edu.vn", "Nghỉ ốm / Khám bệnh", "2026-10-06", "2026-10-06", "Buổi sáng (08:15 - 12:00)", "0.5 ngày", "Đi khám sức khỏe định kỳ theo lịch tại Bệnh viện Đại học Y Dược Thái Nguyên.", "01/10/2026", "approved", "Đã duyệt", "Hr", "Đã duyệt nghỉ phép khám bệnh."),
            ("NP-004", 6, "Lê Hoàng Nam", "TTS0002", "tts02@student.ictu.edu.vn", "Nghỉ việc cá nhân", "2026-10-08", "2026-10-08", "Cả ngày (08:15 - 17:30)", "1.0 ngày", "Có việc gia đình đột xuất tại quê Hải Dương.", "06/10/2026", "approved", "Đã duyệt", "Hr", "Đã duyệt đơn nghỉ phép cá nhân."),
            ("NP-005", 10, "Vũ Hải Yến", "TTS0005", "tts05@student.ictu.edu.vn", "Nghỉ bảo vệ đề cương nghiên cứu khoa học", "2026-10-15", "2026-10-15", "Buổi sáng (08:15 - 12:00)", "0.5 ngày", "Báo cáo bảo vệ đề cương nghiên cứu khoa học cấp Trường về Ứng dụng AI/NLP.", "11/10/2026", "approved", "Đã duyệt", "Hr", "Đã duyệt đơn nghỉ phép. Chúc em bảo vệ đề cương đạt kết quả tốt nhất."),
        ]
        for req_code, uid, name, code, email, ltype, sdate, edate, sess, dura, reas, cdate, stat, lbl, appr, fb in leaves:
            row = conn.execute(text("SELECT id FROM leave_requests WHERE request_code = :rc;"), {"rc": req_code}).fetchone()
            if not row:
                conn.execute(
                    text("""INSERT INTO leave_requests (request_code, intern_id, intern_name, intern_code, intern_email, leave_type, start_date, end_date, session, duration, reason, created_date, status, status_label, approver, feedback)
                            VALUES (:rc, :uid, :name, :code, :email, :ltype, :sdate, :edate, :sess, :dura, :reas, :cdate, :stat, :lbl, :appr, :fb);"""),
                    {"rc": req_code, "uid": uid, "name": name, "code": code, "email": email, "ltype": ltype, "sdate": sdate, "edate": edate, "sess": sess, "dura": dura, "reas": reas, "cdate": cdate, "stat": stat, "lbl": lbl, "appr": appr, "fb": fb}
                )
            else:
                conn.execute(
                    text("""UPDATE leave_requests SET intern_id = :uid, intern_name = :name, intern_code = :code, intern_email = :email, leave_type = :ltype, start_date = :sdate, end_date = :edate,
                            session = :sess, duration = :dura, reason = :reas, status = :stat, status_label = :lbl, approver = :appr, feedback = :fb
                            WHERE id = :id;"""),
                    {"uid": uid, "name": name, "code": code, "email": email, "ltype": ltype, "sdate": sdate, "edate": edate, "sess": sess, "dura": dura, "reas": reas, "stat": stat, "lbl": lbl, "appr": appr, "fb": fb, "id": row[0]}
                )

        # 8. Seed support_tickets
        print("8. Seeding support_tickets...")
        tickets = [
            ("TK-2026-089", "Giấy chứng nhận hoàn thành thực tập (Certificate)", "TTS (TTS0001)", "cert_internship", "Thủ tục hành chính", "hr", "normal", "Bình thường", "completed", "Đã duyệt", "Xin cấp giấy xác nhận thời gian thực tập tại ICTU để nộp về Khoa.", "Đã cấp bản scan kèm chữ ký số ICTU.", 1, "Cả bản cứng & scan PDF"),
            ("TK-2026-090", "Cấp thẻ ra vào / VPN công ty", "Lê Hoàng Nam (TTS0002)", "facility", "Cơ sở vật chất", "hr", "normal", "Bình thường", "pending", "Chờ duyệt", "Xin cấp tài khoản VPN nội bộ và thẻ quẹt cửa ra vào Lab QA.", "Đang chuyển bộ phận CNTT kích hoạt tài khoản.", 1, "Cấp mã điện tử"),
            ("TK-2026-075", "Giấy xác nhận thực tập gửi về khoa", "Trần Thị Mai Phương (TTS0003)", "cert_internship", "Thủ tục hành chính", "hr", "normal", "Bình thường", "completed", "Đã duyệt", "Xin đóng dấu xác nhận quá trình thực tập tại trung tâm dữ liệu.", "Đã xác nhận và chuyển trả giấy tờ tại phòng HR.", 2, "Bản cứng có dấu đỏ"),
            ("TK-2026-822", "Cấp quyền truy cập môi trường Staging/Security Lab", "Hoàng Minh Đức (TTS0004)", "tech_support", "Hỗ trợ kỹ thuật", "mentor", "high", "Khẩn cấp", "completed", "Đã duyệt", "Yêu cầu cấp quyền SSH vào server Sandbox để pentest bảo mật API.", "Mentor Hướng đã mở port và cấp SSH key.", 1, "Cấp qua Email"),
            ("TK-2026-816", "Đăng ký tài nguyên GPU Server AI Lab", "Vũ Hải Yến (TTS0005)", "tech_support", "Hỗ trợ kỹ thuật", "mentor", "high", "Khẩn cấp", "pending", "Chờ duyệt", "Xin cấp phát cụm GPU RTX 4090 để chạy thử nghiệm vector embedding tài liệu lớn.", "Mentor Quân đang thẩm định tài nguyên GPU server.", 1, "Cấp qua Email"),
        ]
        for tcode, title, sname, cat, cat_lbl, t_appr, prio, prio_lbl, stat, stat_lbl, desc, resp, cop, deliv in tickets:
            row = conn.execute(text("SELECT id FROM support_tickets WHERE ticket_code = :tc;"), {"tc": tcode}).fetchone()
            if not row:
                conn.execute(
                    text("""INSERT INTO support_tickets (ticket_code, title, sender_name, category, category_label, target_approver, priority, priority_label, status, status_label, description, response_note, copies, delivery_method, created_at)
                            VALUES (:tc, :title, :sname, :cat, :cat_lbl, :t_appr, :prio, :prio_lbl, :stat, :stat_lbl, :desc, :resp, :cop, :deliv, NOW());"""),
                    {"tc": tcode, "title": title, "sname": sname, "cat": cat, "cat_lbl": cat_lbl, "t_appr": t_appr, "prio": prio, "prio_lbl": prio_lbl, "stat": stat, "stat_lbl": stat_lbl, "desc": desc, "resp": resp, "cop": cop, "deliv": deliv}
                )
            else:
                conn.execute(
                    text("""UPDATE support_tickets SET title = :title, sender_name = :sname, category = :cat, category_label = :cat_lbl, target_approver = :t_appr, priority = :prio, priority_label = :prio_lbl,
                            status = :stat, status_label = :stat_lbl, description = :desc, response_note = :resp, copies = :cop, delivery_method = :deliv
                            WHERE id = :id;"""),
                    {"title": title, "sname": sname, "cat": cat, "cat_lbl": cat_lbl, "t_appr": t_appr, "prio": prio, "prio_lbl": prio_lbl, "stat": stat, "stat_lbl": stat_lbl, "desc": desc, "resp": resp, "cop": cop, "deliv": deliv, "id": row[0]}
                )

        # 9. Update intern_profiles banking and details
        print("9. Updating intern_profiles bank details...")
        banks = {
            5: ("MB Bank", "999908123451"),
            6: ("Techcombank", "190368123452"),
            8: ("Vietcombank", "0071008123453"),
            9: ("BIDV", "42710008123454"),
            10: ("TPBank", "03988123455"),
        }
        for uid, (bname, bacc) in banks.items():
            conn.execute(
                text("UPDATE intern_profiles SET bank_name = :bname, bank_account = :bacc WHERE user_id = :uid;"),
                {"bname": bname, "bacc": bacc, "uid": uid}
            )

        conn.commit()
        print("Successfully seeded distinct data for all 5 interns!")

if __name__ == "__main__":
    seed_5_interns()
