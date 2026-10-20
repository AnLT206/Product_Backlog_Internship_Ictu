import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Filter,
  UserCheck,
  RefreshCw,
  X,
  MapPin,
  FileText,
} from 'lucide-react';
import {
  fetchWeeklySchedules,
  createWeeklySchedule,
  updateWeeklySchedule,
  deleteWeeklySchedule,
} from '../../../api/operations';
import { getInterns } from '../../../api/interns';
import { getMentors } from '../../../api/mentors';
import { syncWorkScheduleChange } from '../../../utils/realtimeSync';
import './WeeklyWorkScheduleManager.css';

export default function WeeklyWorkScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState({ interns: [], mentors: [] });
  const [toast, setToast] = useState(null);

  // Filters
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'intern' | 'mentor'
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchName, setSearchName] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'intern',
    session_date: '',
    shift_name: 'Ca Sáng (08:00 - 12:00)',
    start_time: '08:00',
    end_time: '12:00',
    location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
    notes: '',
    status: 'scheduled',
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Helper tính số ngày còn lại đến phiên
  const getDaysDiff = (sessionDateStr) => {
    if (!sessionDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(sessionDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Load danh sách lịch và danh sách user
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, internRes, mentorRes] = await Promise.all([
        fetchWeeklySchedules(),
        getInterns().catch(() => ({ ok: false, data: [] })),
        getMentors().catch(() => ({ ok: false, data: [] })),
      ]);

      if (schedRes && schedRes.ok && Array.isArray(schedRes.data)) {
        setSchedules(schedRes.data);
      } else if (Array.isArray(schedRes)) {
        setSchedules(schedRes);
      }

      let rawInterns = [];
      if (Array.isArray(internRes?.data?.items)) {
        rawInterns = internRes.data.items;
      } else if (Array.isArray(internRes?.data)) {
        rawInterns = internRes.data;
      } else if (Array.isArray(internRes?.items)) {
        rawInterns = internRes.items;
      }

      let rawMentors = [];
      if (Array.isArray(mentorRes?.data)) {
        rawMentors = mentorRes.data;
      } else if (Array.isArray(mentorRes)) {
        rawMentors = mentorRes;
      }

      const interns = rawInterns.map((u) => ({
        id: u.user_id || u.id,
        full_name: u.full_name || u.name || u.email,
        code: u.code || '',
        email: u.email || '',
      }));

      const mentors = rawMentors.map((u) => ({
        id: u.user_id || u.id,
        full_name: u.full_name || u.name || u.email,
        code: u.code || '',
        email: u.email || '',
      }));

      setUsersList({
        interns: interns.length > 0 ? interns : [
          { id: 2, full_name: 'Trần Thị Mai Phương', code: 'TTS0003' },
          { id: 3, full_name: 'Nguyễn Văn An', code: 'TTS0001' },
          { id: 4, full_name: 'Lê Hoàng Nam', code: 'TTS0002' },
          { id: 5, full_name: 'Hoàng Minh Đức', code: 'TTS0004' },
        ],
        mentors: mentors.length > 0 ? mentors : [
          { id: 6, full_name: 'Trần Hoàng Quân', code: 'MT0001' },
          { id: 7, full_name: 'Phạm Quốc Hướng', code: 'MT0002' },
        ],
      });
    } catch {
      showToast('Không thể tải danh sách lịch làm việc.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick preset shift times
  const handleShiftPresetChange = (preset) => {
    if (preset === 'morning') {
      setFormData((prev) => ({
        ...prev,
        shift_name: 'Ca Sáng (08:00 - 12:00)',
        start_time: '08:00',
        end_time: '12:00',
      }));
    } else if (preset === 'afternoon') {
      setFormData((prev) => ({
        ...prev,
        shift_name: 'Ca Chiều (13:30 - 17:30)',
        start_time: '13:30',
        end_time: '17:30',
      }));
    } else if (preset === 'full_day') {
      setFormData((prev) => ({
        ...prev,
        shift_name: 'Ca Cả Ngày (08:00 - 17:30)',
        start_time: '08:00',
        end_time: '17:30',
      }));
    } else if (preset === 'mentor_review') {
      setFormData((prev) => ({
        ...prev,
        shift_name: 'Phiên Hướng Dẫn & Review 1-1',
        start_time: '14:00',
        end_time: '16:30',
      }));
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormError('');
    // Mặc định ngày mai hoặc 3 ngày tới
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const dateStr = defaultDate.toISOString().slice(0, 10);

    const firstIntern = usersList.interns[0];
    const initialUserId = firstIntern?.id || firstIntern?.user_id || '';

    setFormData({
      user_id: initialUserId,
      role: 'intern',
      session_date: dateStr,
      shift_name: 'Ca Sáng (08:00 - 12:00)',
      start_time: '08:00',
      end_time: '12:00',
      location: 'P.302 – Trung tâm Phần mềm & AI ICTU',
      notes: '',
      status: 'scheduled',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormError('');
    setFormData({
      user_id: item.user_id,
      role: item.role,
      session_date: item.session_date,
      shift_name: item.shift_name,
      start_time: item.start_time?.slice(0, 5) || '08:00',
      end_time: item.end_time?.slice(0, 5) || '12:00',
      location: item.location || '',
      notes: item.notes || '',
      status: item.status || 'scheduled',
    });
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.user_id) {
      setFormError('Vui lòng chọn nhân sự (Thực tập sinh hoặc Mentor).');
      return;
    }
    if (!formData.session_date) {
      setFormError('Vui lòng chọn ngày làm việc.');
      return;
    }
    if (!formData.shift_name.trim()) {
      setFormError('Vui lòng nhập tên ca làm việc.');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      setFormError('Giờ bắt đầu phải trước giờ kết thúc ca làm việc.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        user_id: Number(formData.user_id),
        role: formData.role,
        session_date: formData.session_date,
        shift_name: formData.shift_name.trim(),
        start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
        end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time,
        location: formData.location.trim(),
        notes: formData.notes.trim(),
        status: formData.status,
      };

      if (isEditing) {
        const res = await updateWeeklySchedule(currentId, payload);
        if (res && res.error) {
          throw new Error(res.error || res.message || res.detail || 'Không thể cập nhật lịch.');
        }
        showToast('Đã cập nhật phiên làm việc thành công!', 'success');
      } else {
        const res = await createWeeklySchedule(payload);
        if (res && res.error) {
          throw new Error(res.error || res.message || res.detail || 'Không thể tạo mới lịch.');
        }
        showToast('Đã thêm phiên làm việc mới thành công!', 'success');
      }

      setIsModalOpen(false);
      loadData();
      syncWorkScheduleChange({ action: isEditing ? 'update_session' : 'create_session', user_id: payload.user_id });
    } catch (err) {
      const msg = err.message || 'Thao tác thất bại. Vui lòng kiểm tra lại.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id, name, dateStr) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phiên làm việc "${name}" ngày ${dateStr}?`)) {
      return;
    }
    try {
      const res = await deleteWeeklySchedule(id);
      if (res && res.error) {
        throw new Error(res.error || res.message || 'Xóa lịch thất bại.');
      }
      showToast('Đã xóa phiên làm việc thành công!', 'success');
      setSchedules((prev) => prev.filter((item) => item.id !== id));
      syncWorkScheduleChange({ action: 'delete_session', id });
    } catch (err) {
      showToast(err.message || 'Không thể xóa phiên làm việc.', 'error');
    }
  };

  // Filtered list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      if (filterRole !== 'all' && item.role !== filterRole) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchName.trim()) {
        const q = searchName.toLowerCase();
        const userName = (item.user_name || '').toLowerCase();
        const shiftName = (item.shift_name || '').toLowerCase();
        const userCode = (item.user_code || '').toLowerCase();
        if (!userName.includes(q) && !shiftName.includes(q) && !userCode.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, filterRole, filterStatus, searchName]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = schedules.length;
    const internCount = schedules.filter((s) => s.role === 'intern').length;
    const mentorCount = schedules.filter((s) => s.role === 'mentor').length;
    const scheduledCount = schedules.filter((s) => s.status === 'scheduled').length;
    return { total, internCount, mentorCount, scheduledCount };
  }, [schedules]);

  // Current user list based on selected role in form
  const availableUsers = formData.role === 'intern' ? usersList.interns : usersList.mentors;

  return (
    <div className="wws-container" data-testid="weekly-work-schedule-manager">
      {/* Header & Action */}
      <div className="wws-header-card">
        <div className="wws-header-top">
          <div className="wws-title-group">
            <h2>
              <Calendar className="text-blue-600" size={24} />
              Quản lý Lịch làm việc theo phiên của từng tuần
            </h2>
            <p className="wws-subtitle">
              HR xếp lịch ca làm việc cho Thực tập sinh (TTS) & Giảng viên hướng dẫn (Mentor). Dữ liệu được đồng bộ trực tiếp tới trang cá nhân của TTS và Mentor.
            </p>
          </div>
          <button
            type="button"
            className="wws-add-btn"
            onClick={handleOpenAddModal}
            id="btn-add-weekly-schedule"
          >
            <Plus size={18} />
            <span>Thêm phiên làm việc mới</span>
          </button>
        </div>

        {/* Thông báo chính sách */}
        <div className="wws-policy-notice">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0" />
          <div>
            <strong>Quản lý linh hoạt: </strong>
            HR có thể thêm mới, điều chỉnh phòng họp, phân công nhân sự hoặc cập nhật thời gian cho bất kỳ ca làm việc nào. Dữ liệu được đồng bộ trực tiếp tới TTS và Mentor.
          </div>
        </div>

        {/* Stats Row */}
        <div className="wws-stats-grid">
          <div className="wws-stat-card">
            <span className="wws-stat-label">Tổng số ca đã xếp</span>
            <span className="wws-stat-value">{stats.total}</span>
            <span className="wws-stat-hint">Phiên làm việc trong hệ thống</span>
          </div>
          <div className="wws-stat-card">
            <span className="wws-stat-label">Ca Thực tập sinh (TTS)</span>
            <span className="wws-stat-value" style={{ color: '#2563eb' }}>{stats.internCount}</span>
            <span className="wws-stat-hint">Được hiển thị tại /intern/schedule</span>
          </div>
          <div className="wws-stat-card">
            <span className="wws-stat-label">Ca Mentor hướng dẫn</span>
            <span className="wws-stat-value" style={{ color: '#d97706' }}>{stats.mentorCount}</span>
            <span className="wws-stat-hint">Được hiển thị tại /mentor/schedule</span>
          </div>
          <div className="wws-stat-card">
            <span className="wws-stat-label">Ca dự kiến (Scheduled)</span>
            <span className="wws-stat-value" style={{ color: '#16a34a' }}>{stats.scheduledCount}</span>
            <span className="wws-stat-hint">Đang trong kế hoạch thực hiện</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="wws-filter-bar">
          <div className="wws-filter-item">
            <Filter size={15} />
            <label htmlFor="filter-role">Đối tượng:</label>
            <select
              id="filter-role"
              className="wws-filter-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">Tất cả (TTS & Mentor)</option>
              <option value="intern">Chỉ Thực tập sinh (TTS)</option>
              <option value="mentor">Chỉ Mentor</option>
            </select>
          </div>

          <div className="wws-filter-item">
            <label htmlFor="filter-status">Trạng thái:</label>
            <select
              id="filter-status"
              className="wws-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="scheduled">Đã lên lịch (Scheduled)</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="wws-filter-item" style={{ flex: 1, minWidth: '220px' }}>
            <label htmlFor="filter-search">Tìm kiếm:</label>
            <input
              id="filter-search"
              type="text"
              className="wws-filter-input"
              style={{ width: '100%' }}
              placeholder="Tìm theo tên TTS, Mentor, ca làm việc..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="wws-btn-edit"
            style={{ marginLeft: 'auto' }}
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="wws-table-card">
        <div className="wws-table-responsive">
          <table className="wws-table">
            <thead>
              <tr>
                <th>Ngày làm việc</th>
                <th>Ca / Phiên</th>
                <th>Thời gian</th>
                <th>Đối tượng</th>
                <th>Nhân sự</th>
                <th>Địa điểm</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Đang tải danh sách lịch làm việc...</p>
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="wws-empty">
                      <Calendar size={40} className="wws-empty-icon" />
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#334155' }}>
                        Chưa có phiên làm việc nào phù hợp với bộ lọc.
                      </p>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        Bấm "Thêm phiên làm việc mới" ở trên để xếp ca cho TTS hoặc Mentor.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((item) => {
                  const daysDiff = getDaysDiff(item.session_date);

                  return (
                    <tr key={item.id} data-testid={`schedule-row-${item.id}`}>
                      {/* Ngày */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {item.session_date}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {daysDiff === 0
                            ? 'Hôm nay'
                            : daysDiff > 0
                            ? `Còn ${daysDiff} ngày nữa`
                            : `Đã qua ${Math.abs(daysDiff)} ngày`}
                        </div>
                      </td>

                      {/* Tên Ca */}
                      <td>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.shift_name}</span>
                        {item.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Giờ */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
                          <Clock size={14} className="text-slate-500" />
                          <span>
                            {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                          </span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span
                          className={`wws-role-badge ${
                            item.role === 'intern' ? 'wws-role-badge--intern' : 'wws-role-badge--mentor'
                          }`}
                        >
                          {item.role === 'intern' ? 'Thực tập sinh' : 'Mentor'}
                        </span>
                      </td>

                      {/* Nhân sự */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {item.user_name || `User #${item.user_id}`}
                        </div>
                        {item.user_code && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Mã: {item.user_code}
                          </span>
                        )}
                      </td>

                      {/* Địa điểm */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#475569' }}>
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.location || 'P.302 – Trung tâm Phần mềm & AI ICTU'}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái ca làm việc */}
                      <td>
                        <span
                          className={`wws-lock-badge ${
                            item.status === 'completed'
                              ? 'wws-lock-badge--open'
                              : item.status === 'cancelled'
                              ? 'wws-lock-badge--locked'
                              : 'wws-lock-badge--open'
                          }`}
                        >
                          <CheckCircle size={12} />
                          {item.status === 'completed'
                            ? 'Hoàn thành'
                            : item.status === 'cancelled'
                            ? 'Đã hủy'
                            : 'Đã lên lịch'}
                        </span>
                      </td>

                      {/* Thao tác: Nút Sửa & Xóa */}
                      <td>
                        <div className="wws-actions" style={{ justifyContent: 'center' }}>
                          {/* NÚT SỬA */}
                          <button
                            type="button"
                            className="wws-btn-edit"
                            onClick={() => handleOpenEditModal(item)}
                            title="Chỉnh sửa phiên làm việc"
                            aria-label={`Sửa ca ${item.shift_name}`}
                            id={`btn-edit-schedule-${item.id}`}
                          >
                            <Edit2 size={13} />
                            <span>Sửa</span>
                          </button>

                          {/* NÚT XÓA */}
                          <button
                            type="button"
                            className="wws-btn-delete"
                            onClick={() => handleDelete(item.id, item.shift_name, item.session_date)}
                            title="Xóa phiên làm việc này"
                            aria-label={`Xóa ca ${item.shift_name}`}
                            id={`btn-delete-schedule-${item.id}`}
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Lịch làm việc */}
      {isModalOpen && (
        <div className="wws-modal-overlay" onClick={() => !formSubmitting && setIsModalOpen(false)}>
          <div className="wws-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wws-modal-header">
              <h3>
                {isEditing ? 'Chỉnh sửa Phiên làm việc' : 'Thêm Phiên làm việc mới cho Tuần'}
              </h3>
              <button
                type="button"
                className="wws-modal-close"
                onClick={() => setIsModalOpen(false)}
                disabled={formSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="wws-modal-body">
                {formError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#fee2e2',
                      borderLeft: '4px solid #ef4444',
                      borderRadius: '6px',
                      color: '#991b1b',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Chọn Role & Chọn User */}
                <div className="wws-form-row">
                  <div className="wws-form-group">
                    <label htmlFor="modal-role">Đối tượng áp dụng *</label>
                    <select
                      id="modal-role"
                      value={formData.role}
                      disabled={isEditing}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        const list = newRole === 'intern' ? usersList.interns : usersList.mentors;
                        setFormData((prev) => ({
                          ...prev,
                          role: newRole,
                          user_id: list[0]?.id || list[0]?.user_id || '',
                        }));
                      }}
                    >
                      <option value="intern">Thực tập sinh (TTS)</option>
                      <option value="mentor">Mentor (Giảng viên hướng dẫn)</option>
                    </select>
                  </div>

                  <div className="wws-form-group">
                    <label htmlFor="modal-user">Chọn nhân sự *</label>
                    <select
                      id="modal-user"
                      value={formData.user_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, user_id: e.target.value }))}
                      required
                    >
                      <option value="">-- Chọn nhân sự --</option>
                      {availableUsers.map((u) => {
                        const uid = u.id || u.user_id;
                        const name = u.full_name || u.name || u.email;
                        const code = u.code ? ` (${u.code})` : '';
                        return (
                          <option key={uid} value={uid}>
                            {name} {code}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Ngày làm việc */}
                <div className="wws-form-group">
                  <label htmlFor="modal-session-date">
                    Ngày làm việc của phiên *
                  </label>
                  <input
                    id="modal-session-date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, session_date: e.target.value }))}
                    required
                  />
                </div>

                {/* Mẫu ca nhanh */}
                <div className="wws-form-group">
                  <label>Mẫu ca nhanh</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="wws-btn-edit"
                      onClick={() => handleShiftPresetChange('morning')}
                    >
                      Ca Sáng (08:00 - 12:00)
                    </button>
                    <button
                      type="button"
                      className="wws-btn-edit"
                      onClick={() => handleShiftPresetChange('afternoon')}
                    >
                      Ca Chiều (13:30 - 17:30)
                    </button>
                    <button
                      type="button"
                      className="wws-btn-edit"
                      onClick={() => handleShiftPresetChange('full_day')}
                    >
                      Ca Cả Ngày
                    </button>
                    {formData.role === 'mentor' && (
                      <button
                        type="button"
                        className="wws-btn-edit"
                        onClick={() => handleShiftPresetChange('mentor_review')}
                      >
                        Phiên Review 1-1
                      </button>
                    )}
                  </div>
                </div>

                {/* Tên Ca */}
                <div className="wws-form-group">
                  <label htmlFor="modal-shift-name">Tên ca / Phiên làm việc *</label>
                  <input
                    id="modal-shift-name"
                    type="text"
                    value={formData.shift_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shift_name: e.target.value }))}
                    placeholder="VD: Ca Sáng tiêu chuẩn, Phiên hướng dẫn Sprint 2..."
                    required
                  />
                </div>

                {/* Giờ bắt đầu & kết thúc */}
                <div className="wws-form-row">
                  <div className="wws-form-group">
                    <label htmlFor="modal-start-time">Giờ bắt đầu *</label>
                    <input
                      id="modal-start-time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="wws-form-group">
                    <label htmlFor="modal-end-time">Giờ kết thúc *</label>
                    <input
                      id="modal-end-time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Địa điểm */}
                <div className="wws-form-group">
                  <label htmlFor="modal-location">Địa điểm làm việc</label>
                  <input
                    id="modal-location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="P.302 – Trung tâm Phần mềm & AI ICTU"
                  />
                </div>

                {/* Ghi chú */}
                <div className="wws-form-group">
                  <label htmlFor="modal-notes">Nội dung / Ghi chú công việc phiên</label>
                  <textarea
                    id="modal-notes"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Nội dung nhiệm vụ, tài liệu chuẩn bị, mục tiêu phiên làm việc..."
                  />
                </div>
              </div>

              <div className="wws-modal-footer">
                <button
                  type="button"
                  className="wws-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="wws-btn-save"
                  disabled={formSubmitting}
                  id="btn-save-weekly-schedule"
                >
                  {formSubmitting
                    ? 'Đang lưu...'
                    : isEditing
                    ? 'Lưu thay đổi'
                    : 'Thêm phiên làm việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`wws-toast wws-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
