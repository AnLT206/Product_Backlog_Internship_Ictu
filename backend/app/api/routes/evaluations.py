from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.evaluation import EvaluationCreateRequest, EvaluationResponse
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/mentor", tags=["evaluations"])


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
