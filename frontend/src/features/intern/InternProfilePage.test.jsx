import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InternProfilePage from './InternProfilePage';

let mockCurrentUser = {
  id: 7,
  email: 'ungvien@ictu.edu.vn',
  full_name: 'Nguyễn Thu Hà',
  code: 'UV0001',
  role: 'intern',
  status: 'pending',
  phone: '0987654321',
  university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
};

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockCurrentUser,
      updateUser: vi.fn(),
      isAuthenticated: true,
    }),
  };
});

describe('InternProfilePage Test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders profile page for applicant without error', () => {
    render(
      <BrowserRouter>
        <InternProfilePage />
      </BrowserRouter>
    );
    expect(screen.getByText('Hồ Sơ Cá Nhân Ứng Viên')).toBeInTheDocument();
  });

  it('renders profile page for approved intern without error', () => {
    mockCurrentUser = {
      id: 7,
      email: 'ungvien@ictu.edu.vn',
      full_name: 'Nguyễn Thu Hà',
      code: 'UV0001',
      role: 'intern',
      status: 'active',
      phone: '0987654321',
      university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
    };
    render(
      <BrowserRouter>
        <InternProfilePage />
      </BrowserRouter>
    );
    expect(screen.getByText('Thông Tin Cá Nhân & Tài Khoản Ngân Hàng')).toBeInTheDocument();
  });
});
