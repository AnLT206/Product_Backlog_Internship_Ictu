import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  getMe,
  login as loginRequest,
  readStoredUser,
  saveSession,
} from '../api/auth';
import { acquireTokenForRole } from '../api/client';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const DEMO_PROFILES = {
  intern: {
    id: 5,
    full_name: 'Nguyễn Văn An',
    code: 'TTS0001',
    email: 'intern@ictu.edu.vn',
    role: 'intern',
    status: 'active',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
    phone: '0912.345.001',
    phone_number: '0912.345.001',
    cccd: '001203019876',
    address: 'Phường Quyết Thắng, TP. Thái Nguyên',
    bank_account: '999908123456',
    bank_name: 'MB Bank',
  },
  applicant: {
    id: 7,
    full_name: 'Nguyễn Thu Hà',
    code: 'UV0001',
    email: 'ungvien@ictu.edu.vn',
    role: 'intern',
    status: 'pending',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
    phone: '0987.654.321',
    phone_number: '0987.654.321',
    cccd: '001203019876',
    address: 'Phường Quyết Thắng, TP. Thái Nguyên',
    bank_account: '999908123456',
    bank_name: 'MB Bank',
  },
  mentor: {
    id: 3,
    full_name: 'Trần Hoàng Quân',
    code: 'MT0001',
    email: 'mentor@ictu.edu.vn',
    role: 'mentor',
    status: 'active',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
  },
  hr: {
    id: 2,
    full_name: 'Trần Thị Mai',
    code: 'HR0001',
    email: 'hr@ictu.edu.vn',
    role: 'hr',
    status: 'active',
  },
  admin: {
    id: 1,
    full_name: 'Quản trị viên Hệ thống',
    code: 'AD0001',
    email: 'admin@ictu.edu.vn',
    role: 'admin',
    status: 'active',
  },
};

export function getPersistedUserProfile(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  try {
    const scopedRaw = localStorage.getItem(`ictu_user_profile_${normalized}`);
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    const legacyRaw = localStorage.getItem('ictu_user_profile');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.email || parsed.email.toLowerCase().trim() === normalized) {
          return parsed;
        }
      }
    }
  } catch {}
  return null;
}

export function enrichUserWithPersistedProfile(userObj) {
  if (!userObj) return userObj;
  const isCandidate = (userObj.email || '').toLowerCase().includes('ungvien') || (userObj.code || '') === 'UV0001';
  const persisted = getPersistedUserProfile(userObj.email);
  let resolvedStatus = userObj.status;
  let resolvedProfileStatus = userObj.profile_status || userObj.status;

  if (persisted?.status && !isCandidate) resolvedStatus = persisted.status;
  if (persisted?.profile_status && !isCandidate) resolvedProfileStatus = persisted.profile_status;

  if (userObj.profile_status === 'rejected' || userObj.status === 'rejected') {
    resolvedStatus = 'rejected';
    resolvedProfileStatus = 'rejected';
  } else {
    try {
      const rawDec = localStorage.getItem('applicant_decision_status');
      if (rawDec) {
        const dec = JSON.parse(rawDec);
        const isTargetApplicant =
          (dec?.applicantId && (dec.applicantId === userObj.id || String(dec.applicantId) === String(userObj.id))) ||
          (dec?.targetEmail && userObj.email && dec.targetEmail.toLowerCase() === userObj.email.toLowerCase()) ||
          (!dec?.applicantId && userObj.email && userObj.email.toLowerCase().includes('ungvien'));

        if (dec?.status && isTargetApplicant) {
          resolvedStatus = dec.status === 'rejected' ? 'rejected' : dec.status === 'approved' ? 'approved' : resolvedStatus;
          resolvedProfileStatus = dec.status;
        }
      }
    } catch {}
  }

  return {
    ...userObj,
    status: resolvedStatus,
    profile_status: resolvedProfileStatus,
    avatar: persisted?.avatar ?? userObj.avatar ?? null,
    phone: persisted?.phone ?? userObj.phone ?? userObj.phone_number,
    phone_number: persisted?.phone ?? userObj.phone_number ?? userObj.phone,
    cccd: persisted?.cccd ?? userObj.cccd,
    address: persisted?.address ?? userObj.address,
    bank_account: persisted?.bank_account ?? userObj.bank_account,
    bank_name: persisted?.bank_name ?? userObj.bank_name,
    dob: persisted?.dob ?? userObj.dob,
  };
}

export function isApplicantUser(u) {
  if (!u) return false;
  const email = (u.email || '').toLowerCase().trim();
  const code = (u.code || '').toUpperCase().trim();
  const name = (u.full_name || '').toLowerCase().trim();
  const role = (u.role || '').toLowerCase().trim();
  const status = (u.status || '').toLowerCase().trim();
  const profileStatus = (u.profile_status || '').toLowerCase().trim();

  // 1. ĐÃ DUYỆT / ACTIVE -> Chắc chắn là Thực tập sinh chính thức, KHÔNG còn là Ứng viên chờ duyệt nữa!
  if (status === 'active' || status === 'approved' || profileStatus === 'approved') {
    return false;
  }

  // 2. Nếu người dùng đã hoàn thành ký hợp đồng (onboarded), không còn là ứng viên chờ duyệt nữa
  if (typeof window !== 'undefined' && localStorage.getItem('applicant_onboarded') === 'true') {
    return false;
  }

  // 3. Các tài khoản TTS chính thức có code TTS
  if (code.startsWith('TTS') && code !== 'TTS9999' && code !== 'TTS0003' && status !== 'pending') {
    return false;
  }

  // 4. Đối với tài khoản ứng viên định danh (ungvien@ictu.edu.vn hoặc UV0001)
  if (email.includes('ungvien') || code === 'UV0001') {
    return true;
  }

  return (
    role === 'applicant' ||
    status === 'pending' ||
    status === 'unsubmitted' ||
    profileStatus === 'pending' ||
    email.includes('ungvien') ||
    code === 'UV0001' ||
    code === 'TTS9999' ||
    code === 'TTS0003' ||
    name === 'ứng viên' ||
    name.includes('ứng viên')
  );
}

