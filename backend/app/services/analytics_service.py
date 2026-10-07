from datetime import date, datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.intern_profile import InternProfile
from app.models.program_member import ProgramMember
from app.schemas.analytics import InternSourceAnalyticsResponse, StatItem


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_sources_analytics(
        self,
        program_id: int | None = None,
        status: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> InternSourceAnalyticsResponse:
        """
        Viết câu truy vấn (COUNT, GROUP BY) thống kê số lượng và tỷ lệ phần trăm
        thực tập sinh theo từng Trường đại học và Chuyên ngành (SCRUM-176).
        """
        # Base query cho InternProfile
        base_query = self.db.query(InternProfile)

        if program_id is not None:
            base_query = base_query.join(
                ProgramMember, ProgramMember.intern_user_id == InternProfile.user_id
            ).filter(ProgramMember.program_id == program_id)

        if status:
            base_query = base_query.filter(InternProfile.status == status.strip())

        if from_date:
            from_dt = datetime.combine(from_date, datetime.min.time())
            base_query = base_query.filter(InternProfile.created_at >= from_dt)

        if to_date:
            to_dt = datetime.combine(to_date, datetime.max.time())
            base_query = base_query.filter(InternProfile.created_at <= to_dt)

        total_interns = base_query.count()

        if total_interns == 0:
            return InternSourceAnalyticsResponse(
                total_interns=0,
                by_university=[],
                by_major=[],
            )

        # 1. Thống kê theo Trường đại học (COUNT, GROUP BY university)
        uni_query = (
            base_query.with_entities(
                func.coalesce(InternProfile.university, "Khác").label("name"),
                func.count(InternProfile.id).label("count"),
            )
            .group_by(func.coalesce(InternProfile.university, "Khác"))
            .order_by(func.count(InternProfile.id).desc())
            .all()
        )

        by_university = [
            StatItem(
                name=row.name,
                count=row.count,
                percentage=round((row.count / total_interns) * 100, 2),
            )
            for row in uni_query
        ]

        # 2. Thống kê theo Chuyên ngành (COUNT, GROUP BY major)
        major_query = (
            base_query.with_entities(
                func.coalesce(InternProfile.major, "Khác").label("name"),
                func.count(InternProfile.id).label("count"),
            )
            .group_by(func.coalesce(InternProfile.major, "Khác"))
            .order_by(func.count(InternProfile.id).desc())
            .all()
        )

        by_major = [
            StatItem(
                name=row.name,
                count=row.count,
                percentage=round((row.count / total_interns) * 100, 2),
            )
            for row in major_query
        ]

        return InternSourceAnalyticsResponse(
            total_interns=total_interns,
            by_university=by_university,
            by_major=by_major,
        )
