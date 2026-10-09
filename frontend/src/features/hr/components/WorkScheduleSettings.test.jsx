import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import WorkScheduleSettings, {
  validateWorkSchedule,
  DEFAULT_SCHEDULES,
} from './WorkScheduleSettings';
import * as operationsApi from '../../../api/operations';

describe('WorkScheduleSettings Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(operationsApi, 'fetchWorkSchedules').mockResolvedValue({
      ok: true,
      data: [...DEFAULT_SCHEDULES],
    });
    vi.spyOn(operationsApi, 'saveWorkSchedule').mockImplementation(async (payload) => ({
      ok: true,
      data: {
        id: 'WS-999',
        ...payload,
        applied_members_count: 0,
        status: 'active',
        created_at: 'Vừa tạo',
      },
    }));
    vi.spyOn(operationsApi, 'updateWorkSchedule').mockImplementation(async (id, payload) => ({
      ok: true,
      data: {
        id,
        ...payload,
        applied_members_count: 14,
        status: 'active',
        created_at: '01/10/2026 08:00',
      },
    }));
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. UNIT TEST VALIDATION LOGIC
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Logic Validation thuần (validateWorkSchedule)', () => {
    it('báo lỗi khi chưa chọn nhóm thực tập', () => {
      const res = validateWorkSchedule({
        groupId: '',
        startTime: '08:15',
        endTime: '17:30',
        workDays: ['Thứ 2'],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.groupId).toBe('Vui lòng chọn nhóm thực tập áp dụng.');
    });

    it('báo lỗi khi Giờ kết thúc <= Giờ bắt đầu', () => {
      // Bằng nhau
      const resEqual = validateWorkSchedule({
        groupId: 'group_dev',
        startTime: '08:15',
        endTime: '08:15',
        workDays: ['Thứ 2'],
      });
      expect(resEqual.isValid).toBe(false);
      expect(resEqual.errors.endTime).toBe('Giờ kết thúc phải lớn hơn giờ bắt đầu.');

      // Nhỏ hơn
      const resLess = validateWorkSchedule({
        groupId: 'group_dev',
        startTime: '17:30',
        endTime: '08:15',
        workDays: ['Thứ 2'],
      });
      expect(resLess.isValid).toBe(false);
      expect(resLess.errors.endTime).toBe('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
    });

    it('báo lỗi khi không chọn ngày làm việc nào', () => {
      const res = validateWorkSchedule({
        groupId: 'group_dev',
        startTime: '08:15',
        endTime: '17:30',
        workDays: [],
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.workDays).toBe('Vui lòng chọn ít nhất một ngày làm việc trong tuần (Từ Thứ 2 đến Thứ 7).');
    });

    it('trả về isValid: true khi mọi trường hợp đều thỏa mãn', () => {
      const res = validateWorkSchedule({
        groupId: 'group_dev',
        startTime: '08:15',
        endTime: '17:30',
        workDays: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. RENDER GIAO DIỆN FORM VÀ BẢNG
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Render Giao diện & Form thiết lập', () => {
    it('render đầy đủ các trường của Form thiết lập ca làm việc', async () => {
      render(<WorkScheduleSettings />);

      await waitFor(() => {
        expect(screen.getAllByText('Nhóm Dev (Phần mềm & Fullstack)').length).toBeGreaterThan(0);
      });

      // Dropdown chọn nhóm thực tập
      expect(screen.getByLabelText(/Chọn nhóm thực tập/i)).toBeInTheDocument();

      // 2 ô Timepicker
      expect(screen.getByLabelText(/Giờ bắt đầu/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Giờ kết thúc/i)).toBeInTheDocument();

      // Checkbox các ngày từ Thứ 2 đến Thứ 7
      const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      days.forEach((dayName) => {
        expect(screen.getByLabelText(dayName)).toBeInTheDocument();
      });

      // Nút Lưu Cấu hình
      expect(screen.getByRole('button', { name: /Lưu Cấu hình/i })).toBeInTheDocument();

      // Bảng bên dưới form chứa danh sách "Các lịch làm việc đang áp dụng"
      expect(screen.getByRole('heading', { name: /Các lịch làm việc đang áp dụng/i })).toBeInTheDocument();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. HIỂN THỊ LỖI ĐỎ DƯỚI Ô INPUT TRÊN DOM
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Validate & Hiển thị lỗi đỏ dưới ô input', () => {
    it('hiển thị lỗi đỏ dưới dropdown khi chưa chọn nhóm', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      // Bấm nút Lưu Cấu hình ngay khi chưa chọn nhóm
      const saveBtn = screen.getByRole('button', { name: /Lưu Cấu hình/i });
      await user.click(saveBtn);

      const errorGroup = screen.getByTestId('error-group');
      expect(errorGroup).toBeInTheDocument();
      expect(errorGroup).toHaveTextContent('Vui lòng chọn nhóm thực tập áp dụng.');
    });

    it('hiển thị lỗi đỏ dưới ô Giờ kết thúc khi Giờ kết thúc <= Giờ bắt đầu', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      const startInput = screen.getByLabelText(/Giờ bắt đầu/i);
      const endInput = screen.getByLabelText(/Giờ kết thúc/i);

      // Nhập Giờ bắt đầu là 17:00, Giờ kết thúc là 08:00
      await user.clear(startInput);
      await user.type(startInput, '17:00');

      await user.clear(endInput);
      await user.type(endInput, '08:00');

      const saveBtn = screen.getByRole('button', { name: /Lưu Cấu hình/i });
      await user.click(saveBtn);

      const errorEndTime = screen.getByTestId('error-end-time');
      expect(errorEndTime).toBeInTheDocument();
      expect(errorEndTime).toHaveTextContent('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
    });

    it('hiển thị lỗi đỏ khi bỏ chọn toàn bộ ngày làm việc', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      // Bấm nút shortcut "Bỏ chọn tất cả"
      const clearBtn = screen.getByRole('button', { name: /Bỏ chọn tất cả/i });
      await user.click(clearBtn);

      const saveBtn = screen.getByRole('button', { name: /Lưu Cấu hình/i });
      await user.click(saveBtn);

      const errorDays = screen.getByTestId('error-work-days');
      expect(errorDays).toBeInTheDocument();
      expect(errorDays).toHaveTextContent(/Vui lòng chọn ít nhất một ngày làm việc trong tuần/i);
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 4. UPDATE UI: PUSH CẤU HÌNH VÀO DANH SÁCH BÊN DƯỚI
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Gọi API thành công & Tự động Push cấu hình mới vào danh sách', () => {
    it('thêm lịch làm việc mới vào danh sách bên dưới form sau khi lưu', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      // 1. Chọn Nhóm thực tập
      const groupSelect = screen.getByLabelText(/Chọn nhóm thực tập/i);
      await user.selectOptions(groupSelect, 'group_tester');

      // 2. Chỉnh giờ hợp lệ
      const startInput = screen.getByLabelText(/Giờ bắt đầu/i);
      const endInput = screen.getByLabelText(/Giờ kết thúc/i);
      await user.clear(startInput);
      await user.type(startInput, '09:00');
      await user.clear(endInput);
      await user.type(endInput, '18:00');

      // 3. Bấm Lưu Cấu hình
      const saveBtn = screen.getByRole('button', { name: /Lưu Cấu hình/i });
      await user.click(saveBtn);

      // 4. Kiểm tra API được gọi đúng tham số
      await waitFor(() => {
        expect(operationsApi.saveWorkSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            group_id: 'group_tester',
            start_time: '09:00',
            end_time: '18:00',
          })
        );
      });

      // 5. Kiểm tra danh sách bảng bên dưới tự động hiển thị dòng cấu hình mới
      await waitFor(() => {
        expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument();
      });

      // Toast thông báo thành công
      expect(screen.getByText(/Đã lưu thành công ca làm việc/i)).toBeInTheDocument();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 5. CHỨC NĂNG CHỈNH SỬA LỊCH LÀM VIỆC (NÚT "SỬA")
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('5. Chức năng Chỉnh sửa Lịch làm việc (Nút "Sửa")', () => {
    it('khi bấm "Sửa", đổ dữ liệu dòng vào form và chuyển sang chế độ Chỉnh sửa', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-row-WS-001')).toBeInTheDocument();
      });

      // Bấm nút "Sửa" ở dòng WS-001
      const editBtn = screen.getByTestId('btn-edit-WS-001');
      await user.click(editBtn);

      // Tiêu đề form đổi sang "Chỉnh sửa Cấu hình Ca làm việc"
      expect(screen.getByText(/Chỉnh sửa Cấu hình Ca làm việc/i)).toBeInTheDocument();
      expect(screen.getByTestId('ws-editing-tag')).toHaveTextContent('Mã: WS-001');

      // Giá trị form được điền chính xác từ dòng WS-001
      const groupSelect = screen.getByLabelText(/Chọn nhóm thực tập/i);
      expect(groupSelect).toHaveValue('group_dev');

      const startInput = screen.getByLabelText(/Giờ bắt đầu/i);
      expect(startInput).toHaveValue('08:15');

      const endInput = screen.getByLabelText(/Giờ kết thúc/i);
      expect(endInput).toHaveValue('17:30');

      // Nút submit đổi thành "Lưu Thay đổi" và có nút "Hủy chỉnh sửa"
      expect(screen.getByTestId('btn-save-schedule')).toHaveTextContent(/Lưu Thay đổi/i);
      expect(screen.getByTestId('btn-cancel-edit')).toBeInTheDocument();
    });

    it('khi cập nhật và lưu thay đổi, gọi API updateWorkSchedule và cập nhật hàng trên bảng', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-row-WS-001')).toBeInTheDocument();
      });

      // Bấm nút "Sửa" ở dòng WS-001
      const editBtn = screen.getByTestId('btn-edit-WS-001');
      await user.click(editBtn);

      // Thay đổi giờ làm việc
      const startInput = screen.getByLabelText(/Giờ bắt đầu/i);
      const endInput = screen.getByLabelText(/Giờ kết thúc/i);
      await user.clear(startInput);
      await user.type(startInput, '08:00');
      await user.clear(endInput);
      await user.type(endInput, '17:00');

      // Bấm "Lưu Thay đổi"
      const saveBtn = screen.getByTestId('btn-save-schedule');
      await user.click(saveBtn);

      // Kiểm tra API update được gọi đúng
      await waitFor(() => {
        expect(operationsApi.updateWorkSchedule).toHaveBeenCalledWith(
          'WS-001',
          expect.objectContaining({
            group_id: 'group_dev',
            start_time: '08:00',
            end_time: '17:00',
          })
        );
      });

      // Hàng trên bảng được cập nhật khung giờ mới
      await waitFor(() => {
        expect(screen.getByText('08:00 – 17:00')).toBeInTheDocument();
      });

      // Toast thông báo cập nhật thành công
      expect(screen.getByText(/Đã cập nhật thành công ca làm việc/i)).toBeInTheDocument();
    });

    it('khi bấm "Hủy chỉnh sửa", form được reset và quay lại chế độ tạo mới', async () => {
      const user = userEvent.setup();
      render(<WorkScheduleSettings />);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-row-WS-001')).toBeInTheDocument();
      });

      // Bấm nút "Sửa" ở dòng WS-001
      const editBtn = screen.getByTestId('btn-edit-WS-001');
      await user.click(editBtn);

      expect(screen.getByText(/Chỉnh sửa Cấu hình Ca làm việc/i)).toBeInTheDocument();

      // Bấm "Hủy chỉnh sửa"
      const cancelBtn = screen.getByTestId('btn-cancel-edit');
      await user.click(cancelBtn);

      // Quay lại tiêu đề "Thiết lập Cấu hình Ca mới"
      expect(screen.getByText(/Thiết lập Cấu hình Ca mới/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lưu Cấu hình/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Chọn nhóm thực tập/i)).toHaveValue('');
    });
  });
});
