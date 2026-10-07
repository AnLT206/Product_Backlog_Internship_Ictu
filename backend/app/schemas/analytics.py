from pydantic import BaseModel, Field


class StatItem(BaseModel):
    name: str = Field(..., description="Tên trường đại học hoặc tên chuyên ngành")
    count: int = Field(..., description="Số lượng thực tập sinh")
    percentage: float = Field(..., description="Tỷ lệ phần trăm (0-100%)")


class InternSourceAnalyticsResponse(BaseModel):
    total_interns: int = Field(..., description="Tổng số lượng thực tập sinh thỏa mãn điều kiện lọc")
    by_university: list[StatItem] = Field(default_factory=list, description="Thống kê theo từng Trường đại học")
    by_major: list[StatItem] = Field(default_factory=list, description="Thống kê theo từng Chuyên ngành")
