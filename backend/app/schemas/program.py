from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class ProgramCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    department: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def end_after_start(self) -> "ProgramCreateRequest":
        if self.end_date <= self.start_date:
            raise ValueError("end_date phải lớn hơn start_date.")
        return self


class ProgramUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def end_after_start_when_both(self) -> "ProgramUpdateRequest":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.end_date <= self.start_date
        ):
            raise ValueError("end_date phải lớn hơn start_date.")
        return self


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
