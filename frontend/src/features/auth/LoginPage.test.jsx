import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockLogout = vi.fn();
let mockAuthData = {
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: mockLogout,
};

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => mockAuthData,
  };
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthData = {
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: mockLogout,
    };
  });

  it('renders login form with email and password fields without auto-redirecting', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeInTheDocument();
  });

  it('calls logout if user or isAuthenticated was present when entering /login to clear stale session', () => {
    mockAuthData = {
      user: { id: 1, email: 'admin@ictu.edu.vn', role: 'admin' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: mockLogout,
    };

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });
});
