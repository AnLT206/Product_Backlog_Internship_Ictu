import { Outlet } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import { useAuth } from '../../context/AuthContext'

const INTERN_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Dashboard', permission: 'tasks_update', end: true },
  { to: '/intern/schedule', label: 'Lịch thực tập cá nhân', permission: 'schedule_view' },
  { to: '/intern/attendance', label: 'Lịch sử chấm công - nghỉ phép', permission: 'attendance_self' },
  { to: '/intern/reports', label: 'Báo cáo tuần & Feedback', permission: 'reports_submit' },
  { to: '/intern/allowance', label: 'Phụ cấp & Thu nhập', permission: 'allowances' },
  { to: '/intern/support', label: 'Yêu cầu hỗ trợ (Tickets)', permission: 'support_tickets' },
  { to: '/intern/training', label: 'Tài liệu đào tạo & Onboarding', permission: 'schedule_view' },
]

const APPLICANT_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Hồ sơ & Tiến trình ứng tuyển', end: true },
  { to: '/intern/upload', label: 'Tải lên CV & Đơn thực tập' },
]

export default function InternLayout() {
  const { user } = useAuth()
  const isApplicant =
    user?.status === 'pending' ||
    (user?.email === 'ungvien@ictu.edu.vn' && user?.status !== 'active') ||
    (user?.code === 'TTS9999' && user?.status !== 'active')

  const navItems = isApplicant ? APPLICANT_NAV_ITEMS : INTERN_NAV_ITEMS

  return (
    <EnterpriseAppShell
      portalName="Thực tập Doanh nghiệp"
      logoTitle="ICTU Intern Hub"
      logoSubtitle={isApplicant ? 'Cổng Tuyển Dụng & Đào Tạo' : 'Hệ thống Thực tập Doanh nghiệp'}
      sidebarSectionLabel={isApplicant ? 'HỒ SƠ ỨNG TUYỂN' : 'KHÔNG GIAN LÀM VIỆC TTS'}
      navItems={navItems}
      breadcrumbs={[
        {
          label: isApplicant
            ? `Tiến trình xét tuyển hồ sơ - Ứng viên ${user?.full_name || 'Nguyễn Văn An'}`
            : `Không gian làm việc cá nhân - TTS ${user?.full_name || 'Nguyễn Văn Bình'}`,
        },
      ]}
      showNotifications={false}
      showTopbarUser={false}
      avatarText={isApplicant ? 'NA' : 'NB'}
      userCardMeta={
        isApplicant
          ? 'Mã UV: TTS9999 · K20-CNTT'
          : 'Mã TTS: TTS0002 - ĐTV • K20-CNTT'
      }
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}


