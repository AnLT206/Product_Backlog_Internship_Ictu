from fastapi import APIRouter

from app.api.routes import (
    admin,
    attendance,
    auth,
    departments,
    documents,
    intern_contract,
    interns,
    mentors,
    programs,
    support_requests,
    tasks,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(documents.router)           # /api/hr/documents/*
api_router.include_router(documents.intern_router)    # /api/intern/documents/*
api_router.include_router(intern_contract.router)
api_router.include_router(interns.router)
api_router.include_router(mentors.router)
api_router.include_router(programs.router)
api_router.include_router(admin.router)
api_router.include_router(admin.users_router)
api_router.include_router(tasks.router)
api_router.include_router(attendance.router)
api_router.include_router(support_requests.router)

