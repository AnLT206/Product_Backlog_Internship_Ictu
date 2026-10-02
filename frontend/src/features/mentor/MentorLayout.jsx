import { Outlet } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'

const MENTOR_NAV_ITEMS = [
  { to: '/mentor/dashboard', label: 'Danh sách TTS phụ trách', badge: '2', permission: 'interns_view', end: true },
  { to: '/mentor/dashboard#tasks', label: 'Phân công nhiệm vụ (Tasks)', permission: 'tasks_manage' },
  { to: '/mentor/dashboard#reports', label: 'Duyệt báo cáo tuần', badge: '1 mới', permission: 'reports_feedback' },
  { to: '/mentor/dashboard#evaluations', label: 'Đánh giá & Điểm cuối kỳ', permission: 'evaluations' },
  { to: '/mentor/dashboard#meetings', label: 'Lịch họp & Code Review', permission: 'schedule_view' },
  { to: '/mentor/attendance', label: 'Tổng hợp công & Phụ cấp', permission: 'attendance_self' },
  { to: '/mentor/contracts', label: 'Hợp đồng thực tập & Tiếp nhận', permission: 'schedule_view' },
  { to: '/mentor/reports', label: 'Báo cáo gửi Nhà trường', permission: 'evaluations' },
]

export default function MentorLayout() {
  return (
    <EnterpriseAppShell
      portalName="Hướng dẫn Chuyên môn"
      logoTitle="ICTU Mentor Hub"
      logoSubtitle="Cổng Hướng dẫn Kỹ thuật"
      sidebarSectionLabel="HƯỚNG DẪN & ĐÁNH GIÁ TTS"
      navItems={MENTOR_NAV_ITEMS}
      breadcrumbs={[{ label: 'Quản lý & Hướng dẫn Thực tập' }]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText="ME"
      userCardMeta="Senior Tech Lead • Khoa CNTT"
      defaultUserName="Mentor"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}

