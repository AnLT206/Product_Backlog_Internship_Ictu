import { Outlet } from 'react-router-dom'
import {
  Users,
  CheckSquare,
  FileText,
  Award,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'

const MENTOR_NAV_ITEMS = [
  { to: '/mentor/dashboard', label: 'Danh sách TTS phụ trách', icon: Users, badge: '2', end: true },
  { to: '/mentor/dashboard#tasks', label: 'Phân công nhiệm vụ (Tasks)', icon: CheckSquare },
  { to: '/mentor/dashboard#reports', label: 'Duyệt báo cáo tuần', icon: FileText, badge: '1 mới' },
  { to: '/mentor/dashboard#evaluations', label: 'Đánh giá & Điểm cuối kỳ', icon: Award },
  { to: '/mentor/dashboard#meetings', label: 'Lịch họp & Code Review', icon: Calendar },
  { to: '/mentor/attendance', label: 'Tổng hợp công & Phụ cấp', icon: Calendar },
  { to: '/mentor/contracts', label: 'Hợp đồng thực tập & Tiếp nhận', icon: FileText },
  { to: '/mentor/reports', label: 'Báo cáo gửi Nhà trường', icon: FileSpreadsheet },
]

export default function MentorLayout() {
  return (
    <EnterpriseAppShell
      portalName="Hướng dẫn Chuyên môn"
      portalTagPrefix="PHÂN HỆ NGHIỆP VỤ"
      portalTag="Hướng dẫn Chuyên môn"
      showPortalTagBox={true}
      logoTitle="ICTU Mentor Hub"
      logoSubtitle="Cổng Hướng dẫn Kỹ thuật"
      sidebarSectionLabel="HƯỚNG DẪN & ĐÁNH GIÁ TTS"
      navItems={MENTOR_NAV_ITEMS}
      breadcrumbs={[{ label: 'Quản lý & Hướng dẫn Thực tập' }]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText="MB"
      userCardMeta="Senior Tech Lead • Khoa CNTT"
      defaultUserName="Trần Hoàng Quân"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}

