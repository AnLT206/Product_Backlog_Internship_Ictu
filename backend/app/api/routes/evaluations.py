from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.evaluation import (
    EvaluationCreateRequest,
    EvaluationResponse,
    FinalEvaluationReportResponse,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/mentor", tags=["evaluations"])
hr_router = APIRouter(prefix="/hr", tags=["evaluations"])


@router.post(
    "/evaluations",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mentor lưu đánh giá tổng kết cuối kỳ",
    dependencies=[Depends(require_roles("mentor"))],
)
def create_evaluation(
    payload: EvaluationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluationResponse:
    return EvaluationService(db).create_evaluation(current_user, payload)


@hr_router.get(
    "/evaluations/summary",
    response_model=FinalEvaluationReportResponse,
    status_code=status.HTTP_200_OK,
    summary="HR xem báo cáo tổng hợp đánh giá cuối kỳ, xếp loại và chuyên cần (US-20)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
@hr_router.get(
    "/evaluations/final-report",
    response_model=FinalEvaluationReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Bí danh của báo cáo tổng hợp đánh giá cuối kỳ (US-20)",
    dependencies=[Depends(require_roles("hr", "admin"))],
    include_in_schema=False,
)
def get_final_evaluations_summary(
    program_id: int | None = None,
    batch_id: int | None = None,
    batch: str | None = None,
    university: str | None = None,
    school: str | None = None,
    grade: str | None = None,
    search: str | None = None,
    academic_year: str | None = None,
    intern_id: int | None = None,
    db: Session = Depends(get_db),
) -> FinalEvaluationReportResponse:
    from app.services.evaluation_report_service import EvaluationReportService

    return EvaluationReportService(db).get_final_evaluation_report(
        program_id=program_id,
        batch_id=batch_id,
        batch=batch,
        university=university,
        school=school,
        grade=grade,
        search=search,
        academic_year=academic_year,
        intern_id=intern_id,
    )

