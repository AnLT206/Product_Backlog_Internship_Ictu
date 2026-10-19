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
  admin: {
    id: 1,
    full_name: 'Quản trị viên Hệ thống (Admin)',
    code: 'AD0001',
    email: 'admin@ictu.edu.vn',
    role: 'admin',
    status: 'active',
  },
  hr: {
    id: 2,
    full_name: 'Trần Thị Mai (HR Manager)',
    code: 'HR0001',
    email: 'hr@ictu.edu.vn',
    role: 'hr',
    status: 'active',
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
  mentor1: {
    id: 3,
    full_name: 'Trần Hoàng Quân',
    code: 'MT0001',
    email: 'mentor@ictu.edu.vn',
    role: 'mentor',
    status: 'active',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
  },
  mentor2: {
    id: 4,
    full_name: 'Phạm Quốc Hướng',
    code: 'MT0002',
    email: 'mentor2@ictu.edu.vn',
    role: 'mentor',
    status: 'active',
    department: 'Kiểm thử chất lượng (QA/QC)',
  },
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
  tts1: {
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
  tts2: {
    id: 6,
    full_name: 'Lê Hoàng Nam',
    code: 'TTS0002',
    email: 'tts02@student.ictu.edu.vn',
    role: 'intern',
    status: 'active',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật phần mềm',
    phone: '0912.345.002',
    phone_number: '0912.345.002',
    cccd: '001203019877',
    address: 'Phường Tân Thịnh, TP. Thái Nguyên',
    bank_account: '999908123457',
    bank_name: 'Vietcombank',
  },
  tts3: {
    id: 8,
    full_name: 'Trần Thị Mai Phương',
    code: 'TTS0003',
    email: 'tts03@student.ictu.edu.vn',
    role: 'intern',
    status: 'active',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Hệ thống thông tin',
    phone: '0912.345.003',
    phone_number: '0912.345.003',
    cccd: '001203019878',
    address: 'Phường Hoàng Văn Thụ, TP. Thái Nguyên',
    bank_account: '999908123458',
    bank_name: 'BIDV',
  },
  tts4: {
    id: 9,
    full_name: 'Hoàng Minh Đức',
    code: 'TTS0004',
    email: 'tts04@student.ictu.edu.vn',
    role: 'intern',
    status: 'active',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'An toàn thông tin',
    phone: '0912.345.004',
    phone_number: '0912.345.004',
    cccd: '001203019879',
    address: 'Phường Phan Đình Phùng, TP. Thái Nguyên',
    bank_account: '999908123459',
    bank_name: 'Techcombank',
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
    // Đối với ứng viên (ungvien), TUYỆT ĐỐI không đọc fallback từ 'ictu_user_profile' (vốn là TTS 1 An)
    if (normalized.includes('ungvien')) {
      return null;
    }
    const legacyRaw = localStorage.getItem('ictu_user_profile');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.email && parsed.email.toLowerCase().trim() === normalized) {
          return parsed;
        }
      }
    }
  } catch {}
  return null;
}

