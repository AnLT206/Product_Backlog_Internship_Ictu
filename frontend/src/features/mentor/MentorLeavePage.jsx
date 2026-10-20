/**
 * MentorLeavePage.jsx
 * Route: /mentor/leave
 *
 * Màn hình Theo dõi Đơn xin Nghỉ phép của Thực tập sinh.
 * Kế thừa nguyên si bảng theo dõi đơn nghỉ và trạng thái phê duyệt từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorLeavePage() {
  return <MentorDashboardPage forcedTab="leave" />
}
