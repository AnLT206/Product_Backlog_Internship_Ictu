import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import MentorDashboardPage from './MentorDashboardPage';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ hash: '' }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 3,
      role: 'mentor',
      full_name: 'Trần Hoàng Quân',
      email: 'mentor@ictu.edu.vn',
    },
  }),
}));

vi.mock('../../api/operations', () => ({
  fetchMentorMentees: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { id: 5, code: 'TTS0001', full_name: 'Nguyễn Văn An', email: 'intern@ictu.edu.vn', major: 'Kỹ thuật Phần mềm', gpa: 3.85, program_name: 'Dự án AI' },
      { id: 8, code: 'TTS0003', full_name: 'Trần Thị Mai Phương', email: 'tts03@student.ictu.edu.vn', major: 'Hệ thống thông tin', gpa: 3.72, program_name: 'Dự án Cloud' },
    ],
  }),
  fetchMentorTasks: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      {
        id: 137,
        title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
        description: 'Mô tả task',
        intern_id: 5,
        intern_name: 'Nguyễn Văn An (TTS0001)',
        due_at: '2026-10-15',
        priority: 'high',
        status: 'doing',
        progress: 75,
      },
    ],
  }),
  fetchMentorReports: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  fetchMentorEvaluations: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  fetchLeaveRequests: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  createMentorTask: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      id: 999,
      title: 'Thiết kế CSDL mới cho Sprint 2',
      description: 'Mô tả task mới',
      intern_id: 8,
      intern_name: 'Trần Thị Mai Phương (TTS0003)',
      due_at: '2026-10-25',
      priority: 'high',
      status: 'doing',
      progress: 0,
    },
  }),
  updateMentorTaskStatus: vi.fn().mockResolvedValue({ ok: true }),
  deleteMentorTask: vi.fn().mockResolvedValue({ ok: true }),
  gradeMentorReport: vi.fn().mockResolvedValue({ ok: true }),
  saveMentorEvaluation: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('MentorDashboardPage Task Binding & Border Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('TTS có task (Nguyễn Văn An) hiển thị khung task có viền và thông tin task thực tế', async () => {
    const { container } = render(<MentorDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument();
    });

    // Nguyễn Văn An (id 5) có task 137
    await waitFor(() => {
      expect(screen.getByText('Phát triển REST API Quản lý Hồ sơ Thực tập sinh')).toBeInTheDocument();
      expect(screen.getByText('75% hoàn thiện')).toBeInTheDocument();
    });

    // Khung task tồn tại
    const taskBoxes = container.querySelectorAll('.mentee-task-box');
    expect(taskBoxes.length).toBe(1);
  });

  it('TTS chưa có task (Trần Thị Mai Phương) KHÔNG hiển thị khung task và có nút Giao việc', async () => {
    render(<MentorDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument();
    });

    // Trần Thị Mai Phương chưa có task nên không có khung task riêng cho bạn này
    // Cả hai TTS đều có nút "+ Giao việc (Task)"
    const assignTaskButtons = screen.getAllByRole('button', { name: /\+ Giao việc \(Task\)/i });
    expect(assignTaskButtons.length).toBe(2);

    // Mở modal giao việc cho Trần Thị Mai Phương
    fireEvent.click(assignTaskButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Giao nhiệm vụ mới cho Thực tập sinh')).toBeInTheDocument();
    });
  });
});

