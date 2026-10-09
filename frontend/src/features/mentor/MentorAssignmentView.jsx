import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  CheckSquare,
  Square,
  UserCheck,
  AlertCircle,
  Mail,
  GraduationCap,
  RotateCcw,
  X,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { getMentors, getMentorInterns, assignMentorInterns } from '../../api/mentors';
import { syncMentorAssignment } from '../../utils/realtimeSync';
import { getSavedAvatar } from '../../utils/avatarHelper';
import './MentorAssignmentView.css';

function initials(name) {
  if (!name) return 'TTS';
  const trimmed = name.trim();
  if (trimmed.toUpperCase() === 'TTS') return 'TTS';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].length <= 3 ? parts[0].toUpperCase() : parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * MentorAssignmentView
 *
 * Màn hình Phân công Thực tập sinh cho Mentor (User Story 1):
 * - Kết hợp Select box chọn Mentor và Checkbox list danh sách Thực tập sinh chưa có Mentor
 * - Xử lý gọi API lấy danh sách User, API gán mentor và hiển thị thông báo phân công thành công
 *
 * @param {object} props
 * @param {number|null} [props.initialMentorId]
 * @param {function} [props.onAssignmentSuccess]
 * @param {boolean} [props.isModalMode]
 * @param {function} [props.onClose]
 */