export function normalizeUserName(u) {
  if (!u) return u;
  const clone = { ...u };
  // Giữ nguyên ID, full_name, email, status từ backend
  // Chỉ gán mã mặc định nếu user thiếu code
  if (!clone.code) {
    if (clone.role === 'admin') clone.code = 'AD0001';
    else if (clone.role === 'hr') clone.code = 'HR0001';
    else if (clone.role === 'mentor') clone.code = 'MT0001';
    else if (clone.role === 'intern') clone.code = 'TTS0001';
    else clone.code = 'UV0001';
  }
  return clone;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = readStoredUser();
    if (stored) {
      const normalized = normalizeUserName(stored);
      const enriched = enrichUserWithPersistedProfile(normalized);
      saveSession({
        access_token: stored.access_token || localStorage.getItem('access_token') || 'demo-enterprise-token',
        user: enriched,
      });
      return enriched;
    }
    // Default demo session for immediate preview
    const demo = DEMO_PROFILES.intern;
    const enriched = enrichUserWithPersistedProfile(demo);
    saveSession({ access_token: 'demo-enterprise-token', user: enriched });
    return enriched;
  });
  const [booting, setBooting] = useState(false);

  const login = useCallback(async (email, password) => {
    const normalizedEmail = (email || '').toLowerCase().trim();
    try {
      const { ok, status, data } = await loginRequest({ email, password });
      if (ok && data?.user) {
        let normalized = normalizeUserName(data.user);
        normalized = enrichUserWithPersistedProfile(normalized);
        saveSession({ access_token: data.access_token, user: normalized });
        setUser(normalized);

        // Đồng bộ thêm thông tin chi tiết từ /api/auth/me nếu có
        getMe().then(({ ok: meOk, data: meData }) => {
          if (meOk && meData) {
            setUser((curr) => {
              if (!curr || (curr.email || '').toLowerCase() !== normalized.email.toLowerCase()) return curr;
              const next = enrichUserWithPersistedProfile({
                ...curr,
                status: meData.profile_status || meData.status || curr.status,
                profile_status: meData.profile_status || meData.status || curr.profile_status,
                phone_number: meData.phone_number || curr.phone_number,
                phone: meData.phone_number || curr.phone,
                address: meData.address || curr.address,
                dob: meData.dob || curr.dob,
                gender: meData.gender || curr.gender,
                university: meData.university || curr.university,
                major: meData.major || curr.major,
                academic_year: meData.academic_year || curr.academic_year,
                gpa: meData.gpa || curr.gpa,
              });
              saveSession({ access_token: data.access_token, user: next });
              return next;
            });
          }
        }).catch(() => {});

        return { ok: true, status, user: normalized };
      }
    } catch {
      // offline fallback
    }

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
      const enriched = enrichUserWithPersistedProfile(demoProfile);
      saveSession({ access_token: 'demo-enterprise-token', user: enriched });
      setUser(enriched);
      return { ok: true, status: 200, user: enriched };
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
      const updated = normalizeUserName({ ...prev, ...patch });
      if (updated.email) {
        const key = `ictu_user_profile_${updated.email.toLowerCase().trim()}`;
        try {
          const currentSaved = getPersistedUserProfile(updated.email) || {};
          const nextSaved = { ...currentSaved, ...updated };
          localStorage.setItem(key, JSON.stringify(nextSaved));
          localStorage.setItem('ictu_user_profile', JSON.stringify(nextSaved));
        } catch {}
      }
      saveSession({
        access_token: localStorage.getItem('access_token') || 'demo-enterprise-token',
        user: updated,
      });
      return updated;
    });
  }, []);

  const switchRole = useCallback(async (targetRole) => {
    const rawProfile = DEMO_PROFILES[targetRole] || DEMO_PROFILES.intern;
    const profile = enrichUserWithPersistedProfile(rawProfile);
    const existingToken = localStorage.getItem(`access_token_${targetRole}`);
    saveSession({
      access_token: existingToken || localStorage.getItem('access_token') || 'demo-enterprise-token',
      user: profile,
    });
    setUser(profile);
    const roleKey = targetRole;
    const freshToken = await acquireTokenForRole(roleKey);
    saveSession({
      access_token: freshToken || existingToken || localStorage.getItem('access_token') || 'demo-enterprise-token',
      user: profile,
    });
    return profile;
  }, []);

  useEffect(() => {
    const tk = localStorage.getItem('access_token');
    if (!tk || tk === 'demo-enterprise-token') {
      const currentRole = user?.email === 'ungvien@ictu.edu.vn' || user?.id === 7 ? 'applicant' : (user?.role || 'hr');
      acquireTokenForRole(currentRole).then((freshToken) => {
        if (freshToken && user) {
          saveSession({ access_token: freshToken, user });
        }
      }).catch(() => {});
    }
  }, [user]);

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
      const rawUser = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
        code: data.code,
        phone_number: data.phone_number,
        phone: data.phone_number,
        address: data.address,
        dob: data.dob,
        gender: data.gender,
        university: data.university,
        major: data.major,
        academic_year: data.academic_year,
        gpa: data.gpa,
      };
      const nextUser = enrichUserWithPersistedProfile(normalizeUserName(rawUser));
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
