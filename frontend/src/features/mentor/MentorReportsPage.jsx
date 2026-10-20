/**
 * MentorReportsPage.jsx
 * Route: /mentor/reports
 *
 * Màn hình Duyệt & Đánh giá Báo cáo Tuần của Thực tập sinh.
 * Kế thừa nguyên si giao diện danh sách báo cáo, bộ lọc trạng thái và modal chấm điểm từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorReportsPage() {
  return <MentorDashboardPage forcedTab="reports" />
}
