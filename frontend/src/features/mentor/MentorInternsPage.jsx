/**
 * MentorInternsPage.jsx
 * Route: /mentor/interns
 *
 * Màn hình Danh sách Thực tập sinh do Mentor phụ trách.
 * Kế thừa nguyên si giao diện, bộ lọc, thẻ mentee và modal giao việc từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorInternsPage() {
  return <MentorDashboardPage forcedTab="mentees" />
}
