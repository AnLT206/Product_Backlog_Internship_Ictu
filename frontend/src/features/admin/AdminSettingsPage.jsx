import { useState, useEffect } from 'react';
import {
  Sliders,
  Shield,
  KeyRound,
  Building,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Server,
  Zap,
} from 'lucide-react';
import {
  getSystemSettings,
  updateSystemSettings,
  testLdapConnection,
  testHrmConnection,
} from '../../api/admin';
import './AdminSettingsPage.css';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Test connection states
  const [ldapTesting, setLdapTesting] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState(null);
  const [hrmTesting, setHrmTesting] = useState(false);
  const [hrmTestResult, setHrmTestResult] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Load settings from backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await getSystemSettings();
        if (isMounted && res.ok && res.data?.flat) {
          setSettings(res.data.flat);
          setInitialSettings(res.data.flat);
        }
      } catch (err) {
        console.error('Lỗi khi tải tham số hệ thống:', err);
        if (isMounted) showToast('Không thể tải cấu hình tham số từ máy chủ.', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  function handleChange(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleReset() {
    setSettings(initialSettings);
    showToast('Đã phục hồi các tham số về trạng thái đã lưu gần nhất.', 'info');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateSystemSettings(settings);
      if (res.ok && res.data?.flat) {
        setSettings(res.data.flat);
        setInitialSettings(res.data.flat);
        showToast('Đã lưu toàn bộ cấu hình tham số hệ thống thành công!', 'success');
      } else {
        showToast(res.data?.detail || 'Không thể lưu tham số hệ thống.', 'error');
      }
    } catch {
      showToast('Đã xảy ra lỗi khi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Test LDAP Connection
  async function handleTestLdap() {
    setLdapTesting(true);
    setLdapTestResult(null);
    try {
      const res = await testLdapConnection({
        ldap_server_url: settings.ldap_server_url,
        ldap_base_dn: settings.ldap_base_dn,
      });
      if (res.ok && res.data) {
        setLdapTestResult(res.data);
      } else {
        setLdapTestResult({
          success: false,
          service: 'LDAP Test',
          latency_ms: 0,
          message: 'Không thể kết nối tới máy chủ Active Directory.',
        });
      }
    } catch {
      setLdapTestResult({
        success: false,
        service: 'LDAP Test',
        latency_ms: 0,
        message: 'Lỗi mạng khi kiểm tra kết nối LDAP.',
      });
    } finally {
      setLdapTesting(false);
    }
  }

  // Test HRM Connection
  async function handleTestHrm() {
    setHrmTesting(true);
    setHrmTestResult(null);
    try {
      const res = await testHrmConnection();
      if (res.ok && res.data) {
        setHrmTestResult(res.data);
      } else {
        setHrmTestResult({
          success: false,
          service: 'HRM Sync',
          latency_ms: 0,
          message: 'Không thể phản hồi từ cổng HRM đối tác.',
        });
      }
    } catch {
      setHrmTestResult({
        success: false,
        service: 'HRM Sync',
        latency_ms: 0,
        message: 'Lỗi kết nối tới endpoint HRM.',
      });
    } finally {
      setHrmTesting(false);
    }
  }

  const TABS = [
    { id: 'general', label: 'Cấu hình Chung', icon: Sliders },
    { id: 'sso_ldap', label: 'Xác thực SSO & LDAP', icon: KeyRound },
    { id: 'security', label: 'Bảo mật & Phiên làm việc', icon: Shield },
    { id: 'integration', label: 'Tích hợp HRM & Chấm công', icon: Building },
  ];

  if (loading) {
    return (
      <div className="admin-settings-page">
        <div className="settings-loading-card">
          <div className="settings-spinner" />
          <span>Đang tải tham số hệ thống & SSO/LDAP...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`settings-toast toast--${toast.type}`} role="alert">
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="toast-icon" />
          ) : (
            <CheckCircle2 size={18} className="toast-icon" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="settings-header">
        <div className="settings-header__title-area">
          <div className="settings-header__badge">
            <Zap size={13} />
            HỆ THỐNG & KẾT NỐI
          </div>
          <h1>
            Cấu hình Tham số & <span>SSO/LDAP</span>
          </h1>
          <p className="settings-header__desc">
            Quản trị các thông số vận hành cốt lõi, chính sách định danh SSO tập trung, máy chủ Active Directory và liên kết hệ sinh thái ICTU.
          </p>
        </div>

        <div className="settings-header__actions">
          {isDirty && (
            <span className="dirty-badge">
              ● Có thay đổi chưa lưu
            </span>
          )}
          <button
            type="button"
            className="btn-settings-reset"
            onClick={handleReset}
            disabled={saving || !isDirty}
            title="Khôi phục trạng thái đã lưu"
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>
          <button
            type="button"
            className="btn-settings-save"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="settings-tabs-nav">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="settings-content-card">
        {/* ── TAB 1: CẤU HÌNH CHUNG ── */}
        {activeTab === 'general' && (
          <div className="settings-panel">
            <div className="panel-intro">
              <h3>Thông tin Cổng Thông tin & Tham số Thực tập</h3>
              <p>Các thiết lập hiển thị giao diện, mức phụ cấp và chu kỳ làm việc tiêu chuẩn áp dụng cho toàn hệ thống.</p>
            </div>

            <div className="settings-grid">
              <div className="form-group span-2">
                <label>Tên hệ thống hiển thị chính thức</label>
                <input
                  type="text"
                  value={settings.system_name || ''}
                  onChange={(e) => handleChange('system_name', e.target.value)}
                  className="settings-input"
                  placeholder="Hệ thống Quản lý Tuyển dụng & Đào tạo Thực tập sinh ICTU"
                />
                <span className="field-hint">Hiển thị ở tiêu đề trang, logo thương hiệu và email gửi tự động.</span>
              </div>

              <div className="form-group span-2">
                <label>Đơn vị chủ quản & Quản lý vận hành</label>
                <input
                  type="text"
                  value={settings.organization_name || ''}
                  onChange={(e) => handleChange('organization_name', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label>Hòm thư hỗ trợ kỹ thuật (Contact Email)</label>
                <input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label>Kỳ / Đợt thực tập mặc định hiện tại</label>
                <input
                  type="text"
                  value={settings.current_semester || ''}
                  onChange={(e) => handleChange('current_semester', e.target.value)}
                  className="settings-input"
                  placeholder="Q3/2026"
                />
              </div>

              <div className="form-group">
                <label>Phụ cấp cơ sở hàng tháng (VNĐ / TTS)</label>
                <input
                  type="number"
                  value={settings.default_intern_allowance || ''}
                  onChange={(e) => handleChange('default_intern_allowance', e.target.value)}
                  className="settings-input"
                  step="50000"
                />
                <span className="field-hint">Mức hưởng chuẩn áp dụng cho thực tập sinh đạt đủ ngày công.</span>
              </div>

              <div className="form-group">
                <label>Số ngày công tiêu chuẩn hàng tháng</label>
                <input
                  type="number"
                  value={settings.standard_work_days || '22'}
                  onChange={(e) => handleChange('standard_work_days', e.target.value)}
                  className="settings-input"
                  min="15"
                  max="31"
                />
              </div>

              <div className="form-group">
                <label>Hạn chót nộp báo cáo tuần của TTS</label>
                <input
                  type="text"
                  value={settings.weekly_report_deadline || ''}
                  onChange={(e) => handleChange('weekly_report_deadline', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label>Dung lượng tệp tài liệu tối đa (MB)</label>
                <input
                  type="number"
                  value={settings.max_upload_size_mb || '10'}
                  onChange={(e) => handleChange('max_upload_size_mb', e.target.value)}
                  className="settings-input"
                  min="2"
                  max="50"
                />
              </div>

              <div className="form-group span-2 toggle-row">
                <div className="toggle-info">
                  <strong>Mở cổng tiếp nhận ứng viên đăng ký tự do</strong>
                  <p>Cho phép sinh viên tự tạo tài khoản và nộp CV từ trang chủ mà không cần tạo trước tài khoản nội bộ.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.allow_public_registration === 'true'}
                    onChange={(e) =>
                      handleChange('allow_public_registration', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SSO & LDAP ── */}
        {activeTab === 'sso_ldap' && (
          <div className="settings-panel">
            <div className="panel-intro">
              <h3>Định danh Tập trung Single Sign-On & Máy chủ Thư mục LDAP</h3>
              <p>Tích hợp hệ thống tài khoản nhà trường, SAML 2.0 / Keycloak và Active Directory cho cán bộ & sinh viên.</p>
            </div>

            <div className="settings-grid">
              {/* Section 1: SSO */}
              <div className="form-group span-2 toggle-row banner-toggle">
                <div className="toggle-info">
                  <div className="badge-tag">SAML 2.0 / OpenID Connect</div>
                  <strong>Kích hoạt ICTU Single Sign-On (SSO)</strong>
                  <p>Bật tính năng xác thực tập trung một chạm cho người dùng có tài khoản @ictu.edu.vn.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.sso_enabled === 'true'}
                    onChange={(e) =>
                      handleChange('sso_enabled', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="form-group span-2">
                <label>Nhà cung cấp danh tính (IdP Provider)</label>
                <input
                  type="text"
                  value={settings.sso_provider || ''}
                  onChange={(e) => handleChange('sso_provider', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label>SSO Issuer URL / Realm Endpoint</label>
                <input
                  type="text"
                  value={settings.sso_issuer_url || ''}
                  onChange={(e) => handleChange('sso_issuer_url', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="form-group">
                <label>Client ID định danh ứng dụng</label>
                <input
                  type="text"
                  value={settings.sso_client_id || ''}
                  onChange={(e) => handleChange('sso_client_id', e.target.value)}
                  className="settings-input"
                />
              </div>

              <div className="section-divider span-2" />

              {/* Section 2: LDAP */}
              <div className="form-group span-2 toggle-row banner-toggle">
                <div className="toggle-info">
                  <div className="badge-tag badge-tag--green">Active Directory / LDAP</div>
                  <strong>Đồng bộ người dùng qua máy chủ Active Directory (LDAP)</strong>
                  <p>Tự động đồng bộ vai trò, chức vụ và phòng ban của cán bộ nhân viên từ máy chủ thư mục trường.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.ldap_enabled === 'true'}
                    onChange={(e) =>
                      handleChange('ldap_enabled', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="form-group">
                <label>Địa chỉ máy chủ LDAP Server (Host & Port)</label>
                <input
                  type="text"
                  value={settings.ldap_server_url || ''}
                  onChange={(e) => handleChange('ldap_server_url', e.target.value)}
                  className="settings-input"
                  placeholder="ldap://ad.ictu.edu.vn:389"
                />
              </div>

              <div className="form-group">
                <label>LDAP Base DN (Nhánh thư mục gốc)</label>
                <input
                  type="text"
                  value={settings.ldap_base_dn || ''}
                  onChange={(e) => handleChange('ldap_base_dn', e.target.value)}
                  className="settings-input"
                  placeholder="DC=ictu,DC=edu,DC=vn"
                />
              </div>

              <div className="form-group span-2">
                <label>LDAP Bind DN (Tài khoản dịch vụ đồng bộ)</label>
                <input
                  type="text"
                  value={settings.ldap_bind_dn || ''}
                  onChange={(e) => handleChange('ldap_bind_dn', e.target.value)}
                  className="settings-input"
                  placeholder="CN=InternshipSync,OU=Services,DC=ictu,DC=edu,DC=vn"
                />
              </div>

              <div className="form-group span-2">
                <label>Tên miền email được phép đăng nhập (Domain Whitelist)</label>
                <input
                  type="text"
                  value={settings.allowed_email_domains || ''}
                  onChange={(e) => handleChange('allowed_email_domains', e.target.value)}
                  className="settings-input"
                  placeholder="ictu.edu.vn, student.ictu.edu.vn"
                />
              </div>

              {/* Test Connection Box */}
              <div className="test-conn-box span-2">
                <div className="test-conn-box__left">
                  <Wifi size={22} className="test-conn-icon" />
                  <div>
                    <strong>Kiểm tra thông tuyến máy chủ LDAP / Active Directory</strong>
                    <p>Thực hiện gửi gói tin kiểm tra ping và xác thực giao thức LDAP tới máy chủ nội bộ.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-test-conn"
                  onClick={handleTestLdap}
                  disabled={ldapTesting}
                >
                  {ldapTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối LDAP'}
                </button>
              </div>

              {ldapTestResult && (
                <div
                  className={`test-result-card span-2 ${
                    ldapTestResult.success ? 'is-success' : 'is-failed'
                  }`}
                >
                  <div className="test-result-header">
                    {ldapTestResult.success ? (
                      <CheckCircle2 size={18} className="text-success" />
                    ) : (
                      <AlertCircle size={18} className="text-danger" />
                    )}
                    <strong>{ldapTestResult.message}</strong>
                    <span className="latency-badge">{ldapTestResult.latency_ms} ms</span>
                  </div>
                  {ldapTestResult.details && (
                    <div className="test-result-details">
                      {Object.entries(ldapTestResult.details).map(([k, v]) => (
                        <div key={k} className="detail-item">
                          <span className="detail-key">{k}:</span>
                          <span className="detail-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: BẢO MẬT & PHIÊN ── */}
        {activeTab === 'security' && (
          <div className="settings-panel">
            <div className="panel-intro">
              <h3>Chính sách Bảo mật & Thời hạn Phiên làm việc</h3>
              <p>Thiết lập thời gian hết hạn Token JWT, quy tắc phòng chống tấn công brute-force và nhật ký truy vết.</p>
            </div>

            <div className="settings-grid">
              <div className="form-group">
                <label>Thời hạn phiên Access Token (Phút)</label>
                <input
                  type="number"
                  value={settings.jwt_access_expire_minutes || '60'}
                  onChange={(e) => handleChange('jwt_access_expire_minutes', e.target.value)}
                  className="settings-input"
                  min="5"
                  max="1440"
                />
                <span className="field-hint">Khuyến nghị: 60 phút để đảm bảo cân bằng bảo mật.</span>
              </div>

              <div className="form-group">
                <label>Thời hạn duy trì Refresh Token (Ngày)</label>
                <input
                  type="number"
                  value={settings.jwt_refresh_expire_days || '7'}
                  onChange={(e) => handleChange('jwt_refresh_expire_days', e.target.value)}
                  className="settings-input"
                  min="1"
                  max="90"
                />
                <span className="field-hint">Thời gian tối đa lưu trạng thái "Ghi nhớ đăng nhập".</span>
              </div>

              <div className="form-group">
                <label>Số lần đăng nhập sai tối đa trước khi tạm khóa</label>
                <input
                  type="number"
                  value={settings.max_login_attempts || '5'}
                  onChange={(e) => handleChange('max_login_attempts', e.target.value)}
                  className="settings-input"
                  min="3"
                  max="10"
                />
                <span className="field-hint">Khóa tài khoản 15 phút nếu vượt quá ngưỡng này.</span>
              </div>

              <div className="form-group span-2 toggle-row">
                <div className="toggle-info">
                  <strong>Bắt buộc mật khẩu độ phức tạp cao</strong>
                  <p>Yêu cầu tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.enforce_strong_password === 'true'}
                    onChange={(e) =>
                      handleChange('enforce_strong_password', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="form-group span-2 toggle-row">
                <div className="toggle-info">
                  <strong>Ghi nhận nhật ký truy vết chi tiết (System Audit Log)</strong>
                  <p>Tự động ghi vết IP truy cập, thiết bị và các hành động sửa/xóa dữ liệu nhạy cảm vào bảng kiểm toán.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.enable_audit_logging === 'true'}
                    onChange={(e) =>
                      handleChange('enable_audit_logging', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: TÍCH HỢP HRM & CHẤM CÔNG ── */}
        {activeTab === 'integration' && (
          <div className="settings-panel">
            <div className="panel-intro">
              <h3>Tích hợp Hệ thống HRM Doanh nghiệp & Thiết bị Chấm công</h3>
              <p>Kết nối cổng đồng bộ dữ liệu nhân sự thực tập sinh và máy chấm công tự động (US 37 & 38).</p>
            </div>

            <div className="settings-grid">
              <div className="form-group span-2 toggle-row banner-toggle">
                <div className="toggle-info">
                  <div className="badge-tag badge-tag--purple">HRM Gateway REST API</div>
                  <strong>Đồng bộ hồ sơ TTS sang hệ thống HRM Doanh nghiệp đối tác</strong>
                  <p>Khi HR phê duyệt ứng viên vào kỳ thực tập, hồ sơ được tự động đồng bộ sang cổng nhân sự ngoài.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.hrm_integration_enabled === 'true'}
                    onChange={(e) =>
                      handleChange('hrm_integration_enabled', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="form-group span-2">
                <label>HRM Webhook / API Endpoint URL</label>
                <input
                  type="url"
                  value={settings.hrm_api_endpoint || ''}
                  onChange={(e) => handleChange('hrm_api_endpoint', e.target.value)}
                  className="settings-input"
                  placeholder="https://hrm.ictu.edu.vn/api/v1/interns/sync"
                />
              </div>

              <div className="form-group span-2 toggle-row">
                <div className="toggle-info">
                  <strong>Tự động nhận dữ liệu từ máy chấm công vân tay / QR Code</strong>
                  <p>Hệ thống tự động lắng nghe và cập nhật lượt check-in/check-out của TTS vào bảng công hàng tháng.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={settings.attendance_device_sync === 'true'}
                    onChange={(e) =>
                      handleChange('attendance_device_sync', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {/* Test HRM Button */}
              <div className="test-conn-box span-2">
                <div className="test-conn-box__left">
                  <Server size={22} className="test-conn-icon" />
                  <div>
                    <strong>Kiểm tra tín hiệu cổng HRM đối tác</strong>
                    <p>Gửi gói tin ping kiểm tra tính sẵn sàng của endpoint webhook.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-test-conn"
                  onClick={handleTestHrm}
                  disabled={hrmTesting}
                >
                  {hrmTesting ? 'Đang kiểm tra...' : 'Kiểm tra đồng bộ HRM'}
                </button>
              </div>

              {hrmTestResult && (
                <div
                  className={`test-result-card span-2 ${
                    hrmTestResult.success ? 'is-success' : 'is-failed'
                  }`}
                >
                  <div className="test-result-header">
                    <CheckCircle2 size={18} className="text-success" />
                    <strong>{hrmTestResult.message}</strong>
                    <span className="latency-badge">{hrmTestResult.latency_ms} ms</span>
                  </div>
                  {hrmTestResult.details && (
                    <div className="test-result-details">
                      {Object.entries(hrmTestResult.details).map(([k, v]) => (
                        <div key={k} className="detail-item">
                          <span className="detail-key">{k}:</span>
                          <span className="detail-val">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
