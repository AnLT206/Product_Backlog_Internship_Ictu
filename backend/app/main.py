from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.activity_log_filter import ActivityLogFilterMiddleware
from app.api.routes import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Đặt sau CORS: Starlette chạy middleware theo thứ tự ngược (last added = outermost).
app.add_middleware(ActivityLogFilterMiddleware)

app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
