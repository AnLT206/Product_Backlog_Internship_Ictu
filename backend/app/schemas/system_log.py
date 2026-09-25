from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SystemLogAction = Literal["CREATE", "UPDATE", "DELETE"]


class SystemLogResponse(BaseModel):
    id: int
    user_id: int | None = None
    role: str | None = None
    action: SystemLogAction
    method: str
    path: str
    resource: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    status_code: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SystemLogListResponse(BaseModel):
    items: list[SystemLogResponse]
    total: int
    limit: int = Field(..., ge=1)
    offset: int = Field(..., ge=0)
