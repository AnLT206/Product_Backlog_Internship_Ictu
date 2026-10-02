/**
 * src/api/operations.js
 * API gọi BE thật cho các thao tác Mentor, HR Attendance, Contracts, Reports
 * Toàn bộ dữ liệu được lưu và đọc trực tiếp từ MySQL Database.
 */

import apiFetch from './client'

/* ── MENTOR PORTAL ── */
export async function fetchMentorMentees() {
  return apiFetch('/api/mentor/mentees', { method: 'GET' })
}

export async function fetchMentorTasks() {
  return apiFetch('/api/mentor/tasks', { method: 'GET' })
}

export async function createMentorTask(task) {
  return apiFetch('/api/mentor/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

export async function updateMentorTaskStatus(taskId, status, progress) {
  return apiFetch(`/api/mentor/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, progress }),
  })
}

export async function deleteMentorTask(taskId) {
  return apiFetch(`/api/mentor/tasks/${taskId}`, {
    method: 'DELETE',
  })
}

export async function fetchMentorReports() {
  return apiFetch('/api/mentor/reports', { method: 'GET' })
}

export async function gradeMentorReport(reportId, score, mentor_feedback) {
  return apiFetch(`/api/mentor/reports/${reportId}/grade`, {
    method: 'POST',
    body: JSON.stringify({ score, mentor_feedback, status: 'reviewed' }),
  })
}

export async function fetchMentorEvaluations() {
  return apiFetch('/api/mentor/evaluations', { method: 'GET' })
}

export async function saveMentorEvaluation(evaluation) {
  return apiFetch('/api/mentor/evaluations', {
    method: 'POST',
    body: JSON.stringify(evaluation),
  })
}

/* ── HR & MENTOR SUB-PAGES ── */
export async function fetchAttendance() {
  return apiFetch('/api/hr/attendance', { method: 'GET' })
}

export async function approveAttendance(id) {
  return apiFetch(`/api/hr/attendance/${id}/approve`, {
    method: 'POST',
  })
}

export async function approveAllAttendance() {
  return apiFetch('/api/hr/attendance/approve-all', {
    method: 'POST',
  })
}

export async function fetchContracts() {
  return apiFetch('/api/hr/contracts', { method: 'GET' })
}

export async function signContract(id) {
  return apiFetch(`/api/hr/contracts/${id}/sign`, {
    method: 'POST',
  })
}

export async function signAllContracts() {
  return apiFetch('/api/hr/contracts/sign-all', {
    method: 'POST',
  })
}

export async function fetchUniversityReports() {
  return apiFetch('/api/hr/university-reports', { method: 'GET' })
}

export async function sendUniversityReport(id) {
  return apiFetch(`/api/hr/university-reports/${id}/send`, {
    method: 'POST',
  })
}

export async function syncAllScores() {
  return apiFetch('/api/hr/university-reports/sync-scores', {
    method: 'POST',
  })
}

/* ── INTERN WEEKLY REPORTS ── */
export async function submitInternReport(reportData) {
  return apiFetch('/api/intern/reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  })
}

