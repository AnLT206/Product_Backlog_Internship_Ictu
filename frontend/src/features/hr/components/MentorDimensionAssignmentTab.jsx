import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  School,
  Calendar,
  Building2,
  Users,
  UserPlus,
  CheckSquare,
  Square,
  X,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Check,
  Award,
  Layers,
  HelpCircle,
  Edit3,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import {
  getDimensionsSummary,
  getInternsByDimension,
  batchAssignByDimension,
  unassignMentorRole,
  updateInternMentors,
  getMentors,
} from '../../../api/mentors';
import './MentorDimensionAssignmentTab.css';

const ROLE_OPTIONS = [
  { value: 'primary', label: '⭐️ Mentor chính (Primary)', desc: 'Chịu trách nhiệm học vụ & đánh giá kỳ' },
  { value: 'technical', label: '🛠 Mentor kỹ thuật (Technical)', desc: 'Hướng dẫn code, review PR, kiến trúc' },
  { value: 'co_mentor', label: '👥 Mentor đồng hành (Co-mentor)', desc: 'Hỗ trợ sát sao, trao đổi công việc hàng ngày' },
  { value: 'advisor', label: '💡 Cố vấn chuyên môn (Advisor)', desc: 'Định hướng nghề nghiệp & tư vấn chuyên sâu' },
];

