from fastapi import APIRouter

from app.api.routes import (
    admin,
    allowances,
    analytics,
    attendance,
    auth,
    departments,
    documents,
    evaluations,
    intern_contract,
    interns,
    leaves,
    meetings,
    mentors,
    mentor_assignments,
    notifications,
    programs,
    reports,
    schedules,
    support_requests,
    tasks,
    weekly_reports,
    work_schedules,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(allowances.router)
api_router.include_router(analytics.router)
api_router.include_router(departments.router)
api_router.include_router(documents.router)           # /api/hr/documents/*
api_router.include_router(documents.intern_router)    # /api/intern/documents/*
api_router.include_router(evaluations.router)
api_router.include_router(intern_contract.router)
api_router.include_router(interns.router)
api_router.include_router(leaves.router)
api_router.include_router(meetings.router)
api_router.include_router(mentors.router)
api_router.include_router(mentor_assignments.router)
api_router.include_router(notifications.router)
api_router.include_router(programs.router)
api_router.include_router(reports.router)
api_router.include_router(schedules.router)
api_router.include_router(admin.router)
api_router.include_router(admin.users_router)
api_router.include_router(tasks.router)
api_router.include_router(attendance.router)
api_router.include_router(support_requests.router)
api_router.include_router(weekly_reports.router)
api_router.include_router(work_schedules.router)

