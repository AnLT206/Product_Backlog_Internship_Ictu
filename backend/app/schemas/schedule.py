from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ScheduleResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    start_date: date
    end_date: date
    location: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
