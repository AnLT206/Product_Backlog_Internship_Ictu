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
import RequireAuth from './RequireAuth.jsx'
import InternListPage from '../features/interns/InternListPage.jsx'
import InternCreatePage from '../features/interns/InternCreatePage.jsx'
import InternEditPage from '../features/interns/InternEditPage.jsx'
import ProgramListPage from '../features/programs/ProgramListPage.jsx'
import ProgramFormPage from '../features/programs/ProgramFormPage.jsx'
import MentorListPage from '../features/mentors/MentorListPage.jsx'
import HrLayout from '../features/hr/HrLayout.jsx'
import HrDashboardPage from '../features/hr/HrDashboardPage.jsx'
import MentorLayout from '../features/mentor/MentorLayout.jsx'
import MentorDashboardPage from '../features/mentor/MentorDashboardPage.jsx'
import InternLayout from '../features/intern/InternLayout.jsx'
import InternDashboardPage from '../features/intern/InternDashboardPage.jsx'

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
          <Route path="system-logs" element={<SystemLogsPage />} />
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
          <Route path="mentors" element={<MentorListPage />} />
        </Route>

        {/* ── Phân hệ Mentor (Mentor Portal) ── */}
        <Route
          path="/mentor"
          element={
            <RequireAuth roles={['mentor', 'admin']}>
              <MentorLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboardPage />} />
        </Route>

        {/* ── Phân hệ Thực tập sinh (Intern Portal) ── */}
        <Route
          path="/intern"
          element={
            <RequireAuth roles={['intern']}>
              <InternLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InternDashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
