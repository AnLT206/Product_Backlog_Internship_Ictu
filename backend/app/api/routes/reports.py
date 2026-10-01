from datetime import date

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.report import ReportSubmitResponse
from app.services.report_service import ReportService

router = APIRouter(tags=["reports"])


@router.post(
    "/reports",
    response_model=ReportSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Nộp báo cáo tuần và file đính kèm nếu có",
    dependencies=[Depends(require_roles("intern"))],
)
def submit_report(
    content: str = Form(...),
    week_start: date = Form(...),
    week_end: date = Form(...),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportSubmitResponse:
    return ReportService(db).submit_report(
        user_id=current_user.id,
        content=content,
        week_start=week_start,
        week_end=week_end,
        file=file,
    )
