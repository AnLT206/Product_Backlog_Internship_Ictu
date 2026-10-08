from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.analytics import InternSourceAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/hr/analytics", tags=["hr-analytics"])
reports_router = APIRouter(prefix="/hr/reports", tags=["hr-reports"])


def _stream_sources_export(
    db: Session,
    file_format: str,
    program_id: int | None,
    status: str | None,
    from_date: date | None,
    to_date: date | None,
) -> StreamingResponse:
    report = AnalyticsService(db).export_sources_report(
        file_format=file_format,
        program_id=program_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )
    return StreamingResponse(
        iter([report.content]),
        media_type=report.media_type,
        headers={"Content-Disposition": f'attachment; filename="{report.filename}"'},
    )


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
) -> StreamingResponse:
    return _stream_sources_export(
        db,
        format,
        program_id,
        status,
        from_date,
        to_date,
    )


@reports_router.get(
    "/export",
    summary="Alias tải báo cáo thống kê dưới dạng Excel hoặc PDF",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def export_intern_source_report(
    type: Literal["excel", "pdf"] = Query(..., description="Định dạng file: excel hoặc pdf"),
    program_id: int | None = Query(default=None, description="Lọc theo đợt thực tập"),
    status: str | None = Query(default=None, description="Lọc theo trạng thái hồ sơ"),
    from_date: date | None = Query(default=None, description="Lọc từ ngày nộp hồ sơ"),
    to_date: date | None = Query(default=None, description="Lọc đến ngày nộp hồ sơ"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    file_format = "xlsx" if type == "excel" else "pdf"
    return _stream_sources_export(
        db,
        file_format,
        program_id,
        status,
        from_date,
        to_date,
    )
