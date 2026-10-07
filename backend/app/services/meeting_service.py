from datetime import datetime

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User
from app.schemas.meeting import MeetingAttendeeItem, MeetingCreate, MeetingResponse
from app.services.email_service import EmailService


class MeetingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_response(self, meeting: Meeting) -> MeetingResponse:
        attendees_items = [
            MeetingAttendeeItem(
                user_id=att.user_id,
                full_name=att.user.full_name if att.user else None,
                email=att.user.email if att.user else None,
                is_notified=att.is_notified,
            )
            for att in meeting.attendees
        ]
        return MeetingResponse(
            id=meeting.id,
            title=meeting.title,
            description=meeting.description,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            meeting_link=meeting.meeting_link,
            host_id=meeting.host_id,
            host_name=meeting.host.full_name if meeting.host else None,
            attendees=attendees_items,
            created_at=meeting.created_at,
            updated_at=meeting.updated_at,
        )

    def get_by_id(self, meeting_id: int) -> MeetingResponse:
        meeting = (
            self.db.query(Meeting)
            .options(
                joinedload(Meeting.host),
                joinedload(Meeting.attendees).joinedload(MeetingAttendee.user),
            )
            .filter(Meeting.id == meeting_id)
            .first()
        )
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lịch họp",
            )
        return self._to_response(meeting)

    def list_meetings(self, user_id: int, role_name: str) -> list[MeetingResponse]:
        query = self.db.query(Meeting).options(
            joinedload(Meeting.host),
            joinedload(Meeting.attendees).joinedload(MeetingAttendee.user),
        )
        if role_name == "intern":
            query = query.join(MeetingAttendee, MeetingAttendee.meeting_id == Meeting.id).filter(
                MeetingAttendee.user_id == user_id
            )
        elif role_name in ("hr", "mentor", "admin"):
            # Lấy tất cả hoặc cuộc họp do chính user tạo
            pass

        meetings = query.order_by(Meeting.start_time.desc()).all()
        return [self._to_response(m) for m in meetings]

    def create_meeting(
        self,
        data: MeetingCreate,
        host: User,
        background_tasks: BackgroundTasks,
    ) -> MeetingResponse:
        """
        Tạo lịch họp mới và tự động kích hoạt gửi email thông báo chi tiết
        (Thời gian, Địa điểm/Link họp) tới thực tập sinh qua BackgroundTasks (SCRUM-178, SCRUM-179).
        """
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian bắt đầu họp phải trước thời gian kết thúc",
            )

        # Kiểm tra danh sách TTS
        interns = (
            self.db.query(User)
            .filter(User.id.in_(data.intern_ids))
            .all()
        )
        if not interns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy thực tập sinh nào hợp lệ trong danh sách được mời",
            )

        # Lưu cuộc họp
        meeting = Meeting(
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            start_time=data.start_time,
            end_time=data.end_time,
            meeting_link=data.meeting_link.strip() if data.meeting_link else None,
            host_id=host.id,
        )
        self.db.add(meeting)
        self.db.flush()

        # Tạo người tham gia và kích hoạt gửi email
        now = datetime.now()
        start_str = data.start_time.strftime("%d/%m/%Y %H:%M")
        end_str = data.end_time.strftime("%d/%m/%Y %H:%M")

        for intern in interns:
            subject, body = EmailService.format_meeting_email(
                intern_name=intern.full_name or "Bạn",
                meeting_title=meeting.title,
                start_time=start_str,
                end_time=end_str,
                meeting_link=meeting.meeting_link,
                host_name=host.full_name,
                description=meeting.description,
            )

            # Đẩy vào queue bất đồng bộ không làm chậm request
            if intern.email:
                EmailService.enqueue_email(background_tasks, intern.email, subject, body)
                is_notified = True
                notified_at = now
            else:
                is_notified = False
                notified_at = None

            attendee = MeetingAttendee(
                meeting_id=meeting.id,
                user_id=intern.id,
                is_notified=is_notified,
                notified_at=notified_at,
            )
            self.db.add(attendee)

        self.db.commit()
        self.db.refresh(meeting)
        return self._to_response(meeting)
