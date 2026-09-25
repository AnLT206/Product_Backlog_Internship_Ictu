from sqlalchemy.orm import Session

from app.models.notification import Notification


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
