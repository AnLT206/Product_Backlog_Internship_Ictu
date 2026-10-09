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
import InternEditPage from '../features/interns/InternEditPage.jsx'
import InternCreatePage from '../features/interns/InternCreatePage.jsx'
import InternDashboardPage from '../features/interns/InternDashboardPage.jsx'
import InternLayout from '../features/interns/InternLayout.jsx'
import InternUploadPage from '../features/interns/InternUploadPage.jsx'
import TaskListPage from '../features/interns/TaskListPage.jsx'
import TaskDetailPage from '../features/interns/TaskDetailPage.jsx'
import HRDashboardPage from '../features/hr/HRDashboardPage.jsx'
import HRLayout from '../features/hr/HRLayout.jsx'
import CompletionRatePage from '../features/hr/CompletionRatePage.jsx'
import ProgramListPage from '../features/programs/ProgramListPage.jsx'
import ProgramFormPage from '../features/programs/ProgramFormPage.jsx'
import MentorListPage from '../features/mentors/MentorListPage.jsx'
import MentorAssignPage from '../features/mentors/MentorAssignPage.jsx'
import MentorLayout from '../features/mentors/MentorLayout.jsx'
import MentorDashboardPage from '../features/mentors/MentorDashboardPage.jsx'
import MentorInternsPage from '../features/mentors/MentorInternsPage.jsx'
import MentorTasksPage from '../features/mentors/MentorTasksPage.jsx'

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
          <Route path="users" element={<UsersPage />} />
          <Route path="users/new" element={<CreateAccountPage />} />
          <Route path="roles" element={<PermissionMatrixPage />} />
          <Route path="system-logs" element={<SystemLogsPage />} />
        </Route>

        <Route
          path="/hr"
          element={
            <RequireAuth roles={['hr']}>
              <HRLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HRDashboardPage />} />
          <Route path="interns" element={<InternListPage />} />
          <Route path="interns/new" element={<InternCreatePage />} />
          <Route path="interns/:id/edit" element={<InternEditPage />} />
          <Route path="programs" element={<ProgramListPage />} />
          <Route path="programs/new" element={<ProgramFormPage />} />
          <Route path="mentors" element={<MentorListPage />} />
          <Route path="mentors/assign" element={<MentorAssignPage />} />
          <Route path="completion-rate" element={<CompletionRatePage />} />
        </Route>

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
          <Route path="interns" element={<MentorInternsPage />} />
          <Route path="tasks" element={<MentorTasksPage />} />
        </Route>
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
          <Route path="documents/upload" element={<InternUploadPage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
