import { Outlet, useLocation } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import './HrLayout.css'

const HR_NAV_ITEMS = [
  {
    to: '/hr/dashboard',
    label: 'Tổng quan Dashboard',
    end: true,
  },
  {
    to: '/hr/interns',
    label: 'Quản lý hồ sơ TTS',
  },
  {
    to: '/hr/programs',
    label: 'Kỳ thực tập tuyển dụng',
  },
  {
    to: '/hr/mentor-assignment',
    label: 'Điều phối & Gán Mentor',
  },
  {
    to: '/hr/attendance',
    label: 'Chấm công & Phụ cấp',
  },
  {
    to: '/hr/contracts',
    label: 'Hợp đồng thực tập',
  },
  {
    to: '/hr/analytics',
    label: 'Báo cáo & Thống kê KPI',
  },
  {
    to: '/hr/tickets',
    label: 'Yêu cầu hỗ trợ (Tickets)',
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
      sidebarSectionLabel="QUẢN LÝ NHÂN SỰ & TUYỂN DỤNG"
      navItems={HR_NAV_ITEMS}
      breadcrumbs={[
        { label: 'Cổng HR' },
        { label: currentLabel },
      ]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText="HR"
      userCardMeta="HR Manager • Ban HTDN"
      defaultUserName="HR"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}



