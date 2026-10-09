/**
 * ProgramListPage.jsx
 * Route: /hr/programs
 *
 * Quản lý danh sách kỳ thực tập (HR):
 * - Hiển thị đúng số lượng kỳ thực tập thực tế từ hệ thống backend
 * - Thống kê số kỳ đang mở, đã đóng, chỉ tiêu tiếp nhận
 * - Chỉnh sửa / thay đổi kỳ thực tập (tên, phòng ban, thời gian, chỉ tiêu, mô tả, trạng thái)
 * - Đóng kỳ thực tập để kết thúc hoặc mở lại
 * - Xóa kỳ thực tập khỏi hệ thống
 * - Thêm mới kỳ thực tập nhanh chóng
 * - Tab Cài đặt Khung thời gian chương trình
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import {
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  closeProgram,
  openProgram
} from '../../api/programs';
import { getDepartments } from '../../api/mentors';
import ProgramSettings from '../hr/ProgramSettings';
import './ProgramListPage.css';

/** Định dạng ngày YYYY-MM-DD → DD/MM/YYYY */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const DEFAULT_DEPARTMENTS = [
  'Công nghệ thông tin',
  'Phát triển phần mềm',
  'Đảm bảo chất lượng (QA/QC)',
  'Thiết kế UI/UX',
  'Dữ liệu & Trí tuệ nhân tạo (AI)',
  'An ninh mạng & Hệ thống',
  'DevOps & Điện toán đám mây'
];

