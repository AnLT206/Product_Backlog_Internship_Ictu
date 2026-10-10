import { Outlet, useLocation, Navigate } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import { useAuth, isApplicantUser } from '../../context/AuthContext'

const INTERN_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Dashboard', permission: 'tasks_update', end: true },
  { to: '/intern/schedule', label: 'Lịch thực tập cá nhân', permission: 'schedule_view' },
  { to: '/intern/attendance', label: 'Lịch sử chấm công - nghỉ phép', permission: 'attendance_self' },
  { to: '/intern/reports', label: 'Báo cáo tuần', permission: 'reports_submit' },
  { to: '/intern/allowance', label: 'Thu nhập', permission: 'allowances' },
  { to: '/intern/support', label: 'Trợ giúp' },
  { to: '/intern/training', label: 'Tài liệu đào tạo', permission: 'schedule_view' },
  { to: '/intern/profile', label: 'Hồ sơ cá nhân' },
]

// Ứng viên chỉ có quyền xem lộ trình, upload CV, hồ sơ cá nhân (không có phần Trợ giúp)
const APPLICANT_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Lộ trình thực tập', end: true },
  { to: '/intern/upload', label: 'Upload CV' },
  { to: '/intern/profile', label: 'Hồ sơ cá nhân' },
]

export default function InternLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const isApplicant =
    isApplicantUser(user) ||
    location.pathname === '/intern/upload' ||
    location.pathname === '/intern/roadmap' ||
    (typeof window !== 'undefined' &&
      localStorage.getItem('last_portal_intern_role') === 'applicant' &&
      !['tts02', 'tts03', 'tts04', 'tts05', 'intern@ictu.edu.vn'].some((e) => (user?.email || '').toLowerCase().includes(e)) &&
      localStorage.getItem('applicant_onboarded') !== 'true')
  const isActualIntern = user?.role === 'intern' && !isApplicant

  // Nếu là ứng viên, cho phép truy cập: /intern/upload, /intern/dashboard, /intern/roadmap, /intern/profile
  const allowedApplicantPaths = ['/intern/upload', '/intern/dashboard', '/intern/roadmap', '/intern/profile']
  const isCurrentPathAllowed = allowedApplicantPaths.some(
    (p) => location.pathname === p || location.pathname === `${p}/`
  )

  if (isApplicant && !isCurrentPathAllowed) {
    return <Navigate to="/intern/dashboard" replace />
  }

  const navItems = isApplicant ? APPLICANT_NAV_ITEMS : INTERN_NAV_ITEMS

  // Tên hiển thị người dùng:
  // Nếu là tài khoản TTS thực tế -> hiển thị tên thật của TTS
  // Nếu là Ứng viên -> 'Nguyễn Thu Hà' (hoặc user?.full_name)
  // Nếu là HR / Admin đang vào kiểm thử -> cố định hiển thị chuẩn là 'TTS (TTS0001)'
  const displayUserName = isApplicant
    ? (user?.full_name && !user.full_name.includes('TTS') ? user.full_name : 'Nguyễn Thu Hà')
    : isActualIntern
    ? (user?.full_name || 'TTS')
    : 'TTS (TTS0001)'

  const displayUserMeta = isApplicant
    ? `Mã UV: ${user?.code && user.code !== 'TTS0001' ? user.code : 'UV0001'} · K20-CNTT`
    : isActualIntern
    ? `Mã TTS: ${user?.code || 'TTS0001'} · K20-CNTT`
    : 'Mã TTS: TTS0001 · K20-CNTT'

  // Breadcrumb chuẩn theo từng trang của TTS
  let currentBreadcrumbLabel = `Không gian làm việc Thực tập sinh – ${isActualIntern ? (user?.full_name || 'TTS') : 'TTS'}`
  if (isApplicant) {
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


