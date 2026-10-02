import { Outlet, useLocation } from 'react-router-dom'
import EnterpriseAppShell from '../../components/common/EnterpriseAppShell'
import './AdminDashboardPage.css'

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Tổng quan & Giám sát Hệ thống', end: true },
  { to: '/admin/users', label: 'Quản lý Tài khoản & Định danh', permission: 'admin_users' },
  { to: '/admin/roles', label: 'Ma trận Phân quyền (RBAC)', permission: 'admin_roles' },
  { to: '/admin/settings', label: 'Cấu hình Tham số & SSO/LDAP', permission: 'admin_users' },
  { to: '/admin/system-logs', label: 'Nhật ký Truy vết (Audit Log)', badge: '24', permission: 'admin_audit_logs' },
  { to: '/admin/backup', label: 'Sao lưu & Khôi phục Dữ liệu', permission: 'admin_backup' },
]

export default function AdminLayout() {
  const location = useLocation()
  const activeNav = ADMIN_NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )
  const currentLabel = activeNav ? activeNav.label : 'Bảng điều khiển'

  return (
    <EnterpriseAppShell
      portalName="Quản trị Hệ thống"
      logoTitle="ICTU Admin Console"
      logoSubtitle="DevSecOps & Infra Control"
      sidebarSectionLabel="BẢNG ĐIỀU KHIỂN KỸ THUẬT"
      navItems={ADMIN_NAV_ITEMS}
      breadcrumbs={[
        { label: 'Admin Console' },
        { label: currentLabel },
      ]}
      avatarText="SA"
      adminUserCard={true}
      showNotifications={true}
      showTopbarUser={true}
      defaultUserName="admin@ictu.edu.vn"
      userCardMeta="Root Administrator"
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}