export function enrichUserWithPersistedProfile(userObj) {
  if (!userObj) return userObj;
  const isCandidate =
    (userObj.email || '').toLowerCase().includes('ungvien') ||
    (userObj.code || '') === 'UV0001' ||
    userObj.status === 'pending' ||
    userObj.status === 'rejected' ||
    userObj.status === 'unsubmitted' ||
    userObj.profile_status === 'pending' ||
    userObj.profile_status === 'rejected' ||
    userObj.role === 'applicant';
  const persisted = getPersistedUserProfile(userObj.email);
  let resolvedStatus = userObj.status;
  let resolvedProfileStatus = userObj.profile_status || userObj.status;

  if (persisted?.status && !isCandidate) resolvedStatus = persisted.status;
  if (persisted?.profile_status && !isCandidate) resolvedProfileStatus = persisted.profile_status;

  if (userObj.profile_status === 'rejected' || userObj.status === 'rejected') {
    resolvedStatus = 'rejected';
    resolvedProfileStatus = 'rejected';
  } else if ((userObj.profile_status === 'pending' || userObj.status === 'pending') && isCandidate) {
    resolvedStatus = 'pending';
    resolvedProfileStatus = 'pending';
    try {
      localStorage.removeItem('applicant_decision_status');
    } catch {}
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

  // 1. Nếu tài khoản có trạng thái pending, rejected hoặc unsubmitted -> Luôn là Ứng viên (chưa duyệt / chưa chính thức)
  if (
    status === 'pending' ||
    status === 'rejected' ||
    status === 'unsubmitted' ||
    profileStatus === 'pending' ||
    profileStatus === 'rejected' ||
    role === 'applicant'
  ) {
    return true;
  }

  // 2. Nếu người dùng đã hoàn thành ký hợp đồng (onboarded), chắc chắn là Thực tập sinh chính thức
  if (typeof window !== 'undefined' && localStorage.getItem('applicant_onboarded') === 'true') {
    return false;
  }

  // 3. Các tài khoản TTS chính thức cụ thể (TTS0001 - TTS0004...) khi không bị pending/rejected
  if (code.startsWith('TTS') && code !== 'TTS9999') {
    return false;
  }
  if (
    email === 'intern@ictu.edu.vn' ||
    email.startsWith('tts') ||
    email.startsWith('an.nv') ||
    email.startsWith('nam.lh') ||
    email.startsWith('phuong.ttm') ||
    email.startsWith('duc.hm') ||
    email.startsWith('yen.vh')
  ) {
    return false;
  }

  // 4. Tài khoản định danh Ứng viên (ungvien@ictu.edu.vn hoặc UV0001 hoặc ID 7)
  if (
    email.includes('ungvien') ||
    code === 'UV0001' ||
    code === 'TTS9999' ||
    u.id === 7 ||
    name === 'nguyễn thu hà' ||
    name.includes('thu hà') ||
    name === 'ứng viên' ||
    name.includes('ứng viên')
  ) {
    if (status === 'active' && profileStatus !== 'rejected' && profileStatus !== 'pending') {
      return false;
    }
    return true;
  }

  // 5. Các tài khoản đã active / approved khác
  if (status === 'active' || status === 'approved' || profileStatus === 'approved') {
    return false;
  }

  return false;
}

export function normalizeUserName(u) {
  if (!u) return u;
  const clone = { ...u };
  const email = (clone.email || '').toLowerCase().trim();
  const code = (clone.code || '').toUpperCase().trim();
  const isCandidate =
    email.includes('ungvien') ||
    clone.id === 7 ||
    code === 'UV0001' ||
    clone.role === 'applicant' ||
    (clone.full_name && clone.full_name.toLowerCase().includes('thu hà'));

  if (isCandidate) {
    clone.role = 'intern';
    clone.code = 'UV0001';
    clone.email = 'ungvien@ictu.edu.vn';
    if (
      !clone.full_name ||
      clone.full_name.includes('HR') ||
      clone.full_name.includes('Trần Thị Mai') ||
      clone.full_name.includes('Admin')
    ) {
      clone.full_name = 'Nguyễn Thu Hà';
    }
    if (!clone.status) clone.status = 'pending';
    return clone;
  }

  // Mentor 2
  if (email === 'mentor2@ictu.edu.vn' || code === 'MT0002') {
    clone.role = 'mentor';
    clone.code = 'MT0002';
    if (!clone.full_name || clone.full_name === 'Mentor') {
      clone.full_name = 'Phạm Quốc Hướng';
    }
    return clone;
  }

  // Mentor 1
  if (email === 'mentor@ictu.edu.vn' || code === 'MT0001') {
    clone.role = 'mentor';
    clone.code = 'MT0001';
    if (!clone.full_name || clone.full_name === 'Mentor') {
      clone.full_name = 'Trần Hoàng Quân';
    }
    return clone;
  }

  // TTS 2
  if (email === 'tts02@student.ictu.edu.vn' || code === 'TTS0002') {
    clone.role = 'intern';
    clone.code = 'TTS0002';
    if (!clone.full_name) clone.full_name = 'Lê Hoàng Nam';
    return clone;
  }

  // TTS 3
  if (email === 'tts03@student.ictu.edu.vn' || code === 'TTS0003') {
    clone.role = 'intern';
    clone.code = 'TTS0003';
    if (!clone.full_name) clone.full_name = 'Trần Thị Mai Phương';
    return clone;
  }

  // TTS 4
  if (email === 'tts04@student.ictu.edu.vn' || code === 'TTS0004') {
    clone.role = 'intern';
    clone.code = 'TTS0004';
    if (!clone.full_name) clone.full_name = 'Hoàng Minh Đức';
    return clone;
  }

  // TTS 1
  if (email === 'intern@ictu.edu.vn' || code === 'TTS0001') {
    clone.role = 'intern';
    clone.code = 'TTS0001';
    if (!clone.full_name) clone.full_name = 'Nguyễn Văn An';
    return clone;
  }

  // HR
  if (email === 'hr@ictu.edu.vn' || code === 'HR0001' || clone.role === 'hr') {
    clone.role = 'hr';
    clone.code = 'HR0001';
    if (!clone.full_name || clone.full_name === 'HR') {
      clone.full_name = 'Trần Thị Mai (HR Manager)';
    }
    return clone;
  }

  // Admin
  if (email === 'admin@ictu.edu.vn' || code === 'AD0001' || clone.role === 'admin') {
    clone.role = 'admin';
    clone.code = 'AD0001';
    if (!clone.full_name || clone.full_name === 'Admin') {
      clone.full_name = 'Quản trị viên Hệ thống (Admin)';
    }
    return clone;
  }

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
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path === '/login' || path === '/register') {
      return null;
    }

    const stored = readStoredUser();
    if (stored) {
      const normalized = normalizeUserName(stored);
      const enriched = enrichUserWithPersistedProfile(normalized);
      const isApp = isApplicantUser(enriched);
      const roleKey = isApp ? 'applicant' : (enriched.role || 'intern');
      saveSession({
        access_token:
          stored.access_token ||
          (typeof window !== 'undefined' && window.sessionStorage ? sessionStorage.getItem(`access_token_${roleKey}`) || sessionStorage.getItem('access_token_current') : null) ||
          localStorage.getItem(`access_token_${roleKey}`) ||
          localStorage.getItem('access_token') ||
          'demo-enterprise-token',
        user: enriched,
      });
      return enriched;
    }
    // Default demo session: xác định đúng vai trò theo ngữ cảnh URL của tab hiện tại
    let demo;
    if (path.startsWith('/admin')) {
      demo = DEMO_PROFILES.admin;
    } else if (path.startsWith('/hr')) {
      demo = DEMO_PROFILES.hr;
    } else if (path.startsWith('/mentor')) {
      demo = DEMO_PROFILES.mentor;
    } else if (path.startsWith('/intern')) {
      const isApplicantUrl =
        path === '/intern/upload' ||
        (typeof window !== 'undefined' &&
          ((window.sessionStorage && sessionStorage.getItem('last_portal_intern_role') === 'applicant') ||
            localStorage.getItem('last_portal_intern_role') === 'applicant'));
      demo = isApplicantUrl ? DEMO_PROFILES.applicant : DEMO_PROFILES.intern;
    } else {
      // Các trang công khai (/, /login, /register...) không tự động khởi tạo phiên
      return null;
    }
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
              const isCandidate = (curr.email || '').toLowerCase().includes('ungvien') || curr.id === 7 || curr.code === 'UV0001';
              const next = enrichUserWithPersistedProfile({
                ...curr,
                full_name: isCandidate ? 'Nguyễn Thu Hà' : (meData.full_name || curr.full_name),
                code: isCandidate ? 'UV0001' : (meData.code || curr.code),
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
    } else if (normalizedEmail.includes('tts02')) {
      demoProfile = DEMO_PROFILES.tts2;
    } else if (normalizedEmail.includes('tts03')) {
      demoProfile = DEMO_PROFILES.tts3;
    } else if (normalizedEmail.includes('tts04')) {
      demoProfile = DEMO_PROFILES.tts4;
    } else if (normalizedEmail.includes('intern') || normalizedEmail.includes('an.nv')) {
      demoProfile = DEMO_PROFILES.intern;
    } else if (normalizedEmail.includes('mentor2')) {
      demoProfile = DEMO_PROFILES.mentor2;
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
    const isApp = isApplicantUser(user);
    const roleKey = isApp ? 'applicant' : (user?.role || 'intern');
    const tk = localStorage.getItem(`access_token_${roleKey}`) || localStorage.getItem('access_token');
    if (!tk || tk === 'demo-enterprise-token') {
      acquireTokenForRole(roleKey).then((freshToken) => {
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
