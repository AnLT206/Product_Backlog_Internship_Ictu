import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AllowanceManagementPage, {
  parseRawNumber,
  formatCurrencyInput,
  formatVndDisplay,
  INITIAL_ALLOWANCE_RECORDS,
} from './AllowanceManagementPage';
import * as operationsApi from '../../api/operations';

describe('AllowanceManagementPage Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(operationsApi, 'fetchHrAllowances').mockResolvedValue({
      ok: true,
      data: [...INITIAL_ALLOWANCE_RECORDS],
    });
    vi.spyOn(operationsApi, 'updateHrAllowance').mockImplementation(async (payload) => ({
      ok: true,
      data: payload,
    }));
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. UNIT TEST FORMAT TIỀN TỆ & VALIDATION SỐ HỌC
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Logic Format tiền tệ & Validation', () => {
    it('formatCurrencyInput tự động thêm dấu phẩy phân cách hàng nghìn (1500000 -> 1,500,000)', () => {
      expect(formatCurrencyInput(1500000)).toBe('1,500,000');
      expect(formatCurrencyInput('2500000')).toBe('2,500,000');
      expect(formatCurrencyInput('300000')).toBe('300,000');
      expect(formatCurrencyInput('')).toBe('');
    });

    it('parseRawNumber loại bỏ mọi chữ cái, ký tự âm và chuyển về số nguyên dương', () => {
      expect(parseRawNumber('1,500,000')).toBe(1500000);
      expect(parseRawNumber('-1500000')).toBe(1500000); // Ký tự âm bị lọc bỏ
      expect(parseRawNumber('abc1500000xyz')).toBe(1500000); // Chữ cái bị lọc bỏ
      expect(parseRawNumber('')).toBe(0);
    });

    it('formatVndDisplay format hiển thị đúng hậu tố VNĐ', () => {
      expect(formatVndDisplay(1500000)).toBe('1,500,000 VNĐ');
      expect(formatVndDisplay(0)).toBe('0 VNĐ');
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. RENDER GIAO DIỆN FORM VÀ BẢNG 6 CỘT
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Render Giao diện & Layout', () => {
    it('render đầy đủ các trường của Form nhập liệu phía trên', async () => {
      render(<AllowanceManagementPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Quản lý Chi trả Phụ cấp/i })).toBeInTheDocument();
      });

      // Dropdown Chọn TTS
      expect(screen.getByLabelText(/Chọn TTS/i)).toBeInTheDocument();

      // Input Mức phụ cấp cơ bản
      expect(screen.getByLabelText(/Mức phụ cấp cơ bản/i)).toBeInTheDocument();

      // Input Thưởng/Khấu trừ
      expect(screen.getByLabelText(/Thưởng hoặc khấu trừ/i)).toBeInTheDocument();

      // Nút Cập nhật
      expect(screen.getByRole('button', { name: /Cập nhật/i })).toBeInTheDocument();
    });

    it('render đúng 6 cột tiêu đề của Bảng chi trả phụ cấp theo kỳ', async () => {
      render(<AllowanceManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      });

      const requiredColumns = [
        'Họ tên',
        'Số ngày công',
        'Phụ cấp cơ bản',
        'Thưởng/Phạt',
        'Tổng thực nhận',
        'Trạng thái',
      ];

      requiredColumns.forEach((colTitle) => {
        expect(screen.getByRole('columnheader', { name: new RegExp(colTitle, 'i') })).toBeInTheDocument();
      });
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. RÀNG BUỘC KHI GÕ: KHÔNG CHỮ CÁI, KHÔNG SỐ ÂM, TỰ ĐỘNG THÊM DẤU PHẨY
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Ràng buộc nhập liệu ô Input tiền', () => {
    it('tự động format dấu phẩy khi gõ số vào ô Mức phụ cấp cơ bản', async () => {
      const user = userEvent.setup();
      render(<AllowanceManagementPage />);

      const baseInput = screen.getByLabelText(/Mức phụ cấp cơ bản/i);

      // Xóa và nhập 1500000
      await user.clear(baseInput);
      await user.type(baseInput, '1500000');

      // Tự động biến thành 1,500,000
      expect(baseInput).toHaveValue('1,500,000');
    });

    it('ngăn chặn nhập chữ cái và dấu âm vào ô Mức phụ cấp cơ bản', async () => {
      const user = userEvent.setup();
      render(<AllowanceManagementPage />);

      const baseInput = screen.getByLabelText(/Mức phụ cấp cơ bản/i);

      await user.clear(baseInput);
      await user.type(baseInput, '-abc1500000xyz');

      // Các chữ cái và dấu '-' đều bị loại bỏ, chỉ giữ lại số đã format
      expect(baseInput).toHaveValue('1,500,000');
    });

    it('tự động format dấu phẩy khi gõ số vào ô Thưởng/Khấu trừ', async () => {
      const user = userEvent.setup();
      render(<AllowanceManagementPage />);

      const bonusInput = screen.getByLabelText(/Thưởng hoặc khấu trừ/i);

      await user.clear(bonusInput);
      await user.type(bonusInput, '350000');

      expect(bonusInput).toHaveValue('350,000');
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * 4. TỰ ĐỘNG TÍNH TOÁN TỔNG THỰC NHẬN & CẬP NHẬT API + BẢNG
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Tính toán Tổng thực nhận tự động và đẩy lên API', () => {
    it('tính toán live preview Tổng thực nhận = Phụ cấp cơ bản + Thưởng', async () => {
      const user = userEvent.setup();
      render(<AllowanceManagementPage />);

      const baseInput = screen.getByLabelText(/Mức phụ cấp cơ bản/i);
      const bonusInput = screen.getByLabelText(/Thưởng hoặc khấu trừ/i);

      await user.clear(baseInput);
      await user.type(baseInput, '2000000'); // 2,000,000

      await user.clear(bonusInput);
      await user.type(bonusInput, '500000'); // 500,000

      // Preview tổng thực nhận tự động tính: 2,500,000 VNĐ
      const preview = screen.getByTestId('preview-total-net');
      expect(preview).toHaveTextContent('2,500,000 VNĐ');
    });

    it('tính toán tự động và gọi API update kèm cập nhật lại Bảng bên dưới', async () => {
      const user = userEvent.setup();
      render(<AllowanceManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      });

      // 1. Chọn TTS Nguyễn Văn An (id: 1)
      const selectIntern = screen.getByLabelText(/Chọn TTS/i);
      await user.selectOptions(selectIntern, '1');

      // 2. Nhập Mức phụ cấp cơ bản: 2,500,000
      const baseInput = screen.getByLabelText(/Mức phụ cấp cơ bản/i);
      await user.clear(baseInput);
      await user.type(baseInput, '2500000');

      // 3. Nhập Thưởng: 300,000
      const bonusInput = screen.getByLabelText(/Thưởng hoặc khấu trừ/i);
      await user.clear(bonusInput);
      await user.type(bonusInput, '300000');

      // 4. Bấm "Cập nhật"
      const updateBtn = screen.getByRole('button', { name: /Cập nhật/i });
      await user.click(updateBtn);

      // 5. Kiểm tra API được gọi với total_net tự động tính: 2800000
      await waitFor(() => {
        expect(operationsApi.updateHrAllowance).toHaveBeenCalledWith(
          expect.objectContaining({
            intern_id: 1,
            base_allowance: 2500000,
            bonus_penalty: 300000,
            total_net: 2800000, // Phụ cấp cơ bản + Thưởng
          })
        );
      });

      // 6. Kiểm tra dòng của TTS trong bảng được cập nhật đúng giá trị
      const netCell = screen.getByTestId('total-net-1');
      expect(netCell).toHaveTextContent('2,800,000 VNĐ');

      // Toast thông báo
      expect(screen.getByText(/Đã cập nhật phụ cấp cho Nguyễn Văn An thành công/i)).toBeInTheDocument();
    });
  });
});

