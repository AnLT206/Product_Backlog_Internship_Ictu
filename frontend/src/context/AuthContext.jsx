import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  clearSession,
  getMe,
  login as loginRequest,
  readStoredUser,
  saveSession,
} from '../api/auth';

const AuthContext = createContext(null);

export const DEMO_PROFILES = {
  intern: {
    id: 1,
    full_name: 'Nguyễn Văn Bình',
    code: 'TTS0002',
    email: 'intern@ictu.edu.vn',
    role: 'intern',
    status: 'active',
    university: 'ĐH Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
  },
  applicant: {
    id: 5,
    full_name: 'Nguyễn Văn An',
    code: 'TTS9999',
    email: 'ungvien@ictu.edu.vn',
    role: 'intern',
    status: 'pending',
    university: 'ĐH Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
  },
  mentor: {
    id: 2,
    full_name: 'Trần Hoàng Quân',
    email: 'mentor@ictu.edu.vn',
    role: 'mentor',
    status: 'active',
    department: 'Công nghệ thông tin',
  },
  hr: {
    id: 3,
    full_name: 'Cán bộ Nhân sự HR',
    email: 'hr@ictu.edu.vn',
    role: 'hr',
    status: 'active',
  },
  admin: {
    id: 4,
    full_name: 'System Admin',
    email: 'admin@ictu.edu.vn',
    role: 'admin',
    status: 'active',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = readStoredUser();
    if (stored) return stored;
    // Default demo session for immediate preview
    const demo = DEMO_PROFILES.intern;
    saveSession({ access_token: 'demo-enterprise-token', user: demo });
    return demo;
  });
  const [booting, setBooting] = useState(false);

  const login = useCallback(async (email, password) => {
    try {
      const { ok, status, data } = await loginRequest({ email, password });
      if (ok && data?.user) {
        saveSession({ access_token: data.access_token, user: data.user });
        setUser(data.user);
        return { ok: true, status, user: data.user };
      }
    } catch {
      // offline fallback
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    let demoProfile = null;
    if (normalizedEmail.includes('ungvien')) {
      demoProfile = DEMO_PROFILES.applicant;
    } else if (normalizedEmail.includes('intern') || normalizedEmail.includes('an.nv')) {
      demoProfile = DEMO_PROFILES.intern;
    } else if (normalizedEmail.includes('mentor') || normalizedEmail.includes('binh.nv')) {
      demoProfile = DEMO_PROFILES.mentor;
    } else if (normalizedEmail.includes('hr')) {
      demoProfile = DEMO_PROFILES.hr;
    } else if (normalizedEmail.includes('admin')) {
      demoProfile = DEMO_PROFILES.admin;
    }

    if (demoProfile) {
      saveSession({ access_token: 'demo-enterprise-token', user: demoProfile });
      setUser(demoProfile);
      return { ok: true, status: 200, user: demoProfile };
    }

    return { ok: false, status: 401, message: 'Email hoặc mật khẩu không đúng.' };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      saveSession({
        access_token: localStorage.getItem('access_token') || 'demo-enterprise-token',
        user: updated,
      });
      return updated;
    });
  }, []);

  const switchRole = useCallback((targetRole) => {
    const profile = DEMO_PROFILES[targetRole] || DEMO_PROFILES.intern;
    saveSession({ access_token: 'demo-enterprise-token', user: profile });
    setUser(profile);
    return profile;
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
        code: data.code,
      };
      saveSession({ access_token: token, user: nextUser });
      setUser(nextUser);
      return nextUser;
    } catch {
      return null;
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
      updateUser,
      switchRole,
      refreshMe,
    }),
    [user, booting, login, logout, updateUser, switchRole, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải dùng trong AuthProvider.');
  }
  return ctx;
}
