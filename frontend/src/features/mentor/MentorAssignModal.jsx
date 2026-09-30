import { useState, useEffect, useMemo } from 'react';
import { getMentorInterns, assignMentorInterns } from '../../api/mentors';
import './MentorAssignModal.css';

export default function MentorAssignModal({ mentor, onClose, onSuccess, onToast }) {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'assigned' | 'unassigned'

  useEffect(() => {
    let isMounted = true;
    async function loadInterns() {
      setLoading(true);
      try {
        const res = await getMentorInterns(mentor.id);
        if (isMounted) {
          if (res.ok && Array.isArray(res.data)) {
            setInterns(res.data);
            const initialSelected = new Set(
              res.data.filter((i) => i.is_assigned).map((i) => i.id)
            );
            setSelectedIds(initialSelected);
          } else {
            setInterns([]);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách TTS phân công:', err);
        if (isMounted) {
          onToast({ type: 'error', message: 'Không thể tải danh sách thực tập sinh.' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInterns();
    return () => {
      isMounted = false;
    };
  }, [mentor.id, onToast]);

  // Toggle selection
  function handleToggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Filtered list
  const filteredInterns = useMemo(() => {
    return interns.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.major && item.major.toLowerCase().includes(q));

      const isSelected = selectedIds.has(item.id);
      const isUnassigned = !item.current_mentor_id;

      let matchesFilter = true;
      if (filterType === 'assigned') {
        matchesFilter = isSelected;
      } else if (filterType === 'unassigned') {
        matchesFilter = isUnassigned;
      }

      return matchesSearch && matchesFilter;
    });
  }, [interns, searchQuery, filterType, selectedIds]);

  // Handle Save
  async function handleSave() {
    setSaving(true);
    try {
      const idsArray = Array.from(selectedIds);
      const res = await assignMentorInterns(mentor.id, idsArray);
      if (res.ok) {
        onToast({
          type: 'success',
          message: `Đã cập nhật phân bổ thành công! Mentor ${mentor.full_name} hiện phụ trách ${idsArray.length} thực tập sinh.`,
        });
        if (onSuccess) {
          onSuccess(res.data);
        }
        onClose();
      } else {
        onToast({
          type: 'error',
          message: res.data?.detail || 'Không thể lưu phân bổ thực tập sinh.',
        });
      }
    } catch {
      onToast({
        type: 'error',
        message: 'Đã xảy ra lỗi khi kết nối máy chủ.',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleSelectAll() {
    const allFiltered = new Set(selectedIds);
    filteredInterns.forEach((i) => allFiltered.add(i.id));
    setSelectedIds(allFiltered);
  }

  function handleDeselectAll() {
    const next = new Set(selectedIds);
    filteredInterns.forEach((i) => next.delete(i.id));
    setSelectedIds(next);
  }

  return (
    <div className="mentor-assign-overlay" role="dialog" aria-modal="true">
      <div className="mentor-assign-modal">
        {/* Header */}
        <div className="mentor-assign-header">
          <div>
            <div className="mentor-assign-badge">HR PHÂN BỔ MENTOR</div>
            <h2>Phân công TTS cho Mentor: <span>{mentor.full_name}</span></h2>
            <p className="mentor-assign-desc">
              Chọn các thực tập sinh mà HR muốn chỉ định cho Mentor <strong>{mentor.full_name}</strong> ({mentor.email}) trực tiếp hướng dẫn và đánh giá.
            </p>
          </div>
          <button
            type="button"
            className="mentor-assign-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="mentor-assign-toolbar">
          <div className="mentor-assign-search-wrap">
            <span className="mentor-assign-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo mã TTS, tên, email, ngành học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mentor-assign-search-input"
            />
          </div>

          <div className="mentor-assign-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Tất cả ({interns.length})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'assigned' ? 'active' : ''}`}
              onClick={() => setFilterType('assigned')}
            >
              Đang chọn ({selectedIds.size})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'unassigned' ? 'active' : ''}`}
              onClick={() => setFilterType('unassigned')}
            >
              Chưa có mentor
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mentor-assign-batch-actions">
          <span>
            Đã chọn: <strong className="highlight-count">{selectedIds.size}</strong> / {interns.length} thực tập sinh
          </span>
          <div className="batch-btns">
            <button type="button" onClick={handleSelectAll} className="btn-batch">
              + Chọn tất cả mục hiển thị
            </button>
            <button type="button" onClick={handleDeselectAll} className="btn-batch">
              ✕ Bỏ chọn mục hiển thị
            </button>
          </div>
        </div>

        {/* List of interns */}
        <div className="mentor-assign-body">
          {loading ? (
            <div className="mentor-assign-loading">
              <span className="loading-spinner" />
              <span>Đang tải danh sách thực tập sinh...</span>
            </div>
          ) : filteredInterns.length === 0 ? (
            <div className="mentor-assign-empty">
              Không tìm thấy thực tập sinh nào phù hợp.
            </div>
          ) : (
            <div className="interns-grid-list">
              {filteredInterns.map((intern) => {
                const isChecked = selectedIds.has(intern.id);
                const hasOtherMentor =
                  intern.current_mentor_id && intern.current_mentor_id !== mentor.id;

                return (
                  <label
                    key={intern.id}
                    className={`intern-check-card ${isChecked ? 'is-selected' : ''}`}
                  >
                    <div className="intern-check-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(intern.id)}
                        className="intern-checkbox"
                      />
                      <div className="intern-avatar-small">
                        {(intern.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="intern-info-block">
                        <div className="intern-name-row">
                          <span className="intern-code-pill">{intern.code || 'TTS'}</span>
                          <strong className="intern-name">{intern.full_name}</strong>
                        </div>
                        <div className="intern-meta-row">
                          <span>{intern.major || 'CNTT'}</span>
                          <span>•</span>
                          <span>{intern.university || 'ICTU'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="intern-status-col">
                      {isChecked ? (
                        <span className="mentor-assigned-badge badge--active">
                          ✓ Gán cho Mentor này
                        </span>
                      ) : hasOtherMentor ? (
                        <span className="mentor-assigned-badge badge--other" title={`Đang được hướng dẫn bởi ${intern.current_mentor_name}`}>
                          Đang gắn: {intern.current_mentor_name}
                        </span>
                      ) : (
                        <span className="mentor-assigned-badge badge--none">
                          Chưa phân công
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mentor-assign-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Đang lưu phân bổ...' : `Xác nhận phân bổ (${selectedIds.size} TTS)`}
          </button>
        </div>
      </div>
    </div>
  );
}
