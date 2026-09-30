import { Outlet, useLocation } from 'react-router-dom'
import {
  Users,
  Briefcase,
  UserCheck,
  Calendar,
  Lock,
  FileSpreadsheet,
} from 'lucide-react'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import './HrLayout.css'

const HR_NAV_ITEMS = [
  {
    to: '/hr/dashboard',
    label: 'Xét duyệt hồ sơ & Tuyển dụng',
    icon: Users,
    badge: '1',
    end: true,
  },
  {
    to: '/hr/programs',
    label: 'Quản lý Kỳ thực tập',
    icon: Briefcase,
    badge: 'Q3/2026',
    badgeClass: 'badge--cyan',
  },
  {
    to: '/hr/mentors',
    label: 'Phân công & Ghép cặp Mentor',
    icon: UserCheck,
    badge: '2/2',
  },
  {
    to: '/hr/attendance',
    label: 'Tổng hợp công & Phụ cấp',
    icon: Calendar,
    hasDot: true,
  },
  {
    to: '/hr/contracts',
    label: 'Hợp đồng thực tập & Tiếp nhận',
    icon: Lock,
  },
  {
    to: '/hr/reports',
    label: 'Báo cáo gửi Nhà trường',
    icon: FileSpreadsheet,
  },
]

export default function HrLayout() {
  const location = useLocation()
  const activeNav = HR_NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  const currentLabel = activeNav ? activeNav.label : 'Phân hệ Nhân sự'

  return (
    <EnterpriseAppShell
      portalName="Tuyển dụng & Điều phối TTS"
      logoTitle="ICTU HR Hub"
      logoSubtitle="Hệ sinh thái Tuyển dụng & Điều phối TTS"
      portalTagPrefix="PHÂN HỆ NGHIỆP VỤ"
      portalTag="Quản lý Nhân sự & Tiếp nhận"
      showPortalTagBox={true}
      sidebarSectionLabel="QUẢN LÝ NHÂN SỰ & TUYỂN DỤNG"
      navItems={HR_NAV_ITEMS}
      breadcrumbs={[
        { label: 'Cổng HR' },
        { label: currentLabel },
      ]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText="TM"
      userCardMeta="HR Manager • Ban HTDN"
      defaultUserName="Trần Thị Mai"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}



