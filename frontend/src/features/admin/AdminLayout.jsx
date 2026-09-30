import { Outlet } from 'react-router-dom'
import {
  Activity,
  Users,
  ShieldCheck,
  Sliders,
  FileText,
  DatabaseBackup,
  Terminal,
  Layout,
} from 'lucide-react'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import './AdminDashboardPage.css'

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Tổng quan & Giám sát Hệ thống', icon: Activity, end: true },
  { to: '/admin/users', label: 'Quản lý Tài khoản & Định danh', icon: Users },
  { to: '/admin/roles', label: 'Ma trận Phân quyền (RBAC)', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Cấu hình Tham số & SSO/LDAP', icon: Sliders },
  { to: '/admin/system-logs', label: 'Nhật ký Truy vết (Audit Log)', icon: FileText, badge: '24' },
  { to: '/admin/backup', label: 'Sao lưu & Khôi phục Dữ liệu', icon: DatabaseBackup },
]

export default function AdminLayout() {
  return (
    <EnterpriseAppShell
      portalName="Quản trị Hệ thống"
      logoTitle="ICTU Admin Console"
      logoSubtitle="DevSecOps & Infra Control"
      portalTag="Quản trị Hệ thống"
      showPortalTagBox={true}
      sidebarSectionLabel="BẢNG ĐIỀU KHIỂN KỸ THUẬT"
      navItems={ADMIN_NAV_ITEMS}
      avatarText="SA"
      adminUserCard={true}
      defaultUserName="admin@ictu.edu.vn"
      userCardMeta="Root Administrator"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}
