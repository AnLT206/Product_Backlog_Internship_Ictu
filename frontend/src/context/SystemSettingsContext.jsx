import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPublicSettings } from '../api/admin';

const DEFAULT_SETTINGS = {
  system_name: 'Hệ thống Quản lý Tuyển dụng & Đào tạo Thực tập sinh ICTU',
  organization_name: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
  contact_email: 'admin@ictu.edu.vn',
  current_semester: 'Q3/2026',
  default_intern_allowance: '2500000',
  standard_work_days: '22',
  weekly_report_deadline: 'Chủ nhật (23:59)',
  allow_public_registration: true,
  maintenance_mode: false,
  sso_enabled: true,
  max_upload_size_mb: '10',
};

const STORAGE_KEY = 'ictu_system_settings_cache';

const SystemSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
  updateLocalSettings: () => {},
});

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublicSettings();
      if (res.ok && res.data) {
        const merged = { ...DEFAULT_SETTINGS, ...res.data };
        setSettings(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (err) {
      console.error('Không thể tải cấu hình tham số hệ thống:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLocalSettings = useCallback((newSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    fetchSettings();

    function handleSettingsEvent(e) {
      if (e.detail) {
        updateLocalSettings(e.detail);
      } else {
        fetchSettings();
      }
    }

    function handleStorageEvent(e) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('system_settings_updated', handleSettingsEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('system_settings_updated', handleSettingsEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [fetchSettings, updateLocalSettings]);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
        updateLocalSettings,
      }}
    >
      {/* Maintenance Mode Banner */}
      {settings.maintenance_mode && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            borderBottom: '1px solid #FECACA',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'sticky',
            top: 0,
            zIndex: 99999,
          }}
        >
          <span>⚠️ CHẾ ĐỘ BẢO TRÌ ĐANG BẬT: Hệ thống đang tạm thời hạn chế thay đổi để bảo vệ an toàn dữ liệu.</span>
        </div>
      )}
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SystemSettingsContext);
}
