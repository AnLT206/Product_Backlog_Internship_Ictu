"""Tests tích hợp cho Tiếp nhận log quét thẻ/QR ngoại vi và Giải thuật phân tích chấm công (SCRUM-242, SCRUM-243)."""

from collections.abc import Generator
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models.attendance import Attendance
from app.models.attendance_raw_log import AttendanceRawLog
from app.models.internship_program import InternshipProgram
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.work_shift import WorkShift
from app.utils.authenticate_login import create_access_token
import app.models as _models  # noqa: F401


@pytest.fixture
def raw_attendance_client() -> Generator[tuple[TestClient, sessionmaker], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, autoflush=False)
    Base.metadata.create_all(engine)

    with session_factory() as db:
        role_admin = Role(id=1, name="admin", description="Admin")
        role_hr = Role(id=2, name="hr", description="HR")
        role_intern = Role(id=3, name="intern", description="Intern")
        db.add_all([role_admin, role_hr, role_intern])
        db.flush()

        # Admin user (id=1)
        admin = User(
            id=1,
            code="ADM001",
            email="admin@company.com",
            password_hash="x",
            full_name="System Admin",
            role_id=role_admin.id,
            status="active",
        )
        # Intern 1 (id=10)
        intern1 = User(
            id=10,
            code="TTS2026_01",
            email="tts01@company.com",
            password_hash="x",
            full_name="Lê Tâm An",
            role_id=role_intern.id,
            status="active",
        )
        # Intern 2 (id=11)
        intern2 = User(
            id=11,
            code="TTS2026_02",
            email="tts02@company.com",
            password_hash="x",
            full_name="Nguyễn Văn Minh",
            role_id=role_intern.id,
            status="active",
        )
        db.add_all([admin, intern1, intern2])
        db.flush()

        # Chương trình thực tập & phân bổ
        program = InternshipProgram(
            id=1,
            name="Chương trình AI & Cloud K2026",
            department="Trung tâm R&D",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            max_interns=30,
            is_deleted=False,
        )
        db.add(program)
        db.flush()

        pm1 = ProgramMember(
            program_id=program.id,
            intern_user_id=intern1.id,
            status="in_progress",
        )
        pm2 = ProgramMember(
            program_id=program.id,
            intern_user_id=intern2.id,
            status="in_progress",
        )
        db.add_all([pm1, pm2])
        db.flush()

        # Ca làm việc chuẩn: 08:30 - 17:30, linh hoạt 15 phút, từ Thứ 2 đến Thứ 7 (1,2,3,4,5,6)
        shift = WorkShift(
            id=1,
            program_id=program.id,
            group_name="Ca hành chính tiêu chuẩn",
            start_time=time(8, 30),
            end_time=time(17, 30),
            flexible_minutes=15,
            days_of_week="1,2,3,4,5,6,7",
            is_active=True,
        )
        db.add(shift)
        db.commit()

    def override_get_db():
        with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        yield tc, session_factory
    app.dependency_overrides.clear()


