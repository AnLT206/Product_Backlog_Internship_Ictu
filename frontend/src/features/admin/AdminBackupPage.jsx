import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  HardDrive,
  Clock,
  Calendar,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCode,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  updateBackupSchedule,
} from '../../api/admin';
import './AdminBackupPage.css';

export default function AdminBackupPage() {
  const [data, setData] = useState({
    items: [],
    total_backups: 0,
    total_size_formatted: '0 B',
    last_backup_at: null,
    schedule: {
      auto_backup_enabled: true,
      frequency: 'daily',
      retention_days: 30,
      next_scheduled_run: '02:00 AM ngày mai',
    },
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    backup_type: 'full',
    note: '',
  });

  const [restoreModalItem, setRestoreModalItem] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    auto_backup_enabled: true,
    frequency: 'daily',
    retention_days: 30,
  });

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Load backups list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBackups();
      if (res.ok && res.data) {
        setData(res.data);
        if (res.data.schedule) {
          setScheduleForm({
            auto_backup_enabled: res.data.schedule.auto_backup_enabled ?? true,
            frequency: res.data.schedule.frequency || 'daily',
            retention_days: res.data.schedule.retention_days || 30,
          });
        }
      } else {
        showToast('Không thể tải danh sách bản sao lưu.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi tải bản sao lưu:', err);
      showToast('Lỗi mạng khi tải dữ liệu sao lưu.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Backup
  async function handleCreateBackup() {
    setCreating(true);
    try {
      const res = await createBackup(createForm);
      if (res.ok) {
        showToast('Đã tạo bản sao lưu dữ liệu mới thành công!', 'success');
        setCreateModalOpen(false);
        setCreateForm({ backup_type: 'full', note: '' });
        await loadData();
      } else {
        showToast(res.data?.detail || 'Không thể tạo bản sao lưu.', 'error');
      }
    } catch {
      showToast('Đã xảy ra lỗi khi tạo bản sao lưu.', 'error');
    } finally {
      setCreating(false);
    }
  }

  // Handle Restore
  async function handleConfirmRestore() {
    if (!restoreModalItem) return;
    setRestoring(true);
    try {
      const res = await restoreBackup(restoreModalItem.id);
      if (res.ok) {
        showToast(
          res.data?.detail || `Đã khôi phục cơ sở dữ liệu thành công từ tệp ${restoreModalItem.filename}!`,
          'success'
        );
        setRestoreModalItem(null);
        setConfirmText('');
        await loadData();
      } else {
        showToast(res.data?.detail || 'Không thể khôi phục bản sao lưu.', 'error');
      }
    } catch {
      showToast('Đã xảy ra lỗi trong quá trình khôi phục.', 'error');
    } finally {
      setRestoring(false);
    }
  }

  // Handle Delete
  async function handleDelete(item) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản sao lưu "${item.filename}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      const res = await deleteBackup(item.id);
      if (res.ok) {
        showToast('Đã xóa bản sao lưu thành công.', 'success');
        await loadData();
      } else {
        showToast(res.data?.detail || 'Không thể xóa bản sao lưu.', 'error');
      }
    } catch {
      showToast('Lỗi mạng khi xóa bản sao lưu.', 'error');
    }
  }

  // Handle Download file
  function handleDownload(item) {
    const token = localStorage.getItem('token');
    const downloadUrl = `/api/admin/backups/${item.id}/download`;
    
    // Tạo link tải an toàn kèm Bearer token qua fetch blob
    fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast(`Đang tải xuống tệp ${item.filename}...`, 'info');
      })
      .catch(() => {
        showToast('Không thể tải tệp sao lưu.', 'error');
      });
  }

  // Handle Save Schedule
  async function handleSaveSchedule() {
    setSavingSchedule(true);
    try {
      const res = await updateBackupSchedule(scheduleForm);
      if (res.ok) {
        showToast('Cập nhật cấu hình lịch tự động sao lưu thành công!', 'success');
        setScheduleModalOpen(false);
        await loadData();
      } else {
        showToast('Không thể lưu cấu hình lịch sao lưu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi lưu lịch sao lưu.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  }

  function formatDateTime(dtStr) {
    if (!dtStr) return '—';
    const d = new Date(dtStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function renderTypeBadge(type) {
    switch (type) {
      case 'full':
        return <span className="type-badge badge--full">Toàn phần (Full)</span>;
      case 'data_only':
        return <span className="type-badge badge--data">Dữ liệu (Data)</span>;
      case 'schema_only':
        return <span className="type-badge badge--schema">Cấu trúc (Schema)</span>;
      default:
        return <span className="type-badge">{type}</span>;
    }
  }

  return (
    <div className="admin-backup-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`backup-toast toast--${toast.type}`} role="alert">
          {toast.type === 'error' ? (
            <AlertCircle size={18} className="toast-icon" />
          ) : (
            <CheckCircle2 size={18} className="toast-icon" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="backup-header">
        <div className="backup-header__title-area">
          <div className="backup-header__badge">
            <Database size={13} />
            DEVSECOPS & AN TOÀN DỮ LIỆU
          </div>
          <h1>
            Sao lưu & Khôi phục <span>Dữ liệu</span>
          </h1>
          <p className="backup-header__desc">
            Quản lý các snapshot sao lưu cơ sở dữ liệu định kỳ, khôi phục an toàn hệ thống và thiết lập chu kỳ lưu trữ tự động (US 41).
          </p>
        </div>

        <div className="backup-header__actions">
          <button
            type="button"
            className="btn-backup-schedule"
            onClick={() => setScheduleModalOpen(true)}
          >
            <Settings size={15} />
            Lịch tự động
          </button>
          <button
            type="button"
            className="btn-backup-create"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={16} />
            Tạo bản sao lưu tức thì
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="backup-stats-grid">
        <div className="backup-stat-card">
          <div className="stat-card__icon icon--blue">
            <Database size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Tổng số bản sao lưu</span>
            <strong className="stat-card__value">{data.total_backups} bản ghi</strong>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="stat-card__icon icon--green">
            <HardDrive size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Dung lượng lưu trữ</span>
            <strong className="stat-card__value">{data.total_size_formatted}</strong>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="stat-card__icon icon--purple">
            <Clock size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Lần sao lưu gần nhất</span>
            <strong className="stat-card__value">
              {data.last_backup_at ? formatDateTime(data.last_backup_at) : 'Chưa có'}
            </strong>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="stat-card__icon icon--amber">
            <Calendar size={22} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Lịch tự động kế tiếp</span>
            <strong className="stat-card__value">
              {data.schedule?.auto_backup_enabled ? data.schedule.next_scheduled_run : 'Đang tạm dừng'}
            </strong>
          </div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="backup-table-card">
        <div className="table-card__header">
          <div className="table-card__header-left">
            <h3>Danh sách Bản sao lưu CSDL ({data.items.length})</h3>
            <span className="table-header-sub">Các snapshot dữ liệu MySQL được lưu trữ an toàn tại máy chủ nội bộ ICTU.</span>
          </div>
          <button
            type="button"
            className="btn-table-refresh"
            onClick={loadData}
            disabled={loading}
            title="Tải lại danh sách"
          >
            <RefreshCw size={14} className={loading ? 'is-spinning' : ''} />
            Làm mới
          </button>
        </div>

        <div className="backup-table-wrapper">
          <table className="backup-data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Tên tệp sao lưu (.sql)</th>
                <th>Loại sao lưu</th>
                <th>Dung lượng</th>
                <th>Thời điểm tạo</th>
                <th>Người tạo</th>
                <th>Lần khôi phục</th>
                <th style={{ textAlign: 'center', width: '180px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-row">
                      <div className="backup-spinner" />
                      <span>Đang tải danh sách bản sao lưu...</span>
                    </div>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-row">
                      <span>Chưa có bản sao lưu nào. Hãy bấm "Tạo bản sao lưu tức thì" để tạo bản đầu tiên.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="col-idx">{idx + 1}</td>
                    <td>
                      <div className="file-name-cell">
                        <FileCode size={18} className="file-icon" />
                        <div>
                          <strong className="file-title">{item.filename}</strong>
                          {item.note && <span className="file-note">{item.note}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{renderTypeBadge(item.backup_type)}</td>
                    <td>
                      <span className="size-badge">{item.file_size_formatted}</span>
                    </td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>
                      <span className="creator-text">{item.created_by_name || 'System Admin'}</span>
                    </td>
                    <td>
                      {item.restored_at ? (
                        <span className="restored-badge" title={formatDateTime(item.restored_at)}>
                          ✓ Đã khôi phục
                        </span>
                      ) : (
                        <span className="not-restored-badge">—</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons-cell">
                        <button
                          type="button"
                          className="btn-action-icon btn-action--download"
                          onClick={() => handleDownload(item)}
                          title="Tải về máy tính (.sql)"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon btn-action--restore"
                          onClick={() => {
                            setRestoreModalItem(item);
                            setConfirmText('');
                          }}
                          title="Khôi phục CSDL từ bản này"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon btn-action--delete"
                          onClick={() => handleDelete(item)}
                          title="Xóa bản sao lưu"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: TẠO BẢN SAO LƯU ── */}
      {createModalOpen && (
        <div className="backup-modal-overlay" role="dialog" aria-modal="true">
          <div className="backup-modal-card">
            <div className="backup-modal-header">
              <div className="modal-title-wrap">
                <Database size={20} className="modal-title-icon" />
                <h3>Tạo Bản Sao lưu Dữ liệu Tức thì</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="backup-modal-body">
              <label className="form-label">Chọn phạm vi sao lưu</label>
              <div className="type-options-grid">
                <label
                  className={`type-option-card ${
                    createForm.backup_type === 'full' ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="backup_type"
                    value="full"
                    checked={createForm.backup_type === 'full'}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, backup_type: e.target.value }))
                    }
                  />
                  <div>
                    <strong>Toàn phần (Full Database)</strong>
                    <p>Sao lưu toàn bộ bảng dữ liệu, người dùng, hồ sơ, phân quyền và lịch sử hoạt động.</p>
                  </div>
                </label>

                <label
                  className={`type-option-card ${
                    createForm.backup_type === 'data_only' ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="backup_type"
                    value="data_only"
                    checked={createForm.backup_type === 'data_only'}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, backup_type: e.target.value }))
                    }
                  />
                  <div>
                    <strong>Chỉ Dữ liệu nghiệp vụ (Data Only)</strong>
                    <p>Sao lưu các bảng hồ sơ TTS, nhiệm vụ, báo cáo và bảng công (không bao gồm schema).</p>
                  </div>
                </label>

                <label
                  className={`type-option-card ${
                    createForm.backup_type === 'schema_only' ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="backup_type"
                    value="schema_only"
                    checked={createForm.backup_type === 'schema_only'}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, backup_type: e.target.value }))
                    }
                  />
                  <div>
                    <strong>Chỉ Cấu trúc bảng (Schema Only)</strong>
                    <p>Chỉ sao lưu định nghĩa các bảng và ràng buộc khóa ngoại (DDL), dung lượng nhỏ.</p>
                  </div>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Ghi chú bản sao lưu (Tùy chọn)</label>
                <textarea
                  rows={3}
                  value={createForm.note}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, note: e.target.value }))
                  }
                  className="modal-textarea"
                  placeholder="Ví dụ: Sao lưu trước đợt duyệt hồ sơ Q3/2026..."
                />
              </div>
            </div>

            <div className="backup-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setCreateModalOpen(false)}
                disabled={creating}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleCreateBackup}
                disabled={creating}
              >
                {creating ? 'Đang tạo bản sao lưu...' : 'Bắt đầu sao lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: XÁC NHẬN KHÔI PHỤC DỮ LIỆU (DANGER MODAL) ── */}
      {restoreModalItem && (
        <div className="backup-modal-overlay" role="dialog" aria-modal="true">
          <div className="backup-modal-card danger-modal">
            <div className="backup-modal-header danger-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={22} className="danger-icon" />
                <h3>Cảnh báo Khôi phục Cơ sở Dữ liệu</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setRestoreModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="backup-modal-body">
              <div className="danger-callout">
                <strong>HÀNH ĐỘNG CÓ THỂ GÂY GHI ĐÈ DỮ LIỆU!</strong>
                <p>
                  Khôi phục dữ liệu sẽ đưa toàn bộ trạng thái hệ thống quay trở lại thời điểm bản sao lưu được ghi nhận ({formatDateTime(restoreModalItem.created_at)}). Các thay đổi dữ liệu sau mốc này có thể bị mất.
                </p>
              </div>

              <div className="restore-target-box">
                <span className="target-label">Tệp bản sao lưu sẽ khôi phục:</span>
                <strong className="target-name">{restoreModalItem.filename}</strong>
                <span className="target-size">Dung lượng: {restoreModalItem.file_size_formatted}</span>
              </div>

              <div className="confirm-input-wrap">
                <label>
                  Để xác nhận, vui lòng nhập chữ <strong>XACNHAN</strong> vào ô bên dưới:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="XACNHAN"
                  className="confirm-input"
                />
              </div>
            </div>

            <div className="backup-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setRestoreModalItem(null)}
                disabled={restoring}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-danger-submit"
                onClick={handleConfirmRestore}
                disabled={restoring || confirmText !== 'XACNHAN'}
              >
                {restoring ? 'Đang khôi phục dữ liệu...' : 'Tôi hiểu rủi ro & Tiến hành khôi phục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CẤU HÌNH LỊCH TỰ ĐỘNG SAO LƯU ── */}
      {scheduleModalOpen && (
        <div className="backup-modal-overlay" role="dialog" aria-modal="true">
          <div className="backup-modal-card">
            <div className="backup-modal-header">
              <div className="modal-title-wrap">
                <Calendar size={20} className="modal-title-icon" />
                <h3>Thiết lập Lịch Tự động Sao lưu (Auto Backup)</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setScheduleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="backup-modal-body">
              <div className="toggle-row banner-toggle" style={{ marginBottom: '16px' }}>
                <div className="toggle-info">
                  <strong>Bật cơ chế sao lưu tự động định kỳ</strong>
                  <p>Hệ thống tự động kích hoạt tiến trình sao lưu cơ sở dữ liệu ngầm vào ban đêm.</p>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={scheduleForm.auto_backup_enabled}
                    onChange={(e) =>
                      setScheduleForm((p) => ({
                        ...p,
                        auto_backup_enabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Tần suất sao lưu tự động</label>
                <select
                  value={scheduleForm.frequency}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, frequency: e.target.value }))
                  }
                  className="modal-select"
                >
                  <option value="daily">Hàng ngày (Daily lúc 02:00 AM)</option>
                  <option value="weekly">Hàng tuần (Vào lúc 02:00 AM Chủ Nhật)</option>
                  <option value="monthly">Hàng tháng (Ngày mùng 1 hàng tháng)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời hạn lưu trữ bản sao lưu (Retention Policy)</label>
                <select
                  value={scheduleForm.retention_days}
                  onChange={(e) =>
                    setScheduleForm((p) => ({
                      ...p,
                      retention_days: Number(e.target.value),
                    }))
                  }
                  className="modal-select"
                >
                  <option value={15}>15 ngày (Tự động xóa các bản cũ hơn 15 ngày)</option>
                  <option value={30}>30 ngày (Khuyến nghị)</option>
                  <option value={60}>60 ngày</option>
                  <option value={90}>90 ngày (Dành cho kiểm toán quý)</option>
                </select>
              </div>
            </div>

            <div className="backup-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setScheduleModalOpen(false)}
                disabled={savingSchedule}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
              >
                {savingSchedule ? 'Đang lưu...' : 'Lưu cấu hình lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
