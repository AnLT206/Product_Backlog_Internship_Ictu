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

  it('preserves applicant identity and does not overwrite with TTS 1 An on F5 reload', () => {
    const applicantUser = {
      id: 7,
      email: 'ungvien@ictu.edu.vn',
      full_name: 'Nguyễn Thu Hà',
      code: 'UV0001',
      role: 'intern',
      status: 'pending',
      phone: '0987654321',
      university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    };
    mockCurrentUser = applicantUser;

    // Giả lập scenario: Tab HR ghi đè auth_user thành HR
    localStorage.setItem('auth_user_applicant', JSON.stringify(applicantUser));
    localStorage.setItem('last_portal_intern_role', 'applicant');
    localStorage.setItem('auth_user', JSON.stringify({ id: 2, email: 'hr@ictu.edu.vn', role: 'hr' }));
    // Có legacy cat profile trong ictu_user_profile
    localStorage.setItem('ictu_user_profile', JSON.stringify({ full_name: 'TTS', email: 'intern@ictu.edu.vn', avatar: 'cat.png' }));

    const profile = InternProfilePage.getSavedUserProfile
      ? InternProfilePage.getSavedUserProfile(applicantUser)
      : null;

    render(
      <BrowserRouter>
        <InternProfilePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Hồ Sơ Cá Nhân Ứng Viên')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nguyễn Thu Hà')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ungvien@ictu.edu.vn')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UV0001')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('intern@ictu.edu.vn')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('TTS0001')).not.toBeInTheDocument();
  });
});

