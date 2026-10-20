from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.schemas.internship_group import (
    AssignInternsToDepartmentRequest,
    AssignInternsToDepartmentResponse,
    AssignInternsToGroupRequest,
    AssignInternsToGroupResponse,
    InternGroupsDepartmentsResponse,
    InternshipGroupCreate,
    InternshipGroupResponse,
    InternshipGroupUpdate,
)
from app.services.internship_group_service import InternshipGroupService

router = APIRouter(prefix="", tags=["internship-groups"])


@router.get(
    "/hr/internship-groups",
    response_model=list[InternshipGroupResponse],
    summary="HR & Mentor lấy danh sách nhóm thực tập theo phòng ban/chương trình/mentor",
    dependencies=[Depends(require_roles("hr", "admin", "mentor"))],
)
def list_internship_groups(
    department_id: int | None = Query(None, description="Lọc theo ID phòng ban"),
    program_id: int | None = Query(None, description="Lọc theo ID kỳ thực tập"),
    leader_user_id: int | None = Query(None, description="Lọc theo ID Mentor phụ trách"),
    status: str | None = Query(None, description="Lọc theo trạng thái (active, inactive, closed)"),
    db: Session = Depends(get_db),
) -> list[InternshipGroupResponse]:
    return InternshipGroupService(db).list_groups(
        department_id=department_id,
        program_id=program_id,
        leader_user_id=leader_user_id,
        status_filter=status,
    )


@router.post(
    "/hr/internship-groups",
    response_model=InternshipGroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="HR tạo mới nhóm thực tập theo phòng ban",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def create_internship_group(
    payload: InternshipGroupCreate,
    db: Session = Depends(get_db),
) -> InternshipGroupResponse:
    return InternshipGroupService(db).create_group(payload)


@router.get(
    "/hr/internship-groups/{group_id}",
    response_model=InternshipGroupResponse,
    summary="HR & Mentor xem chi tiết nhóm thực tập kèm danh sách thành viên",
    dependencies=[Depends(require_roles("hr", "admin", "mentor"))],
)
def get_internship_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
) -> InternshipGroupResponse:
    return InternshipGroupService(db).get_group_detail(group_id)


@router.put(
    "/hr/internship-groups/{group_id}",
    response_model=InternshipGroupResponse,
    summary="HR cập nhật thông tin nhóm thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def update_internship_group(
    group_id: int,
    payload: InternshipGroupUpdate,
    db: Session = Depends(get_db),
) -> InternshipGroupResponse:
    return InternshipGroupService(db).update_group(group_id, payload)


@router.post(
    "/hr/internship-groups/assign-interns",
    response_model=AssignInternsToGroupResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều thực tập sinh vào nhóm thực tập (POST body group_id)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns_to_group_body(
    payload: AssignInternsToGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignInternsToGroupResponse:
    if not payload.group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp group_id.",
        )
    return InternshipGroupService(db).assign_interns_to_group(
        group_id=payload.group_id,
        payload=payload,
        assigned_by=current_user.id,
    )


@router.post(
    "/hr/internship-groups/{group_id}/assign-interns",
    response_model=AssignInternsToGroupResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều thực tập sinh vào nhóm thực tập (POST path group_id)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns_to_group_path(
    group_id: int,
    payload: AssignInternsToGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignInternsToGroupResponse:
    return InternshipGroupService(db).assign_interns_to_group(
        group_id=group_id,
        payload=payload,
        assigned_by=current_user.id,
    )


@router.delete(
    "/hr/internship-groups/{group_id}/interns/{intern_profile_id}",
    summary="HR xoá thực tập sinh khỏi nhóm thực tập",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def remove_intern_from_group(
    group_id: int,
    intern_profile_id: int,
    db: Session = Depends(get_db),
) -> dict:
    return InternshipGroupService(db).remove_intern_from_group(group_id, intern_profile_id)


@router.post(
    "/hr/departments/assign-interns",
    response_model=AssignInternsToDepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều thực tập sinh vào phòng ban (POST body department_id)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns_to_department_body(
    payload: AssignInternsToDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignInternsToDepartmentResponse:
    if not payload.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp department_id.",
        )
    return InternshipGroupService(db).assign_interns_to_department(
        department_id=payload.department_id,
        payload=payload,
        assigned_by=current_user.id,
    )


@router.post(
    "/hr/departments/{department_id}/assign-interns",
    response_model=AssignInternsToDepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary="HR phân công một hoặc nhiều thực tập sinh vào phòng ban (POST path department_id)",
    dependencies=[Depends(require_roles("hr", "admin"))],
)
def assign_interns_to_department_path(
    department_id: int,
    payload: AssignInternsToDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignInternsToDepartmentResponse:
    return InternshipGroupService(db).assign_interns_to_department(
        department_id=department_id,
        payload=payload,
        assigned_by=current_user.id,
    )


@router.get(
    "/hr/interns/{intern_profile_id}/groups",
    response_model=InternGroupsDepartmentsResponse,
    summary="HR, Mentor & TTS xem thông tin nhóm và phòng ban của một thực tập sinh",
    dependencies=[Depends(require_roles("hr", "admin", "mentor", "intern"))],
)
def get_intern_groups_departments(
    intern_profile_id: int,
    db: Session = Depends(get_db),
) -> InternGroupsDepartmentsResponse:
    return InternshipGroupService(db).get_intern_groups_departments(intern_profile_id)
