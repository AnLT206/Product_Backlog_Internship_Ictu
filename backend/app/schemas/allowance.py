from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class AllowanceHistoryResponse(BaseModel):
    id: int
    period: str
    allowance_type: str
    amount: Decimal
    note: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