export default function MentorDimensionAssignmentTab() {
  // State 4 chiều dữ liệu
  const [dimensionsSummary, setDimensionsSummary] = useState(null);
  const [activeDimensionType, setActiveDimensionType] = useState('major'); // 'major' | 'class' | 'intake' | 'department'
  const [activeDimensionValue, setActiveDimensionValue] = useState('');
  const [internsData, setInternsData] = useState([]);
  const [mentorsList, setMentorsList] = useState([]);

  // Selection & Form State
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);
  const [selectedRoleType, setSelectedRoleType] = useState('primary');
  const [assignmentMode, setAssignmentMode] = useState('append'); // 'append' | 'replace'
  const [selectedInternIds, setSelectedInternIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Chỉnh sửa phân công cho từng TTS
  const [editingIntern, setEditingIntern] = useState(null);
  const [editMentorsList, setEditMentorsList] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null); // { type: 'success' | 'error', message: string }

  // 1. Tải dữ liệu tổng hợp và danh sách Mentor ban đầu
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, mentorRes] = await Promise.all([
        getDimensionsSummary(),
        getMentors(),
      ]);

      if (sumRes.ok && sumRes.data) {
        setDimensionsSummary(sumRes.data);
      }
      if (mentorRes.ok && mentorRes.data) {
        const mentors = Array.isArray(mentorRes.data)
          ? mentorRes.data
          : mentorRes.data.mentors || [];
        setMentorsList(mentors);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khởi tạo phân công theo nhóm:', err);
      setAlertInfo({ type: 'error', message: 'Không thể kết nối máy chủ để tải dữ liệu nhóm.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Xác định danh sách giá trị theo dimensionType hiện tại
  const currentDimensionList = useMemo(() => {
    if (!dimensionsSummary) return [];
    if (activeDimensionType === 'major') return dimensionsSummary.majors || [];
    if (activeDimensionType === 'class') return dimensionsSummary.classes || [];
    if (activeDimensionType === 'intake') return dimensionsSummary.intakes || [];
    if (activeDimensionType === 'department') return dimensionsSummary.departments || [];
    return [];
  }, [dimensionsSummary, activeDimensionType]);

  // 3. Tự động chọn giá trị đầu tiên khi chuyển tab tiêu chí
  useEffect(() => {
    if (currentDimensionList.length > 0) {
      const exists = currentDimensionList.some((item) => item.value === activeDimensionValue);
      if (!exists) {
        setActiveDimensionValue(currentDimensionList[0].value);
      }
    } else {
      setActiveDimensionValue('');
    }
  }, [currentDimensionList, activeDimensionValue]);

  // 4. Tải danh sách TTS của tiêu chí đang chọn
  const loadInternsForDimension = useCallback(async (dimType, dimVal) => {
    if (!dimType || !dimVal) {
      setInternsData([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getInternsByDimension(dimType, dimVal);
      if (res.ok && res.data) {
        setInternsData(res.data.interns || []);
        setSelectedInternIds([]); // Reset selection
      } else {
        setInternsData([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách TTS theo tiêu chí:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeDimensionType && activeDimensionValue) {
      loadInternsForDimension(activeDimensionType, activeDimensionValue);
    }
  }, [activeDimensionType, activeDimensionValue, loadInternsForDimension]);

  // 5. Lọc TTS theo ô tìm kiếm
  const filteredInterns = useMemo(() => {
    if (!searchQuery.trim()) return internsData;
    const q = searchQuery.toLowerCase();
    return internsData.filter(
      (it) =>
        (it.full_name && it.full_name.toLowerCase().includes(q)) ||
        (it.email && it.email.toLowerCase().includes(q)) ||
        (it.code && it.code.toLowerCase().includes(q)) ||
        (it.class_name && it.class_name.toLowerCase().includes(q))
    );
  }, [internsData, searchQuery]);

  // 6. Xử lý chọn/bỏ chọn checkbox TTS
  const handleToggleSelectAll = () => {
    if (selectedInternIds.length === filteredInterns.length) {
      setSelectedInternIds([]);
    } else {
      setSelectedInternIds(filteredInterns.map((i) => i.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedInternIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 7. Xử lý chọn Mentor (Multi-select)
  const handleToggleMentor = (mentorId) => {
    setSelectedMentorIds((prev) =>
      prev.includes(mentorId) ? prev.filter((m) => m !== mentorId) : [...prev, mentorId]
    );
  };

  // 8. Thực hiện Phân công (Batch Assignment 1-N & N-N)
  const handleExecuteAssignment = async () => {
    if (selectedMentorIds.length === 0) {
      setAlertInfo({ type: 'error', message: 'Vui lòng chọn ít nhất một Mentor cần phân công.' });
      return;
    }
    if (!activeDimensionValue) {
      setAlertInfo({ type: 'error', message: 'Chưa có tiêu chí nhóm nào được chọn.' });
      return;
    }

    setIsSubmitting(true);
    setAlertInfo(null);
    try {
      const payload = {
        dimension_type: activeDimensionType,
        dimension_value: activeDimensionValue,
        mentor_ids: selectedMentorIds,
        role_type: selectedRoleType,
        assignment_mode: assignmentMode,
        target_intern_ids: selectedInternIds.length > 0 ? selectedInternIds : null,
      };

      const res = await batchAssignByDimension(payload);
      if (res.ok) {
        setAlertInfo({
          type: 'success',
          message: res.data?.message || 'Phân công Mentor thành công!',
        });
        // Tải lại dữ liệu
        await Promise.all([
          getDimensionsSummary().then((r) => r.ok && setDimensionsSummary(r.data)),
          loadInternsForDimension(activeDimensionType, activeDimensionValue),
        ]);
        setSelectedMentorIds([]);
        setSelectedInternIds([]);
      } else {
        setAlertInfo({
          type: 'error',
          message: res.data?.detail || 'Không thể thực hiện phân công. Vui lòng thử lại.',
        });
      }
    } catch (err) {
      console.error('Lỗi phân công Mentor:', err);
      setAlertInfo({ type: 'error', message: 'Lỗi hệ thống khi gọi phân công Mentor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Gỡ bỏ một vai trò Mentor khỏi TTS
  const handleUnassignRole = async (mentorId, internId, roleType, mentorName) => {
    const roleLabel = ROLE_OPTIONS.find((r) => r.value === roleType)?.label || roleType;
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ vai trò "${roleLabel}" của Mentor ${mentorName} khỏi TTS này?`)) {
      return;
    }

    try {
      const res = await unassignMentorRole({
        mentor_id: mentorId,
        intern_id: internId,
        role_type: roleType,
      });
      if (res.ok) {
        setAlertInfo({ type: 'success', message: 'Đã hủy phân công thành công.' });
        await Promise.all([
          getDimensionsSummary().then((r) => r.ok && setDimensionsSummary(r.data)),
          loadInternsForDimension(activeDimensionType, activeDimensionValue),
        ]);
      } else {
        setAlertInfo({ type: 'error', message: res.data?.detail || 'Không thể hủy vai trò.' });
      }
    } catch (err) {
      console.error('Lỗi khi hủy vai trò:', err);
    }
  };

  // 10. Mở Modal Chỉnh sửa phân công Mentor cho TTS
  const handleOpenEditModal = (intern) => {
    setEditingIntern(intern);
    if (intern.mentors && intern.mentors.length > 0) {
      setEditMentorsList(
        intern.mentors.map((m) => ({
          mentor_id: m.mentor_id,
          role_type: m.role_type || 'primary',
        }))
      );
    } else {
      setEditMentorsList(
        mentorsList.length > 0 ? [{ mentor_id: mentorsList[0].id, role_type: 'primary' }] : []
      );
    }
  };

  const handleCloseEditModal = () => {
    setEditingIntern(null);
    setEditMentorsList([]);
  };

  const handleAddEditRow = () => {
    const available = mentorsList.find(
      (m) => !editMentorsList.some((em) => em.mentor_id === m.id)
    );
    const newId = available ? available.id : (mentorsList[0]?.id || 1);
    setEditMentorsList((prev) => [...prev, { mentor_id: newId, role_type: 'technical' }]);
  };

  const handleRemoveEditRow = (index) => {
    setEditMentorsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditRowChange = (index, field, value) => {
    setEditMentorsList((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveEditMentors = async () => {
    if (!editingIntern) return;
    setIsSubmitting(true);
    try {
      const res = await updateInternMentors(editingIntern.id, editMentorsList);
      if (res.ok) {
        setAlertInfo({
          type: 'success',
          message: `Đã cập nhật phân công Mentor cho thực tập sinh ${editingIntern.full_name} thành công!`,
        });
        handleCloseEditModal();
        await Promise.all([
          getDimensionsSummary().then((r) => r.ok && setDimensionsSummary(r.data)),
          loadInternsForDimension(activeDimensionType, activeDimensionValue),
        ]);
      } else {
        setAlertInfo({
          type: 'error',
          message: res.data?.detail || 'Không thể lưu thay đổi phân công.',
        });
      }
    } catch (err) {
      console.error('Lỗi lưu phân công:', err);
      setAlertInfo({ type: 'error', message: 'Lỗi hệ thống khi cập nhật phân công.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dimension-assignment-container" data-testid="dimension-assignment-section">
      {/* ── ALERTS BANNER ── */}
      {alertInfo && (
        <div className={`dim-alert ${alertInfo.type}`} role="alert">
          {alertInfo.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alertInfo.message}</span>
          <button
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={() => setAlertInfo(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TOP STATS CARDS ── */}
      <div className="dimension-summary-cards">
        <div
          className={`dim-stat-card ${activeDimensionType === 'major' ? 'is-active' : ''}`}
          onClick={() => setActiveDimensionType('major')}
        >
          <div className="dim-icon-wrapper major">
            <GraduationCap size={26} />
          </div>
          <div className="dim-info">
            <span className="dim-title">Khối Chuyên môn</span>
            <span className="dim-count">{dimensionsSummary?.majors?.length || 0} Ngành</span>
            <span className="dim-subtext">Click để điều phối theo Khối</span>
          </div>
        </div>

        <div
          className={`dim-stat-card ${activeDimensionType === 'class' ? 'is-active' : ''}`}
          onClick={() => setActiveDimensionType('class')}
        >
          <div className="dim-icon-wrapper class">
            <School size={26} />
          </div>
          <div className="dim-info">
            <span className="dim-title">Lớp Sinh hoạt</span>
            <span className="dim-count">{dimensionsSummary?.classes?.length || 0} Lớp</span>
            <span className="dim-subtext">Click để điều phối theo Lớp</span>
          </div>
        </div>

        <div
          className={`dim-stat-card ${activeDimensionType === 'intake' ? 'is-active' : ''}`}
          onClick={() => setActiveDimensionType('intake')}
        >
          <div className="dim-icon-wrapper intake">
            <Calendar size={26} />
          </div>
          <div className="dim-info">
            <span className="dim-title">Khóa Tuyển sinh</span>
            <span className="dim-count">{dimensionsSummary?.intakes?.length || 0} Khóa</span>
            <span className="dim-subtext">Click để điều phối theo Khóa</span>
          </div>
        </div>

        <div
          className={`dim-stat-card ${activeDimensionType === 'department' ? 'is-active' : ''}`}
          onClick={() => setActiveDimensionType('department')}
        >
          <div className="dim-icon-wrapper department">
            <Building2 size={26} />
          </div>
          <div className="dim-info">
            <span className="dim-title">Ban / Phòng ban</span>
            <span className="dim-count">{dimensionsSummary?.departments?.length || 0} Ban</span>
            <span className="dim-subtext">Click để điều phối theo Ban</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION & VALUE SELECTOR ── */}
      <div className="dimension-nav-bar">
        <div className="dim-tabs">
          <button
            type="button"
            className={`dim-tab-btn ${activeDimensionType === 'major' ? 'is-active' : ''}`}
            onClick={() => setActiveDimensionType('major')}
          >
            <GraduationCap size={16} /> Khối (Ngành)
          </button>
          <button
            type="button"
            className={`dim-tab-btn ${activeDimensionType === 'class' ? 'is-active' : ''}`}
            onClick={() => setActiveDimensionType('class')}
          >
            <School size={16} /> Lớp sinh hoạt
          </button>
          <button
            type="button"
            className={`dim-tab-btn ${activeDimensionType === 'intake' ? 'is-active' : ''}`}
            onClick={() => setActiveDimensionType('intake')}
          >
            <Calendar size={16} /> Khóa tuyển sinh
          </button>
          <button
            type="button"
            className={`dim-tab-btn ${activeDimensionType === 'department' ? 'is-active' : ''}`}
            onClick={() => setActiveDimensionType('department')}
          >
            <Building2 size={16} /> Ban chuyên trách
          </button>
        </div>

        <div className="dim-value-selector">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Chọn nhóm cụ thể:
          </label>
          <select
            className="dim-select-input"
            value={activeDimensionValue}
            onChange={(e) => setActiveDimensionValue(e.target.value)}
          >
            {currentDimensionList.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value} ({item.total_interns} TTS - {item.assigned_interns} đã gán)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ACTION CONTROL PANEL (1-N & N-N COORDINATION HUB) ── */}
      <div className="dim-control-panel">
        <div className="dim-panel-header">
          <div className="dim-panel-title">
            <Sparkles size={18} color="#2563eb" />
            <span>Khung Điều phối Mentor (1-N & N-N Đa vai trò)</span>
          </div>
          <div className="dim-panel-badge">
            Đang chọn: <strong>{activeDimensionValue || 'Chưa chọn'}</strong> ({internsData.length} TTS)
          </div>
        </div>

        <div className="dim-form-grid">
          {/* 1. Chọn Mentor (Multi-select) */}
          <div className="dim-form-group">
            <label className="dim-form-label">
              1. Chọn Mentor ({selectedMentorIds.length} đã chọn):
            </label>
            <div className="dim-mentor-multiselect">
              {mentorsList.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8', padding: '6px' }}>
                  Không có Mentor nào khả dụng
                </span>
              ) : (
                mentorsList.map((m) => {
                  const isChecked = selectedMentorIds.includes(m.id);
                  return (
                    <label key={m.id} className="dim-mentor-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMentor(m.id)}
                      />
                      <span>
                        <strong>{m.full_name || m.email}</strong> ({m.department || 'ICTU'})
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Chọn vai trò Mentor */}
          <div className="dim-form-group">
            <label className="dim-form-label">2. Vai trò phân công:</label>
            <select
              className="dim-select"
              value={selectedRoleType}
              onChange={(e) => setSelectedRoleType(e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {ROLE_OPTIONS.find((r) => r.value === selectedRoleType)?.desc}
            </span>
          </div>

          {/* 3. Chế độ phân công (1-N hay N-N) */}
          <div className="dim-form-group">
            <label className="dim-form-label">3. Chế độ phân công:</label>
            <select
              className="dim-select"
              value={assignmentMode}
              onChange={(e) => setAssignmentMode(e.target.value)}
            >
              <option value="append">Gán bổ sung (N-N Co-mentoring)</option>
              <option value="replace">Ghi đè vai trò (1-N)</option>
            </select>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {assignmentMode === 'append'
                ? 'Giữ nguyên các Mentor khác của TTS, bổ sung thêm Mentor này.'
                : 'Thay thế tất cả Mentor có cùng vai trò này.'}
            </span>
          </div>

          {/* 4. Nút hành động */}
          <div>
            <button
              type="button"
              className="btn-assign-dim"
              disabled={isSubmitting || selectedMentorIds.length === 0 || internsData.length === 0}
              onClick={handleExecuteAssignment}
            >
              <UserPlus size={16} />
              <span>
                {selectedInternIds.length > 0
                  ? `Phân công (${selectedInternIds.length} TTS)`
                  : `Phân công cho cả nhóm (${internsData.length} TTS)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH TTS THEO TIÊU CHÍ (MULTI-MENTOR TABLE) ── */}
      <div className="dim-table-card">
        <div className="dim-table-header">
          <div className="dim-table-title">
            <Users size={18} color="#475569" />
            <span>Danh sách Thực tập sinh thuộc nhóm ({filteredInterns.length})</span>
          </div>

          <div className="dim-search-box">
            <Search size={16} className="dim-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã TTS, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="dim-table-wrapper">
          <table className="dim-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      filteredInterns.length > 0 &&
                      selectedInternIds.length === filteredInterns.length
                    }
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th>Mã TTS</th>
                <th>Họ và Tên</th>
                <th>Khối / Ngành</th>
                <th>Lớp</th>
                <th>Khóa</th>
                <th>Ban tiếp nhận</th>
                <th>Mentors phụ trách (N-N)</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {isLoading
                      ? 'Đang tải danh sách thực tập sinh...'
                      : 'Không có thực tập sinh nào thuộc tiêu chí này.'}
                  </td>
                </tr>
              ) : (
                filteredInterns.map((intern) => {
                  const isChecked = selectedInternIds.includes(intern.id);
                  return (
                    <tr key={intern.id} style={{ background: isChecked ? '#f0f9ff' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(intern.id)}
                        />
                      </td>
                      <td>
                        <strong style={{ color: '#0369a1' }}>{intern.code || `TTS-${intern.id}`}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.full_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{intern.email}</div>
                      </td>
                      <td>{intern.major || '—'}</td>
                      <td>{intern.class_name || '—'}</td>
                      <td>{intern.academic_year || '—'}</td>
                      <td>
                        {intern.departments && intern.departments.length > 0
                          ? intern.departments.join(', ')
                          : '—'}
                      </td>
                      <td>
                        <div className="mentor-badges-container">
                          {intern.mentors && intern.mentors.length > 0 ? (
                            intern.mentors.map((m) => (
                              <span key={m.id} className={`mentor-role-badge ${m.role_type}`}>
                                <span>
                                  {m.role_type === 'primary' && '⭐️'}
                                  {m.role_type === 'technical' && '🛠'}
                                  {m.role_type === 'co_mentor' && '👥'}
                                  {m.role_type === 'advisor' && '💡'}{' '}
                                  {m.mentor_name}
                                </span>
                                <button
                                  type="button"
                                  className="btn-remove-mentor-role"
                                  title="Gỡ vai trò này"
                                  onClick={() =>
                                    handleUnassignRole(m.mentor_id, intern.id, m.role_type, m.mentor_name)
                                  }
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="no-mentors-tag">Chưa có Mentor</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-edit-intern"
                          title="Chỉnh sửa phân công Mentor cho TTS này"
                          onClick={() => handleOpenEditModal(intern)}
                        >
                          <Edit3 size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL CHỈNH SỬA PHÂN CÔNG MENTOR (CHO TỪNG TTS) ── */}
      {editingIntern && (
        <div className="dim-modal-overlay" role="dialog" aria-modal="true">
          <div className="dim-modal-dialog">
            <div className="dim-modal-header">
              <div className="dim-modal-title">
                <Edit3 size={18} color="#2563eb" />
                <span>Chỉnh sửa Phân công Mentor</span>
              </div>
              <button
                type="button"
                className="dim-modal-close"
                onClick={handleCloseEditModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dim-modal-body">
              <div className="dim-modal-intern-info">
                <div>
                  <strong>TTS:</strong> {editingIntern.full_name} ({editingIntern.code || `TTS-${editingIntern.id}`})
                </div>
                <div>
                  <strong>Lớp:</strong> {editingIntern.class_name || '—'}
                </div>
                <div>
                  <strong>Khối:</strong> {editingIntern.major || '—'}
                </div>
              </div>

              <div>
                <label className="dim-form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Danh sách Mentor phụ trách (Quan hệ 1-N hoặc N-N):
                </label>

                {editMentorsList.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: '8px 0' }}>
                    Chưa có Mentor nào được phân công cho TTS này.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {editMentorsList.map((row, idx) => (
                      <div key={idx} className="dim-edit-mentor-row">
                        <select
                          className="dim-select"
                          value={row.mentor_id}
                          onChange={(e) =>
                            handleEditRowChange(idx, 'mentor_id', Number(e.target.value))
                          }
                        >
                          {mentorsList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name || m.email} ({m.department || 'ICTU'})
                            </option>
                          ))}
                        </select>

                        <select
                          className="dim-select"
                          value={row.role_type}
                          onChange={(e) =>
                            handleEditRowChange(idx, 'role_type', e.target.value)
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="btn-remove-edit-row"
                          title="Gỡ Mentor này khỏi TTS"
                          onClick={() => handleRemoveEditRow(idx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-add-mentor-row"
                    onClick={handleAddEditRow}
                  >
                    <Plus size={15} />
                    <span>Thêm Mentor phụ trách (Đồng hướng dẫn N-N)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="dim-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCloseEditModal}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-save"
                disabled={isSubmitting}
                onClick={handleSaveEditMentors}
              >
                <Save size={15} />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
