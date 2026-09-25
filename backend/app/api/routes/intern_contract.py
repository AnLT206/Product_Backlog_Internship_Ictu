from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/intern", tags=["intern-contract"])


@router.post(
    "/contract/confirm",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
)
def confirm_contract(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("intern")),
) -> DocumentResponse:
    return DocumentService(db).confirm_contract(current_user)
