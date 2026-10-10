import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, readStoredUser, clearSession } from './auth';
import { isApplicantUser } from '../context/AuthContext';

describe('auth.js and multi-tab session isolation', () => {
  beforeEach(() => {
    localStorage.clear();
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

    // Sau đó ở tab HR, người dùng đăng nhập HR và ghi đè auth_user
    const hrUser = { id: 2, email: 'hr@ictu.edu.vn', role: 'hr' };
    saveSession({ access_token: 'hr-token', user: hrUser });

    // Ở tab Ứng viên (/intern/profile), khi F5, readStoredUser PHẢI lấy đúng applicantUser, không được lấy HR!
    window.location.pathname = '/intern/profile';
    const restoredUser = readStoredUser();
    expect(restoredUser.email).toBe('ungvien@ictu.edu.vn');
    expect(restoredUser.code).toBe('UV0001');
    expect(isApplicantUser(restoredUser)).toBe(true);
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
