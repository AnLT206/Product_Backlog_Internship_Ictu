# -*- coding: utf-8 -*-
"""
Script tự động kiểm tra và đồng bộ cấu trúc CSDL (Auto Migration & Schema Sync):
- Đảm bảo tất cả các bảng từ SQLAlchemy Base.metadata được tạo đầy đủ.
- Tự động bổ sung các cột còn thiếu trong các bảng hiện có (class_name, role_type, v.v.).
- Đồng bộ dữ liệu phân công mentor, nhóm thực tập (internship_groups), lịch làm việc (weekly_work_schedules).
- Chạy an toàn (idempotent), không làm mất dữ liệu người dùng.
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
import app.models  # Nạp tất cả các models


def sync_schema():
    print("[1/5] Kiểm tra và tạo các bảng còn thiếu trong CSDL...")
    Base.metadata.create_all(bind=engine)
    print("  -> Đã tạo/xác nhận các bảng từ Base.metadata.")

    print("[2/5] Kiểm tra và bổ sung các cột còn thiếu trong các bảng...")
    with engine.connect() as conn:
        inspector = inspect(conn)

        # 1. intern_profiles: class_name
        ip_cols = {c["name"] for c in inspector.get_columns("intern_profiles")}
        if "class_name" not in ip_cols:
            print("  -> Bổ sung cột class_name vào bảng intern_profiles...")
            conn.execute(text("ALTER TABLE intern_profiles ADD COLUMN class_name VARCHAR(100) NULL AFTER academic_year"))
            try:
                conn.execute(text("ALTER TABLE intern_profiles ADD INDEX idx_intern_profiles_class_name (class_name)"))
            except Exception:
                pass
            conn.commit()

        # 2. mentor_interns: role_type, dimension_type, dimension_value, assigned_by_id
        if "mentor_interns" in inspector.get_table_names():
            mi_cols = {c["name"] for c in inspector.get_columns("mentor_interns")}
            if "role_type" not in mi_cols:
                print("  -> Bổ sung cột role_type vào bảng mentor_interns...")
                conn.execute(text("ALTER TABLE mentor_interns ADD COLUMN role_type ENUM('primary', 'technical', 'co_mentor', 'advisor') NOT NULL DEFAULT 'primary' AFTER intern_id"))
            if "dimension_type" not in mi_cols:
                print("  -> Bổ sung cột dimension_type vào bảng mentor_interns...")
                conn.execute(text("ALTER TABLE mentor_interns ADD COLUMN dimension_type ENUM('direct', 'major', 'class', 'intake', 'department') NOT NULL DEFAULT 'direct' AFTER role_type"))
            if "dimension_value" not in mi_cols:
                print("  -> Bổ sung cột dimension_value vào bảng mentor_interns...")
                conn.execute(text("ALTER TABLE mentor_interns ADD COLUMN dimension_value VARCHAR(150) NULL AFTER dimension_type"))
            if "assigned_by_id" not in mi_cols:
                print("  -> Bổ sung cột assigned_by_id vào bảng mentor_interns...")
                conn.execute(text("ALTER TABLE mentor_interns ADD COLUMN assigned_by_id INT NULL AFTER dimension_value"))
                try:
                    conn.execute(text("ALTER TABLE mentor_interns ADD CONSTRAINT fk_mentor_interns_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE SET NULL"))
                except Exception:
                    pass

            # Cập nhật unique constraint cho mentor_interns
            try:
                conn.execute(text("ALTER TABLE mentor_interns DROP INDEX uq_mentor_intern"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE mentor_interns ADD UNIQUE KEY uq_mentor_intern_role (mentor_id, intern_id, role_type)"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE mentor_interns ADD INDEX idx_mentor_interns_dimension (dimension_type, dimension_value)"))
            except Exception:
                pass
            conn.commit()

        # 3. backup_records
        if "backup_records" in inspector.get_table_names():
            br_cols = {c["name"] for c in inspector.get_columns("backup_records")}
            if "is_encrypted" not in br_cols:
                conn.execute(text("ALTER TABLE backup_records ADD COLUMN is_encrypted TINYINT(1) NOT NULL DEFAULT 0"))
            if "encryption_algorithm" not in br_cols:
                conn.execute(text("ALTER TABLE backup_records ADD COLUMN encryption_algorithm VARCHAR(50) NULL DEFAULT 'AES-256-Fernet'"))
            if "checksum_sha256" not in br_cols:
                conn.execute(text("ALTER TABLE backup_records ADD COLUMN checksum_sha256 VARCHAR(64) NULL"))
            if "cloud_storage_url" not in br_cols:
                conn.execute(text("ALTER TABLE backup_records ADD COLUMN cloud_storage_url VARCHAR(500) NULL"))
            if "cloud_uploaded_at" not in br_cols:
                conn.execute(text("ALTER TABLE backup_records ADD COLUMN cloud_uploaded_at DATETIME NULL"))
            conn.commit()

        # 4. leave_requests
        if "leave_requests" in inspector.get_table_names():
            lr_cols = {c["name"] for c in inspector.get_columns("leave_requests")}
            if "user_id" not in lr_cols:
                conn.execute(text("ALTER TABLE leave_requests ADD COLUMN user_id INT NULL AFTER id"))
                try:
                    conn.execute(text("ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE"))
                except Exception:
                    pass
            if "created_at" not in lr_cols:
                conn.execute(text("ALTER TABLE leave_requests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            if "updated_at" not in lr_cols:
                conn.execute(text("ALTER TABLE leave_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
            # Sync user_id = intern_id chỉ cho những intern_id tồn tại trong users
            conn.execute(text("UPDATE leave_requests SET user_id = intern_id WHERE user_id IS NULL AND intern_id IN (SELECT id FROM users)"))
            conn.execute(text("DELETE FROM leave_requests WHERE user_id IS NULL"))
            conn.commit()

        # 5. system_logs: description
        if "system_logs" in inspector.get_table_names():
            sl_cols = {c["name"] for c in inspector.get_columns("system_logs")}
            if "description" not in sl_cols:
                conn.execute(text("ALTER TABLE system_logs ADD COLUMN description VARCHAR(500) NULL"))
                conn.commit()

        # 6. users: cccd
        if "users" in inspector.get_table_names():
            u_cols = {c["name"] for c in inspector.get_columns("users")}
            if "cccd" not in u_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN cccd VARCHAR(12) NULL UNIQUE AFTER email"))
                conn.commit()


def sync_data():
    print("[3/5] Chuẩn hóa dữ liệu lớp học (class_name) cho Thực tập sinh...")
    db: Session = SessionLocal()
    try:
        class_mapping = {
            5: "K20-CNTT01",
            6: "K20-KTPM01",
            7: "K20-CNTT02",
            8: "K21-HTTT01",
            9: "K20-ATTT01",
            24: "K20-KTPM02",
        }
        for u_id, c_name in class_mapping.items():
            db.execute(
                text("UPDATE intern_profiles SET class_name = :c_name WHERE user_id = :u_id AND (class_name IS NULL OR class_name = '')"),
                {"c_name": c_name, "u_id": u_id},
            )
        db.commit()

        print("[4/5] Đồng bộ phân công Mentor (ProgramMember, InternProfile, MentorIntern)...")
        # Mentor 1 (id 3: Trần Hoàng Quân) -> TTS 5 (Nguyễn Văn An), TTS 8 (Trần Thị Mai Phương)
        # Mentor 2 (id 4: Phạm Quốc Hướng) -> TTS 6 (Lê Hoàng Nam), TTS 9 (Hoàng Minh Đức)
        mentor_mapping = {
            5: 3,
            8: 3,
            6: 4,
            9: 4,
        }
        for intern_id, mentor_id in mentor_mapping.items():
            # Cập nhật intern_profiles
            db.execute(
                text("UPDATE intern_profiles SET mentor_id = :mentor_id WHERE user_id = :intern_id AND (mentor_id IS NULL OR mentor_id = 0)"),
                {"mentor_id": mentor_id, "intern_id": intern_id},
            )
            # Cập nhật program_members
            db.execute(
                text("UPDATE program_members SET mentor_user_id = :mentor_id WHERE intern_user_id = :intern_id AND (mentor_user_id IS NULL OR mentor_user_id = 0)"),
                {"mentor_id": mentor_id, "intern_id": intern_id},
            )
            # Đảm bảo mentor_interns
            exists = db.execute(
                text("SELECT id FROM mentor_interns WHERE mentor_id = :m_id AND intern_id = :i_id AND role_type = 'primary'"),
                {"m_id": mentor_id, "i_id": intern_id},
            ).first()
            if not exists:
                db.execute(
                    text("INSERT INTO mentor_interns (mentor_id, intern_id, role_type, dimension_type, dimension_value) VALUES (:m_id, :i_id, 'primary', 'direct', 'Phân công trực tiếp')"),
                    {"m_id": mentor_id, "i_id": intern_id},
                )
        db.commit()

        print("[5/5] Đảm bảo nhóm thực tập (internship_groups), ca làm việc (work_shifts) & liên kết phòng ban...")
        # Đảm bảo nhóm 1 và nhóm 2 gắn đúng kỳ thực tập 1
        g1 = db.execute(text("SELECT id FROM internship_groups WHERE code = 'GRP-KTPM01'")).first()
        if not g1:
            db.execute(text(
                "INSERT INTO internship_groups (name, code, department_id, program_id, leader_user_id, description, max_members, status) "
                "VALUES ('Nhóm Kỹ thuật Phần mềm (Software Dev)', 'GRP-KTPM01', 1, 1, 3, 'Nhóm chuyên trách Frontend React & Backend FastAPI', 20, 'active')"
            ))
            db.commit()
            g1 = db.execute(text("SELECT id FROM internship_groups WHERE code = 'GRP-KTPM01'")).first()
        else:
            db.execute(text("UPDATE internship_groups SET program_id = 1, leader_user_id = 3 WHERE id = :gid"), {"gid": g1[0]})
            db.commit()

        g2 = db.execute(text("SELECT id FROM internship_groups WHERE code = 'GRP-QA01'")).first()
        if not g2:
            db.execute(text(
                "INSERT INTO internship_groups (name, code, department_id, program_id, leader_user_id, description, max_members, status) "
                "VALUES ('Nhóm Kiểm thử & Đảm bảo chất lượng (QA/QC)', 'GRP-QA01', 2, 1, 4, 'Nhóm kiểm thử tự động Automation Testing và CI/CD', 20, 'active')"
            ))
            db.commit()
            g2 = db.execute(text("SELECT id FROM internship_groups WHERE code = 'GRP-QA01'")).first()
        else:
            db.execute(text("UPDATE internship_groups SET program_id = 1, leader_user_id = 4 WHERE id = :gid"), {"gid": g2[0]})
            db.commit()

        # Gán intern vào nhóm và phòng ban qua intern_profiles.id
        intern_profiles = db.execute(text("SELECT id, user_id FROM intern_profiles")).fetchall()
        for ip in intern_profiles:
            ip_id = ip[0]
            u_id = ip[1]
            target_group_id = g1[0] if u_id in (5, 6, 8, 24) else g2[0]
            target_dept_id = 1 if u_id in (5, 6, 8, 24) else 2

            # Gán group
            has_group = db.execute(
                text("SELECT id FROM intern_profile_groups WHERE intern_profile_id = :ip_id AND group_id = :g_id"),
                {"ip_id": ip_id, "g_id": target_group_id},
            ).first()
            if not has_group:
                role_val = "leader" if u_id in (5, 9) else "member"
                db.execute(
                    text("INSERT INTO intern_profile_groups (intern_profile_id, group_id, role, status) VALUES (:ip_id, :g_id, :role, 'active')"),
                    {"ip_id": ip_id, "g_id": target_group_id, "role": role_val},
                )

            # Gán department
            has_dept = db.execute(
                text("SELECT id FROM intern_profile_departments WHERE intern_profile_id = :ip_id AND department_id = :d_id"),
                {"ip_id": ip_id, "d_id": target_dept_id},
            ).first()
            if not has_dept:
                db.execute(
                    text("INSERT INTO intern_profile_departments (intern_profile_id, department_id) VALUES (:ip_id, :d_id)"),
                    {"ip_id": ip_id, "d_id": target_dept_id},
                )
        db.commit()

        # Đảm bảo cột group_id trong bảng work_shifts
        insp = inspect(db.get_bind())
        ws_cols = [c["name"] for c in insp.get_columns("work_shifts")]
        if "group_id" not in ws_cols:
            db.execute(text("ALTER TABLE work_shifts ADD COLUMN group_id INT NULL"))
            db.commit()

        # Đảm bảo có ca làm việc chuẩn cho kỳ thực tập (work_shifts)
        shifts_count = db.execute(text("SELECT count(*) FROM work_shifts WHERE program_id = 1")).scalar()
        if shifts_count == 0:
            print("  -> Khởi tạo ca làm việc chuẩn (work_shifts) cho Kỳ thực tập 1...")
            db.execute(text(
                "INSERT INTO work_shifts (program_id, group_id, group_name, shift_type, start_time, end_time, days_of_week, flexible_minutes, is_active) VALUES "
                "(1, NULL, 'Ca Sáng tiêu chuẩn (08:00 - 12:00)', 'morning', '08:00:00', '12:00:00', '2,3,4,5,6', 15, 1),"
                "(1, NULL, 'Ca Chiều tiêu chuẩn (13:30 - 17:30)', 'afternoon', '13:30:00', '17:30:00', '2,3,4,5,6', 15, 1)"
            ))
            db.commit()

        # Sinh lịch làm việc tuần thật từ cấu hình nhóm cho TTS và Mentor
        schedules_count = db.execute(text("SELECT count(*) FROM weekly_work_schedules")).scalar()
        if schedules_count == 0:
            print("  -> Tự động sinh lịch làm việc theo nhóm (weekly_work_schedules) cho TTS và Mentor...")
            from app.services.weekly_schedule_service import WeeklyScheduleService
            WeeklyScheduleService(db).generate_schedules_from_group_shifts(
                program_id=1,
                start_date=date(2026, 10, 1),
                end_date=date(2026, 10, 31),
                created_by_id=2,
            )

        # Đảm bảo đơn nghỉ phép mẫu (leave_requests)
        leave_count = db.execute(text("SELECT count(*) FROM leave_requests")).scalar()
        if leave_count == 0:
            print("  -> Khởi tạo đơn xin nghỉ phép mẫu...")
            db.execute(text(
                "INSERT INTO leave_requests (user_id, request_code, intern_id, intern_name, intern_code, intern_email, leave_type, start_date, end_date, session, duration, reason, created_date, status, status_label, approver) "
                "VALUES (5, 'NP-2026-001', 5, 'Nguyễn Văn An', 'TTS0001', 'intern@ictu.edu.vn', 'Nghỉ học môn thi tốt nghiệp', '24/10/2026', '24/10/2026', 'Ca sáng (08:00 - 12:00)', '0.5 ngày', 'Trùng lịch thi kết thúc học phần tại trường ICTU', '20/10/2026', 'pending', 'Chờ duyệt', 'Chờ duyệt')"
            ))
            db.commit()

        print("[OK] Hoàn tất quá trình tự động cập nhật và đồng bộ CSDL!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Quá trình cập nhật CSDL gặp lỗi: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=== BẮT ĐẦU AUTO MIGRATE VÀ ĐỒNG BỘ DỮ LIỆU ===")
    sync_schema()
    sync_data()
    print("=== KẾT THÚC AUTO MIGRATE THÀNH CÔNG ===")
