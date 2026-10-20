/**
 * MentorGroupsPage.jsx
 * Route: /mentor/groups
 *
 * Màn hình Nhóm Thực tập & Dự án do Mentor phụ trách.
 * Kế thừa nguyên si giao diện, đề tài dự án, danh sách thành viên nhóm từ MentorDashboardPage.
 */

import React from 'react'
import MentorDashboardPage from './MentorDashboardPage'

export default function MentorGroupsPage() {
  return <MentorDashboardPage forcedTab="groups" />
}
