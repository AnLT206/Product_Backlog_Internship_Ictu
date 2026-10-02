from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload


from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.models.intern_profile import InternProfile
from app.models.program_member import ProgramMember
from app.models.intern_task import InternTask
from app.models.intern_report import InternReport
from app.models.intern_evaluation import InternEvaluation
from app.models.intern_attendance import InternAttendance
from app.models.intern_contract_record import InternContractRecord
from app.models.university_report import UniversityReport
from app.schemas.operations import (
    TaskCreateRequest,
    TaskStatusUpdateRequest,
    ReportGradeRequest,
    EvaluationSaveRequest,
    ContractCreateRequest,
    InternReportCreateRequest,
)

router = APIRouter(tags=["operations"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. MENTOR MENTEES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/mentor/mentees", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def get_mentor_mentees(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh sách TTS phụ trách trực tiếp từ CSDL."""
    members = (
        db.query(ProgramMember)
        .options(
            joinedload(ProgramMember.intern).joinedload(User.intern_profile),
            joinedload(ProgramMember.program),
        )
        .all()
    )

    if not members:
        # Fallback query all intern users if no program member yet
        interns = db.query(User).options(joinedload(User.intern_profile)).filter(User.role.has(name="intern")).all()
        return [
            {
                "id": u.id,
                "code": u.code,
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.intern_profile.phone_number if u.intern_profile else "0912 345 678",
                "university": u.intern_profile.university if u.intern_profile else "ĐH CNTT & TT (ICTU)",
                "major": u.intern_profile.major if u.intern_profile else "Công nghệ thông tin",
                "gpa": float(u.intern_profile.gpa) if u.intern_profile and u.intern_profile.gpa else 3.5,
                "status": u.status,
                "program_name": "Kỳ thực tập Mùa Thu 2026",
            }
            for u in interns
        ]

    return [
        {
            "id": m.intern.id,
            "code": m.intern.code,
            "full_name": m.intern.full_name,
            "email": m.intern.email,
            "phone": m.intern.intern_profile.phone_number if m.intern.intern_profile else "0912 345 678",
            "university": m.intern.intern_profile.university if m.intern.intern_profile else "ĐH CNTT & TT (ICTU)",
            "major": m.intern.intern_profile.major if m.intern.intern_profile else "Công nghệ thông tin",
            "gpa": float(m.intern.intern_profile.gpa) if m.intern.intern_profile and m.intern.intern_profile.gpa else 3.5,
            "status": m.intern.status,
            "program_name": m.program.name if m.program else "Kỳ thực tập Q3/2026",
        }
        for m in members
        if m.intern
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 2. MENTOR TASKS (TASK BOARD)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/mentor/tasks", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def get_tasks(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh sách nhiệm vụ của TTS từ DB."""
    tasks = db.query(InternTask).options(joinedload(InternTask.intern)).order_by(InternTask.id.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description or "",
            "intern_id": t.intern_id,
            "intern_name": f"{t.intern.full_name} ({t.intern.code})" if t.intern else "Thực tập sinh",
            "due_at": t.due_at or "2026-10-15",
            "priority": t.priority,
            "status": t.status,
            "progress": t.progress,
        }
        for t in tasks
    ]


@router.post("/mentor/tasks", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def create_task(payload: TaskCreateRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Tạo mới nhiệm vụ và lưu trực tiếp vào MySQL."""
    intern_id = payload.intern_id
    if not intern_id:
        intern = db.query(User).filter(User.role.has(name="intern")).first()
        intern_id = intern.id if intern else 1

    task = InternTask(
        intern_id=intern_id,
        title=payload.title,
        description=payload.description,
        due_at=payload.due_at or "2026-10-15",
        priority=payload.priority,
        status=payload.status,
        progress=payload.progress,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    intern = db.query(User).filter(User.id == task.intern_id).first()
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description or "",
        "intern_id": task.intern_id,
        "intern_name": f"{intern.full_name} ({intern.code})" if intern else "Thực tập sinh",
        "due_at": task.due_at,
        "priority": task.priority,
        "status": task.status,
        "progress": task.progress,
    }


@router.patch("/mentor/tasks/{task_id}/status", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def update_task_status(task_id: int, payload: TaskStatusUpdateRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Cập nhật trạng thái nhiệm vụ trực tiếp trong DB."""
    task = db.query(InternTask).filter(InternTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ.")

    task.status = payload.status
    if payload.progress is not None:
        task.progress = payload.progress
    elif payload.status == "done":
        task.progress = 100

    db.commit()
    return {"id": task.id, "status": task.status, "progress": task.progress}


@router.delete("/mentor/tasks/{task_id}", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def delete_task(task_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    """Xóa nhiệm vụ khỏi DB."""
    task = db.query(InternTask).filter(InternTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ.")

    db.delete(task)
    db.commit()
    return {"detail": "Đã xóa nhiệm vụ thành công."}


# ─────────────────────────────────────────────────────────────────────────────
# 3. MENTOR REPORTS (WEEKLY REPORTS)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/mentor/reports", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def get_reports(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh sách báo cáo tuần của TTS từ DB."""
    reports = db.query(InternReport).options(joinedload(InternReport.intern)).order_by(InternReport.id.desc()).all()
    return [
        {
            "id": r.id,
            "intern_id": r.intern_id,
            "intern_name": f"{r.intern.full_name} ({r.intern.code})" if r.intern else "Thực tập sinh",
            "week_title": r.week_title,
            "period": r.period or "Tuần thực tập",
            "submitted_at": r.submitted_at or "30/09/2026",
            "tasks_done": r.tasks_done or "",
            "issues": r.issues or "Không có",
            "self_assessment": r.self_assessment or "Tốt",
            "mentor_feedback": r.mentor_feedback or "",
            "score": r.score,
            "status": r.status,
        }
        for r in reports
    ]


@router.post("/mentor/reports/{report_id}/grade", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def grade_report(report_id: int, payload: ReportGradeRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Mentor chấm điểm và phản hồi báo cáo tuần, lưu trực tiếp vào DB."""
    report = db.query(InternReport).filter(InternReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")

    report.score = payload.score
    report.mentor_feedback = payload.mentor_feedback
    report.status = payload.status
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "score": report.score,
        "mentor_feedback": report.mentor_feedback,
        "status": report.status,
        "detail": "Đã lưu kết quả chấm điểm báo cáo tuần vào CSDL thành công.",
    }


@router.post("/intern/reports", dependencies=[Depends(require_roles("intern", "admin", "hr", "mentor"))])
def submit_intern_report(
    payload: InternReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Thực tập sinh nộp báo cáo tuần vào CSDL."""
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    report = InternReport(
        intern_id=current_user.id,
        week_title=payload.week_title,
        period=f"{payload.week_title} (Năm học 2026)",
        submitted_at=now_str,
        tasks_done=payload.content,
        issues="Không có khó khăn lớn",
        self_assessment="Tốt",
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "week_title": report.week_title,
        "week_range": f"{report.week_title} (Năm học 2026)",
        "submitted_at": report.submitted_at,
        "summary": report.tasks_done,
        "tasks_done": report.tasks_done,
        "issues": report.issues or "Không có",
        "plan": "Tiếp tục thực hiện nhiệm vụ Sprint theo kế hoạch",
        "status": report.status,
        "file_name": payload.file_name,
        "message": f"Nộp báo cáo {payload.week_title} thành công!",
    }


@router.post("/intern/weekly-reports")
async def submit_intern_weekly_reports_form(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Hỗ trợ nộp báo cáo tuần bằng FormData hoặc JSON."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        week_val = str(form.get("report_time") or form.get("week") or datetime.now().strftime("%d/%m/%Y %H:%M"))
        content_val = str(form.get("content") or "")
        file_obj = form.get("file")
        file_name = getattr(file_obj, "filename", None) if file_obj else None
    else:
        try:
            body = await request.json()
            week_val = str(body.get("report_time") or body.get("week") or body.get("week_title") or datetime.now().strftime("%d/%m/%Y %H:%M"))
            content_val = body.get("content") or ""
            file_name = body.get("file_name")
        except Exception:
            week_val = datetime.now().strftime("%d/%m/%Y %H:%M")
            content_val = ""
            file_name = None

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    report = InternReport(
        intern_id=1,
        week_title=week_val,
        period=f"Báo cáo: {week_val}",
        submitted_at=now_str,
        tasks_done=content_val,
        issues="Không có khó khăn lớn",
        self_assessment="Tốt",
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "week": report.week_title,
        "submittedDate": now_str,
        "contentSummary": report.tasks_done,
        "fileName": file_name or "BaoCao.pdf",
        "fileSize": "1.2 MB",
        "status": "Chờ duyệt",
        "message": f"Nộp báo cáo {week_val} thành công!",
    }





# ─────────────────────────────────────────────────────────────────────────────
# 4. MENTOR EVALUATIONS (FINAL SCORING)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/mentor/evaluations", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def get_evaluations(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh sách bảng điểm đánh giá của TTS từ DB."""
    evals = db.query(InternEvaluation).options(joinedload(InternEvaluation.intern).joinedload(User.intern_profile)).all()
    return [
        {
            "id": e.id,
            "intern_id": e.intern_id,
            "code": e.intern.code if e.intern else "TTS0000",
            "name": e.intern.full_name if e.intern else "Thực tập sinh",
            "faculty": e.intern.intern_profile.major if e.intern and e.intern.intern_profile else "Khoa CNTT",
            "project": "Dự án chuyển đổi số ICTU",
            "attendance_score": e.attendance_score,
            "tech_score": e.tech_score,
            "report_score": e.report_score,
            "final_score": e.final_score,
            "letter_grade": e.letter_grade,
            "status": e.status,
            "status_label": "Đã xác nhận điểm" if e.status == "verified" else "Chờ bổ sung báo cáo",
            "mentor_note": e.mentor_note or "Hoàn thành tốt các mục tiêu chuyên môn.",
        }
        for e in evals
    ]


@router.post("/mentor/evaluations", dependencies=[Depends(require_roles("mentor", "hr", "admin"))])
def save_evaluation(payload: EvaluationSaveRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Lưu đánh giá điểm số học phần của sinh viên trực tiếp vào DB."""
    ev = db.query(InternEvaluation).filter(InternEvaluation.intern_id == payload.intern_id).first()
    if not ev:
        ev = InternEvaluation(
            intern_id=payload.intern_id,
            attendance_score=payload.attendance_score,
            tech_score=payload.tech_score,
            report_score=payload.report_score,
            final_score=payload.final_score,
            letter_grade=payload.letter_grade,
            mentor_note=payload.mentor_note,
            status=payload.status,
        )
        db.add(ev)
    else:
        ev.attendance_score = payload.attendance_score
        ev.tech_score = payload.tech_score
        ev.report_score = payload.report_score
        ev.final_score = payload.final_score
        ev.letter_grade = payload.letter_grade
        ev.mentor_note = payload.mentor_note
        ev.status = payload.status

    db.commit()
    return {"detail": "Đã lưu đánh giá và điểm số vào CSDL thành công."}


# ─────────────────────────────────────────────────────────────────────────────
# 5. HR & MENTOR ATTENDANCE & ALLOWANCE
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/hr/attendance", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def get_attendance(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy dữ liệu ngày công và phụ cấp từ bảng intern_attendances trong DB."""
    rows = db.query(InternAttendance).options(joinedload(InternAttendance.intern).joinedload(User.intern_profile)).all()
    return [
        {
            "id": r.id,
            "code": r.intern.code if r.intern else "TTS0000",
            "name": r.intern.full_name if r.intern else "Thực tập sinh",
            "faculty": r.intern.intern_profile.major if r.intern and r.intern.intern_profile else "Khoa CNTT",
            "project": "Dự án Hệ sinh thái ICTU",
            "standard_days": r.standard_days,
            "actual_days": r.actual_days,
            "late_days": r.late_days,
            "leave_days": r.leave_days,
            "allowance": r.allowance,
            "status": r.status,
            "status_label": r.status_label or "Chờ duyệt phụ cấp",
        }
        for r in rows
    ]


@router.post("/hr/attendance/{record_id}/approve", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def approve_attendance(record_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """HR/Mentor duyệt phụ cấp cho từng cá nhân trực tiếp trong DB."""
    rec = db.query(InternAttendance).filter(InternAttendance.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi chấm công.")

    rec.status = "approved"
    rec.status_label = "Đã duyệt chi trả"
    db.commit()
    return {"id": rec.id, "status": rec.status, "status_label": rec.status_label}


@router.post("/hr/attendance/approve-all", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def approve_all_attendance(db: Session = Depends(get_db)) -> dict[str, Any]:
    """HR/Mentor duyệt toàn bộ phụ cấp trong DB."""
    db.query(InternAttendance).update({"status": "approved", "status_label": "Đã duyệt chi trả"})
    db.commit()
    return {"detail": "Đã duyệt toàn bộ danh sách phụ cấp trong CSDL thành công."}


# ─────────────────────────────────────────────────────────────────────────────
# 6. HR & MENTOR DIGITAL CONTRACTS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/hr/contracts", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def get_contracts(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh sách hợp đồng thực tập số từ DB."""
    contracts = db.query(InternContractRecord).options(joinedload(InternContractRecord.intern).joinedload(User.intern_profile)).all()
    return [
        {
            "id": c.id,
            "contract_code": c.contract_code,
            "student_name": c.intern.full_name if c.intern else "Thực tập sinh",
            "student_code": c.intern.code if c.intern else "TTS0000",
            "faculty": c.intern.intern_profile.major if c.intern and c.intern.intern_profile else "Khoa CNTT",
            "doc_type": c.doc_type,
            "created_at": "28/09/2026",
            "signed_intern": c.signed_intern,
            "signed_company": c.signed_company,
            "signed_ictu": c.signed_ictu,
            "status": c.status,
            "status_label": c.status_label or "Chờ ký số",
            "cert": c.cert or "ICTU-CA Verified",
        }
        for c in contracts
    ]


@router.post("/hr/contracts/{contract_id}/sign", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def sign_contract(contract_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """HR ký số hợp đồng điện tử và cập nhật trạng thái trong DB."""
    con = db.query(InternContractRecord).filter(InternContractRecord.id == contract_id).first()
    if not con:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng.")

    con.signed_company = True
    con.signed_ictu = True
    con.status = "completed"
    con.status_label = "Đã hoàn tất ký số 3 bên"
    con.cert = "ICTU-CA Verified (30/09)"
    db.commit()
    return {"id": con.id, "status": con.status, "status_label": con.status_label}


@router.post("/hr/contracts/sign-all", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def sign_all_contracts(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Ký số hàng loạt toàn bộ hợp đồng trong DB."""
    db.query(InternContractRecord).update({
        "signed_company": True,
        "signed_ictu": True,
        "status": "completed",
        "status_label": "Đã hoàn tất ký số 3 bên",
        "cert": "ICTU-CA Verified (30/09)",
    })
    db.commit()
    return {"detail": "Đã hoàn tất ký số toàn bộ hợp đồng trong CSDL."}


# ─────────────────────────────────────────────────────────────────────────────
# 7. HR UNIVERSITY REPORTS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/hr/university-reports", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def get_university_reports(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Lấy danh mục báo cáo gửi Nhà trường từ DB."""
    reports = db.query(UniversityReport).all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "title": r.title,
            "target": r.target,
            "submit_date": r.submit_date or "Chưa chốt",
            "total_students": r.total_students,
            "signer": r.signer or "Ban Hợp tác Doanh nghiệp",
            "cert": r.cert or "Chờ ký số",
            "status": r.status,
            "status_label": r.status_label or "Chờ gửi",
        }
        for r in reports
    ]


@router.post("/hr/university-reports/{report_id}/send", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def send_university_report(report_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Ký số và gửi báo cáo sang Cổng Đào tạo ICTU, lưu trực tiếp vào DB."""
    rep = db.query(UniversityReport).filter(UniversityReport.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")

    rep.status = "sent"
    rep.status_label = "Đã chuyển sang Cổng Đào tạo ICTU"
    rep.submit_date = "30/09/2026"
    rep.cert = "ICTU-CA e-Seal #99988 (Ký duyệt)"
    db.commit()
    return {"id": rep.id, "status": rep.status, "status_label": rep.status_label}


@router.post("/hr/university-reports/sync-scores", dependencies=[Depends(require_roles("hr", "admin", "mentor"))])
def sync_scores_to_edusoft(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Đồng bộ toàn bộ bảng điểm học phần sang Hệ thống Edusoft ICTU trong DB."""
    db.query(InternEvaluation).update({"status": "synced"})
    db.commit()
    return {"detail": "Đã đồng bộ 100% bảng điểm học phần sang Hệ thống Edusoft ICTU trong CSDL!"}
