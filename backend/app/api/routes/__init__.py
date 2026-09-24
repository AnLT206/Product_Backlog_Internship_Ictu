from fastapi import APIRouter

from app.api.routes import auth, departments, interns, mentors

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(interns.router)
api_router.include_router(mentors.router)
