from pydantic import BaseModel, Field


class RoleItem(BaseModel):
    key: str
    label: str


class PermissionModuleItem(BaseModel):
    key: str
    label: str
    group: str


class PermissionMatrixResponse(BaseModel):
    roles: list[RoleItem]
    modules: list[PermissionModuleItem]
    matrix: dict[str, dict[str, bool]]


class PermissionMatrixUpdateRequest(BaseModel):
    matrix: dict[str, dict[str, bool]] = Field(
        ...,
        description="Ma trận phân quyền dạng { role_name: { perm_name: true/false } }",
    )


class RolePermissionUpdateRequest(BaseModel):
    permission_keys: list[str] = Field(
        ..., description="Danh sách key quyền cấp cho vai trò"
    )


class PermissionActionResponse(BaseModel):
    detail: str
    matrix: dict[str, dict[str, bool]] | None = None
