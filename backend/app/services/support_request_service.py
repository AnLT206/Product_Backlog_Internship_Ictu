"""Service xử lý nghiệp vụ Yêu cầu Hỗ trợ từ Thực tập sinh (Task 5)."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.support_request import SupportRequest
from app.models.user import User
from app.schemas.support_request import (
    SupportRequestCreate,
    SupportRequestResponse,
    SupportRequestUpdateStatus,
)


class SupportRequestService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response(self, req: SupportRequest) -> SupportRequestResponse:
        user_full_name = req.user.full_name if req.user else None
        user_code = req.user.code if req.user else None
        user_email = req.user.email if req.user else None
        responder_name = req.responder.full_name if req.responder else None

        return SupportRequestResponse(
            id=req.id,
            user_id=req.user_id,
            user_full_name=user_full_name,
            user_code=user_code,
            user_email=user_email,
            title=req.title,
            content=req.content,
            category=req.category,
            priority=req.priority,
            status=req.status,
            response_note=req.response_note,
            responder_id=req.responder_id,
            responder_name=responder_name,
            resolved_at=req.resolved_at,
            created_at=req.created_at,
            updated_at=req.updated_at,
        )

    def create_request(
        self, user_id: int, payload: SupportRequestCreate
    ) -> SupportRequestResponse:
        """Thực tập sinh tạo yêu cầu hỗ trợ mới (Task 5)."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin người dùng.",
            )

        new_request = SupportRequest(
            user_id=user_id,
            title=payload.title,
            content=payload.content,
            category=payload.category,
            priority=payload.priority,
            status="pending",
        )
        self.db.add(new_request)
        self.db.commit()
        self.db.refresh(new_request)

        return self._to_response(new_request)

    def list_my_requests(
        self, user_id: int, status_filter: str | None = None
    ) -> list[SupportRequestResponse]:
        """Thực tập sinh xem danh sách yêu cầu của chính mình."""
        query = (
            self.db.query(SupportRequest)
            .options(joinedload(SupportRequest.user), joinedload(SupportRequest.responder))
            .filter(SupportRequest.user_id == user_id)
        )
        if status_filter:
            query = query.filter(SupportRequest.status == status_filter)

        rows = query.order_by(SupportRequest.created_at.desc()).all()
        return [self._to_response(r) for r in rows]

    def list_all_requests(
        self,
        status_filter: str | None = None,
        category_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SupportRequestResponse]:
        """HR / Admin theo dõi toàn bộ danh sách yêu cầu hỗ trợ từ TTS."""
        query = self.db.query(SupportRequest).options(
            joinedload(SupportRequest.user), joinedload(SupportRequest.responder)
        )
        if status_filter:
            query = query.filter(SupportRequest.status == status_filter)
        if category_filter:
            query = query.filter(SupportRequest.category == category_filter)

        rows = (
            query.order_by(SupportRequest.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [self._to_response(r) for r in rows]

    def update_request_status(
        self, request_id: int, responder_id: int, payload: SupportRequestUpdateStatus
    ) -> SupportRequestResponse:
        """HR / Admin phản hồi và cập nhật trạng thái yêu cầu hỗ trợ."""
        req = (
            self.db.query(SupportRequest)
            .options(joinedload(SupportRequest.user), joinedload(SupportRequest.responder))
            .filter(SupportRequest.id == request_id)
            .first()
        )
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy yêu cầu hỗ trợ.",
            )

        req.status = payload.status
        if payload.response_note is not None:
            req.response_note = payload.response_note
        req.responder_id = responder_id

        if payload.status in ("resolved", "rejected"):
            req.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)

        self.db.commit()
        self.db.refresh(req)

        return self._to_response(req)
