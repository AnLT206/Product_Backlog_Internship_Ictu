from typing import Any
from pydantic import BaseModel, Field


class StatItem(BaseModel):
    name: str = Field(..., description="Tên trường đại học hoặc tên chuyên ngành")
    count: int = Field(..., description="Số lượng thực tập sinh")
    percentage: float = Field(..., description="Tỷ lệ phần trăm (0-100%)")


class InternSourceAnalyticsResponse(BaseModel):
    total_interns: int = Field(..., description="Tổng số lượng thực tập sinh thỏa mãn điều kiện lọc")
    by_university: list[StatItem] = Field(default_factory=list, description="Thống kê theo từng Trường đại học")
    by_major: list[StatItem] = Field(default_factory=list, description="Thống kê theo từng Chuyên ngành")


class KPICardItem(BaseModel):
    key: str = Field(..., description="Mã định danh thẻ KPI")
    label: str = Field(..., description="Tên hiển thị thẻ KPI")
    value: int = Field(..., description="Giá trị số lượng")
    rate: float | None = Field(default=None, description="Tỷ lệ phần trăm tương ứng nếu có")
    hint: str | None = Field(default=None, description="Gợi ý/Mô tả ngắn")
    tone: str = Field(default="primary", description="Màu sắc thẻ (primary, success, warn, danger)")


class ComparisonKPI(BaseModel):
    has_previous: bool = Field(default=False, description="Có dữ liệu đợt trước để so sánh hay không")
    current_rate: float = Field(default=0.0, description="Tỷ lệ hoàn thành đợt hiện tại (%)")
    previous_rate: float = Field(default=0.0, description="Tỷ lệ hoàn thành đợt trước (%)")
    diff: float = Field(default=0.0, description="Chênh lệch tỷ lệ hoàn thành (+/- %)")
    trend: str = Field(default="same", description="Xu hướng: up (tăng), down (giảm), same (bằng nhau)")
    arrow: str = Field(default="→", description="Ký hiệu mũi tên hiển thị (↑, ↓, →)")
    text: str = Field(default="Chưa có dữ liệu so sánh", description="Văn bản mô tả so sánh")
    badge_text: str = Field(default="0%", description="Badge ngắn hiển thị chênh lệch")


class PeriodSummaryItem(BaseModel):
    id: int
    name: str
    total: int = 0
    completed: int = 0
    completion_rate: float = 0.0


class ProgramBatchCompletionItem(BaseModel):
    id: int
    name: str
    department: str
    start_date: str | None = None
    end_date: str | None = None
    status: str = "open"
    total: int = 0
    completed: int = 0
    in_progress: int = 0
    dropped_out: int = 0
    failed: int = 0
    not_completed: int = 0
    completion_rate: float = 0.0


class CompletionRateAnalyticsResponse(BaseModel):
    """Phản hồi API GET /api/hr/analytics/completion-rate (US-33)."""

    summary: dict[str, Any] = Field(..., description="Tổng hợp số lượng theo 4 trạng thái và tỷ lệ hoàn thành")
    kpis: list[KPICardItem] = Field(default_factory=list, description="Danh sách các chỉ số thẻ KPI tổng quan")
    comparison: ComparisonKPI = Field(..., description="So sánh tỷ lệ hoàn thành với đợt trước")
    previous_period: PeriodSummaryItem | None = Field(default=None, description="Thông tin kỳ trước đó")
    programs: list[ProgramBatchCompletionItem] = Field(default_factory=list, description="Tỷ lệ % hoàn thành chương trình của từng đợt")

