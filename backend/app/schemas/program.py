from datetime import date, datetime

from pydantic import BaseModel, Field


class ProgramCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    department: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date
    end_date: date


class ProgramUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None


class ProgramResponse(BaseModel):
    id: int
    name: str
    department: str
    description: str | None = None
    start_date: date
    end_date: date
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
