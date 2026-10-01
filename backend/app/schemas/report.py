from datetime import date

from pydantic import BaseModel


class ReportSubmitResponse(BaseModel):
    id: int
    content: str
    week_start: date
    week_end: date
    week_number: int
    attachment_path: str | None = None
