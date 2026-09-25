from fastapi import APIRouter

from app.api.routes import auth, departments, documents, intern_contract, interns, mentors

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(documents.router)
api_router.include_router(intern_contract.router)
api_router.include_router(interns.router)
api_router.include_router(mentors.router)