export default function MentorAssignmentView({
  initialMentorId = null,
  onAssignmentSuccess,
  isModalMode = false,
  onClose,
}) {
  const [mentors, setMentors] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState(initialMentorId);
  const [interns, setInterns] = useState([]);
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());

  const [loadingMentors, setLoadingMentors] = useState(true);
  const [loadingInterns, setLoadingInterns] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterMode, setFilterMode] = useState('unassigned'); // 'unassigned' | 'all' | 'assigned_this'
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // 1. Tải danh sách Mentors
  const loadMentorsList = useCallback(async () => {
    setLoadingMentors(true);
    try {
      const res = await getMentors();
      if (res.ok && Array.isArray(res.data)) {
        setMentors(res.data);
        if (!selectedMentorId && res.data.length > 0) {
          setSelectedMentorId(res.data[0].id);
        }
      } else {
        setMentors([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách Mentors:', err);
      showToast('Không thể tải danh sách Mentor.', 'error');
    } finally {
      setLoadingMentors(false);
    }
  }, [selectedMentorId, showToast]);

  useEffect(() => {
    loadMentorsList();
  }, [loadMentorsList]);

  // 2. Tải danh sách Interns khi selectedMentorId thay đổi
  const loadInternsForMentor = useCallback(
    async (mentorId) => {
      if (!mentorId) {
        setInterns([]);
        setSelectedInternIds(new Set());
        return;
      }
      setLoadingInterns(true);
      try {
        const res = await getMentorInterns(mentorId);
        if (res.ok && Array.isArray(res.data)) {
          const mapped = res.data.map((item) => ({
            ...item,
            avatar: item.avatar || getSavedAvatar(item.email, item.id, item.full_name),
          }));
          setInterns(mapped);
          // Mặc định chọn các TTS đang được gán cho mentor này
          const initiallyAssigned = new Set(
            mapped.filter((i) => i.is_assigned).map((i) => i.id)
          );
          setSelectedInternIds(initiallyAssigned);
        } else {
          setInterns([]);
          setSelectedInternIds(new Set());
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách TTS:', err);
        showToast('Không thể tải danh sách thực tập sinh.', 'error');
      } finally {
        setLoadingInterns(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (selectedMentorId) {
      loadInternsForMentor(selectedMentorId);
    }
  }, [selectedMentorId, loadInternsForMentor]);

  useEffect(() => {
    const handleAvatarChange = () => {
      if (selectedMentorId) {
        loadInternsForMentor(selectedMentorId);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('ictu_avatar_changed', handleAvatarChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ictu_avatar_changed', handleAvatarChange);
      }
    };
  }, [selectedMentorId, loadInternsForMentor]);

  // Mentor đang được chọn
  const currentMentor = useMemo(() => {
    return mentors.find((m) => m.id === Number(selectedMentorId)) || null;
  }, [mentors, selectedMentorId]);

  // Thống kê số lượng
  const stats = useMemo(() => {
    const unassignedCount = interns.filter((i) => !i.current_mentor_id).length;
    const assignedThisCount = interns.filter((i) => i.is_assigned).length;
    const totalCount = interns.length;
    return { unassignedCount, assignedThisCount, totalCount };
  }, [interns]);

  // Lọc danh sách TTS theo search và filterMode
  const filteredInterns = useMemo(() => {
    return interns.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.major && item.major.toLowerCase().includes(q)) ||
        (item.university && item.university.toLowerCase().includes(q));

      let matchesFilter = true;
      if (filterMode === 'unassigned') {
        matchesFilter = !item.current_mentor_id;
      } else if (filterMode === 'assigned_this') {
        matchesFilter = item.is_assigned;
      }

      return matchesSearch && matchesFilter;
    });
  }, [interns, searchQuery, filterMode]);

  // Danh sách các TTS có thể thao tác (chưa có mentor HOẶC thuộc về mentor đang chọn)
  const selectableVisibleInterns = useMemo(() => {
    return filteredInterns.filter(
      (i) => !i.current_mentor_id || i.current_mentor_id === selectedMentorId
    );
  }, [filteredInterns, selectedMentorId]);

  const hasDisabledInFiltered = useMemo(() => {
    return filteredInterns.some(
      (i) => i.current_mentor_id && i.current_mentor_id !== selectedMentorId
    );
  }, [filteredInterns, selectedMentorId]);

  // Toggle chọn 1 TTS (chỉ cho phép nếu chưa có mentor HOẶC thuộc mentor này)
  const toggleSelectIntern = (id) => {
    const target = interns.find((i) => i.id === id);
    if (target && target.current_mentor_id && target.current_mentor_id !== selectedMentorId) {
      showToast(
        `Thực tập sinh ${target.full_name} đã được phân công cho Mentor ${target.current_mentor_name || 'khác'}. Vui lòng chọn Mentor đó để hủy/đổi phân công.`,
        'info'
      );
      return;
    }

    setSelectedInternIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Chọn tất cả trong danh sách đang hiển thị (chỉ chọn các TTS khả dụng)
  const handleSelectAllVisible = () => {
    const selectableIds = selectableVisibleInterns.map((i) => i.id);
    if (selectableIds.length === 0) return;

    const allSelected = selectableIds.every((id) => selectedInternIds.has(id));

    setSelectedInternIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Bỏ chọn tất cả
  const handleClearAll = () => {
    setSelectedInternIds(new Set());
  };

  // Lưu phân công
  const handleSaveAssignment = async () => {
    if (!selectedMentorId) {
      showToast('Vui lòng chọn Mentor cần phân công.', 'error');
      return;
    }

    setSaving(true);
    try {
      const internIdsArray = Array.from(selectedInternIds);
      const res = await assignMentorInterns(selectedMentorId, internIdsArray);

      if (res.ok) {
        showToast(
          `✅ Phân công thành công! Mentor ${currentMentor?.full_name || ''} hiện phụ trách ${internIdsArray.length} thực tập sinh.`
        );

        // Đồng bộ thời gian thực sang HR Portal (Cập nhật KPI 3 và bảng Matching Matrix)
        syncMentorAssignment(
          Number(selectedMentorId),
          currentMentor?.full_name || 'Mentor',
          internIdsArray,
          'Dự án Core API Microservice & Quản lý TTS'
        );

        // Cập nhật lại số lượng trong state mentors
        setMentors((prev) =>
          prev.map((m) =>
            m.id === selectedMentorId ? { ...m, intern_count: internIdsArray.length } : m
          )
        );

        // Tải lại danh sách Interns để cập nhật trạng thái mới nhất
        await loadInternsForMentor(selectedMentorId);

        // Gọi callback nếu có
        if (onAssignmentSuccess) {
          onAssignmentSuccess(res.data, internIdsArray.length);
        }

        // Tự động đóng nếu đang ở modal mode
        if (isModalMode && onClose) {
          setTimeout(() => onClose(), 1200);
        }
      } else {
        showToast(res.data?.detail || 'Không thể lưu phân công thực tập sinh.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi phân công:', err);
      showToast('Lỗi máy chủ khi gửi dữ liệu phân công.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mentor-assignment-view ${isModalMode ? 'assignment-modal-mode' : ''}`}>
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`assignment-toast assignment-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'error' ? '✕ ' : '✓ '}
          {toast.message}
        </div>
      )}

      {/* Header Modal Mode */}
      {isModalMode && (
        <div className="assignment-modal-header">
          <div>
            <span className="assignment-badge">HR Tuyển dụng &amp; Điều phối</span>
            <h2>Phân công Thực tập sinh cho Mentor</h2>
            <p>Chọn Mentor chuyên môn và gán danh sách thực tập sinh cần hướng dẫn.</p>
          </div>
          {onClose && (
            <button
              type="button"
              className="assignment-close-btn"
              onClick={onClose}
              title="Đóng modal"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div className="assignment-view-body">
        {/* ======================================================= */}
        {/* FORM THỐNG NHẤT LIỀN KHỐI (UNIFIED FORM CONTAINER)      */}
        {/* ======================================================= */}
        <div className="assignment-unified-form">
          {/* ======================================================= */}
          {/* KHỐI 1: SELECT BOX CHỌN MENTOR & THÔNG TIN MENTOR       */}
          {/* ======================================================= */}
          <section className="assignment-form-section mentor-selection-section">
            <div className="card-header-row">
              <div className="card-header-title">
                <Users size={20} className="text-primary" />
                <h3>1. Chọn Mentor phụ trách</h3>
              </div>
              {currentMentor && (
                <span className="mentor-active-pill">
                  ● Đang quản lý: <strong>{currentMentor.intern_count || 0} TTS</strong>
                </span>
              )}
            </div>

            <div className="mentor-select-wrapper">
              <label htmlFor="mentor-select-box" className="assignment-label">
                Chọn Mentor trong danh sách: <span className="text-danger">*</span>
              </label>
              <div className="select-control-row">
                <select
                  id="mentor-select-box"
                  className="assignment-select-input"
                  value={selectedMentorId || ''}
                  onChange={(e) => setSelectedMentorId(Number(e.target.value))}
                  disabled={loadingMentors}
                >
                  {mentors.length === 0 ? (
                    <option value="">(Chưa có mentor nào trong hệ thống)</option>
                  ) : (
                    mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} — {m.department || 'Chưa phân bổ'} (Hiện có: {m.intern_count || 0} TTS)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Card chi tiết thông tin Mentor được chọn */}
            {currentMentor && (
              <div className="current-mentor-profile">
                <div className="mentor-profile-avatar" aria-hidden="true">
                  {initials(currentMentor.full_name)}
                </div>
                <div className="mentor-profile-info">
                  <div className="mentor-name-role">
                    <h4>{currentMentor.full_name}</h4>
                    <span className="mentor-dept-tag">{currentMentor.department}</span>
                  </div>
                  <div className="mentor-meta-grid">
                    <span className="mentor-meta-item">
                      <Mail size={13} /> {currentMentor.email}
                    </span>
                    {currentMentor.phone_number && (
                      <span className="mentor-meta-item">
                        📞 {currentMentor.phone_number}
                      </span>
                    )}
                    <span className="mentor-meta-item">
                      <GraduationCap size={13} /> Chức vụ: {currentMentor.position || 'Mentor chuyên môn'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ĐƯỜNG KẺ PHÂN CÁCH TINH TẾ GIỮA 2 PHẦN */}
          <div className="assignment-form-divider" />

          {/* ======================================================= */}
          {/* KHỐI 2: CHECKBOX LIST DANH SÁCH THỰC TẬP SINH           */}
          {/* ======================================================= */}
          <section className="assignment-form-section interns-selection-section">
            <div className="card-header-row">
              <div className="card-header-title">
                <UserCheck size={20} className="text-primary" />
                <h3>2. Danh sách Thực tập sinh phân công</h3>
              </div>
            </div>

            {/* Bộ lọc Tabs & Thanh tìm kiếm */}
            <div className="interns-toolbar">
              <div className="filter-pills-group">
                <button
                  type="button"
                  className={`filter-pill-btn ${
                    filterMode === 'unassigned' ? 'filter-pill-btn--active' : ''
                  }`}
                  onClick={() => setFilterMode('unassigned')}
                >
                  <span>Chưa có Mentor</span>
                  <span className="pill-badge pill-badge--warning">
                    {stats.unassignedCount}
                  </span>
                </button>

                <button
                  type="button"
                  className={`filter-pill-btn ${
                    filterMode === 'all' ? 'filter-pill-btn--active' : ''
                  }`}
                  onClick={() => setFilterMode('all')}
                >
                  <span>Tất cả Thực tập sinh</span>
                  <span className="pill-badge">{stats.totalCount}</span>
                </button>

                <button
                  type="button"
                  className={`filter-pill-btn ${
                    filterMode === 'assigned_this' ? 'filter-pill-btn--active' : ''
                  }`}
                  onClick={() => setFilterMode('assigned_this')}
                >
                  <span>Được phân công</span>
                  <span className="pill-badge pill-badge--success">
                    {stats.assignedThisCount}
                  </span>
                </button>
              </div>

              <div className="search-box-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  className="intern-search-input"
                  placeholder="Tìm theo tên, MSSV, ngành..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Select All Toolbar */}
            <div className="quick-select-bar">
              <button
                type="button"
                className="quick-select-action"
                onClick={handleSelectAllVisible}
                disabled={selectableVisibleInterns.length === 0}
              >
                {selectableVisibleInterns.length > 0 &&
                selectableVisibleInterns.every((i) => selectedInternIds.has(i.id)) ? (
                  <>
                    <CheckSquare size={16} className="text-primary" />
                    <span>
                      Bỏ chọn tất cả {hasDisabledInFiltered ? 'khả dụng ' : ''}({selectableVisibleInterns.length})
                    </span>
                  </>
                ) : (
                  <>
                    <Square size={16} />
                    <span>
                      Chọn tất cả {hasDisabledInFiltered ? 'khả dụng ' : 'đang hiển thị '}({selectableVisibleInterns.length})
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Danh sách Checkbox List */}
            <div className="interns-scroll-list">
              {loadingInterns ? (
                <div className="assignment-empty-state">
                  <Loader2 size={28} className="spin-icon text-primary" />
                  <p>Đang tải danh sách thực tập sinh...</p>
                </div>
              ) : filteredInterns.length === 0 ? (
                <div className="assignment-empty-state">
                  <AlertCircle size={32} className="text-muted" />
                  <h4>Không tìm thấy thực tập sinh nào phù hợp</h4>
                  <p>
                    {filterMode === 'unassigned'
                      ? 'Tuyệt vời! Tất cả thực tập sinh hiện đã được phân công Mentor hướng dẫn.'
                      : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.'}
                  </p>
                  {filterMode === 'unassigned' && (
                    <button
                      type="button"
                      className="assignment-btn assignment-btn--ghost"
                      onClick={() => setFilterMode('all')}
                    >
                      Xem tất cả thực tập sinh
                    </button>
                  )}
                </div>
              ) : (
                <div className="interns-checkbox-grid">
                  {filteredInterns.map((intern) => {
                    const isChecked = selectedInternIds.has(intern.id);
                    const isCurrentMentee = intern.is_assigned;
                    const hasOtherMentor = Boolean(
                      intern.current_mentor_id &&
                      intern.current_mentor_id !== selectedMentorId
                    );

                    return (
                      <div
                        key={intern.id}
                        className={`intern-checkbox-card ${
                          isChecked ? 'intern-checkbox-card--selected' : ''
                        } ${hasOtherMentor ? 'intern-checkbox-card--disabled' : ''}`}
                        onClick={() => {
                          if (!hasOtherMentor) {
                            toggleSelectIntern(intern.id);
                          }
                        }}
                        title={
                          hasOtherMentor
                            ? `Đã được phân công cho Mentor ${intern.current_mentor_name || 'khác'}. Vui lòng chọn Mentor đó để hủy/đổi phân công.`
                            : undefined
                        }
                      >
                        <div className="intern-card-checkbox">
                          <input
                            type="checkbox"
                            id={`intern-cb-${intern.id}`}
                            checked={isChecked}
                            disabled={hasOtherMentor}
                            onChange={() => {}} // handled by card onClick
                            aria-label={`Chọn ${intern.full_name}`}
                          />
                        </div>

                        <div className="intern-card-avatar" aria-hidden="true">
                          {(intern.avatar || getSavedAvatar(intern.email, intern.id, intern.full_name)) ? (
                            <img
                              src={intern.avatar || getSavedAvatar(intern.email, intern.id, intern.full_name)}
                              alt=""
                              className="intern-card-avatar-img"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                              }}
                            />
                          ) : null}
                          <span style={{ display: (intern.avatar || getSavedAvatar(intern.email, intern.id, intern.full_name)) ? 'none' : 'inline' }}>
                            {initials(intern.full_name)}
                          </span>
                        </div>

                        <div className="intern-card-content">
                          <div className="intern-card-top">
                            <strong className="intern-name">{intern.full_name}</strong>
                            <span className="intern-code-badge">{intern.code || `TTS000${intern.id}`}</span>
                          </div>

                          <div className="intern-meta-line">
                            <span className="intern-major">{intern.major || 'Công nghệ thông tin'}</span>
                            <span className="intern-uni">• {intern.university || 'ICTU'}</span>
                          </div>

                          <div className="intern-card-bottom">
                            <span className="intern-email">{intern.email}</span>

                            {/* Trạng thái phân công hiện tại */}
                            <div className="intern-status-tag">
                              {!intern.current_mentor_id ? (
                                <span className="status-pill status-pill--unassigned">
                                  Chưa có Mentor
                                </span>
                              ) : isCurrentMentee ? (
                                <span className="status-pill status-pill--current">
                                  Đang phụ trách
                                </span>
                              ) : (
                                <span
                                  className="status-pill status-pill--other"
                                  title={`Đã phân công cho Mentor ${intern.current_mentor_name || 'khác'}`}
                                >
                                  🔒 Mentor: {intern.current_mentor_name || 'Khác'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ======================================================= */}
          {/* KHỐI 3: THANH HÀNH ĐỘNG XÁC NHẬN PHÂN CÔNG (FOOTER)     */}
          {/* ======================================================= */}
          <footer className="assignment-action-bar">
            <div className="action-buttons-group">
              {isModalMode && onClose && (
                <button
                  type="button"
                  className="assignment-btn assignment-btn--ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  Hủy bỏ
                </button>
              )}

              <button
                type="button"
                className="assignment-btn assignment-btn--outline"
                onClick={handleClearAll}
                disabled={saving || selectedInternIds.size === 0}
              >
                <RotateCcw size={14} />
                <span>Bỏ chọn</span>
              </button>

              <button
                type="button"
                className="assignment-btn assignment-btn--primary"
                onClick={handleSaveAssignment}
                disabled={saving || !selectedMentorId}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Đang lưu phân công...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Xác nhận Phân công</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
