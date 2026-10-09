import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../features/home/HomePage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import RegisterPage from '../features/auth/RegisterPage.jsx'
import NotFoundPage from '../features/common/NotFoundPage.jsx'
import AdminLayout from '../features/admin/AdminLayout.jsx'
import AdminDashboardPage from '../features/admin/AdminDashboardPage.jsx'
import CreateAccountPage from '../features/admin/CreateAccountPage.jsx'
import UsersPage from '../features/admin/UsersPage.jsx'
import PermissionMatrixPage from '../features/admin/PermissionMatrixPage.jsx'
import SystemLogsPage from '../features/admin/SystemLogsPage.jsx'
import AdminSettingsPage from '../features/admin/AdminSettingsPage.jsx'
import AdminBackupPage from '../features/admin/AdminBackupPage.jsx'
import RequireAuth from './RequireAuth.jsx'
import InternListPage from '../features/intern/InternListPage.jsx'
import InternCreatePage from '../features/intern/InternCreatePage.jsx'
import InternEditPage from '../features/intern/InternEditPage.jsx'
import ProgramListPage from '../features/programs/ProgramListPage.jsx'
import ProgramFormPage from '../features/programs/ProgramFormPage.jsx'
import MentorAssignmentPage from '../features/hr/MentorAssignmentPage.jsx'
import HrLayout from '../features/hr/HrLayout.jsx'
import HrDashboardPage from '../features/hr/HrDashboardPage.jsx'
import HrAttendancePage from '../features/hr/HrAttendancePage.jsx'
import HrContractsPage from '../features/hr/HrContractsPage.jsx'
import HrReportsPage from '../features/hr/HrReportsPage.jsx'
import HRAnalyticsDashboard from '../features/hr/HRAnalyticsDashboard.jsx'
import SupportTicketManager from '../features/hr/SupportTicketManager.jsx'
import MentorLayout from '../features/mentor/MentorLayout.jsx'
import MentorDashboardPage from '../features/mentor/MentorDashboardPage.jsx'
import InternLayout from '../features/intern/InternLayout.jsx'
import InternDashboardPage from '../features/intern/InternDashboardPage.jsx'
import InternAttendancePage from '../features/intern/InternAttendancePage.jsx'
import InternReportsPage from '../features/intern/InternReportsPage.jsx'
import InternTrainingPage from '../features/intern/InternTrainingPage.jsx'
import InternUploadPage from '../features/intern/InternUploadPage.jsx'
import WeeklyReportForm from '../features/intern/WeeklyReportForm.jsx'
import InternSchedulePage from '../features/intern/InternSchedulePage.jsx'
import InternAllowancePage from '../features/intern/InternAllowancePage.jsx'
import InternSupportPage from '../features/intern/InternSupportPage.jsx'
import InternProfilePage from '../features/intern/InternProfilePage.jsx'


export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Phân hệ Quản trị viên (Admin Portal) ── */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin']}>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/new" element={<CreateAccountPage />} />
          <Route path="roles" element={<PermissionMatrixPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="system-logs" element={<SystemLogsPage />} />
          <Route path="backup" element={<AdminBackupPage />} />
        </Route>

        {/* ── Phân hệ Nhân sự (HR Portal) ── */}
        <Route
          path="/hr"
          element={
            <RequireAuth roles={['hr', 'admin']}>
              <HrLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HrDashboardPage />} />
          <Route path="interns" element={<InternListPage />} />
          <Route path="interns/new" element={<InternCreatePage />} />
          <Route path="interns/:id/edit" element={<InternEditPage />} />
          <Route path="programs" element={<ProgramListPage />} />
          <Route path="programs/new" element={<ProgramFormPage />} />
          <Route path="mentors" element={<Navigate to="/hr/mentor-assignment" replace />} />
          <Route path="mentor-assignment" element={<MentorAssignmentPage />} />
          <Route path="attendance" element={<HrAttendancePage />} />
          <Route path="attendance-report" element={<Navigate to="/hr/attendance?tab=report" replace />} />
          <Route path="work-schedule" element={<Navigate to="/hr/attendance?tab=schedule" replace />} />
          <Route path="allowances" element={<Navigate to="/hr/attendance?tab=allowance" replace />} />
          <Route path="contracts" element={<HrContractsPage />} />
          <Route path="reports" element={<Navigate to="/hr/analytics" replace />} />
          <Route path="analytics" element={<HRAnalyticsDashboard />} />
          <Route path="tickets" element={<SupportTicketManager />} />
        </Route>

        {/* ── Phân hệ Mentor (Mentor Portal) ── */}
        <Route
          path="/mentor"
          element={
            <RequireAuth roles={['mentor', 'admin', 'hr']}>
              <MentorLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboardPage />} />
          <Route path="attendance" element={<HrAttendancePage />} />
          <Route path="contracts" element={<HrContractsPage />} />
          <Route path="reports" element={<HrReportsPage />} />
        </Route>

        {/* ── Phân hệ Thực tập sinh (Intern Portal) ── */}
        <Route
          path="/intern"
          element={
            <RequireAuth roles={['intern', 'hr', 'admin']}>
              <InternLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InternDashboardPage />} />
          <Route path="roadmap" element={<Navigate to="/intern/dashboard" replace />} />
          <Route path="tasks" element={<Navigate to="/intern/dashboard" replace />} />
          <Route path="schedule" element={<InternSchedulePage />} />
          <Route path="attendance" element={<InternAttendancePage />} />
          <Route path="reports" element={<InternReportsPage />} />
          <Route path="allowance" element={<InternAllowancePage />} />
          <Route path="support" element={<InternSupportPage />} />
          <Route path="training" element={<InternTrainingPage />} />
          <Route path="upload" element={<InternUploadPage />} />
          <Route path="report" element={<WeeklyReportForm />} />
          <Route path="profile" element={<InternProfilePage />} />
        </Route>


        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
