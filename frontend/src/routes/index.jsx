import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../features/home/HomePage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import RegisterPage from '../features/auth/RegisterPage.jsx'
import NotFoundPage from '../features/common/NotFoundPage.jsx'
import RoleHomePage from '../features/common/RoleHomePage.jsx'
import AdminLayout from '../features/admin/AdminLayout.jsx'
import AdminDashboardPage from '../features/admin/AdminDashboardPage.jsx'
import CreateAccountPage from '../features/admin/CreateAccountPage.jsx'
import PermissionMatrixPage from '../features/admin/PermissionMatrixPage.jsx'
import SystemLogsPage from '../features/admin/SystemLogsPage.jsx'
import RequireAuth from './RequireAuth.jsx'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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
          <Route path="users/new" element={<CreateAccountPage />} />
          <Route path="roles" element={<PermissionMatrixPage />} />
          <Route path="system-logs" element={<SystemLogsPage />} />
        </Route>

        <Route
          path="/hr/dashboard"
          element={
            <RequireAuth roles={['hr', 'admin']}>
              <RoleHomePage roleLabel="HR" />
            </RequireAuth>
          }
        />
        <Route
          path="/mentor/dashboard"
          element={
            <RequireAuth roles={['mentor', 'admin']}>
              <RoleHomePage roleLabel="Mentor" />
            </RequireAuth>
          }
        />
        <Route
          path="/intern/dashboard"
          element={
            <RequireAuth roles={['intern']}>
              <RoleHomePage roleLabel="Thực tập sinh" />
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
