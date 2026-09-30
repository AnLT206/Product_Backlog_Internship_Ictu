import { Outlet } from 'react-router-dom'
import {
  CheckSquare,
  Clock,
  FileText,
  BookOpen,
  DollarSign,
  LayoutDashboard,
  UploadCloud,
} from 'lucide-react'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import { useAuth } from '../../context/AuthContext'

const INTERN_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Nhiệm vụ cá nhân (Tasks)', icon: CheckSquare, permission: 'tasks_update', end: true },
  { to: '/intern/upload', label: 'Tải lên CV & Đơn thực tập', icon: UploadCloud, permission: 'auth_login' },
  { to: '/intern/dashboard#attendance', label: 'Chấm công & Điểm danh', icon: Clock, permission: 'attendance_self' },
  { to: '/intern/dashboard#reports', label: 'Báo cáo tuần & Feedback', icon: FileText, badge: 'T8', permission: 'reports_submit' },
  { to: '/intern/dashboard#training', label: 'Tài liệu đào tạo & Onboarding', icon: BookOpen, permission: 'schedule_view' },
  { to: '/intern/dashboard#allowance', label: 'Chế độ & Trợ cấp cá nhân', icon: DollarSign, permission: 'allowances' },
]

const APPLICANT_NAV_ITEMS = [
  { to: '/intern/dashboard', label: 'Hồ sơ & Tiến trình ứng tuyển', icon: LayoutDashboard, end: true },
  { to: '/intern/upload', label: 'Tải lên CV & Đơn thực tập', icon: UploadCloud },
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
      portalTag={isApplicant ? 'Ứng viên Thực tập' : 'Thực tập sinh'}
      showPortalTagBox={true}
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


