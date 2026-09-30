import { Outlet, useNavigate } from 'react-router-dom'
import {
  Users,
  CheckSquare,
  FileText,
  Award,
  Calendar,
  Plus,
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
  const navigate = useNavigate()

  return (
    <EnterpriseAppShell
      portalName="Hướng dẫn Chuyên môn"
      portalTag="Hướng dẫn Chuyên môn"
      showPortalTagBox={true}
      logoTitle="ICTU Mentor Hub"
      logoSubtitle="Cổng Hướng dẫn Kỹ thuật"
      sidebarSectionLabel="HƯỚNG DẪN & ĐÁNH GIÁ TTS"
      navItems={MENTOR_NAV_ITEMS}
      breadcrumbs={[{ label: 'Quản lý & Hướng dẫn Thực tập' }]}
      periodInfo="Học kỳ Q3/2026 • Tuần 08"
      avatarText="MB"
      userCardMeta="Senior Tech Lead • Khoa CNTT"
      topbarActions={
        <>
          <button
            type="button"
            className="topbar-btn topbar-btn--primary"
            onClick={() => {
              navigate('/mentor/dashboard#tasks')
              window.dispatchEvent(new CustomEvent('open-mentor-task-modal'))
            }}
          >
            <Plus size={14} />
            <span>+ Giao nhiệm vụ mới</span>
          </button>
          <button
            type="button"
            className="topbar-btn"
            onClick={() => navigate('/mentor/dashboard#reports')}
          >
            <span>Chấm báo cáo tuần (1)</span>
          </button>
          <button
            type="button"
            className="topbar-btn"
            onClick={() => navigate('/mentor/dashboard#meetings')}
          >
            <Calendar size={14} />
            <span>+ Đặt lịch Review 1-on-1</span>
          </button>
        </>
      }
    >
      <Outlet />
    </EnterpriseAppShell>
  )
}

