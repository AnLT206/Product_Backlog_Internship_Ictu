from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class SettingItem(BaseModel):
    id: int | None = None
    key: str
    value: str
    category: str
    label: str | None = None
    description: str | None = None
    is_secret: bool = False
    updated_at: datetime | None = None


class SystemSettingsResponse(BaseModel):
    items: list[SettingItem]
    by_category: dict[str, list[SettingItem]]
    flat: dict[str, str]


class SystemSettingsUpdateRequest(BaseModel):
    settings: dict[str, str] = Field(
        ...,
        description="Key-value mapping of system settings to update"
    )


class TestConnectionRequest(BaseModel):
    ldap_server_url: str | None = None
    ldap_base_dn: str | None = None
    ldap_bind_dn: str | None = None
    ldap_password: str | None = None


class TestConnectionResponse(BaseModel):
    success: bool
    service: str
    latency_ms: int
    message: str
    details: dict[str, str] | None = None
