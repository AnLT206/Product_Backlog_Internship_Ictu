/**
 * MentorEvaluationsPage.jsx
 * Route: /mentor/evaluations
 *
 * Màn hình Đánh giá Năng lực Cuối kỳ Thực tập sinh.
 * Kế thừa nguyên si bảng Rubric chuẩn 5 tiêu chí và form chấm điểm từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorEvaluationsPage() {
  return <MentorDashboardPage forcedTab="evaluations" />
}
