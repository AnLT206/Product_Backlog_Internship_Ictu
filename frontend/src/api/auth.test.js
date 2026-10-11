import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, readStoredUser, clearSession } from './auth';
import { isApplicantUser } from '../context/AuthContext';

describe('auth.js and multi-tab session isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete window.location;
    window.location = { pathname: '/' };
  });

  it('saves and reads role-scoped sessions correctly', () => {
    const hrUser = { id: 2, email: 'hr@ictu.edu.vn', role: 'hr' };
    saveSession({ access_token: 'hr-token', user: hrUser });

    expect(localStorage.getItem('auth_user_hr')).toBeTruthy();
    expect(localStorage.getItem('access_token_hr')).toBe('hr-token');

    window.location.pathname = '/hr/interns';
    expect(readStoredUser()).toEqual(hrUser);
  });

  it('isolates applicant session from HR session during multi-tab testing', () => {
    const applicantUser = {
      id: 7,
      email: 'ungvien@ictu.edu.vn',
      code: 'UV0001',
      full_name: 'Nguyễn Thu Hà',
      role: 'intern',
      status: 'rejected',
    };
    saveSession({ access_token: 'app-token', user: applicantUser });

    // Sau đó ở tab HR, người dùng đăng nhập HR và ghi đè auth_user trong localStorage
    const hrUser = { id: 2, email: 'hr@ictu.edu.vn', role: 'hr' };
    localStorage.setItem('auth_user', JSON.stringify(hrUser));

    // Ở tab Ứng viên (/intern/profile), khi F5, readStoredUser PHẢI lấy đúng applicantUser, không được lấy HR!
    window.location.pathname = '/intern/profile';
    const restoredUser = readStoredUser();
    expect(restoredUser.email).toBe('ungvien@ictu.edu.vn');
    expect(restoredUser.code).toBe('UV0001');
    expect(isApplicantUser(restoredUser)).toBe(true);
  });

  it('isolates Admin portal on F5 reload even if HR/Intern was written to localStorage', () => {
    const adminUser = {
      id: 1,
      email: 'admin@ictu.edu.vn',
      code: 'AD0001',
      full_name: 'Quản trị viên Hệ thống (Admin)',
      role: 'admin',
    };
    saveSession({ access_token: 'admin-token', user: adminUser });

    // Tab khác ghi đè localStorage.auth_user thành HR
    localStorage.setItem('auth_user', JSON.stringify({ id: 2, email: 'hr@ictu.edu.vn', role: 'hr' }));

    window.location.pathname = '/admin/dashboard';
    const restored = readStoredUser();
    expect(restored.role).toBe('admin');
    expect(restored.email).toBe('admin@ictu.edu.vn');
    expect(restored.code).toBe('AD0001');
  });

  it('isolates HR portal on F5 reload even if Admin was written to localStorage', () => {
    const hrUser = {
      id: 2,
      email: 'hr@ictu.edu.vn',
      code: 'HR0001',
      full_name: 'Trần Thị Mai (HR Manager)',
      role: 'hr',
    };
    saveSession({ access_token: 'hr-token', user: hrUser });

    // Tab khác ghi đè localStorage.auth_user thành Admin
    localStorage.setItem('auth_user', JSON.stringify({ id: 1, email: 'admin@ictu.edu.vn', role: 'admin' }));

    window.location.pathname = '/hr/dashboard';
    const restored = readStoredUser();
    expect(restored.role).toBe('hr');
    expect(restored.email).toBe('hr@ictu.edu.vn');
    expect(restored.code).toBe('HR0001');
  });

  it('isolates Mentor 1 and Mentor 2 independently between tabs on F5 reload', () => {
    const mentor1 = {
      id: 3,
      email: 'mentor@ictu.edu.vn',
      code: 'MT0001',
      full_name: 'Trần Hoàng Quân',
      role: 'mentor',
    };
    const mentor2 = {
      id: 4,
      email: 'mentor2@ictu.edu.vn',
      code: 'MT0002',
      full_name: 'Phạm Quốc Hướng',
      role: 'mentor',
    };

    // Tab A: Mentor 1
    sessionStorage.setItem('auth_user_current', JSON.stringify(mentor1));
    window.location.pathname = '/mentor/dashboard';
    expect(readStoredUser()).toEqual(mentor1);

    // Tab B: Mentor 2 (giả lập tab khác với sessionStorage riêng)
    sessionStorage.setItem('auth_user_current', JSON.stringify(mentor2));
    window.location.pathname = '/mentor/dashboard';
    expect(readStoredUser()).toEqual(mentor2);

    // Không bao giờ để HR hay Admin lọt vào /mentor/*
    sessionStorage.clear();
    localStorage.setItem('auth_user', JSON.stringify({ id: 1, email: 'admin@ictu.edu.vn', role: 'admin' }));
    const fallbackMentor = readStoredUser();
    expect(fallbackMentor.role).toBe('mentor');
    expect(fallbackMentor.code).toBe('MT0001');
  });

  it('isolates distinct TTS accounts (TTS 1, 2, 3, 4) on F5 reload', () => {
    const tts1 = { id: 5, code: 'TTS0001', email: 'intern@ictu.edu.vn', role: 'intern', full_name: 'Nguyễn Văn An' };
    const tts2 = { id: 6, code: 'TTS0002', email: 'tts02@student.ictu.edu.vn', role: 'intern', full_name: 'Lê Hoàng Nam' };
    const tts3 = { id: 8, code: 'TTS0003', email: 'tts03@student.ictu.edu.vn', role: 'intern', full_name: 'Trần Thị Mai Phương' };
    const tts4 = { id: 9, code: 'TTS0004', email: 'tts04@student.ictu.edu.vn', role: 'intern', full_name: 'Hoàng Minh Đức' };

    window.location.pathname = '/intern/dashboard';

    // Tab TTS 1
    sessionStorage.setItem('auth_user_current', JSON.stringify(tts1));
    expect(readStoredUser()).toEqual(tts1);

    // Tab TTS 2
    sessionStorage.setItem('auth_user_current', JSON.stringify(tts2));
    expect(readStoredUser()).toEqual(tts2);

    // Tab TTS 3
    sessionStorage.setItem('auth_user_current', JSON.stringify(tts3));
    expect(readStoredUser()).toEqual(tts3);

    // Tab TTS 4
    sessionStorage.setItem('auth_user_current', JSON.stringify(tts4));
    expect(readStoredUser()).toEqual(tts4);

    // Không bao giờ để HR hay Admin lọt vào /intern/*
    sessionStorage.clear();
    localStorage.setItem('auth_user', JSON.stringify({ id: 2, email: 'hr@ictu.edu.vn', role: 'hr' }));
    const fallbackIntern = readStoredUser();
    expect(fallbackIntern.role).toBe('intern');
    expect(fallbackIntern.code).toBe('TTS0001');
    expect(fallbackIntern.email).toBe('intern@ictu.edu.vn');
  });

  it('correctly evaluates isApplicantUser for various accounts', () => {
    const applicant = { email: 'ungvien@ictu.edu.vn', code: 'UV0001', role: 'intern', status: 'pending' };
    const rejectedApplicant = { email: 'ungvien@ictu.edu.vn', code: 'UV0001', role: 'intern', status: 'rejected' };
    const officialIntern = { email: 'intern@ictu.edu.vn', code: 'TTS0001', role: 'intern', status: 'active' };
    const tts2 = { email: 'tts02@student.ictu.edu.vn', code: 'TTS0002', role: 'intern', status: 'active' };
    const hr = { email: 'hr@ictu.edu.vn', code: 'HR0001', role: 'hr', status: 'active' };

    expect(isApplicantUser(applicant)).toBe(true);
    expect(isApplicantUser(rejectedApplicant)).toBe(true);
    expect(isApplicantUser(officialIntern)).toBe(false);
    expect(isApplicantUser(tts2)).toBe(false);
    expect(isApplicantUser(hr)).toBe(false);
  });
});

