from pydantic import BaseModel


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: str | None = None