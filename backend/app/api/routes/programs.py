from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas.program import (
    ProgramAssignRequest,
    ProgramAssignResponse,
    ProgramCreateRequest,
    ProgramResponse,
    ProgramUpdateRequest,
)
from app.services.program_service import ProgramService

router = APIRouter(prefix="/hr/programs", tags=["programs"])


@router.get(
    "",
    response_model=list[ProgramResponse],
    summary="Lấy danh sách các kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def list_programs(
    include_deleted: bool = Query(default=False, description="Bao gồm cả các kỳ đã xóa mềm"),
    db: Session = Depends(get_db),
) -> list[ProgramResponse]:
    return ProgramService(db).list_programs(include_deleted=include_deleted)


@router.post(
    "",
    response_model=ProgramResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_program(
    payload: ProgramCreateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).create_program(payload)


@router.get(
    "/{program_id}",
    response_model=ProgramResponse,
    summary="Xem thông tin chi tiết một kỳ thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def get_program(program_id: int, db: Session = Depends(get_db)) -> ProgramResponse:
    return ProgramService(db).get_program(program_id)


@router.put(
    "/{program_id}",
    response_model=ProgramResponse,
    summary="Cập nhật thông tin chi tiết một kỳ thực tập (SCRUM-25)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_program(
    program_id: int,
    payload: ProgramUpdateRequest,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).update_program(program_id, payload)


@router.patch(
    "/{program_id}/close",
    response_model=ProgramResponse,
    summary="Đóng (Close) kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def close_program(
    program_id: int,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).close_program(program_id)


@router.patch(
    "/{program_id}/open",
    response_model=ProgramResponse,
    summary="Mở lại kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def open_program(
    program_id: int,
    db: Session = Depends(get_db),
) -> ProgramResponse:
    return ProgramService(db).open_program(program_id)


@router.post(
    "/{program_id}/assign",
    response_model=ProgramAssignResponse,
    summary="Gán thực tập sinh vào kỳ thực tập và kiểm tra số lượng tối đa (SCRUM-26)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns(
    program_id: int,
    payload: ProgramAssignRequest,
    db: Session = Depends(get_db),
) -> ProgramAssignResponse:
    return ProgramService(db).assign_interns(program_id, payload)


@router.delete(
    "/{program_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Xóa mềm (Soft Delete) kỳ thực tập (SCRUM-27)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def delete_program(program_id: int, db: Session = Depends(get_db)) -> Response:
    ProgramService(db).delete_program(program_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
