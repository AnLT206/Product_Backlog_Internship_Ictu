import { Outlet, useLocation, Navigate } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import { useAuth, isApplicantUser } from '../../context/AuthContext'

const INTERN_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Dashboard', permission: 'tasks_update', end: true },
  { to: '/intern/program', label: 'Kỳ thực tập' },
  { to: '/intern/schedule', label: 'Lịch thực tập cá nhân', permission: 'schedule_view' },
  { to: '/intern/attendance', label: 'Lịch sử chấm công - nghỉ phép', permission: 'attendance_self' },
  { to: '/intern/reports', label: 'Báo cáo tuần', permission: 'reports_submit' },
  { to: '/intern/allowance', label: 'Thu nhập', permission: 'allowances' },
  { to: '/intern/support', label: 'Trợ giúp' },
  { to: '/intern/training', label: 'Tài liệu đào tạo', permission: 'schedule_view' },
  { to: '/intern/profile', label: 'Hồ sơ cá nhân' },
]

// Ứng viên chỉ có quyền xem lộ trình, kỳ thực tập, upload CV, hồ sơ cá nhân
const APPLICANT_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Lộ trình thực tập', end: true },
  { to: '/intern/program', label: 'Kỳ thực tập' },
  { to: '/intern/upload', label: 'Upload CV' },
  { to: '/intern/profile', label: 'Hồ sơ cá nhân' },
]

export default function InternLayout() {
  const { user } = useAuth()
  const location = useLocation()
  // Xác định vai trò: Ứng viên (chờ duyệt/ký hợp đồng) vs Thực tập sinh chính thức
  const isApplicant = Boolean(user && isApplicantUser(user))
  const isActualIntern = Boolean(user && !isApplicant)

  // Nếu là ứng viên, cho phép truy cập: /intern/upload, /intern/dashboard, /intern/roadmap, /intern/profile, /intern/program
  const allowedApplicantPaths = ['/intern/upload', '/intern/dashboard', '/intern/roadmap', '/intern/profile', '/intern/program']
  const isCurrentPathAllowed = allowedApplicantPaths.some(
    (p) => location.pathname === p || location.pathname === `${p}/`
  )

  if (isApplicant && !isCurrentPathAllowed) {
    return <Navigate to="/intern/dashboard" replace />
  }

  const navItems = isApplicant ? APPLICANT_NAV_ITEMS : INTERN_NAV_ITEMS

  // Tên hiển thị người dùng
  const displayUserName = user?.full_name || (isApplicant ? 'Ứng viên' : 'Thực tập sinh')

  const displayUserCode = user?.code
    ? (isApplicant && user.code.startsWith('TTS') ? user.code.replace('TTS', 'UV') : user.code)
    : (isApplicant ? 'UV0001' : 'TTS0001')

  const displayUserMeta = isApplicant
    ? `Mã UV: ${displayUserCode} · K20-CNTT`
    : `Mã TTS: ${user?.code || 'TTS0001'} · K20-CNTT`

  // Breadcrumb chuẩn theo từng trang của TTS
  let currentBreadcrumbLabel = `Không gian làm việc Thực tập sinh – ${displayUserName}`
  if (location.pathname.includes('/program')) {
    currentBreadcrumbLabel = 'Thông tin Kỳ thực tập & Đơn vị tiếp nhận'
  } else if (isApplicant) {
    if (location.pathname.includes('/upload')) {
      currentBreadcrumbLabel = 'Upload CV & Hồ sơ ứng tuyển'
    } else if (location.pathname.includes('/profile')) {
      currentBreadcrumbLabel = 'Hồ sơ cá nhân ứng viên'
    } else {
      currentBreadcrumbLabel = 'Lộ trình thực tập doanh nghiệp'
    }
  }

  return (
    <EnterpriseAppShell
      portalName="Thực tập Doanh nghiệp"
      logoTitle="ICTU Intern Hub"
      logoSubtitle={isApplicant ? 'Cổng Tuyển Dụng & Đào Tạo' : 'Hệ thống Thực tập Doanh nghiệp'}
      sidebarSectionLabel={isApplicant ? 'HỒ SƠ ỨNG VIÊN' : 'KHÔNG GIAN LÀM VIỆC TTS'}
      navItems={navItems}
      breadcrumbs={[
        {
          label: currentBreadcrumbLabel,
        },
      ]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText={isApplicant ? 'UV' : 'TTS'}
      customUserName={displayUserName}
      userCardMeta={displayUserMeta}
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}


