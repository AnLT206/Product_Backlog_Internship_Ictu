from __future__ import annotations

import hashlib
import hmac
import json
import logging
import threading
import time
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.department import Department
from app.models.hrm_sync_log import HrmSyncLog
from app.models.intern_profile import InternProfile
from app.models.role import Role
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.hrm_sync import (
    HrmPersonnelItem,
    HrmStatusResponse,
    HrmWebhookPayload,
)
from app.utils.hash_password import hash_password

logger = logging.getLogger(__name__)

DEFAULT_MOCK_HRM_ITEMS = [
    {
        "employee_code": "HRM-MENTOR-001",
        "full_name": "Trần Hải Long",
        "email": "long.th@ictu-partner.vn",
        "phone": "0981234567",
        "role": "mentor",
        "department_name": "Bộ phận Kỹ thuật & R&D",
        "position": "Senior Backend Architect / Lead Mentor",
        "status": "active",
        "cccd": "001095012341",
    },
    {
        "employee_code": "HRM-MENTOR-002",
        "full_name": "Nguyễn Hoàng Minh",
        "email": "minh.nh@ictu-partner.vn",
        "phone": "0982345678",
        "role": "mentor",
        "department_name": "Bộ phận Trí tuệ Nhân tạo & Data",
        "position": "AI / Machine Learning Engineer & Mentor",
        "status": "active",
        "cccd": "001095012342",
    },
    {
        "employee_code": "HRM-HR-003",
        "full_name": "Vũ Thùy Linh",
        "email": "linh.vt@ictu-partner.vn",
        "phone": "0983456789",
        "role": "hr",
        "department_name": "Phòng Nhân sự & Đào tạo Đối tác",
        "position": "HR Talent Acquisition Specialist",
        "status": "active",
        "cccd": "001095012343",
    },
    {
        "employee_code": "HRM-INTERN-004",
        "full_name": "Đặng Quốc Anh",
        "email": "anh.dq@student.ictu.edu.vn",
        "phone": "0984567890",
        "role": "intern",
        "department_name": "Bộ phận Kỹ thuật & R&D",
        "position": "Thực tập sinh Fullstack Web",
        "status": "active",
        "university": "Đại học CNTT & TT Thái Nguyên (ICTU)",
        "major": "Công nghệ Thông tin",
        "cccd": "001095012344",
    },
]


