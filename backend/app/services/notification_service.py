from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import NotificationListResponse, NotificationResponse


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_notification(
        self,
        *,
        user_id: int,
        title: str,
        body: str,
        commit: bool = True,
    ) -> Notification:
        row = Notification(
            user_id=user_id,
            title=title.strip(),
            body=body.strip(),
            is_read=False,
        )
        self.db.add(row)
        if commit:
            self.db.commit()
            self.db.refresh(row)
        else:
            self.db.flush()
        return row

    def list_for_user(self, user_id: int) -> NotificationListResponse:
        rows = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .all()
        )
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(row) for row in rows],
            total=len(rows),
        )

    def mark_as_read(self, user_id: int, notification_id: int) -> NotificationResponse:
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông báo.",
            )

        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return NotificationResponse.model_validate(notification)