def _auth(user_id: int, role: str = "admin") -> dict[str, str]:
    token = create_access_token(user_id=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


# ── SCRUM-242: Tiếp nhận log quét mã QR / quẹt thẻ ngoại vi ─────────────────

def test_ingest_single_raw_log_success(raw_attendance_client):
    """Test SCRUM-242: Thiết bị ngoại vi gửi 1 log quét QR với user_code -> Hệ thống tự map user_id và lưu vào attendance_raw_logs."""
    client, session_factory = raw_attendance_client

    scan_dt = datetime(2026, 10, 15, 8, 20, 0)
    payload = {
        "device_id": "SCANNER_GATE_01",
        "device_ip": "192.168.1.105",
        "user_code": "TTS2026_01",
        "scan_time": scan_dt.isoformat(),
        "scan_type": "qr",
        "direction": "in",
        "raw_payload": '{"qr_code": "QR_ENCRYPTED_999", "gate": 1}',
    }

    resp = client.post("/api/attendance/raw-logs", json=payload, headers=_auth(1, "admin"))
    assert resp.status_code == 201

    data = resp.json()
    assert data["device_id"] == "SCANNER_GATE_01"
    assert data["user_code"] == "TTS2026_01"
    assert data["user_id"] == 10
    assert data["user_full_name"] == "Lê Tâm An"
    assert data["is_processed"] is False
    assert data["error_note"] is None

    # Xác nhận trong CSDL
    with session_factory() as db:
        saved_log = db.query(AttendanceRawLog).filter(AttendanceRawLog.id == data["id"]).first()
        assert saved_log is not None
        assert saved_log.user_id == 10


def test_ingest_raw_log_with_unknown_code(raw_attendance_client):
    """Test SCRUM-242: Thiết bị gửi user_code không tồn tại -> Lưu log kèm error_note cảnh báo."""
    client, session_factory = raw_attendance_client

    payload = {
        "device_id": "SCANNER_GATE_01",
        "user_code": "INVALID_CODE_XYZ",
        "scan_type": "rfid_card",
        "direction": "in",
    }
    resp = client.post("/api/attendance/raw-logs", json=payload, headers=_auth(1, "admin"))
    assert resp.status_code == 201

    data = resp.json()
    assert data["user_id"] is None
    assert "không tồn tại" in data["error_note"].lower()


def test_ingest_batch_raw_logs(raw_attendance_client):
    """Test SCRUM-242: Tiếp nhận lô (batch) nhiều bản ghi quét cùng lúc từ máy quẹt thẻ."""
    client, session_factory = raw_attendance_client

    batch_payload = {
        "device_id": "SCANNER_LOBBY_A",
        "logs": [
            {
                "device_id": "SCANNER_LOBBY_A",
                "user_code": "TTS2026_01",
                "scan_time": "2026-10-16T08:15:00",
                "scan_type": "qr",
                "direction": "in",
            },
            {
                "device_id": "SCANNER_LOBBY_A",
                "user_code": "TTS2026_02",
                "scan_time": "2026-10-16T08:25:00",
                "scan_type": "rfid_card",
                "direction": "in",
            },
            {
                "device_id": "SCANNER_LOBBY_A",
                "user_code": "UNKNOWN_USER",
                "scan_time": "2026-10-16T08:30:00",
                "scan_type": "rfid_card",
                "direction": "in",
            },
        ],
    }

    resp = client.post("/api/attendance/raw-logs/batch", json=batch_payload, headers=_auth(1, "admin"))
    assert resp.status_code == 201

    data = resp.json()
    assert data["received_count"] == 3
    assert data["success_count"] == 2
    assert data["failed_count"] == 1
    assert len(data["created_logs"]) == 3


def test_list_raw_logs(raw_attendance_client):
    """Test HR/Admin tra cứu danh sách logs thô có bộ lọc."""
    client, _ = raw_attendance_client

    # Thêm 1 log trước
    client.post(
        "/api/attendance/raw-logs",
        json={"device_id": "SCAN_TEST_99", "user_code": "TTS2026_01"},
        headers=_auth(1, "admin"),
    )

    resp = client.get("/api/attendance/raw-logs?device_id=SCAN_TEST_99", headers=_auth(1, "admin"))
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1
    assert logs[0]["device_id"] == "SCAN_TEST_99"


# ── SCRUM-243: Giải thuật phân tích log quét thẻ thô ─────────────────────────

def test_process_raw_logs_two_scans_calculates_hours_and_checkout(raw_attendance_client):
    """
    Test SCRUM-243:
    TTS quét thẻ 2 lần trong ngày:
    - Lần 1: 08:20 (sớm hơn 08:30) -> check_in_at = 08:20, status = "present"
    - Lần 2: 17:35 (sau 17:30) -> check_out_at = 17:35
    -> Tính total_hours = 9.25 giờ, upsert vào bảng Attendance chính thức, đánh dấu is_processed=True.
    """
    client, session_factory = raw_attendance_client

    day = "2026-10-20"
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T08:20:00",
            "direction": "in",
        },
        headers=_auth(1),
    )
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T17:35:00",
            "direction": "out",
        },
        headers=_auth(1),
    )

    # Kích hoạt giải thuật phân tích
    process_resp = client.post(
        "/api/attendance/process-raw-logs",
        json={"target_date": day},
        headers=_auth(1),
    )
    assert process_resp.status_code == 200

    p_data = process_resp.json()
    assert p_data["processed_logs_count"] == 2
    assert p_data["affected_users_count"] == 1
    assert p_data["attendance_created_count"] == 1
    assert len(p_data["details"]) == 1

    detail = p_data["details"][0]
    assert detail["user_id"] == 10
    assert detail["raw_scans_count"] == 2
    assert detail["check_in_at"] == f"{day}T08:20:00"
    assert detail["check_out_at"] == f"{day}T17:35:00"
    assert detail["total_hours"] == 9.25
    assert detail["status"] == "present"
    assert detail["action_taken"] == "created"

    # Kiểm tra trong bảng attendance chính thức
    with session_factory() as db:
        att = (
            db.query(Attendance)
            .filter(Attendance.user_id == 10, Attendance.work_date == date(2026, 10, 20))
            .first()
        )
        assert att is not None
        assert att.status == "present"
        assert float(att.total_hours) == 9.25

        # Kiểm tra cờ is_processed của raw logs
        raws = db.query(AttendanceRawLog).filter(AttendanceRawLog.user_id == 10).all()
        assert all(r.is_processed for r in raws)
        assert all(r.processed_at is not None for r in raws)


