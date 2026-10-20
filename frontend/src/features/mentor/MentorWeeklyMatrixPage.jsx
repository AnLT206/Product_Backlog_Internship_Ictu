/**
 * MentorWeeklyMatrixPage.jsx
 * Route: /mentor/weekly-matrix
 *
 * Màn hình Ma trận Tiến độ 12 Tuần của Thực tập sinh do Mentor phụ trách.
 * Kế thừa nguyên si giao diện ma trận 12 cột, chấm điểm tuần và đồng bộ thời gian thực từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorWeeklyMatrixPage() {
  return <MentorDashboardPage forcedTab="matrix" />
}
