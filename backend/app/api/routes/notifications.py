import asyncio

from fastapi import APIRouter, Depends, status
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.api.deps import get_active_user_from_token, get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_connection_manager import notification_connection_manager
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])
_WEBSOCKET_AUTH_TIMEOUT_SECONDS = 5


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    return NotificationService(db).list_for_user(current_user.id)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    return NotificationService(db).mark_as_read(current_user.id, notification_id)


@router.websocket("/ws")
async def notification_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    await websocket.accept()
    try:
        message = await asyncio.wait_for(
            websocket.receive_json(),
            timeout=_WEBSOCKET_AUTH_TIMEOUT_SECONDS,
        )
    except WebSocketDisconnect:
        return
    except (asyncio.TimeoutError, KeyError, TypeError, ValueError):
        await websocket.close(code=4401)
        return

    token = message.get("token") if isinstance(message, dict) else None
    user = (
        get_active_user_from_token(token, db)
        if isinstance(message, dict)
        and message.get("type") == "authenticate"
        and isinstance(token, str)
        else None
    )
    db.close()
    if user is None:
        await websocket.close(code=4401)
        return

    user_id = user.id
    await notification_connection_manager.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "authenticated"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await notification_connection_manager.disconnect(user_id, websocket)