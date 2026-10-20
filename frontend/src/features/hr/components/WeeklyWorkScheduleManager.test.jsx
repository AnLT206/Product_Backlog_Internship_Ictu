import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WeeklyWorkScheduleManager from './WeeklyWorkScheduleManager';
import * as operationsApi from '../../../api/operations';
import * as internsApi from '../../../api/interns';
import * as mentorsApi from '../../../api/mentors';

describe('WeeklyWorkScheduleManager Component Test Suite', () => {
  const mockSchedules = [
    {
      id: 1,
      user_id: 10,
      user_name: 'Nguyễn Văn TTS',
      user_code: 'TTS001',
      role: 'intern',
      session_date: '2026-10-30', // >= 3 ngày
      shift_name: 'Ca Sáng (08:00 - 12:00)',
      start_time: '08:00:00',
      end_time: '12:00:00',
      location: 'P.302',
      notes: 'Làm việc sprint 2',
      status: 'scheduled',
      is_editable: true,
      days_until_session: 10,
    },
    {
      id: 2,
      user_id: 20,
      user_name: 'Lê Văn Mentor',
      user_code: 'MT001',
      role: 'mentor',
      session_date: '2026-10-21', // < 3 ngày
      shift_name: 'Ca Chiều Hướng Dẫn',
      start_time: '13:30:00',
      end_time: '17:30:00',
      location: 'Phòng Lab 1',
      notes: 'Review code sprint 1',
      status: 'scheduled',
      is_editable: false,
      days_until_session: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(operationsApi, 'fetchWeeklySchedules').mockResolvedValue({
      ok: true,
      data: mockSchedules,
    });
    vi.spyOn(internsApi, 'getInterns').mockResolvedValue({
      ok: true,
      data: [{ id: 10, full_name: 'Nguyễn Văn TTS', code: 'TTS001' }],
    });
    vi.spyOn(mentorsApi, 'getMentors').mockResolvedValue({
      ok: true,
      data: [{ id: 20, full_name: 'Lê Văn Mentor', code: 'MT001' }],
    });
    vi.spyOn(operationsApi, 'deleteWeeklySchedule').mockResolvedValue({
      ok: true,
      message: 'Đã xóa thành công',
    });
  });

  it('1. Render đầy đủ danh sách phiên làm việc và giao diện quản trị', async () => {
    render(<WeeklyWorkScheduleManager />);

    expect(screen.getByText(/Quản lý Lịch làm việc theo phiên của từng tuần/i)).toBeInTheDocument();
    expect(screen.getByText(/Quản lý linh hoạt/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ca Sáng (08:00 - 12:00)')).toBeInTheDocument();
      expect(screen.getByText('Ca Chiều Hướng Dẫn')).toBeInTheDocument();
    });
  });

  it('2. Bỏ quy tắc 3 ngày: Nút Sửa luôn khả dụng và cho phép chỉnh sửa mọi phiên làm việc', async () => {
    render(<WeeklyWorkScheduleManager />);

    await waitFor(() => {
      expect(screen.getByText('Ca Chiều Hướng Dẫn')).toBeInTheDocument();
    });

    // Ca 1 (cách 10 ngày)
    const btnEditFar = screen.getByRole('button', { name: /Sửa ca Ca Sáng/i });
    expect(btnEditFar).not.toBeDisabled();
    expect(btnEditFar).not.toHaveClass('wws-btn-edit--disabled');

    // Ca 2 (cách 1 ngày) - trước đây bị khóa, nay luôn khả dụng
    const btnEditNear = screen.getByRole('button', { name: /Sửa ca Ca Chiều/i });
    expect(btnEditNear).not.toBeDisabled();
    expect(btnEditNear).not.toHaveClass('wws-btn-edit--disabled');

    // Bấm nút Sửa mở modal chỉnh sửa thành công
    fireEvent.click(btnEditNear);
    expect(screen.getByText(/Chỉnh sửa Phiên làm việc/i)).toBeInTheDocument();
  });

  it('3. Mở modal thêm phiên làm việc mới khi click nút "Thêm phiên làm việc mới"', async () => {
    render(<WeeklyWorkScheduleManager />);

    const addBtn = screen.getByRole('button', { name: /Thêm phiên làm việc mới/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Thêm Phiên làm việc mới cho Tuần/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Đối tượng áp dụng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên ca \/ Phiên làm việc/i)).toBeInTheDocument();
  });

  it('4. Gọi deleteWeeklySchedule khi bấm nút Xóa', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<WeeklyWorkScheduleManager />);

    await waitFor(() => {
      expect(screen.getByText('Ca Sáng (08:00 - 12:00)')).toBeInTheDocument();
    });

    const btnDelete = screen.getByRole('button', { name: /Xóa ca Ca Sáng/i });
    fireEvent.click(btnDelete);

    expect(operationsApi.deleteWeeklySchedule).toHaveBeenCalledWith(1);
  });
});
