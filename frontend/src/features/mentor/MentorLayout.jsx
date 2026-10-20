import { Outlet } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import { useAuth } from '../../context/AuthContext'

const MENTOR_NAV_ITEMS = [
  { to: '/mentor/dashboard', label: 'Danh sách TTS phụ trách', end: true },
  { to: '/mentor/schedule', label: 'Lịch làm việc & Hướng dẫn' },
  { to: '/mentor/dashboard#tasks', label: 'Giao việc & Nhiệm vụ (Tasks)' },
  { to: '/mentor/dashboard#reports', label: 'Duyệt báo cáo tuần' },
  { to: '/mentor/dashboard#evaluations', label: 'Đánh giá năng lực cuối kỳ' },
  { to: '/mentor/dashboard#leave', label: 'Theo dõi đơn nghỉ phép TTS' },
]

export default function MentorLayout() {
  const { user } = useAuth()
  const isMentor2 = user?.code === 'MT0002' || user?.email?.includes('mentor2')
  const mentorName = user?.full_name || (isMentor2 ? 'Phạm Quốc Hướng' : 'Trần Hoàng Quân')
  const userCardMeta = isMentor2 ? 'QA Lead Engineer • Khoa CNTT' : 'Senior Tech Lead • Khoa CNTT'

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
      customUserName={mentorName}
      userCardMeta={userCardMeta}
      defaultUserName="Mentor"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}

