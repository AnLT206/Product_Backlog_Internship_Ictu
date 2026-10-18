from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.system_log import SystemLog
from app.models.user import User
from app.schemas.hrm_sync import (
    HrmPersonnelItem,
    HrmReconciliationPreviewRequest,
    HrmReconciliationPreviewResponse,
    HrmStatusResponse,
    HrmSyncActionResponse,
    HrmSyncLogResponse,
    HrmSyncRequest,
    HrmWebhookPayload,
    ReconciliationSummary,
)
from app.services.hrm_data_mapper import HrmDataMapper
from app.services.hrm_sync_service import HrmCronScheduler, HrmSyncService

router = APIRouter(prefix="/admin/hrm", tags=["admin-hrm"])
webhook_router = APIRouter(prefix="/webhooks/hrm", tags=["webhooks"])


@router.post(
    "/preview",
    response_model=HrmReconciliationPreviewResponse,
    summary="Xem trước Data Mapping và Đối soát trùng lặp tài khoản (Dry-run Preview)",
    dependencies=[Depends(require_roles("admin"))],
)
def preview_hrm_reconciliation(
    payload: HrmReconciliationPreviewRequest,
    db: Session = Depends(get_db),
) -> HrmReconciliationPreviewResponse:
    """
    Xem trước kết quả phân tích trùng lặp, ánh xạ dữ liệu và kế hoạch hành động
    (tạo mới, cập nhật, hợp nhất, bỏ qua, cảnh báo xung đột) mà không commit vào Database.
    """
    service = HrmSyncService(db)
    return service.preview_reconciliation(
        items=payload.items,
        raw_data=payload.raw_data,
        conflict_strategy=payload.conflict_strategy,
    )


@router.get(
    "/status",
    response_model=HrmStatusResponse,
    summary="Kiểm tra trạng thái tích hợp HRM và tiến trình Cron Job",
    dependencies=[Depends(require_roles("admin"))],
)
def get_hrm_sync_status(
    db: Session = Depends(get_db),
) -> HrmStatusResponse:
    return HrmSyncService(db).get_sync_status()


@router.get(
    "/history",
    response_model=list[HrmSyncLogResponse],
    summary="Lịch sử các đợt đồng bộ nhân sự & mentor từ HRM",
    dependencies=[Depends(require_roles("admin"))],
)
def get_hrm_sync_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> list[HrmSyncLogResponse]:
    return HrmSyncService(db).get_sync_history(limit=limit, offset=offset)


@router.post(
    "/sync",
    response_model=HrmSyncActionResponse,
    summary="Kích hoạt đồng bộ nhân sự & mentor từ HRM ngay lập tức",
    dependencies=[Depends(require_roles("admin"))],
)
def trigger_hrm_sync(
    payload: HrmSyncRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HrmSyncActionResponse:
    service = HrmSyncService(db)

    source = payload.source if payload and payload.source else "FastHRM"
    conflict_strategy = payload.conflict_strategy if payload else "update"

    # Xử lý danh sách nhân sự (hỗ trợ cả items chuẩn và raw_data tự động mapping)
    items_to_sync: list[HrmPersonnelItem] = []
    if payload and payload.items:
        items_to_sync.extend(payload.items)
    if payload and payload.raw_data:
        mapped_items, _ = HrmDataMapper.map_batch(payload.raw_data)
        items_to_sync.extend(mapped_items)

    if items_to_sync:
        log = service.sync_personnel(
            items_to_sync,
            sync_type="manual",
            source=source,
            conflict_strategy=conflict_strategy,
        )
    else:
        endpoint = payload.api_endpoint if payload else None
        log = service.sync_from_api(
            endpoint_override=endpoint,
            source=source,
            sync_type="manual",
            conflict_strategy=conflict_strategy,
        )

    # Thống kê tổng hợp đối soát
    reconciliation_summary = None
    if log.details and isinstance(log.details, dict):
        reconciliation_summary = ReconciliationSummary(
            total_input=log.total_records,
            to_create=log.created_users,
            to_update=log.updated_users,
            to_skip=log.details.get("skipped", 0),
            conflicts_count=log.details.get("conflicts_count", 0),
            mentors_count=log.mentors_synced,
            hr_count=log.hr_synced,
            interns_count=log.interns_synced,
        )

    # Record to SystemLog
    try:
        db.add(
            SystemLog(
                user_id=current_user.id,
                action="UPDATE",
                method="POST",
                path="/api/admin/hrm/sync",
                resource=f"Đồng bộ HRM ({log.created_users} tạo mới, {log.updated_users} cập nhật, {log.mentors_synced} mentors, chiến lược: {conflict_strategy})",
                status_code=200,
            )
        )
        db.commit()
    except Exception:
        db.rollback()

    message = (
        f"Đồng bộ thành công {log.total_records} bản ghi ({log.created_users} người dùng mới, "
        f"{log.updated_users} cập nhật, {log.mentors_synced} mentor liên kết, chiến lược '{conflict_strategy}')."
    )
    return HrmSyncActionResponse(
        success=True,
        message=message,
        log=HrmSyncLogResponse.model_validate(log),
        reconciliation=reconciliation_summary,
    )



@router.post(
    "/scheduler/toggle",
    summary="Bật / tắt tiến trình lập lịch Cron Job đồng bộ HRM",
    dependencies=[Depends(require_roles("admin"))],
)
def toggle_hrm_cron_scheduler(
    active: bool = Query(..., description="True để bật scheduler, False để tạm dừng"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    scheduler = HrmCronScheduler.get_instance()
    if active:
        scheduler.start()
        status_text = "running"
    else:
        scheduler.stop()
        status_text = "stopped"

    # Update system_settings
    from app.models.system_setting import SystemSetting
    setting = db.query(SystemSetting).filter(SystemSetting.key == "hrm_auto_sync_enabled").first()
    if setting:
        setting.value = "true" if active else "false"
        db.commit()

    return {
        "success": True,
        "scheduler_status": status_text,
        "detail": f"Đã {'khởi động' if active else 'tạm dừng'} Cron Job đồng bộ HRM thành công.",
    }


@webhook_router.post(
    "",
    summary="Tiếp nhận Webhook thời gian thực từ HRM bên thứ 3 để đồng bộ nhân sự & mentor",
    status_code=status.HTTP_200_OK,
)
async def receive_hrm_webhook(
    request: Request,
    payload: HrmWebhookPayload,
    x_hrm_signature: str | None = Header(None, alias="X-HRM-Signature"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    body_bytes = await request.body()
    service = HrmSyncService(db)

    try:
        log = service.process_webhook(payload, raw_body=body_bytes, signature=x_hrm_signature)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi xử lý Webhook HRM: {str(exc)}",
        )

    return {
        "success": True,
        "detail": f"Đồng bộ Webhook thành công: {log.created_users} tạo mới, {log.updated_users} cập nhật, {log.mentors_synced} mentors.",
        "sync_log_id": log.id,
        "status": log.status,
    }
