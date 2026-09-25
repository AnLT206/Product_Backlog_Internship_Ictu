import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  clearSession,
  getMe,
  login as loginRequest,
  readStoredUser,
  saveSession,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [booting, setBooting] = useState(false);

  const login = useCallback(async (email, password) => {
    const { ok, status, data } = await loginRequest({ email, password });
    if (!ok) {
      const message =
        typeof data?.detail === 'string'
          ? data.detail
          : 'Email hoặc mật khẩu không đúng.';
      return { ok: false, status, message };
    }

    saveSession({ access_token: data.access_token, user: data.user });
    setUser(data.user);
    return { ok: true, status, user: data.user };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      return null;
    }
    setBooting(true);
    try {
      const { ok, data } = await getMe();
      if (!ok) {
        clearSession();
        setUser(null);
        return null;
      }
      const nextUser = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
      };
      saveSession({ access_token: token, user: nextUser });
      setUser(nextUser);
      return nextUser;
    } finally {
      setBooting(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && localStorage.getItem('access_token')),
      booting,
      login,
      logout,
      refreshMe,
    }),
    [user, booting, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải dùng trong AuthProvider.');
  }
  return ctx;
}
