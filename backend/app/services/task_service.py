"""Service xử lý logic quản lý công việc và tiến độ (Tasks 1, 2, 7)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.program_member import ProgramMember
from app.models.role import Role
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
    TaskUpdateRequest,
)

TTS_ROLE_NAME = "intern"
MENTOR_ROLE_NAME = "mentor"
ADMIN_ROLE_NAME = "admin"


class TaskService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_task_response(self, task: Task) -> TaskResponse:
        mentor_name = task.mentor.full_name if task.mentor else None
        intern_name = task.intern.full_name if task.intern else None
        return TaskResponse(
            id=task.id,
            mentor_id=task.mentor_id,
            intern_id=task.intern_id,
            title=task.title,
            description=task.description,
            status=task.status,
            progress=task.progress,
            due_at=task.due_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            mentor_name=mentor_name,
            intern_name=intern_name,
        )

    def create_task(self, current_user: User, payload: TaskCreateRequest) -> TaskResponse:
        """Mentor tạo công việc mới và tự động gán vào tài khoản intern (Task 7)."""
        # 1. Kiểm tra intern tồn tại
        intern = (
            self.db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(User.id == payload.intern_id, Role.name == TTS_ROLE_NAME)
            .first()
        )
        if not intern:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thực tập sinh tương ứng.",
            )

        # 2. Kiểm tra quyền quản lý của Mentor đối với TTS
        is_admin = current_user.role and current_user.role.name == ADMIN_ROLE_NAME
        if not is_admin:
            assignment = (
                self.db.query(ProgramMember)
                .filter(
                    ProgramMember.mentor_user_id == current_user.id,
                    ProgramMember.intern_user_id == payload.intern_id,
                )
                .first()
            )
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn chỉ có thể giao việc cho thực tập sinh thuộc quyền quản lý của mình.",
                )

        # 3. Ràng buộc dữ liệu tiến độ (Task 1)
        if payload.progress < 0 or payload.progress > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tiến độ phải nằm trong khoảng từ 0% đến 100%.",
            )

        task_status = payload.status
        if payload.progress == 100:
            task_status = "done"

        new_task = Task(
            mentor_id=current_user.id,
            intern_id=payload.intern_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            due_at=payload.due_at,
            status=task_status,
            progress=payload.progress,
        )
        self.db.add(new_task)
        self.db.commit()
        self.db.refresh(new_task)

        # Load relationships
        new_task = (
            self.db.query(Task)
            .options(joinedload(Task.mentor), joinedload(Task.intern))
            .filter(Task.id == new_task.id)
            .first()
        )
        return self._to_task_response(new_task)

    def update_task_by_intern(
        self, current_user: User, task_id: int, payload: TaskUpdateRequest
    ) -> TaskResponse:
        """Thực tập sinh cập nhật trạng thái và tiến độ công việc được giao (Task 2)."""
        task = (
            self.db.query(Task)
            .options(joinedload(Task.mentor), joinedload(Task.intern))
            .filter(Task.id == task_id)
            .first()
        )
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy công việc.",
            )

        is_admin = current_user.role and current_user.role.name == ADMIN_ROLE_NAME
        if not is_admin and task.intern_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền cập nhật công việc của người khác.",
            )

        # Cập nhật tiến độ
        if payload.progress is not None:
            if payload.progress < 0 or payload.progress > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tiến độ phải nằm trong khoảng từ 0% đến 100%.",
                )
            task.progress = payload.progress
            if payload.progress == 100 and not payload.status:
                task.status = "done"
            elif payload.progress > 0 and task.status == "todo" and not payload.status:
                task.status = "doing"

        # Cập nhật trạng thái
        if payload.status is not None:
            task.status = payload.status
            if payload.status == "done" and task.progress < 100 and payload.progress is None:
                task.progress = 100

        self.db.commit()
        self.db.refresh(task)
        return self._to_task_response(task)

    def list_tasks_for_mentor(
        self,
        current_user: User,
        intern_id: int | None = None,
        status_filter: str | None = None,
    ) -> TaskListResponse:
        """Lấy danh sách công việc mà Mentor đã giao."""
        query = (
            self.db.query(Task)
            .options(joinedload(Task.mentor), joinedload(Task.intern))
        )
        is_admin = current_user.role and current_user.role.name == ADMIN_ROLE_NAME
        if not is_admin:
            query = query.filter(Task.mentor_id == current_user.id)

        if intern_id:
            query = query.filter(Task.intern_id == intern_id)
        if status_filter:
            query = query.filter(Task.status == status_filter)

        rows = query.order_by(Task.created_at.desc(), Task.id.desc()).all()
        items = [self._to_task_response(t) for t in rows]
        return TaskListResponse(items=items, total=len(items))

    def list_tasks_for_intern(
        self,
        current_user: User,
        status_filter: str | None = None,
    ) -> TaskListResponse:
        """Lấy danh sách công việc được giao cho Thực tập sinh."""
        query = (
            self.db.query(Task)
            .options(joinedload(Task.mentor), joinedload(Task.intern))
            .filter(Task.intern_id == current_user.id)
        )
        if status_filter:
            query = query.filter(Task.status == status_filter)

        rows = query.order_by(Task.due_at.asc(), Task.created_at.desc()).all()
        items = [self._to_task_response(t) for t in rows]
        return TaskListResponse(items=items, total=len(items))