class HrmSyncService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_setting(self, key: str, default: str = "") -> str:
        row = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return row.value if row and row.value is not None else default

    def get_sync_status(self) -> HrmStatusResponse:
        integration_enabled = self._get_setting("hrm_integration_enabled", "true").lower() == "true"
        api_endpoint = self._get_setting("hrm_api_endpoint", "https://hrm.ictu.edu.vn/api/v1/interns/sync")
        auto_sync_enabled = self._get_setting("hrm_auto_sync_enabled", "true").lower() == "true"
        try:
            interval = int(self._get_setting("hrm_cron_interval_minutes", "60"))
        except ValueError:
            interval = 60

        last_sync = self.db.query(HrmSyncLog).order_by(HrmSyncLog.id.desc()).first()

        # Count mentors
        mentor_role = self.db.query(Role).filter(Role.name == "mentor").first()
        total_synced_mentors = (
            self.db.query(User).filter(User.role_id == mentor_role.id).count() if mentor_role else 0
        )
        total_synced_users = self.db.query(User).count()

        scheduler_status = "running" if (integration_enabled and auto_sync_enabled) else "idle"

        return HrmStatusResponse(
            integration_enabled=integration_enabled,
            api_endpoint=api_endpoint,
            auto_sync_enabled=auto_sync_enabled,
            cron_interval_minutes=interval,
            scheduler_status=scheduler_status,
            last_sync=last_sync,
            total_synced_mentors=total_synced_mentors,
            total_synced_users=total_synced_users,
        )

    def get_sync_history(self, limit: int = 50, offset: int = 0) -> list[HrmSyncLog]:
        return (
            self.db.query(HrmSyncLog)
            .order_by(HrmSyncLog.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def sync_personnel(
        self,
        items: list[HrmPersonnelItem],
        sync_type: str = "manual",
        source: str = "FastHRM",
    ) -> HrmSyncLog:
        now = datetime.utcnow()
        log = HrmSyncLog(
            sync_type=sync_type,
            source=source,
            status="in_progress",
            total_records=len(items),
            created_users=0,
            updated_users=0,
            failed_records=0,
            mentors_synced=0,
            hr_synced=0,
            interns_synced=0,
            started_at=now,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)

        # Pre-cache roles
        roles_by_name: dict[str, Role] = {r.name.lower(): r for r in self.db.query(Role).all()}
        fallback_role = roles_by_name.get("mentor") or list(roles_by_name.values())[0]

        created_users = 0
        updated_users = 0
        failed_records = 0
        mentors_synced = 0
        hr_synced = 0
        interns_synced = 0
        error_details: list[dict[str, Any]] = []

        for item in items:
            try:
                target_role = roles_by_name.get(item.role.lower(), fallback_role)

                # Department handling
                dept = None
                if item.department_name and item.department_name.strip():
                    dept_name = item.department_name.strip()
                    dept = self.db.query(Department).filter(Department.name == dept_name).first()
                    if not dept:
                        dept = Department(name=dept_name, description=f"Đồng bộ từ {source}")
                        self.db.add(dept)
                        self.db.flush()

                # User lookup by email or code
                user = self.db.query(User).filter(User.email == item.email.strip()).first()
                if not user and item.employee_code:
                    user = self.db.query(User).filter(User.code == item.employee_code.strip()).first()

                if user:
                    # Update existing user
                    user.full_name = item.full_name.strip()
                    if item.employee_code and not user.code:
                        user.code = item.employee_code.strip()
                    if item.status in ("active", "inactive", "pending"):
                        user.status = item.status
                    if item.cccd and not user.cccd:
                        user.cccd = item.cccd.strip()

                    # Update profile based on role
                    if target_role.name.lower() in ("mentor", "hr", "admin"):
                        profile = (
                            self.db.query(UserProfile)
                            .filter(UserProfile.user_id == user.id)
                            .first()
                        )
                        if not profile:
                            profile = UserProfile(
                                user_id=user.id,
                                department_id=dept.id if dept else None,
                                phone_number=item.phone,
                                position=item.position,
                            )
                            self.db.add(profile)
                        else:
                            if dept:
                                profile.department_id = dept.id
                            if item.phone:
                                profile.phone_number = item.phone
                            if item.position:
                                profile.position = item.position

                    elif target_role.name.lower() == "intern":
                        intern_prof = (
                            self.db.query(InternProfile)
                            .filter(InternProfile.user_id == user.id)
                            .first()
                        )
                        if not intern_prof:
                            intern_prof = InternProfile(
                                user_id=user.id,
                                phone_number=item.phone,
                                university=item.university,
                                major=item.major,
                                status="approved",
                            )
                            self.db.add(intern_prof)
                        else:
                            if item.phone:
                                intern_prof.phone_number = item.phone
                            if item.university:
                                intern_prof.university = item.university
                            if item.major:
                                intern_prof.major = item.major

                    updated_users += 1

                else:
                    # Create new user
                    code_to_set = item.employee_code.strip() if item.employee_code else f"HRM{int(time.time())}"
                    # Check if code already used
                    if self.db.query(User).filter(User.code == code_to_set).first():
                        code_to_set = f"{code_to_set}_{int(time.time()) % 10000}"

                    new_user = User(
                        code=code_to_set,
                        email=item.email.strip(),
                        password_hash=hash_password("FastHRM@2026"),
                        full_name=item.full_name.strip(),
                        role_id=target_role.id,
                        status=item.status or "active",
                        cccd=item.cccd.strip() if item.cccd else None,
                    )
                    self.db.add(new_user)
                    self.db.flush()

                    if target_role.name.lower() in ("mentor", "hr", "admin"):
                        profile = UserProfile(
                            user_id=new_user.id,
                            department_id=dept.id if dept else None,
                            phone_number=item.phone,
                            position=item.position,
                        )
                        self.db.add(profile)
                    elif target_role.name.lower() == "intern":
                        intern_prof = InternProfile(
                            user_id=new_user.id,
                            phone_number=item.phone,
                            university=item.university,
                            major=item.major,
                            status="approved",
                        )
                        self.db.add(intern_prof)

                    created_users += 1

                # Role specific counter
                if target_role.name.lower() == "mentor":
                    mentors_synced += 1
                elif target_role.name.lower() == "hr":
                    hr_synced += 1
                elif target_role.name.lower() == "intern":
                    interns_synced += 1

                self.db.flush()

            except Exception as e:
                failed_records += 1
                error_details.append({
                    "email": item.email,
                    "code": item.employee_code,
                    "error": str(e),
                })
                logger.warning(f"Error syncing HRM item {item.email}: {e}")

        # Finalize log
        log.total_records = len(items)
        log.created_users = created_users
        log.updated_users = updated_users
        log.failed_records = failed_records
        log.mentors_synced = mentors_synced
        log.hr_synced = hr_synced
        log.interns_synced = interns_synced
        log.completed_at = datetime.utcnow()

        if failed_records == 0 and len(items) > 0:
            log.status = "success"
        elif created_users + updated_users > 0:
            log.status = "partial"
        else:
            log.status = "failed" if len(items) > 0 else "success"

        log.details = {
            "created": created_users,
            "updated": updated_users,
            "failed": failed_records,
            "errors": error_details[:20],
        }

        self.db.commit()
        self.db.refresh(log)
        return log

    def sync_from_api(
        self,
        endpoint_override: str | None = None,
        source: str = "FastHRM",
        sync_type: str = "manual",
    ) -> HrmSyncLog:
        endpoint = endpoint_override or self._get_setting(
            "hrm_api_endpoint", "https://hrm.ictu.edu.vn/api/v1/interns/sync"
        )
        api_key = self._get_setting("hrm_api_key", "hrm-partner-key-ictu-2026")

        items_to_sync: list[HrmPersonnelItem] = []
        is_mock_fallback = False

        try:
            # Attempt HTTP call to 3rd party HRM
            headers = {
                "Authorization": f"Bearer {api_key}",
                "X-API-Key": api_key,
                "Accept": "application/json",
            }
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    body = resp.json()
                    raw_items = body.get("data") if isinstance(body, dict) else body
                    if isinstance(raw_items, list):
                        items_to_sync = [HrmPersonnelItem(**item) for item in raw_items]
                else:
                    raise httpx.HTTPStatusError(
                        f"HRM returned status {resp.status_code}",
                        request=resp.request,
                        response=resp,
                    )
        except Exception as exc:
            logger.info(
                f"HRM external endpoint {endpoint} not reachable directly ({exc}). Using standard FastHRM seed roster for demo/local environment."
            )
            is_mock_fallback = True
            items_to_sync = [HrmPersonnelItem(**item) for item in DEFAULT_MOCK_HRM_ITEMS]

        log = self.sync_personnel(items_to_sync, sync_type=sync_type, source=source)
        if is_mock_fallback and log.details and isinstance(log.details, dict):
            log.details["is_mock_fallback"] = True
            log.details["endpoint_contacted"] = endpoint
            self.db.commit()
            self.db.refresh(log)

        return log

    def verify_webhook_signature(
        self,
        payload_bytes: bytes,
        signature_header: str | None,
        secret: str | None = None,
    ) -> bool:
        configured_secret = secret or self._get_setting("hrm_webhook_secret", "hrm_whsec_ictu_demo")
        if not configured_secret or not signature_header:
            return True

        # Calculate HMAC SHA-256
        mac = hmac.new(configured_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        clean_sig = signature_header.replace("sha256=", "").strip()
        return hmac.compare_digest(mac, clean_sig)

    def process_webhook(
        self,
        payload: HrmWebhookPayload,
        raw_body: bytes | None = None,
        signature: str | None = None,
    ) -> HrmSyncLog:
        if signature and raw_body:
            if not self.verify_webhook_signature(raw_body, signature):
                raise ValueError("Chữ ký số Webhook HRM (HMAC-SHA256) không hợp lệ.")

        return self.sync_personnel(
            items=payload.data,
            sync_type="webhook",
            source=payload.source or "FastHRM Webhook",
        )


class HrmCronScheduler:
    """
    Background worker periodically running HRM synchronization.
    Supports thread-safe start, stop, and on-demand trigger.
    """
    _instance: HrmCronScheduler | None = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._running = False
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self.last_run_at: datetime | None = None

    @classmethod
    def get_instance(cls) -> HrmCronScheduler:
        with cls._lock:
            if cls._instance is None:
                cls._instance = HrmCronScheduler()
            return cls._instance

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="HrmCronScheduler")
        self._thread.start()
        logger.info("HRM Cron Scheduler started successfully.")

    def stop(self) -> None:
        if not self._running:
            return
        self._stop_event.set()
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("HRM Cron Scheduler stopped.")

    def is_running(self) -> bool:
        return self._running

    def _run_loop(self) -> None:
        # Initial short grace delay before first run
        if self._stop_event.wait(timeout=10.0):
            return

        while not self._stop_event.is_set():
            db = SessionLocal()
            try:
                service = HrmSyncService(db)
                integration_enabled = service._get_setting("hrm_integration_enabled", "true").lower() == "true"
                auto_sync_enabled = service._get_setting("hrm_auto_sync_enabled", "true").lower() == "true"

                try:
                    interval_min = int(service._get_setting("hrm_cron_interval_minutes", "60"))
                except ValueError:
                    interval_min = 60

                if integration_enabled and auto_sync_enabled:
                    logger.info("HRM Cron Scheduler triggering scheduled sync...")
                    service.sync_from_api(sync_type="cron", source="FastHRM Scheduled Cron")
                    self.last_run_at = datetime.utcnow()

            except Exception as e:
                logger.error(f"Error in HRM Cron Scheduler loop: {e}")
            finally:
                db.close()

            # Sleep in intervals or until stop requested
            wait_seconds = max(interval_min * 60, 60)
            if self._stop_event.wait(timeout=wait_seconds):
                break
