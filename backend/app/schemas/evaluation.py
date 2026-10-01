from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EvaluationCreateRequest(BaseModel):
    intern_id: int = Field(..., gt=0)
    skill_score: int = Field(..., ge=1, le=10)
    attitude_score: int = Field(..., ge=1, le=10)
    comment: str | None = Field(default=None, max_length=2000)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class EvaluationResponse(BaseModel):
    id: int
    intern_id: int
    mentor_id: int
    skill_score: int
    attitude_score: int
    comment: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
