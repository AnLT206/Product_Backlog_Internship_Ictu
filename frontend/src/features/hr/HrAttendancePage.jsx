import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DollarSign,
  BarChart2,
  CalendarCheck,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react'
import AllowanceManagementPage from './AllowanceManagementPage'
import AttendanceReportPage from './AttendanceReportPage'
import LeaveRequestManagement from './components/LeaveRequestManagement'
import WorkScheduleSettings from './components/WorkScheduleSettings'
import WeeklyWorkScheduleManager from './components/WeeklyWorkScheduleManager'
import './HrSubPages.css'

export default function HrAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')

  // Xác định tab mặc định dựa trên query param (?tab=allowance | report | leave | schedule | weekly-schedule)
  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl && ['allowance', 'report', 'leave', 'schedule', 'weekly-schedule'].includes(tabFromUrl)) {
      return tabFromUrl
    }
    return 'weekly-schedule'
  })

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0)

  // Đồng bộ state khi URL param thay đổi (ví dụ khi redirect từ menu khác)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['allowance', 'report', 'leave', 'schedule', 'weekly-schedule'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab])

  // Xử lý chuyển tab
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    setSearchParams({ tab: tabKey })
  }

  return (
    <div className="hr-attendance-hub-container" style={{ padding: '0 0.5rem' }}>
      {/* Thanh điều hướng Tab hợp nhất 4 chức năng chuyên cần & phụ cấp */}
      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '1rem',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Tab 1: Quản lý Phụ cấp */}
        <button
          type="button"
          onClick={() => handleTabChange('allowance')}
          className={`subpage-btn ${activeTab === 'allowance' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <DollarSign size={16} />
          <span>Quản lý & Duyệt phụ cấp</span>
        </button>

        {/* Tab 2: Báo cáo Chuyên cần */}
        <button
          type="button"
          onClick={() => handleTabChange('report')}
          className={`subpage-btn ${activeTab === 'report' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <BarChart2 size={16} />
          <span>Báo cáo Chuyên cần & Cảnh báo</span>
        </button>

        {/* Tab 3: Duyệt Đơn nghỉ phép */}
        <button
          type="button"
          onClick={() => handleTabChange('leave')}
          className={`subpage-btn ${activeTab === 'leave' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <CalendarCheck size={16} />
          <span>Duyệt đơn xin nghỉ phép</span>
          {pendingLeaveCount > 0 && (
            <span
              style={{
                marginLeft: '6px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '999px',
                backgroundColor: activeTab === 'leave' ? '#ffffff' : '#ef4444',
                color: activeTab === 'leave' ? '#2563eb' : '#ffffff',
              }}
            >
              {pendingLeaveCount}
            </span>
          )}
        </button>

        {/* Tab 4: Lịch làm việc theo phiên của từng tuần (TTS & Mentor) */}
        <button
          type="button"
          onClick={() => handleTabChange('weekly-schedule')}
          className={`subpage-btn ${activeTab === 'weekly-schedule' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
          style={{ whiteSpace: 'nowrap' }}
          id="tab-btn-weekly-schedule"
        >
          <Calendar size={16} />
          <span>Lịch phiên theo tuần (TTS / Mentor)</span>
        </button>

        {/* Tab 5: Cấu hình Ca làm việc linh hoạt */}
        <button
          type="button"
          onClick={() => handleTabChange('schedule')}
          className={`subpage-btn ${activeTab === 'schedule' ? 'subpage-btn--primary' : 'subpage-btn--outline'}`}
          style={{ whiteSpace: 'nowrap' }}
          id="tab-btn-schedule-settings"
        >
          <Clock size={16} />
          <span>Khung giờ ca mẫu</span>
        </button>
      </div>

      {/* Render nội dung tương ứng theo tab đã chọn */}
      <div className="hr-attendance-hub-content">
        {activeTab === 'weekly-schedule' && <WeeklyWorkScheduleManager />}
        {activeTab === 'allowance' && <AllowanceManagementPage />}
        {activeTab === 'report' && <AttendanceReportPage />}
        {activeTab === 'leave' && (
          <LeaveRequestManagement onPendingCountChange={setPendingLeaveCount} />
        )}
        {activeTab === 'schedule' && <WorkScheduleSettings isStandalone={false} />}
      </div>
    </div>
  )
}
