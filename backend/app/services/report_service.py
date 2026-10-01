from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.program_member import ProgramMember
from app.models.weekly_report import WeeklyReport
from app.schemas.report import ReportSubmitResponse
from app.services.file_validator import validate_upload_file

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "reports"


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def submit_report(
        self,
        user_id: int,
        content: str,
        week_start: date,
        week_end: date,
        file: UploadFile | None,
    ) -> ReportSubmitResponse:
        cleaned = content.strip()
        if not cleaned:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Nội dung báo cáo không được để trống.",
            )
        if week_end < week_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Ngày kết thúc tuần không thể trước ngày bắt đầu.",
            )

        member = (
            self.db.query(ProgramMember)
            .filter(ProgramMember.intern_user_id == user_id)
            .order_by(ProgramMember.id.desc())
            .first()
        )
        program_id = member.program_id if member else None
        week_number = week_start.isocalendar().week

        existing = (
            self.db.query(WeeklyReport)
            .filter(
                WeeklyReport.user_id == user_id,
                WeeklyReport.week_number == week_number,
                WeeklyReport.program_id == program_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã nộp báo cáo cho tuần {week_number} rồi.",
            )

        attachment_path: str | None = None
        dest: Path | None = None
        if file is not None and file.filename:
            payload = validate_upload_file(file)
            UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
            safe_name = Path(file.filename).name
            stored_name = f"{user_id}_{uuid4().hex}_{safe_name}"
            dest = UPLOAD_ROOT / stored_name
            dest.write_bytes(payload)
            attachment_path = f"uploads/reports/{stored_name}"

        report = WeeklyReport(
            user_id=user_id,
            program_id=program_id,
            week_number=week_number,
            start_date=week_start,
            end_date=week_end,
            title=f"Báo cáo tuần {week_number}",
            content=cleaned,
            attachment_path=attachment_path,
            status="submitted",
        )
        try:
            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)
        except HTTPException:
            raise
        except Exception:
            self.db.rollback()
            if dest is not None and dest.exists():
                dest.unlink()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể lưu báo cáo tuần.",
            ) from None

        return ReportSubmitResponse(
            id=report.id,
            content=report.content,
            week_start=report.start_date,
            week_end=report.end_date,
            week_number=report.week_number,
            attachment_path=report.attachment_path,
        )
