from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.hrm_sync import (
    ConflictStrategy,
    HrmPersonnelItem,
    ReconciliationItemDetail,
    ReconciliationSummary,
)
from app.utils.hash_password import hash_password

logger = logging.getLogger(__name__)


class HrmReconciliationService:
    """
    Dịch vụ đối soát trùng lặp tài khoản (Deduplication & Conflict Reconciliation)
    và điều phối đồng bộ vào bảng Users, UserProfiles, InternProfiles.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def analyze_reconciliation(
        self,
        items: list[HrmPersonnelItem],
        conflict_strategy: ConflictStrategy = "update",
    ) -> tuple[ReconciliationSummary, list[ReconciliationItemDetail]]:
        """
        Đối soát danh sách nhân sự đối chiếu với cơ sở dữ liệu hệ thống.
        Không thay đổi dữ liệu trong database (Dry-Run / Preview mode).
        """
        summary = ReconciliationSummary(total_input=len(items))
        details: list[ReconciliationItemDetail] = []

        # Theo dõi trùng lặp nội bộ trong cùng 1 batch
        seen_emails: dict[str, int] = {}
        seen_codes: dict[str, int] = {}
        seen_cccds: dict[str, int] = {}

        for idx, item in enumerate(items):
            email_clean = item.email.strip().lower()
            code_clean = item.employee_code.strip() if item.employee_code else None
            cccd_clean = item.cccd.strip() if item.cccd else None

            # Đếm vai trò
            if item.role == "mentor":
                summary.mentors_count += 1
            elif item.role == "hr":
                summary.hr_count += 1
            elif item.role == "intern":
                summary.interns_count += 1

            # 1. Kiểm tra trùng lặp trong batch
            conflict_detected = False
            conflict_reason: str | None = None

            if email_clean in seen_emails:
                conflict_detected = True
                conflict_reason = f"Email bị trùng lặp nhiều lần trong danh sách gửi lên (bản ghi #{seen_emails[email_clean] + 1})"
            elif cccd_clean and cccd_clean in seen_cccds:
                conflict_detected = True
                conflict_reason = f"CCCD bị trùng lặp nhiều lần trong danh sách gửi lên (bản ghi #{seen_cccds[cccd_clean] + 1})"
            elif code_clean and code_clean in seen_codes:
                conflict_detected = True
                conflict_reason = f"Mã nhân sự '{code_clean}' bị trùng lặp trong danh sách gửi lên"

            seen_emails[email_clean] = idx
            if code_clean:
                seen_codes[code_clean] = idx
            if cccd_clean:
                seen_cccds[cccd_clean] = idx

            # 2. Đối soát đa tiêu chí với cơ sở dữ liệu
            user_by_email = self.db.query(User).filter(User.email == email_clean).first()
            user_by_cccd = (
                self.db.query(User).filter(User.cccd == cccd_clean).first()
                if cccd_clean
                else None
            )
            user_by_code = (
                self.db.query(User).filter(User.code == code_clean).first()
                if code_clean
                else None
            )

            # Phát hiện xung đột chéo (Cross-field conflicts)
            if user_by_email and user_by_cccd and user_by_email.id != user_by_cccd.id:
                conflict_detected = True
                conflict_reason = (
                    f"Xung đột nghiêm trọng: Email thuộc tài khoản ID {user_by_email.id} ({user_by_email.full_name}), "
                    f"nhưng CCCD lại thuộc tài khoản ID {user_by_cccd.id} ({user_by_cccd.full_name})."
                )
            elif not user_by_email and user_by_cccd and user_by_cccd.email != email_clean:
                conflict_detected = True
                conflict_reason = (
                    f"Xung đột định danh: CCCD '{cccd_clean}' đang thuộc về tài khoản ID {user_by_cccd.id} "
                    f"({user_by_cccd.email}), nhưng email gửi lên lại là '{email_clean}'."
                )

            if user_by_email and user_by_code and user_by_email.id != user_by_code.id:
                conflict_detected = True
                conflict_reason = (
                    f"Xung đột mã: Email thuộc tài khoản ID {user_by_email.id}, "
                    f"nhưng mã nhân sự '{code_clean}' đang được gán cho tài khoản ID {user_by_code.id} ({user_by_code.email})."
                )
            elif not user_by_email and user_by_code and user_by_code.email != email_clean:
                conflict_detected = True
                conflict_reason = (
                    f"Xung đột mã: Mã nhân sự '{code_clean}' đang được gán cho tài khoản ID {user_by_code.id} "
                    f"({user_by_code.email}), nhưng email gửi lên là '{email_clean}'."
                )


            # Xác định tài khoản trùng khớp chính
            matched_user: User | None = user_by_email or user_by_cccd or user_by_code
            matched_by: str = "none"

            if user_by_email:
                matched_by = "email"
            elif user_by_cccd:
                matched_by = "cccd"
            elif user_by_code:
                matched_by = "code"

            # 3. Tính toán Diff Fields nếu tìm thấy tài khoản cũ
            diff_fields: dict[str, Any] = {}
            action: str = "create"

            if matched_user:
                # Kiểm tra khác biệt
                if (matched_user.full_name or "").strip() != item.full_name.strip():
                    diff_fields["full_name"] = {
                        "old": matched_user.full_name,
                        "new": item.full_name,
                    }
                if item.status and matched_user.status != item.status:
                    diff_fields["status"] = {
                        "old": matched_user.status,
                        "new": item.status,
                    }
                if cccd_clean and matched_user.cccd != cccd_clean:
                    diff_fields["cccd"] = {
                        "old": matched_user.cccd,
                        "new": cccd_clean,
                    }
                if code_clean and matched_user.code != code_clean:
                    diff_fields["code"] = {
                        "old": matched_user.code,
                        "new": code_clean,
                    }

                # Phân loại hành động theo chiến lược
                if conflict_strategy == "update":
                    action = "update"
                    summary.to_update += 1
                elif conflict_strategy == "merge":
                    action = "merge"
                    summary.to_merge += 1
                elif conflict_strategy == "skip":
                    action = "skip"
                    summary.to_skip += 1
            else:
                action = "create"
                summary.to_create += 1

            if conflict_detected:
                summary.conflicts_count += 1

            details.append(
                ReconciliationItemDetail(
                    index=idx,
                    employee_code=item.employee_code,
                    email=item.email,
                    full_name=item.full_name,
                    role=item.role,
                    is_existing=matched_user is not None,
                    matched_user_id=matched_user.id if matched_user else None,
                    matched_by=matched_by,
                    conflict_detected=conflict_detected,
                    conflict_reason=conflict_reason,
                    action=action,
                    diff_fields=diff_fields if diff_fields else None,
                )
            )

        return summary, details

    def execute_sync_with_reconciliation(
        self,
        items: list[HrmPersonnelItem],
        conflict_strategy: ConflictStrategy = "update",
        source: str = "FastHRM",
    ) -> tuple[dict[str, int], list[dict[str, Any]]]:
        """
        Thực thi đồng bộ vào bảng Users, UserProfiles, InternProfiles, Departments
        theo chiến lược đối soát trùng lặp đã chọn.
        """
        summary, plan_details = self.analyze_reconciliation(items, conflict_strategy)

        # Pre-cache roles
        roles_by_name: dict[str, Role] = {r.name.lower(): r for r in self.db.query(Role).all()}
        fallback_role = roles_by_name.get("mentor") or list(roles_by_name.values())[0]

        created_count = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0
        mentors_synced = 0
        hr_synced = 0
        interns_synced = 0
        error_items: list[dict[str, Any]] = []

        for idx, item in enumerate(items):
            plan = plan_details[idx]
            try:
                target_role = roles_by_name.get(item.role.lower(), fallback_role)

                # Department handling
                dept = None
                if item.department_name and item.department_name.strip():
                    dept_name = item.department_name.strip()
                    dept = self.db.query(Department).filter(Department.name == dept_name).first()
                    if not dept:
                        dept = Department(name=dept_name, description=f"Tự động tạo từ đồng bộ {source}")
                        self.db.add(dept)
                        self.db.flush()

                # Action: SKIP
                if plan.action == "skip":
                    skipped_count += 1
                    continue

                # Action: UPDATE or MERGE
                if plan.action in ("update", "merge") and plan.matched_user_id:
                    user = self.db.query(User).filter(User.id == plan.matched_user_id).first()
                    if not user:
                        # Fallback nếu không tìm thấy
                        user = self.db.query(User).filter(User.email == item.email.strip().lower()).first()

                    if user:
                        is_merge = plan.action == "merge"

                        # Cập nhật thông tin User
                        if is_merge:
                            if not user.full_name:
                                user.full_name = item.full_name.strip()
                            if not user.code and item.employee_code:
                                # Đảm bảo code không trùng với user khác
                                if not self.db.query(User).filter(User.code == item.employee_code.strip(), User.id != user.id).first():
                                    user.code = item.employee_code.strip()
                            if not user.cccd and item.cccd:
                                if not self.db.query(User).filter(User.cccd == item.cccd.strip(), User.id != user.id).first():
                                    user.cccd = item.cccd.strip()
                        else:
                            # Update ghi đè thông tin mới
                            user.full_name = item.full_name.strip()
                            if item.employee_code:
                                # Kiểm tra trùng code trước khi gán
                                code_conflict = self.db.query(User).filter(User.code == item.employee_code.strip(), User.id != user.id).first()
                                if not code_conflict:
                                    user.code = item.employee_code.strip()
                            if item.cccd:
                                cccd_conflict = self.db.query(User).filter(User.cccd == item.cccd.strip(), User.id != user.id).first()
                                if not cccd_conflict:
                                    user.cccd = item.cccd.strip()
                            if item.status:
                                user.status = item.status

                        # Cập nhật Profiles
                        if target_role.name.lower() in ("mentor", "hr", "admin"):
                            profile = self.db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
                            if not profile:
                                profile = UserProfile(
                                    user_id=user.id,
                                    department_id=dept.id if dept else None,
                                    phone_number=item.phone,
                                    position=item.position,
                                    dob=item.dob if isinstance(item.dob, datetime) else item.dob,
                                )
                                self.db.add(profile)
                            else:
                                if is_merge:
                                    if not profile.department_id and dept:
                                        profile.department_id = dept.id
                                    if not profile.phone_number and item.phone:
                                        profile.phone_number = item.phone
                                    if not profile.position and item.position:
                                        profile.position = item.position
                                    if not profile.dob and item.dob:
                                        profile.dob = item.dob
                                else:
                                    if dept:
                                        profile.department_id = dept.id
                                    if item.phone:
                                        profile.phone_number = item.phone
                                    if item.position:
                                        profile.position = item.position
                                    if item.dob:
                                        profile.dob = item.dob

                        elif target_role.name.lower() == "intern":
                            intern_prof = self.db.query(InternProfile).filter(InternProfile.user_id == user.id).first()
                            if not intern_prof:
                                intern_prof = InternProfile(
                                    user_id=user.id,
                                    phone_number=item.phone,
                                    dob=item.dob if isinstance(item.dob, datetime) else item.dob,
                                    university=item.university,
                                    major=item.major,
                                    status="approved",
                                )
                                self.db.add(intern_prof)
                            else:
                                if is_merge:
                                    if not intern_prof.phone_number and item.phone:
                                        intern_prof.phone_number = item.phone
                                    if not intern_prof.university and item.university:
                                        intern_prof.university = item.university
                                    if not intern_prof.major and item.major:
                                        intern_prof.major = item.major
                                    if not intern_prof.dob and item.dob:
                                        intern_prof.dob = item.dob
                                else:
                                    if item.phone:
                                        intern_prof.phone_number = item.phone
                                    if item.university:
                                        intern_prof.university = item.university
                                    if item.major:
                                        intern_prof.major = item.major
                                    if item.dob:
                                        intern_prof.dob = item.dob

                        updated_count += 1

                # Action: CREATE
                elif plan.action == "create":
                    code_val = item.employee_code.strip() if item.employee_code else None
                    if code_val and self.db.query(User).filter(User.code == code_val).first():
                        code_val = f"HRM{int(datetime.utcnow().timestamp()) % 1000000:06d}"

                    cccd_val = item.cccd.strip() if item.cccd else None
                    if cccd_val and self.db.query(User).filter(User.cccd == cccd_val).first():
                        cccd_val = None  # Tránh vi phạm unique constraint nếu bị trùng

                    new_user = User(
                        code=code_val or f"HRM{int(datetime.utcnow().timestamp()) % 1000000:06d}",
                        email=item.email.strip().lower(),
                        password_hash=hash_password("FastHRM@2026"),
                        full_name=item.full_name.strip(),
                        role_id=target_role.id,
                        status=item.status or "active",
                        cccd=cccd_val,
                    )
                    self.db.add(new_user)
                    self.db.flush()

                    if target_role.name.lower() in ("mentor", "hr", "admin"):
                        profile = UserProfile(
                            user_id=new_user.id,
                            department_id=dept.id if dept else None,
                            phone_number=item.phone,
                            position=item.position,
                            dob=item.dob if isinstance(item.dob, datetime) else item.dob,
                        )
                        self.db.add(profile)
                    elif target_role.name.lower() == "intern":
                        intern_prof = InternProfile(
                            user_id=new_user.id,
                            phone_number=item.phone,
                            dob=item.dob if isinstance(item.dob, datetime) else item.dob,
                            university=item.university,
                            major=item.major,
                            status="approved",
                        )
                        self.db.add(intern_prof)

                    created_count += 1

                # Thống kê theo role đã sync
                if target_role.name.lower() == "mentor":
                    mentors_synced += 1
                elif target_role.name.lower() == "hr":
                    hr_synced += 1
                elif target_role.name.lower() == "intern":
                    interns_synced += 1

                self.db.flush()

            except Exception as e:
                failed_count += 1
                error_items.append({
                    "email": item.email,
                    "code": item.employee_code,
                    "error": str(e),
                })
                logger.error(f"Error in reconciliation execution for {item.email}: {e}")

        counts = {
            "total_records": len(items),
            "created_users": created_count,
            "updated_users": updated_count,
            "skipped_users": skipped_count,
            "failed_records": failed_count,
            "mentors_synced": mentors_synced,
            "hr_synced": hr_synced,
            "interns_synced": interns_synced,
            "conflicts_count": summary.conflicts_count,
        }
        return counts, error_items
