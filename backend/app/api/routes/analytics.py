from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.analytics import InternSourceAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/hr/analytics", tags=["hr-analytics"])


@router.get(
    "/sources",
    response_model=InternSourceAnalyticsResponse,
    summary="Thống kê số lượng và tỷ lệ thực tập sinh theo trường và ngành (SCRUM-177)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_intern_source_analytics(
    program_id: int | None = Query(default=None, description="Lọc theo đợt thực tập"),
    status: str | None = Query(default=None, description="Lọc theo trạng thái hồ sơ (approved, pending, ...)"),
    from_date: date | None = Query(default=None, description="Lọc từ ngày nộp hồ sơ"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày nộp hồ sơ"),
    db: Session = Depends(get_db),
) -> InternSourceAnalyticsResponse:
    return AnalyticsService(db).get_sources_analytics(
        program_id=program_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/export",
    summary="Xuất báo cáo thống kê thực tập sinh ra XLSX hoặc PDF",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def export_intern_source_analytics(
    format: Literal["xlsx", "pdf"] = Query(..., description="Định dạng file xuất"),
    program_id: int | None = Query(default=None, description="Lọc theo đợt thực tập"),
    status: str | None = Query(default=None, description="Lọc theo trạng thái hồ sơ"),
    from_date: date | None = Query(default=None, description="Lọc từ ngày nộp hồ sơ"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày nộp hồ sơ"),
    db: Session = Depends(get_db),
) -> Response:
    report = AnalyticsService(db).export_sources_report(
        file_format=format,
        program_id=program_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )
    return Response(
        content=report.content,
        media_type=report.media_type,
        headers={"Content-Disposition": f'attachment; filename="{report.filename}"'},
    )
