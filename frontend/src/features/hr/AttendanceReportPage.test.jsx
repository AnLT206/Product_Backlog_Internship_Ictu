import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as operationsApi from '../../api/operations';
import AttendanceReportPage, {
  formatDays,
  getRowHighlightClass,
  simulateFetchAttendanceReports,
  MOCK_ATTENDANCE_DATA,
} from './AttendanceReportPage';

describe('AttendanceReportPage Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(operationsApi, 'fetchAttendanceReports').mockResolvedValue({
      ok: true,
      data: [...MOCK_ATTENDANCE_DATA],
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. UNIT TEST LOGIC HIGHLIGHT CẢNH BÁO THEO QUY ĐỊNH
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Logic Cảnh báo & Highlight Dòng (Conditional Rules)', () => {
    it('bôi đỏ (arp-row--danger) khi TTS nghỉ không phép >= 2 buổi', () => {
      const itemDanger = {
        unapproved_leave_days: 2,
        late_count: 0,
      };
      expect(getRowHighlightClass(itemDanger)).toBe('arp-row--danger');

      const itemDangerHigher = {
        unapproved_leave_days: 3.5,
        late_count: 1,
      };
      expect(getRowHighlightClass(itemDangerHigher)).toBe('arp-row--danger');
    });

    it('bôi vàng (arp-row--warning) khi TTS đi muộn >= 3 lần (và không bị nghỉ không phép >= 2)', () => {
      const itemWarning = {
        unapproved_leave_days: 0,
        late_count: 3,
      };
      expect(getRowHighlightClass(itemWarning)).toBe('arp-row--warning');

      const itemWarningHigher = {
        unapproved_leave_days: 1,
        late_count: 5,
      };
      expect(getRowHighlightClass(itemWarningHigher)).toBe('arp-row--warning');
    });

    it('ưu tiên bôi đỏ (arp-row--danger) khi vừa đi muộn >= 3 lần vừa nghỉ không phép >= 2 buổi', () => {
      const itemBoth = {
        unapproved_leave_days: 2.5,
        late_count: 4,
      };
      expect(getRowHighlightClass(itemBoth)).toBe('arp-row--danger');
    });

    it('trả về dòng bình thường (arp-row--normal) khi chuyên cần đạt chuẩn', () => {
      const itemNormal = {
        unapproved_leave_days: 0,
        late_count: 1,
      };
      expect(getRowHighlightClass(itemNormal)).toBe('arp-row--normal');
    });

    it('hàm formatDays định dạng chính xác số nguyên và số thập phân', () => {
      expect(formatDays(22)).toBe('22');
      expect(formatDays(20.5)).toBe('20.5');
      expect(formatDays(0)).toBe('0');
      expect(formatDays(null)).toBe('0');
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. RENDER UI & TOOLBAR STRUCTURE
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Render Giao diện & Toolbar', () => {
    it('render đầy đủ thanh công cụ Toolbar (Tháng/Năm, Đợt thực tập, Ô Search) và tiêu đề', async () => {
      render(<AttendanceReportPage />);

      // Chờ dữ liệu load xong
      await waitFor(() => {
        expect(screen.queryByText(/Đang tải dữ liệu/i)).not.toBeInTheDocument();
      });

      // Tiêu đề trang
      expect(screen.getByRole('heading', { name: /Báo cáo Chuyên cần Thực tập sinh/i })).toBeInTheDocument();

      // Bộ lọc Tháng/Năm
      expect(screen.getByLabelText(/Tháng\/Năm:/i)).toBeInTheDocument();

      // Bộ lọc Đợt thực tập
      expect(screen.getByLabelText(/Đợt thực tập:/i)).toBeInTheDocument();

      // Ô Search theo tên
      expect(screen.getByPlaceholderText(/Tìm kiếm theo họ tên TTS/i)).toBeInTheDocument();
    });

    it('render đúng 6 cột tiêu đề của bảng dữ liệu theo yêu cầu', async () => {
      render(<AttendanceReportPage />);

      // Đợi load xong bảng
      await waitFor(() => {
        expect(screen.queryByText(/Đang tải dữ liệu/i)).not.toBeInTheDocument();
      });

      const requiredColumns = [
        'Họ tên TTS',
        'Tổng số ngày đi làm',
        'Số lần đi muộn',
        'Nghỉ có phép',
        'Nghỉ không phép',
        'Trạng thái',
      ];

      requiredColumns.forEach((colName) => {
        expect(screen.getByRole('columnheader', { name: new RegExp(colName, 'i') })).toBeInTheDocument();
      });
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. CONDITIONAL HIGHLIGHT TRÊN DOM THỰC TẾ
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Hiển thị dữ liệu mẫu & Highlight cảnh báo trực tiếp trên bảng', () => {
    it('áp dụng class arp-row--danger và badge Vi phạm kỷ luật cho TTS có nghỉ không phép >= 2', async () => {
      render(<AttendanceReportPage />);

      // Đợi bảng hiển thị dữ liệu mẫu
      await waitFor(() => {
        expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
      });

      // TTS Lê Hoàng Nam có nghỉ không phép = 2 -> Dòng màu đỏ
      const rowNam = screen.getByTestId('row-intern-103');
      expect(rowNam).toHaveClass('arp-row--danger');
      expect(rowNam).toHaveTextContent(/Vi phạm kỷ luật/i);
    });

    it('áp dụng class arp-row--warning và badge Cảnh báo đi muộn cho TTS có đi muộn >= 3', async () => {
      render(<AttendanceReportPage />);

      await waitFor(() => {
        expect(screen.getByText('Hoàng Minh Tuấn')).toBeInTheDocument();
      });

      // TTS Hoàng Minh Tuấn có đi muộn = 3 -> Dòng màu vàng
      const rowTuan = screen.getByTestId('row-intern-102');
      expect(rowTuan).toHaveClass('arp-row--warning');
      expect(rowTuan).toHaveTextContent(/Cảnh báo đi muộn/i);
    });

    it('áp dụng class arp-row--normal cho TTS đạt chuẩn chuyên cần', async () => {
      render(<AttendanceReportPage />);

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      });

      // TTS Nguyễn Văn An (22 ngày, 0 muộn, 0 nghỉ KP) -> Dòng bình thường
      const rowAn = screen.getByTestId('row-intern-101');
      expect(rowAn).toHaveClass('arp-row--normal');
      expect(rowAn).toHaveTextContent(/Bình thường/i);
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 4. TÌM KIẾM THEO TÊN & FILTER
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Chức năng Tìm kiếm theo tên & Lọc đợt thực tập', () => {
    it('lọc chính xác theo ô Search tên TTS', async () => {
      const user = userEvent.setup();
      render(<AttendanceReportPage />);

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo họ tên TTS/i);
      await user.type(searchInput, 'Hoàng Minh Tuấn');

      expect(screen.getByText('Hoàng Minh Tuấn')).toBeInTheDocument();
      expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
      expect(screen.queryByText('Lê Hoàng Nam')).not.toBeInTheDocument();
    });

    it('lọc chính xác theo đợt thực tập', async () => {
      const user = userEvent.setup();
      render(<AttendanceReportPage />);

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      });

      const batchSelect = screen.getByLabelText(/Đợt thực tập:/i);
      await user.selectOptions(batchSelect, 'BATCH_02');

      // BATCH_02 gồm Bùi Quang Huy, Vũ Trọng Phụng
      expect(screen.getByText('Bùi Quang Huy')).toBeInTheDocument();
      expect(screen.getByText('Vũ Trọng Phụng')).toBeInTheDocument();
      expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 5. ASYNC MOCK FETCH (setTimeout simulation)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('5. Hàm giả lập simulateFetchAttendanceReports', () => {
    it('trả về dữ liệu mẫu sau thời gian delay giả lập', async () => {
      const data = await simulateFetchAttendanceReports({ batch: 'all', search: '' });
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('full_name');
      expect(data[0]).toHaveProperty('total_work_days');
      expect(data[0]).toHaveProperty('late_count');
      expect(data[0]).toHaveProperty('unapproved_leave_days');
    });
  });
});