def test_process_raw_logs_late_arrival(raw_attendance_client):
    """
    Test SCRUM-243:
    Ca làm việc bắt đầu lúc 08:30, linh hoạt 15 phút (tối đa 08:45).
    TTS quét thẻ lúc 09:10 -> Hệ thống tự động phát hiện và tính status = "late".
    """
    client, session_factory = raw_attendance_client

    day = "2026-10-21"
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T09:10:00",
            "direction": "in",
        },
        headers=_auth(1),
    )
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T17:30:00",
            "direction": "out",
        },
        headers=_auth(1),
    )

    process_resp = client.post(
        "/api/attendance/process-raw-logs",
        json={"target_date": day},
        headers=_auth(1),
    )
    assert process_resp.status_code == 200
    detail = process_resp.json()["details"][0]
    assert detail["status"] == "late"


def test_process_raw_logs_half_day(raw_attendance_client):
    """
    Test SCRUM-243:
    TTS quét check-in lúc 08:00 và check-out lúc 11:30 (tổng 3.5 giờ < 4.0 giờ).
    -> Hệ thống gán status = "half_day".
    """
    client, session_factory = raw_attendance_client

    day = "2026-10-22"
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T08:00:00",
            "direction": "in",
        },
        headers=_auth(1),
    )
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_01",
            "scan_time": f"{day}T11:30:00",
            "direction": "out",
        },
        headers=_auth(1),
    )

    process_resp = client.post(
        "/api/attendance/process-raw-logs",
        json={"target_date": day},
        headers=_auth(1),
    )
    assert process_resp.status_code == 200
    detail = process_resp.json()["details"][0]
    assert detail["total_hours"] == 3.5
    assert detail["status"] == "half_day"


def test_process_raw_logs_single_scan_checkin_only(raw_attendance_client):
    """
    Test SCRUM-243:
    TTS chỉ quét thẻ 1 lần vào đầu giờ sáng (chưa quẹt về).
    -> Hệ thống ghi nhận check-in, check_out_at = None, total_hours = None.
    """
    client, _ = raw_attendance_client

    day = "2026-10-23"
    client.post(
        "/api/attendance/raw-logs",
        json={
            "device_id": "SCANNER_01",
            "user_code": "TTS2026_02",
            "scan_time": f"{day}T08:25:00",
            "direction": "in",
        },
        headers=_auth(1),
    )

    process_resp = client.post(
        "/api/attendance/process-raw-logs",
        json={"target_date": day},
        headers=_auth(1),
    )
    assert process_resp.status_code == 200
    detail = process_resp.json()["details"][0]
    assert detail["check_in_at"] == f"{day}T08:25:00"
    assert detail["check_out_at"] is None
    assert detail["total_hours"] is None
    assert detail["status"] == "present"


def test_process_raw_logs_idempotency(raw_attendance_client):
    """
    Test SCRUM-243:
    Chạy giải thuật lần 2 khi không có logs mới -> Báo không có log nào cần xử lý,
    bảng Attendance không bị duplicate bản ghi.
    """
    client, session_factory = raw_attendance_client

    day = "2026-10-24"
    client.post(
        "/api/attendance/raw-logs",
        json={"device_id": "SCANNER_01", "user_code": "TTS2026_01", "scan_time": f"{day}T08:10:00"},
        headers=_auth(1),
    )

    # Chạy lần 1
    resp1 = client.post("/api/attendance/process-raw-logs", json={"target_date": day}, headers=_auth(1))
    assert resp1.status_code == 200
    assert resp1.json()["processed_logs_count"] == 1

    # Chạy lần 2 (không reprocess) -> 0 logs cần xử lý
    resp2 = client.post("/api/attendance/process-raw-logs", json={"target_date": day}, headers=_auth(1))
    assert resp2.status_code == 200
    assert resp2.json()["processed_logs_count"] == 0

    # Xác nhận bảng Attendance chỉ có duy nhất 1 bản ghi cho TTS này trong ngày
    with session_factory() as db:
        count = (
            db.query(Attendance)
            .filter(Attendance.user_id == 10, Attendance.work_date == date(2026, 10, 24))
            .count()
        )
        assert count == 1
