from fastapi import APIRouter

from app.api.routes import admin, auth, departments, documents, interns, mentors, programs

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(documents.router)
api_router.include_router(interns.router)
api_router.include_router(mentors.router)
api_router.include_router(programs.router)
api_router.include_router(admin.router)
