/**
 * MentorTasksPage.jsx
 * Route: /mentor/tasks
 *
 * Màn hình Phân công & Theo dõi Nhiệm vụ Sprint (Tasks).
 * Kế thừa nguyên si giao diện danh sách task, bộ lọc trạng thái và modal giao việc từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorTasksPage() {
  return <MentorDashboardPage forcedTab="tasks" />
}
