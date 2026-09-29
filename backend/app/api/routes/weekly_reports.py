"""Routes cho Báo cáo tuần & Phản hồi của Mentor (Tasks 8, 9)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.weekly_report import (
    ReportFeedbackCreateRequest,
    WeeklyReportCreateRequest,
    WeeklyReportListResponse,
    WeeklyReportResponse,
)
from app.services.weekly_report_service import WeeklyReportService

router = APIRouter(tags=["weekly-reports"])


# ── Intern Weekly Report Endpoints (Task 8) ───────────────────────────────────

@router.post(
    "/intern/weekly-reports",
    response_model=WeeklyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thực tập sinh nộp báo cáo tuần mới (Task 8)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def submit_weekly_report(
    payload: WeeklyReportCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyReportResponse:
    """TTS gửi báo cáo công việc định kỳ theo tuần."""
    return WeeklyReportService(db).submit_report(current_user.id, payload)


@router.get(
    "/intern/weekly-reports",
    response_model=WeeklyReportListResponse,
    summary="Thực tập sinh xem danh sách báo cáo tuần đã nộp (Task 8)",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def list_my_weekly_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyReportListResponse:
    """Danh sách các báo cáo tuần kèm phản hồi, điểm số từ Mentor."""
    return WeeklyReportService(db).list_intern_reports(current_user.id)


@router.get(
    "/intern/weekly-reports/{report_id}",
    response_model=WeeklyReportResponse,
    summary="Thực tập sinh xem chi tiết báo cáo tuần",
    dependencies=[Depends(require_roles("intern", "admin"))],
)
def get_my_weekly_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyReportResponse:
    """Xem chi tiết một báo cáo tuần."""
    return WeeklyReportService(db).get_intern_report_by_id(current_user.id, report_id)


# ── Mentor Report Feedback Endpoints (Task 9) ─────────────────────────────────

@router.get(
    "/mentor/reports",
    response_model=WeeklyReportListResponse,
    summary="Mentor xem danh sách báo cáo tuần của TTS mình phụ trách (Task 9)",
    dependencies=[Depends(require_roles("mentor", "admin"))],
)
def list_mentor_reports(
    intern_id: int | None = Query(None, description="Lọc theo ID thực tập sinh cụ thể"),
    status_filter: Literal["submitted", "reviewed", "draft"] | None = Query(
        None, alias="status", description="Lọc theo trạng thái báo cáo"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyReportListResponse:
    """Mentor tra cứu danh sách báo cáo của các TTS mình quản lý."""
    return WeeklyReportService(db).list_mentor_reports(
        mentor_user=current_user,
        intern_id=intern_id,
        status_filter=status_filter,
    )


@router.post(
    "/mentor/reports/{report_id}/feedback",
    response_model=WeeklyReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Mentor nhận xét và chấm điểm báo cáo tuần của TTS (Task 9)",
    dependencies=[Depends(require_roles("mentor", "admin"))],
)
def add_report_feedback(
    report_id: int,
    payload: ReportFeedbackCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyReportResponse:
    """Mentor gửi phản hồi, góp ý và chấm điểm cho báo cáo tuần."""
    return WeeklyReportService(db).add_feedback(
        mentor_user=current_user,
        report_id=report_id,
        payload=payload,
    )
