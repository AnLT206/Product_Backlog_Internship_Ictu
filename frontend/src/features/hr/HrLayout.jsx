import { Outlet, useLocation } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import './HrLayout.css'

const HR_NAV_ITEMS = [
  {
    to: '/hr/dashboard',
    label: 'Xét duyệt hồ sơ & Tuyển dụng',
    badge: '1',
    permission: 'interns_view',
    end: true,
  },
  {
    to: '/hr/programs',
    label: 'Quản lý Kỳ thực tập',
    badge: 'Q3/2026',
    badgeClass: 'badge--cyan',
    permission: 'programs_manage',
  },
  {
    to: '/hr/mentors',
    label: 'Phân công & Ghép cặp Mentor',
    badge: '2/2',
    permission: 'programs_assign',
  },
  {
    to: '/hr/attendance',
    label: 'Tổng hợp công & Phụ cấp',
    hasDot: true,
    permission: 'attendance_hr',
  },
  {
    to: '/hr/contracts',
    label: 'Hợp đồng thực tập & Tiếp nhận',
    permission: 'allowances',
  },
  {
    to: '/hr/reports',
    label: 'Báo cáo gửi Nhà trường',
    permission: 'stats_view',
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
      avatarText="TM"
      userCardMeta="HR Manager • Ban HTDN"
      defaultUserName="Trần Thị Mai"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}



