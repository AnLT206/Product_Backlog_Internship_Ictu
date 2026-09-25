from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DocumentReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    review_note: str | None = Field(default=None, max_length=255)


class DocumentResponse(BaseModel):
    id: int
    user_id: int
    doc_type: str
    file_name: str
    file_path: str
    status: str
    review_note: str | None = None
    confirmed_at: datetime | None = None

    model_config = {"from_attributes": True}
