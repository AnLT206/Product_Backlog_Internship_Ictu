import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MentorAssignmentPage from './MentorAssignmentPage';

vi.mock('../../api/mentors', () => ({
  getMentors: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { id: 3, full_name: 'Trần Hoàng Quân', email: 'mentor@ictu.edu.vn', department: 'Kỹ thuật phần mềm (Software Engineering)', position: 'Senior Fullstack Tech Lead' },
      { id: 4, full_name: 'Phạm Quốc Hướng', email: 'mentor2@ictu.edu.vn', department: 'Kiểm thử chất lượng (QA/QC)', position: 'QA Lead & Automation Specialist' },
    ],
  }),
  assignMentor: vi.fn().mockResolvedValue({ ok: true }),
  unassignInternFromMentor: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../api/interns', () => ({
  getInterns: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { id: 5, code: 'TTS0001', full_name: 'Nguyễn Văn An', email: 'intern@ictu.edu.vn', university: 'ICTU', major: 'Kỹ thuật Phần mềm', gpa: 3.85 },
      { id: 6, code: 'TTS0002', full_name: 'Lê Hoàng Nam', email: 'tts02@student.ictu.edu.vn', university: 'ICTU', major: 'Kỹ thuật Phần mềm', gpa: 3.65 },
      { id: 8, code: 'TTS0003', full_name: 'Trần Thị Mai Phương', email: 'tts03@student.ictu.edu.vn', university: 'ICTU', major: 'Hệ thống thông tin', gpa: 3.72 },
      { id: 9, code: 'TTS0004', full_name: 'Hoàng Minh Đức', email: 'tts04@student.ictu.edu.vn', university: 'ICTU', major: 'An toàn thông tin', gpa: 3.60 },
    ],
  }),
}));

describe('MentorAssignmentPage Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('render 2 mentor và danh sách 4 TTS phân công đúng cho từng mentor', async () => {
    render(<MentorAssignmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Trần Hoàng Quân').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Phạm Quốc Hướng').length).toBeGreaterThanOrEqual(1);
    });

    // Kiểm tra tên các TTS trên bảng
    expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Lê Hoàng Nam').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Trần Thị Mai Phương').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hoàng Minh Đức').length).toBeGreaterThanOrEqual(1);
  });

  it('khi bấm Hủy gán, sinh viên được gỡ khỏi danh sách đã phân công và chuyển sang chờ phân công', async () => {
    render(<MentorAssignmentPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThanOrEqual(1);
    });

    const unassignButtons = screen.getAllByRole('button', { name: /Hủy gán/i });
    expect(unassignButtons.length).toBe(4);

    // Bấm Hủy gán cho TTS đầu tiên (Nguyễn Văn An)
    fireEvent.click(unassignButtons[0]);

    // Chuyển sang Tab TTS chờ phân công
    const unassignedTab = screen.getByRole('button', { name: /TTS chờ phân công/i });
    fireEvent.click(unassignedTab);

    // Nguyễn Văn An xuất hiện ở tab chờ phân công
    await waitFor(() => {
      expect(screen.getByText(/TTS chờ phân công \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    });
  });
});
