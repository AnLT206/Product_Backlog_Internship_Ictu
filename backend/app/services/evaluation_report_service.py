"""Service tổng hợp đánh giá thành báo cáo cuối kỳ (US-20).

Thiết kế câu truy vấn tổng hợp:
- Điểm số đánh giá: kỹ năng (skill_score), thái độ (attitude_score), điểm tổng kết (final_score)
- Xếp loại: Xuất sắc, Giỏi, Khá, Trung bình, Yếu, Chưa đánh giá
- Chuyên cần: ngày đi làm, đi muộn, nghỉ có phép / không phép, tỷ lệ chuyên cần (%)
- Bộ lọc: theo đợt thực tập (program_id / batch_id), theo trường đại học (university), tìm kiếm (search), xếp loại (grade)
- Thống kê tổng hợp: phân bố xếp loại, thống kê theo từng trường và theo từng đợt thực tập.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, case, distinct, func, or_
from sqlalchemy.orm import Session, aliased

from app.models.attendance import Attendance
from app.models.evaluation import Evaluation
from app.models.intern_profile import InternProfile
from app.models.internship_program import InternshipProgram
from app.models.leave_request import LeaveRequest
from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.user import User
from app.schemas.evaluation import (
    FinalEvaluationItem,
    FinalEvaluationReportResponse,
    ProgramReportSummary,
    UniversityReportSummary,
)

WORKED_STATUSES = ("present", "half_day", "early_leave")
APPROVED_LEAVE = "approved"


def _calculate_grade(score: float | None) -> str:
    """Xếp loại theo thang điểm 10 chuẩn giáo dục đại học."""
    if score is None:
        return "Chưa đánh giá"
    if score >= 9.0:
        return "Xuất sắc"
    if score >= 8.0:
        return "Giỏi"
    if score >= 6.5:
        return "Khá"
    if score >= 5.0:
        return "Trung bình"
    return "Yếu"


class EvaluationReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_final_evaluation_report(
        self,
        program_id: int | None = None,
        university: str | None = None,
        grade: str | None = None,
        search: str | None = None,
        academic_year: str | None = None,
        intern_id: int | None = None,
    ) -> FinalEvaluationReportResponse:
        """Truy vấn và tổng hợp dữ liệu báo cáo cuối kỳ của TTS gửi trường / ban lãnh đạo."""

        if program_id is not None:
            program_exists = (
                self.db.query(InternshipProgram)
                .filter(InternshipProgram.id == program_id, InternshipProgram.is_deleted == False)
                .first()
            )
            if not program_exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Không tìm thấy đợt thực tập với ID {program_id}.",
                )

        MentorUser = aliased(User)

        query = (
            self.db.query(
                User,
                InternProfile,
                ProgramMember,
                InternshipProgram,
                MentorUser,
                Evaluation,
            )
            .join(Role, Role.id == User.role_id)
            .filter(Role.name == "intern")
            .outerjoin(InternProfile, InternProfile.user_id == User.id)
            .outerjoin(ProgramMember, ProgramMember.intern_user_id == User.id)
            .outerjoin(
                InternshipProgram,
                and_(
                    InternshipProgram.id == ProgramMember.program_id,
                    InternshipProgram.is_deleted == False,
                ),
            )
            .outerjoin(MentorUser, MentorUser.id == ProgramMember.mentor_user_id)
            .outerjoin(Evaluation, Evaluation.intern_id == User.id)
        )

        if intern_id is not None:
            query = query.filter(User.id == intern_id)
        if program_id is not None:
            query = query.filter(ProgramMember.program_id == program_id)
        if university and university.strip():
            query = query.filter(InternProfile.university.ilike(f"%{university.strip()}%"))
        if academic_year and academic_year.strip():
            query = query.filter(InternProfile.academic_year == academic_year.strip())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(term),
                    User.code.ilike(term),
                    User.email.ilike(term),
                    InternProfile.university.ilike(term),
                    InternProfile.major.ilike(term),
                )
            )

        rows = query.order_by(User.id.asc()).all()

        items: list[FinalEvaluationItem] = []
        intern_ids: list[int] = []

        for user, profile, pm, program, mentor, evaluation in rows:
            skill_score = evaluation.skill_score if evaluation else None
            attitude_score = evaluation.attitude_score if evaluation else None
            final_score = None
            is_evaluated = False

            if skill_score is not None and attitude_score is not None:
                final_score = round((skill_score + attitude_score) / 2.0, 2)
                is_evaluated = True

            item_grade = _calculate_grade(final_score)

            item = FinalEvaluationItem(
                intern_id=user.id,
                intern_code=user.code,
                full_name=user.full_name,
                email=user.email,
                university=profile.university if profile and profile.university else "Chưa cập nhật",
                major=profile.major if profile else None,
                academic_year=profile.academic_year if profile else None,
                program_id=program.id if program else None,
                program_name=program.name if program else "Chưa phân đợt",
                mentor_id=mentor.id if mentor else None,
                mentor_name=mentor.full_name if mentor else None,
                skill_score=skill_score,
                attitude_score=attitude_score,
                final_score=final_score,
                grade=item_grade,
                comment=evaluation.comment if evaluation else None,
                is_evaluated=is_evaluated,
                present_days=0,
                late_days=0,
                authorized_leave_days=0,
                unauthorized_leave_days=0,
                total_working_days=0,
                attendance_rate=0.0,
            )
            items.append(item)
            intern_ids.append(user.id)

        # Tính toán chuyên cần cho danh sách TTS
        if intern_ids:
            self._enrich_attendance(items, intern_ids)

        # Lọc theo xếp loại nếu có
        if grade and grade.strip():
            grade_target = grade.strip().lower()
            items = [it for it in items if it.grade.lower() == grade_target]

        total_interns = len(items)
        evaluated_items = [it for it in items if it.is_evaluated and it.final_score is not None]
        evaluated_count = len(evaluated_items)
        unevaluated_count = total_interns - evaluated_count
        average_score = (
            round(sum(it.final_score for it in evaluated_items) / evaluated_count, 2)
            if evaluated_count > 0
            else None
        )

        grade_distribution = {
            "Xuất sắc": sum(1 for it in items if it.grade == "Xuất sắc"),
            "Giỏi": sum(1 for it in items if it.grade == "Giỏi"),
            "Khá": sum(1 for it in items if it.grade == "Khá"),
            "Trung bình": sum(1 for it in items if it.grade == "Trung bình"),
            "Yếu": sum(1 for it in items if it.grade == "Yếu"),
            "Chưa đánh giá": sum(1 for it in items if it.grade == "Chưa đánh giá"),
        }

        by_university = self._summarize_by_university(items)
        by_program = self._summarize_by_program(items)

        return FinalEvaluationReportResponse(
            total_interns=total_interns,
            evaluated_count=evaluated_count,
            unevaluated_count=unevaluated_count,
            average_score=average_score,
            grade_distribution=grade_distribution,
            by_university=by_university,
            by_program=by_program,
            items=items,
        )

    def _enrich_attendance(self, items: list[FinalEvaluationItem], intern_ids: list[int]) -> None:
        """Tính toán chuyên cần từ bảng Attendance và LeaveRequest cho danh sách TTS."""
        items_by_id = {it.intern_id: it for it in items}

        join_condition = and_(
            LeaveRequest.user_id == Attendance.user_id,
            Attendance.work_date >= LeaveRequest.start_date,
            Attendance.work_date <= LeaveRequest.end_date,
            LeaveRequest.status == APPROVED_LEAVE,
        )

        present_days_expr = func.count(
            distinct(case((Attendance.status.in_(WORKED_STATUSES), Attendance.work_date)))
        )
        late_days_expr = func.count(
            distinct(case((Attendance.status == "late", Attendance.work_date)))
        )
        auth_leave_expr = func.count(
            distinct(
                case(
                    (
                        and_(Attendance.status == "absent", LeaveRequest.id.is_not(None)),
                        Attendance.work_date,
                    )
                )
            )
        )
        unauth_leave_expr = func.count(
            distinct(
                case(
                    (
                        and_(Attendance.status == "absent", LeaveRequest.id.is_(None)),
                        Attendance.work_date,
                    )
                )
            )
        )

        att_rows = (
            self.db.query(
                Attendance.user_id,
                present_days_expr.label("present_days"),
                late_days_expr.label("late_days"),
                auth_leave_expr.label("auth_days"),
                unauth_leave_expr.label("unauth_days"),
            )
            .select_from(Attendance)
            .outerjoin(LeaveRequest, join_condition)
            .filter(Attendance.user_id.in_(intern_ids))
            .group_by(Attendance.user_id)
            .all()
        )

        for row in att_rows:
            it = items_by_id.get(row.user_id)
            if it:
                it.present_days = int(row.present_days or 0)
                it.late_days = int(row.late_days or 0)
                it.authorized_leave_days = int(row.auth_days or 0)
                it.unauthorized_leave_days = int(row.unauth_days or 0)

        # Cộng ngày nghỉ phép có phép không chấm công
        leave_query = (
            self.db.query(LeaveRequest)
            .filter(LeaveRequest.user_id.in_(intern_ids), LeaveRequest.status == APPROVED_LEAVE)
            .all()
        )
        counted: dict[int, set[date]] = defaultdict(set)
        for leave in leave_query:
            range_start = (
                date.fromisoformat(leave.start_date)
                if isinstance(leave.start_date, str)
                else leave.start_date
            )
            range_end = (
                date.fromisoformat(leave.end_date)
                if isinstance(leave.end_date, str)
                else leave.end_date
            )
            it = items_by_id.get(leave.user_id)
            if not it:
                continue

            attended_dates = {
                w
                for (w,) in self.db.query(Attendance.work_date).filter(
                    Attendance.user_id == leave.user_id,
                    Attendance.work_date >= range_start,
                    Attendance.work_date <= range_end,
                    Attendance.status.in_((*WORKED_STATUSES, "late", "absent")),
                )
            }
            extra = counted[leave.user_id]
            curr = range_start
            while curr <= range_end:
                if curr not in attended_dates and curr not in extra:
                    extra.add(curr)
                    it.authorized_leave_days += 1
                curr += timedelta(days=1)

        for it in items:
            it.total_working_days = it.present_days + it.late_days
            total_days = (
                it.present_days
                + it.late_days
                + it.authorized_leave_days
                + it.unauthorized_leave_days
            )
            it.attendance_rate = (
                round(((it.present_days + it.late_days) / total_days) * 100, 2)
                if total_days > 0
                else 0.0
            )

    @staticmethod
    def _summarize_by_university(items: list[FinalEvaluationItem]) -> list[UniversityReportSummary]:
        """Tổng hợp thống kê điểm số và chuyên cần theo từng trường đại học."""
        groups: dict[str, list[FinalEvaluationItem]] = defaultdict(list)
        for it in items:
            uni = it.university or "Chưa cập nhật"
            groups[uni].append(it)

        summaries: list[UniversityReportSummary] = []
        for uni, u_items in sorted(groups.items(), key=lambda x: x[0]):
            eval_items = [i for i in u_items if i.is_evaluated and i.final_score is not None]
            avg_score = (
                round(sum(i.final_score for i in eval_items) / len(eval_items), 2)
                if eval_items
                else None
            )
            avg_att_rate = round(sum(i.attendance_rate for i in u_items) / len(u_items), 2) if u_items else 0.0

            summaries.append(
                UniversityReportSummary(
                    university=uni,
                    intern_count=len(u_items),
                    evaluated_count=len(eval_items),
                    average_score=avg_score,
                    average_attendance_rate=avg_att_rate,
                )
            )
        return summaries

    @staticmethod
    def _summarize_by_program(items: list[FinalEvaluationItem]) -> list[ProgramReportSummary]:
        """Tổng hợp thống kê điểm số và chuyên cần theo từng đợt thực tập."""
        groups: dict[tuple[int, str], list[FinalEvaluationItem]] = defaultdict(list)
        for it in items:
            p_id = it.program_id or 0
            p_name = it.program_name or "Chưa phân đợt"
            groups[(p_id, p_name)].append(it)

        summaries: list[ProgramReportSummary] = []
        for (p_id, p_name), p_items in sorted(groups.items(), key=lambda x: x[0][0]):
            eval_items = [i for i in p_items if i.is_evaluated and i.final_score is not None]
            avg_score = (
                round(sum(i.final_score for i in eval_items) / len(eval_items), 2)
                if eval_items
                else None
            )
            avg_att_rate = round(sum(i.attendance_rate for i in p_items) / len(p_items), 2) if p_items else 0.0

            summaries.append(
                ProgramReportSummary(
                    program_id=p_id,
                    program_name=p_name,
                    intern_count=len(p_items),
                    evaluated_count=len(eval_items),
                    average_score=avg_score,
                    average_attendance_rate=avg_att_rate,
                )
            )
        return summaries
