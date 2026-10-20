import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MentorDimensionAssignmentTab from './MentorDimensionAssignmentTab';
import * as mentorApi from '../../../api/mentors';

vi.mock('../../../api/mentors', () => ({
  getDimensionsSummary: vi.fn(),
  getMentors: vi.fn(),
  getInternsByDimension: vi.fn(),
  batchAssignByDimension: vi.fn(),
  unassignMentorRole: vi.fn(),
  updateInternMentors: vi.fn(),
  updateSingleMentorRole: vi.fn(),
}));

const mockSummaryData = {
  majors: [
    { dimension_type: 'major', value: 'Kỹ thuật phần mềm', total_interns: 2, assigned_interns: 1, unassigned_interns: 1, mentor_count: 2 },
    { dimension_type: 'major', value: 'An toàn thông tin', total_interns: 1, assigned_interns: 0, unassigned_interns: 1, mentor_count: 0 },
  ],
  classes: [
    { dimension_type: 'class', value: 'K20-KTPM01', total_interns: 2, assigned_interns: 1, unassigned_interns: 1, mentor_count: 2 },
  ],
  intakes: [
    { dimension_type: 'intake', value: 'Khóa 20 (2020-2024)', total_interns: 2, assigned_interns: 1, unassigned_interns: 1, mentor_count: 2 },
  ],
  departments: [
    { dimension_type: 'department', value: 'Ban Kỹ thuật Phần mềm', total_interns: 2, assigned_interns: 1, unassigned_interns: 1, mentor_count: 2 },
  ],
  total_interns: 3,
  total_assigned: 1,
  total_unassigned: 2,
};

const mockMentors = [
  { id: 2, full_name: 'Trần Hoàng Quân', email: 'mentor1@ictu.edu.vn', department: 'Kỹ thuật phần mềm' },
  { id: 3, full_name: 'Phạm Quốc Hướng', email: 'mentor2@ictu.edu.vn', department: 'QA/QC' },
];

const mockInternsForDimension = {
  dimension_type: 'major',
  dimension_value: 'Kỹ thuật phần mềm',
  total: 2,
  interns: [
    {
      id: 10,
      code: 'TTS0001',
      full_name: 'Nguyễn Văn An',
      email: 'an@ictu.edu.vn',
      major: 'Kỹ thuật phần mềm',
      class_name: 'K20-KTPM01',
      academic_year: 'Khóa 20 (2020-2024)',
      departments: ['Ban Kỹ thuật Phần mềm'],
      mentors: [
        { id: 1, mentor_id: 2, mentor_name: 'Trần Hoàng Quân', mentor_email: 'mentor1@ictu.edu.vn', role_type: 'primary', dimension_type: 'major', assigned_at: '2026-10-20T00:00:00' },
        { id: 2, mentor_id: 3, mentor_name: 'Phạm Quốc Hướng', mentor_email: 'mentor2@ictu.edu.vn', role_type: 'technical', dimension_type: 'major', assigned_at: '2026-10-20T00:00:00' },
      ],
    },
    {
      id: 11,
      code: 'TTS0002',
      full_name: 'Lê Hoàng Nam',
      email: 'nam@ictu.edu.vn',
      major: 'Kỹ thuật phần mềm',
      class_name: 'K20-KTPM01',
      academic_year: 'Khóa 20 (2020-2024)',
      departments: ['Ban Kỹ thuật Phần mềm'],
      mentors: [],
    },
  ],
};

describe('MentorDimensionAssignmentTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mentorApi.getDimensionsSummary.mockResolvedValue({ ok: true, data: mockSummaryData });
    mentorApi.getMentors.mockResolvedValue({ ok: true, data: mockMentors });
    mentorApi.getInternsByDimension.mockResolvedValue({ ok: true, data: mockInternsForDimension });
    mentorApi.batchAssignByDimension.mockResolvedValue({ ok: true, data: { message: 'Phân công thành công' } });
    mentorApi.updateInternMentors.mockResolvedValue({ ok: true, data: { message: 'Cập nhật thành công' } });
  });

  it('allows clicking Edit button to open modal, add or modify mentor roles, and save', async () => {
    render(<MentorDimensionAssignmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    });

    // Find and click the Edit button for Nguyễn Văn An
    const editBtns = screen.getAllByRole('button', { name: /Chỉnh sửa/i });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(editBtns[0]);

    // Modal should be opened
    await waitFor(() => {
      expect(screen.getByText(/Chỉnh sửa Phân công Mentor/i)).toBeInTheDocument();
      expect(screen.getByText(/Nguyễn Văn An \(TTS0001\)/i)).toBeInTheDocument();
    });

    // Verify existing mentors appear in modal
    const mentorSelects = screen.getAllByRole('combobox');
    expect(mentorSelects.length).toBeGreaterThanOrEqual(2);

    // Click "Thêm Mentor" button in modal
    const addMentorBtn = screen.getByRole('button', { name: /Thêm Mentor phụ trách/i });
    fireEvent.click(addMentorBtn);

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mentorApi.updateInternMentors).toHaveBeenCalledWith(
        10,
        expect.any(Array)
      );
    });
  });

  it('renders top stats cards and navigation pills correctly', async () => {
    render(<MentorDimensionAssignmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Khối Chuyên môn')).toBeInTheDocument();
      expect(screen.getByText('Lớp Sinh hoạt')).toBeInTheDocument();
      expect(screen.getByText('Khóa Tuyển sinh')).toBeInTheDocument();
      expect(screen.getByText('Ban / Phòng ban')).toBeInTheDocument();
    });

    // Check that interns table shows the interns
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
    });

    // Check multi-mentor tags (N-N)
    expect(screen.getAllByText(/Trần Hoàng Quân/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Phạm Quốc Hướng/i).length).toBeGreaterThanOrEqual(2);
  });

  it('switches dimension tabs to Lớp and loads corresponding values', async () => {
    render(<MentorDimensionAssignmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Khối Chuyên môn')).toBeInTheDocument();
    });

    const classTabBtn = screen.getByRole('button', { name: /Lớp sinh hoạt/i });
    fireEvent.click(classTabBtn);

    await waitFor(() => {
      expect(mentorApi.getInternsByDimension).toHaveBeenCalledWith('class', 'K20-KTPM01');
    });
  });

  it('allows selecting mentors and executing batch assignment', async () => {
    render(<MentorDimensionAssignmentTab />);

    await waitFor(() => {
      expect(screen.getByText('Khung Điều phối Mentor (1-N & N-N Đa vai trò)')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    });

    // Pick first mentor checkbox
    const mentorCheckbox = screen.getByLabelText(/Trần Hoàng Quân/i);
    fireEvent.click(mentorCheckbox);

    // Click assign button
    const assignBtn = screen.getByRole('button', { name: /Phân công cho cả nhóm/i });
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(mentorApi.batchAssignByDimension).toHaveBeenCalledWith(
        expect.objectContaining({
          dimension_type: 'major',
          dimension_value: 'Kỹ thuật phần mềm',
          mentor_ids: [2],
          role_type: 'primary',
          assignment_mode: 'append',
        })
      );
    });
  });
});
