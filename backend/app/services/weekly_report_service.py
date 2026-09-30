"""Service xử lý nghiệp vụ Báo cáo tuần & Phản hồi của Mentor (Tasks 8, 9)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.models.weekly_report import ReportFeedback, WeeklyReport
from app.schemas.weekly_report import (
    ReportFeedbackCreateRequest,
    ReportFeedbackResponse,
    WeeklyReportCreateRequest,
    WeeklyReportListResponse,
    WeeklyReportResponse,
)

TTS_ROLE_NAME = "intern"
MENTOR_ROLE_NAME = "mentor"
ADMIN_ROLE_NAME = "admin"


class WeeklyReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response(self, r: WeeklyReport) -> WeeklyReportResponse:
        user_name = r.user.full_name if r.user else None
        user_code = r.user.code if r.user else None
        program_name = r.program.name if r.program else None

        feedbacks = [
            ReportFeedbackResponse(
                id=fb.id,
                report_id=fb.report_id,
                mentor_id=fb.mentor_id,
                mentor_name=fb.mentor.full_name if fb.mentor else None,
                score=fb.score,
                comment=fb.comment,
                created_at=fb.created_at,
            )
            for fb in (r.feedbacks or [])
        ]

        return WeeklyReportResponse(
            id=r.id,
            user_id=r.user_id,
            user_code=user_code,
            user_name=user_name,
            program_id=r.program_id,
            program_name=program_name,
            week_number=r.week_number,
            start_date=r.start_date,
            end_date=r.end_date,
            title=r.title,
            content=r.content,
            difficulties=r.difficulties,
            next_week_plan=r.next_week_plan,
            status=r.status,
            feedbacks=feedbacks,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )

    def submit_report(
        self, user_id: int, payload: WeeklyReportCreateRequest
    ) -> WeeklyReportResponse:
        """Thực tập sinh nộp báo cáo tuần mới (Task 8)."""
        # Xác định kỳ thực tập
        program_id = payload.program_id
        if program_id is None:
            member = (
                self.db.query(ProgramMember)
                .filter(ProgramMember.intern_user_id == user_id)
                .order_by(ProgramMember.id.desc())
                .first()
            )
            if member:
                program_id = member.program_id

        # Kiểm tra trùng lặp tuần nộp báo cáo
        existing = (
            self.db.query(WeeklyReport)
            .filter(
                WeeklyReport.user_id == user_id,
                WeeklyReport.week_number == payload.week_number,
                WeeklyReport.program_id == program_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Bạn đã nộp báo cáo cho tuần {payload.week_number} rồi.",
            )

        new_report = WeeklyReport(
            user_id=user_id,
            program_id=program_id,
            week_number=payload.week_number,
            start_date=payload.start_date,
            end_date=payload.end_date,
            title=payload.title,
            content=payload.content,
            difficulties=payload.difficulties,
            next_week_plan=payload.next_week_plan,
            status="submitted",
        )
        self.db.add(new_report)
        self.db.commit()
        self.db.refresh(new_report)

        return self._to_response(new_report)

    def list_intern_reports(self, user_id: int) -> WeeklyReportListResponse:
        """Thực tập sinh xem danh sách các báo cáo tuần đã nộp."""
        reports = (
            self.db.query(WeeklyReport)
            .options(
                joinedload(WeeklyReport.user),
                joinedload(WeeklyReport.program),
                joinedload(WeeklyReport.feedbacks).joinedload(ReportFeedback.mentor),
            )
            .filter(WeeklyReport.user_id == user_id)
            .order_by(WeeklyReport.week_number.desc())
            .all()
        )
        items = [self._to_response(r) for r in reports]
        return WeeklyReportListResponse(items=items, total=len(items))

    def get_intern_report_by_id(self, user_id: int, report_id: int) -> WeeklyReportResponse:
        """Thực tập sinh xem chi tiết một báo cáo tuần."""
        report = (
            self.db.query(WeeklyReport)
            .options(
                joinedload(WeeklyReport.user),
                joinedload(WeeklyReport.program),
                joinedload(WeeklyReport.feedbacks).joinedload(ReportFeedback.mentor),
            )
            .filter(WeeklyReport.id == report_id, WeeklyReport.user_id == user_id)
            .first()
        )
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy báo cáo tuần.",
            )
        return self._to_response(report)

    def list_mentor_reports(
        self,
        mentor_user: User,
        intern_id: int | None = None,
        status_filter: str | None = None,
    ) -> WeeklyReportListResponse:
        """Mentor xem danh sách báo cáo của các TTS mình quản lý (Task 9)."""
        is_admin = mentor_user.role and mentor_user.role.name == ADMIN_ROLE_NAME

        query = self.db.query(WeeklyReport).options(
            joinedload(WeeklyReport.user),
            joinedload(WeeklyReport.program),
            joinedload(WeeklyReport.feedbacks).joinedload(ReportFeedback.mentor),
        )

        if not is_admin:
            # Lấy danh sách intern IDs do mentor này hướng dẫn
            managed_intern_ids = [
                m.intern_user_id
                for m in self.db.query(ProgramMember)
                .filter(ProgramMember.mentor_user_id == mentor_user.id)
                .all()
            ]
            if intern_id is not None and intern_id not in managed_intern_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn chỉ có thể xem báo cáo của thực tập sinh do mình phụ trách.",
                )
            if not managed_intern_ids:
                return WeeklyReportListResponse(items=[], total=0)
            query = query.filter(WeeklyReport.user_id.in_(managed_intern_ids))

        if intern_id is not None:
            query = query.filter(WeeklyReport.user_id == intern_id)
        if status_filter:
            query = query.filter(WeeklyReport.status == status_filter)

        reports = query.order_by(WeeklyReport.created_at.desc()).all()
        items = [self._to_response(r) for r in reports]
        return WeeklyReportListResponse(items=items, total=len(items))

    def add_feedback(
        self, mentor_user: User, report_id: int, payload: ReportFeedbackCreateRequest
    ) -> WeeklyReportResponse:
        """Mentor nhận xét và chấm điểm cho báo cáo tuần của TTS (Task 9)."""
        report = (
            self.db.query(WeeklyReport)
            .options(
                joinedload(WeeklyReport.user),
                joinedload(WeeklyReport.program),
                joinedload(WeeklyReport.feedbacks),
            )
            .filter(WeeklyReport.id == report_id)
            .first()
        )
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy báo cáo tuần.",
            )

        is_admin = mentor_user.role and mentor_user.role.name == ADMIN_ROLE_NAME
        if not is_admin:
            # Kiểm tra quan hệ quản lý giữa Mentor và TTS
            assignment = (
                self.db.query(ProgramMember)
                .filter(
                    ProgramMember.mentor_user_id == mentor_user.id,
                    ProgramMember.intern_user_id == report.user_id,
                )
                .first()
            )
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn chỉ có thể phản hồi báo cáo của thực tập sinh do mình phụ trách.",
                )

        # Cập nhật nếu đã có phản hồi từ mentor này, hoặc tạo mới
        fb = (
            self.db.query(ReportFeedback)
            .filter(
                ReportFeedback.report_id == report_id,
                ReportFeedback.mentor_id == mentor_user.id,
            )
            .first()
        )
        if fb:
            fb.score = payload.score
            fb.comment = payload.comment
        else:
            fb = ReportFeedback(
                report_id=report_id,
                mentor_id=mentor_user.id,
                score=payload.score,
                comment=payload.comment,
            )
            self.db.add(fb)

        report.status = "reviewed"
        self.db.commit()
        self.db.refresh(report)

        return self._to_response(report)
