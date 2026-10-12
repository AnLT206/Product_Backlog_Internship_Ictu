import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InternCreatePage from './InternCreatePage';
import * as internApi from '../../api/interns';

vi.mock('../../api/interns', () => ({
  createIntern: vi.fn(),
  uploadInternCv: vi.fn(),
  buildToast: vi.fn((ok, status, data) => ({
    type: ok ? 'success' : 'error',
    message: ok ? 'Thành công' : 'Thất bại',
  })),
}));

describe('InternCreatePage Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('render đầy đủ trường Mật khẩu khởi tạo và nút toggle ẩn/hiện mật khẩu', () => {
    render(<InternCreatePage />);
    const passInput = screen.getByLabelText(/Mật khẩu khởi tạo/i);
    expect(passInput).toBeInTheDocument();
    expect(passInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText(/Hiện mật khẩu/i);
    expect(toggleBtn).toBeInTheDocument();

    // Click toggle button -> đổi thành type text
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'text');

    // Click toggle button lần nữa -> đổi về type password
    fireEvent.click(screen.getByLabelText(/Ẩn mật khẩu/i));
    expect(passInput).toHaveAttribute('type', 'password');
  });

  it('validate lỗi khi để trống mật khẩu hoặc mật khẩu ngắn hơn 6 ký tự', async () => {
    render(<InternCreatePage />);
    const submitBtn = screen.getByRole('button', { name: /Lưu hồ sơ/i });

    // Submit form trống
    fireEvent.click(submitBtn);
    expect(screen.getByText('Vui lòng nhập mật khẩu khởi tạo.')).toBeInTheDocument();

    // Nhập mật khẩu < 6 ký tự
    const passInput = screen.getByLabelText(/Mật khẩu khởi tạo/i);
    fireEvent.change(passInput, { target: { name: 'password', value: '123' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Mật khẩu phải có ít nhất 6 ký tự.')).toBeInTheDocument();
  });

  it('gửi đúng mật khẩu HR tự nhập khi submit form thành công', async () => {
    internApi.createIntern.mockResolvedValueOnce({
      ok: true,
      status: 201,
      data: { id: 99, email: 'intern.new@example.com' },
    });

    render(<InternCreatePage />);
    fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { name: 'full_name', value: 'Nguyễn Văn Test' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { name: 'email', value: 'intern.new@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu khởi tạo/i), { target: { name: 'password', value: 'CustomPass@2026' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu hồ sơ/i }));

    await waitFor(() => {
      expect(internApi.createIntern).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Nguyễn Văn Test',
          email: 'intern.new@example.com',
          password: 'CustomPass@2026',
        })
      );
    });
  });
});