function ProgramListPage() {
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // Mặc định mở danh sách kỳ thực tập
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // State cho Modal Sửa / Tạo kỳ thực tập
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit'); // 'create' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    department: '',
    start_date: '',
    end_date: '',
    max_interns: 50,
    status: 'open',
    description: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPrograms();
      if (res.ok && Array.isArray(res.data)) {
        setPrograms(res.data);
      } else {
        setPrograms([]);
      }
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
    getDepartments()
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setDepartments(res.data.map(d => d.name));
        } else {
          setDepartments(DEFAULT_DEPARTMENTS);
        }
      })
      .catch(() => setDepartments(DEFAULT_DEPARTMENTS));
  }, [fetchList]);

  // Thống kê số lượng thực tế
  const totalPrograms = programs.length;
  const openPrograms = programs.filter(p => p.status === 'open').length;
  const closedPrograms = programs.filter(p => p.status === 'closed').length;
  const totalSlots = programs.reduce((acc, p) => acc + (Number(p.max_interns) || 50), 0);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setModalError('');
    setFormData({
      id: null,
      name: '',
      department: departments[0] || 'Công nghệ thông tin',
      start_date: '',
      end_date: '',
      max_interns: 50,
      status: 'open',
      description: ''
    });
    setModalOpen(true);
  };

  // Mở modal sửa kỳ thực tập
  const handleOpenEditModal = (prog) => {
    setModalMode('edit');
    setModalError('');
    setFormData({
      id: prog.id,
      name: prog.name || '',
      department: prog.department || departments[0] || 'Công nghệ thông tin',
      start_date: prog.start_date || '',
      end_date: prog.end_date || '',
      max_interns: prog.max_interns || 50,
      status: prog.status || 'open',
      description: prog.description || ''
    });
    setModalOpen(true);
  };

  // Đóng modal
  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setModalError('');
  };

  // Xử lý lưu form (Tạo / Sửa)
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.name.trim()) {
      setModalError('Vui lòng nhập tên kỳ thực tập.');
      return;
    }
    if (!formData.department.trim()) {
      setModalError('Vui lòng chọn phòng ban.');
      return;
    }
    if (!formData.start_date) {
      setModalError('Vui lòng chọn ngày bắt đầu.');
      return;
    }
    if (!formData.end_date) {
      setModalError('Vui lòng chọn ngày kết thúc.');
      return;
    }
    if (formData.end_date <= formData.start_date) {
      setModalError('Ngày kết thúc phải lớn hơn ngày bắt đầu.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      department: formData.department.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      max_interns: parseInt(formData.max_interns, 10) || 50,
      description: formData.description.trim() || null,
      status: formData.status
    };

    setSubmitting(true);
    try {
      if (modalMode === 'edit') {
        const res = await updateProgram(formData.id, payload);
        if (res.ok) {
          showToast(`Đã cập nhật kỳ thực tập "${formData.name}" thành công!`);
          setModalOpen(false);
          fetchList();
        } else {
          setModalError(res.data?.detail || 'Không thể cập nhật kỳ thực tập.');
        }
      } else {
        const res = await createProgram(payload);
        if (res.ok) {
          showToast(`Đã tạo kỳ thực tập "${formData.name}" thành công!`);
          setModalOpen(false);
          fetchList();
        } else {
          setModalError(res.data?.detail || 'Không thể tạo kỳ thực tập.');
        }
      }
    } catch {
      setModalError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // Đóng hoặc Mở lại kỳ thực tập
  const handleToggleStatus = async (prog) => {
    try {
      const isCurrentlyOpen = prog.status === 'open';
      const actionText = isCurrentlyOpen ? 'đóng kết thúc' : 'mở lại';
      
      const res = isCurrentlyOpen ? await closeProgram(prog.id) : await openProgram(prog.id);
      if (res.ok) {
        showToast(`Đã ${actionText} kỳ thực tập "${prog.name}" thành công!`);
        fetchList();
      } else {
        showToast(res.data?.detail || `Không thể ${actionText} kỳ thực tập.`, 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi cập nhật trạng thái kỳ thực tập.', 'error');
    }
  };

  // Xóa kỳ thực tập
  const handleDeleteProgram = async (prog) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa kỳ thực tập "${prog.name}" khỏi hệ thống không?\n\nLưu ý: Hành động này sẽ xóa kỳ thực tập khỏi danh sách đang quản lý.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    try {
      const res = await deleteProgram(prog.id);
      if (res.ok || res.status === 204) {
        showToast(`Đã xóa kỳ thực tập "${prog.name}" khỏi hệ thống thành công!`);
        fetchList();
      } else {
        showToast(res.data?.detail || 'Không thể xóa kỳ thực tập.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa kỳ thực tập.', 'error');
    }
  };

  return (
    <div className="program-list-page">
      <div className="program-list-wrapper">
        {/* Toast thông báo */}
        {toast && (
          <div
            className={`program-toast program-toast--${toast.type}`}
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
              border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#a7f3d0'}`,
              color: toast.type === 'error' ? '#dc2626' : '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="program-list-header">
          <div className="program-list-title">
            <span className="program-badge">HR Quản lý Đào tạo</span>
            <h1>Danh sách <span>kỳ thực tập</span></h1>
            <p className="program-list-subtitle">
              Hiển thị số lượng kỳ thực tập thực tế, theo dõi tiến độ, chỉnh sửa thông tin, đóng kết thúc hoặc xóa kỳ thực tập.
            </p>
          </div>

          <button
            type="button"
            className="program-new-btn"
            onClick={handleOpenCreateModal}
          >
            <Plus size={18} />
            <span>Thêm kỳ thực tập mới</span>
          </button>
        </div>

        {/* ── Thống kê trực quan số kỳ thực tập ── */}
        <div className="program-stats-grid">
          <div className="program-stat-card">
            <div className="program-stat-info">
              <span className="program-stat-label">Tổng số kỳ thực tập</span>
              <span className="program-stat-value">{totalPrograms}</span>
            </div>
            <div className="program-stat-icon program-stat-icon--total">
              <Layers size={22} />
            </div>
          </div>

          <div className="program-stat-card">
            <div className="program-stat-info">
              <span className="program-stat-label">Kỳ đang mở tiếp nhận</span>
              <span className="program-stat-value" style={{ color: '#16a34a' }}>{openPrograms}</span>
            </div>
            <div className="program-stat-icon program-stat-icon--open">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="program-stat-card">
            <div className="program-stat-info">
              <span className="program-stat-label">Kỳ đã kết thúc / đóng</span>
              <span className="program-stat-value" style={{ color: '#64748b' }}>{closedPrograms}</span>
            </div>
            <div className="program-stat-icon program-stat-icon--closed">
              <Lock size={22} />
            </div>
          </div>

          <div className="program-stat-card">
            <div className="program-stat-info">
              <span className="program-stat-label">Tổng chỉ tiêu tiếp nhận</span>
              <span className="program-stat-value" style={{ color: '#9333ea' }}>{totalSlots}</span>
            </div>
            <div className="program-stat-icon program-stat-icon--intern">
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="program-nav-tabs">
          <button
            type="button"
            className={`program-nav-tab ${activeTab === 'list' ? 'program-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <ListFilter size={16} />
            <span>Danh sách Kỳ thực tập ({totalPrograms})</span>
          </button>
          <button
            type="button"
            className={`program-nav-tab ${activeTab === 'settings' ? 'program-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Calendar size={16} />
            <span>Cài đặt Khung thời gian Chương trình</span>
          </button>
        </div>

        {/* ── Nội dung Tab ── */}
        {activeTab === 'settings' ? (
          <div className="program-settings-tab-wrapper">
            <ProgramSettings onSaved={fetchList} />
          </div>
        ) : (
          <div className="program-table-card">
            {loading ? (
              <div className="program-empty">
                Đang tải danh sách kỳ thực tập...
              </div>
            ) : programs.length === 0 ? (
              <div className="program-empty">
                Chưa có kỳ thực tập nào trong hệ thống.
                <br />
                Bấm <strong>Thêm kỳ thực tập mới</strong> ở trên để bắt đầu khởi tạo kỳ thực tập.
              </div>
            ) : (
              <div className="program-table-scroll">
                <table className="program-table">
                  <colgroup>
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '21%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="col-prog-name">Tên kỳ thực tập</th>
                      <th className="col-prog-dept">Phòng ban</th>
                      <th className="col-prog-dates" style={{ textAlign: 'center' }}>Thời gian thực tập</th>
                      <th className="col-prog-slots" style={{ textAlign: 'center' }}>Chỉ tiêu</th>
                      <th className="col-prog-status" style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th className="col-prog-actions" style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((prog) => {
                      const isOpen = prog.status === 'open';
                      return (
                        <tr key={prog.id}>
                          <td className="prog-name">
                            <strong>{prog.name}</strong>
                            {prog.description && (
                              <span className="prog-name-desc">
                                {prog.description}
                              </span>
                            )}
                          </td>
                          <td className="prog-dept">
                            <span className="prog-dept-badge" title={prog.department}>
                              {prog.department}
                            </span>
                          </td>
                          <td className="prog-date" style={{ textAlign: 'center' }}>
                            <div className="prog-date-range">
                              <span>{formatDate(prog.start_date)}</span>
                              <span className="prog-date-arrow">→</span>
                              <span>{formatDate(prog.end_date)}</span>
                            </div>
                          </td>
                          <td className="prog-slots" style={{ textAlign: 'center' }}>
                            <span className="prog-slots-badge">
                              {prog.max_interns || 50} TTS
                            </span>
                          </td>
                          <td className="prog-status" style={{ textAlign: 'center' }}>
                            <span className={`prog-status-badge prog-status-badge--${isOpen ? 'open' : 'closed'}`}>
                              <span className={`prog-status-dot prog-status-dot--${isOpen ? 'open' : 'closed'}`} />
                              {isOpen ? 'Đang mở' : 'Đã đóng'}
                            </span>
                          </td>
                          <td className="prog-actions" style={{ textAlign: 'center' }}>
                            <div className="prog-actions-cell">
                              {/* Nút Chỉnh sửa */}
                              <button
                                type="button"
                                className="prog-btn prog-btn--edit"
                                onClick={() => handleOpenEditModal(prog)}
                                title="Chỉnh sửa thông tin kỳ thực tập"
                              >
                                <Pencil size={12} />
                                <span>Sửa</span>
                              </button>

                              {/* Nút Đóng / Mở lại */}
                              <button
                                type="button"
                                className={`prog-btn ${isOpen ? 'prog-btn--close' : 'prog-btn--open'}`}
                                onClick={() => handleToggleStatus(prog)}
                                title={isOpen ? 'Đóng kết thúc kỳ thực tập' : 'Mở lại kỳ thực tập này'}
                              >
                                {isOpen ? <Lock size={12} /> : <Unlock size={12} />}
                                <span>{isOpen ? 'Đóng kỳ' : 'Mở lại'}</span>
                              </button>

                              {/* Nút Xóa */}
                              <button
                                type="button"
                                className="prog-btn prog-btn--delete"
                                onClick={() => handleDeleteProgram(prog)}
                                title="Xóa kỳ thực tập khỏi hệ thống"
                              >
                                <Trash2 size={12} />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Sửa / Thêm mới Kỳ thực tập ── */}
      {modalOpen && (
        <div className="prog-modal-overlay" onClick={handleCloseModal}>
          <div className="prog-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prog-modal-header">
              <h3>
                {modalMode === 'edit' ? 'Chỉnh sửa kỳ thực tập' : 'Thêm kỳ thực tập mới'}
              </h3>
              <button
                type="button"
                className="prog-modal-close"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="prog-modal-body">
                {modalError && (
                  <div className="prog-modal-error">
                    ⚠ {modalError}
                  </div>
                )}

                {/* Tên kỳ thực tập */}
                <div className="prog-form-group">
                  <label>
                    Tên kỳ thực tập <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="prog-form-input"
                    placeholder="VD: Kỳ thực tập Mùa Thu 2026 (Batch 01)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Phòng ban & Chỉ tiêu */}
                <div className="prog-form-row">
                  <div className="prog-form-group">
                    <label>
                      Phòng ban <span className="req">*</span>
                    </label>
                    <select
                      className="prog-form-select"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      {departments.map((dept, index) => (
                        <option key={index} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="prog-form-group">
                    <label>
                      Chỉ tiêu TTS tối đa <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="prog-form-input"
                      placeholder="VD: 50"
                      value={formData.max_interns}
                      onChange={(e) => setFormData({ ...formData, max_interns: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Ngày bắt đầu & Ngày kết thúc */}
                <div className="prog-form-row">
                  <div className="prog-form-group">
                    <label>
                      Ngày bắt đầu <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      className="prog-form-input"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="prog-form-group">
                    <label>
                      Ngày kết thúc <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      className="prog-form-input"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Trạng thái kỳ thực tập */}
                <div className="prog-form-group">
                  <label>Trạng thái hoạt động</label>
                  <select
                    className="prog-form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="open">Đang mở (Tiếp nhận thực tập sinh)</option>
                    <option value="closed">Đã đóng (Kết thúc kỳ thực tập)</option>
                  </select>
                </div>

                {/* Mô tả */}
                <div className="prog-form-group">
                  <label>Mô tả chi tiết</label>
                  <textarea
                    rows="3"
                    className="prog-form-textarea"
                    placeholder="Mô tả mục tiêu, yêu cầu hoặc ghi chú cho kỳ thực tập..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="prog-modal-footer">
                <button
                  type="button"
                  className="prog-modal-btn prog-modal-btn--cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="prog-modal-btn prog-modal-btn--submit"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : modalMode === 'edit' ? 'Lưu thay đổi' : 'Tạo kỳ thực tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramListPage;
