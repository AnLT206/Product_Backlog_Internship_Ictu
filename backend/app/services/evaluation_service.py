from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.evaluation import Evaluation
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.evaluation import EvaluationCreateRequest, EvaluationResponse


class EvaluationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_evaluation(
        self, mentor: User, payload: EvaluationCreateRequest
    ) -> EvaluationResponse:
        intern = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == payload.intern_id, Role.name == "intern")
            .first()
        )
        if intern is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thực tập sinh.",
            )

        assigned = (
            self.db.query(ProgramMember)
            .filter(
                ProgramMember.mentor_user_id == mentor.id,
                ProgramMember.intern_user_id == intern.id,
            )
            .first()
        )
        if assigned is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chỉ đánh giá thực tập sinh được phân công cho mình.",
            )

        row = Evaluation(
            intern_id=intern.id,
            mentor_id=mentor.id,
            skill_score=payload.skill_score,
            attitude_score=payload.attitude_score,
            comment=payload.comment,
        )
        try:
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bạn đã nộp đánh giá tổng kết cho thực tập sinh này.",
            ) from None
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể lưu đánh giá.",
            ) from None
        return EvaluationResponse.model_validate(row)
