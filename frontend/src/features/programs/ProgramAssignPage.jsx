/**
 * ProgramAssignPage.jsx
 * Route: /hr/programs/:id/assign
 *
 * Chức năng HR gán Thực tập sinh (TTS) và Mentor vào kỳ thực tập:
 * - Chọn Mentor hướng dẫn (tùy chọn hoặc phân công cụ thể)
 * - Multi-select Thực tập sinh với tìm kiếm, lọc theo trường/ngành
 * - Kiểm tra giới hạn chỉ tiêu tiếp nhận (max_interns) của kỳ thực tập
 * - Xem danh sách thành viên đã gán trong kỳ, thay đổi Mentor hoặc gỡ khỏi kỳ
 * - Đồng bộ trạng thái thời gian thực và thông báo Toast
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserCheck,
  Building,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Sparkles,
  GraduationCap,
  CheckSquare,
  Square,
  RotateCcw,
  Unlock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  getPrograms,
  getProgramById,
  assignInternsToProgram,
  getProgramMembers,
  updateProgramMember,
  removeProgramMember,
  openProgram,
} from '../../api/programs';
import { getMentors } from '../../api/mentors';
import { getInterns } from '../../api/interns';
import { syncMentorAssignment, syncUnassignMentor } from '../../utils/realtimeSync';
import './ProgramAssignPage.css';

/** Định dạng ngày YYYY-MM-DD → DD/MM/YYYY */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/** Tạo chữ cái viết tắt cho Avatar */
function getInitials(fullName) {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProgramAssignPage() {
  const { id: paramProgramId } = useParams();
  const navigate = useNavigate();

  // ── State Data ──
  const [allPrograms, setAllPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(paramProgramId || '');
  const [program, setProgram] = useState(null);
  const [members, setMembers] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [allInterns, setAllInterns] = useState([]);

  // ── State Tabs & Form ──
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'members'
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());

  // ── State Filter & Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterUni, setFilterUni] = useState('');

  // ── State Status ──
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 1. Tải danh sách tất cả kỳ thực tập, Mentors và Interns
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [programsRes, mentorsRes, internsRes] = await Promise.all([
        getPrograms(),
        getMentors(),
        getInterns({ page_size: 150 }),
      ]);

      if (programsRes.ok && Array.isArray(programsRes.data)) {
        setAllPrograms(programsRes.data);
      }

      if (mentorsRes.ok && Array.isArray(mentorsRes.data)) {
        setMentors(mentorsRes.data);
      }

      let internsList = [];
      if (internsRes.ok && internsRes.data) {
        if (Array.isArray(internsRes.data.items)) {
          internsList = internsRes.data.items;
        } else if (Array.isArray(internsRes.data)) {
          internsList = internsRes.data;
        }
      }
      setAllInterns(internsList);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
      showToast('Không thể tải danh sách dữ liệu. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cập nhật selectedProgramId nếu URL params đổi
  useEffect(() => {
    if (paramProgramId) {
      setSelectedProgramId(paramProgramId);
    }
  }, [paramProgramId]);

  // 2. Tải chi tiết Program và danh sách Members khi chọn Program
  const loadProgramDetail = useCallback(async (progId) => {
    if (!progId) return;
    try {
      const [progRes, membersRes] = await Promise.all([
        getProgramById(progId),
        getProgramMembers(progId),
      ]);

      if (progRes.ok && progRes.data) {
        setProgram(progRes.data);
      }

      if (membersRes.ok && Array.isArray(membersRes.data)) {
        setMembers(membersRes.data);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin kỳ thực tập:', err);
      showToast('Lỗi khi tải chi tiết kỳ thực tập.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedProgramId) {
      loadProgramDetail(selectedProgramId);
    } else if (allPrograms.length > 0 && !selectedProgramId) {
      setSelectedProgramId(String(allPrograms[0].id));
    }
  }, [selectedProgramId, allPrograms, loadProgramDetail]);

  // ── Tính toán các chỉ số của kỳ thực tập ──
  const maxInterns = program?.max_interns || 50;
  const currentInternCount = members.length;
  const remainingSlots = Math.max(0, maxInterns - currentInternCount);
  const capacityPercent = Math.min(100, Math.round((currentInternCount / maxInterns) * 100));
  const isClosed = program?.status === 'closed';

  // ── Lọc danh sách TTS khả dụng (chưa có trong kỳ này) ──
  const memberUserIds = useMemo(() => {
    return new Set(members.map((m) => m.intern_user_id));
  }, [members]);

  // Lấy danh sách các trường và ngành duy nhất
  const uniqueUniversities = useMemo(() => {
    const unis = new Set();
    allInterns.forEach((i) => {
      if (i.university) unis.add(i.university);
    });
    return Array.from(unis);
  }, [allInterns]);

  const uniqueMajors = useMemo(() => {
    const majors = new Set();
    allInterns.forEach((i) => {
      if (i.major) majors.add(i.major);
    });
    return Array.from(majors);
  }, [allInterns]);

  // TTS chưa gán vào kỳ này và thỏa mãn tìm kiếm / lọc
  const availableInterns = useMemo(() => {
    return allInterns.filter((intern) => {
      // 1. Phải chưa có trong kỳ hiện tại
      if (memberUserIds.has(intern.id)) return false;

      // 2. Tìm kiếm từ khóa (tên, mã, email, trường)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (intern.full_name || '').toLowerCase().includes(q);
        const emailMatch = (intern.email || '').toLowerCase().includes(q);
        const codeMatch = (intern.code || intern.user_code || '').toLowerCase().includes(q);
        const uniMatch = (intern.university || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !codeMatch && !uniMatch) return false;
      }

      // 3. Lọc theo trường ĐH
      if (filterUni && intern.university !== filterUni) return false;

      // 4. Lọc theo chuyên ngành
      if (filterMajor && intern.major !== filterMajor) return false;

      return true;
    });
  }, [allInterns, memberUserIds, searchQuery, filterUni, filterMajor]);

  // Thông tin Mentor đang được chọn
  const currentSelectedMentor = useMemo(() => {
    if (!selectedMentorId) return null;
    return mentors.find((m) => String(m.id) === String(selectedMentorId)) || null;
  }, [mentors, selectedMentorId]);

  // ── Handlers Multi-Select TTS ──
  const handleToggleSelectOne = (internId) => {
    setSelectedInternIds((prev) => {
      const next = new Set(prev);
      if (next.has(internId)) {
        next.delete(internId);
      } else {
        next.add(internId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedInternIds((prev) => {
      const next = new Set(prev);
      availableInterns.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedInternIds(new Set());
  };

  // ── Submit Phân công vào kỳ ──
  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!program || !selectedProgramId) {
      showToast('Vui lòng chọn kỳ thực tập hợp lệ.', 'error');
      return;
    }

    if (isClosed) {
      showToast('Kỳ thực tập đã đóng, không thể phân công thêm thực tập sinh.', 'error');
      return;
    }

    if (selectedInternIds.size === 0) {
      showToast('Vui lòng chọn ít nhất một thực tập sinh để phân công.', 'error');
      return;
    }

    if (selectedInternIds.size > remainingSlots) {
      showToast(
        `Số lượng TTS đã chọn (${selectedInternIds.size}) vượt quá chỉ tiêu còn lại của kỳ (${remainingSlots} TTS).`,
        'error'
      );
      return;
    }

    const internIdsArray = Array.from(selectedInternIds);
    const mentorId = selectedMentorId ? Number(selectedMentorId) : null;

    setSubmitting(true);
    try {
      const res = await assignInternsToProgram(selectedProgramId, {
        intern_ids: internIdsArray,
        mentor_id: mentorId,
      });

      if (res.ok || res.status === 200 || res.status === 201) {
        showToast(
          res.data?.message ||
            `Đã gán thành công ${internIdsArray.length} thực tập sinh vào kỳ thực tập!`,
          'success'
        );

        // Phát sự kiện đồng bộ thời gian thực
        if (mentorId && currentSelectedMentor) {
          syncMentorAssignment(
            mentorId,
            currentSelectedMentor.full_name,
            internIdsArray,
            program.name
          );
        }

        setSelectedInternIds(new Set());
        // Làm mới dữ liệu
        await loadProgramDetail(selectedProgramId);
        setActiveTab('members');
      } else {
        showToast(res.data?.detail || 'Không thể gán thực tập sinh vào kỳ.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi phân công vào kỳ:', err);
      showToast(err.message || 'Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cập nhật Mentor cho TTS đã có trong kỳ ──
  const handleInlineChangeMentor = async (internId, newMentorId) => {
    try {
      const payload = {
        mentor_id: newMentorId ? Number(newMentorId) : null,
      };
      const res = await updateProgramMember(selectedProgramId, internId, payload);
      if (res.ok) {
        showToast('Đã cập nhật Mentor hướng dẫn thành công!', 'success');
        await loadProgramDetail(selectedProgramId);
      } else {
        showToast(res.data?.detail || 'Không thể đổi Mentor.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi đổi mentor:', err);
      showToast('Lỗi máy chủ khi cập nhật Mentor.', 'error');
    }
  };

  // ── Gỡ TTS khỏi kỳ thực tập ──
  const handleRemoveMember = async (member) => {
    const confirmMsg = `Bạn có chắc chắn muốn gỡ thực tập sinh "${member.intern_name}" khỏi kỳ thực tập "${program?.name}" không?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await removeProgramMember(selectedProgramId, member.intern_user_id);
      if (res.ok || res.status === 204) {
        syncUnassignMentor(member.intern_user_id);
        showToast(`Đã gỡ thực tập sinh "${member.intern_name}" khỏi kỳ thực tập!`, 'success');
        await loadProgramDetail(selectedProgramId);
      } else {
        showToast(res.data?.detail || 'Không thể gỡ thực tập sinh.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi gỡ thành viên:', err);
      showToast('Lỗi máy chủ khi gỡ thực tập sinh.', 'error');
    }
  };

  // ── Mở lại kỳ thực tập nếu đang đóng ──
  const handleReopenProgram = async () => {
    if (!program) return;
    try {
      const res = await openProgram(program.id);
      if (res.ok) {
        showToast(`Đã mở lại kỳ thực tập "${program.name}" thành công!`, 'success');
        await loadProgramDetail(program.id);
      } else {
        showToast(res.data?.detail || 'Không thể mở lại kỳ thực tập.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi mở lại kỳ.', 'error');
    }
  };

  return (
    <div className="program-assign-page">
      <div className="pa-wrapper">
        {/* Toast Alert */}
        {toast && (
          <div className={`pa-toast pa-toast--${toast.type}`} role="status">
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Top Bar & Breadcrumb ── */}
        <div className="pa-top-nav">
          <button
            type="button"
            className="pa-back-btn"
            onClick={() => navigate('/hr/programs')}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Danh sách kỳ thực tập</span>
          </button>

          <div className="pa-breadcrumb">
            <Link to="/hr/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
              HR Hub
            </Link>
            <ChevronRight size={14} />
            <Link to="/hr/programs" style={{ color: 'inherit', textDecoration: 'none' }}>
              Kỳ thực tập
            </Link>
            <ChevronRight size={14} />
            <span>Phân công TTS & Mentor</span>
          </div>
        </div>

        {/* ── Hero Info Card ── */}
        <div className="pa-hero-card">
          <div className="pa-hero-top">
            <div className="pa-hero-info">
              <div className="pa-hero-badge-group">
                <span className="pa-tag pa-tag--dept">
                  <Building size={12} />
                  {program?.department || 'Chưa phân ban'}
                </span>
                <span
                  className={`pa-tag ${isClosed ? 'pa-tag--status-closed' : 'pa-tag--status-open'}`}
                >
                  {isClosed ? 'Đã kết thúc / Đóng kỳ' : 'Đang mở tiếp nhận TTS'}
                </span>
              </div>

              <h1 className="pa-hero-title">
                {program?.name || 'Đang tải thông tin kỳ thực tập...'}
              </h1>

              <div className="pa-hero-meta">
                <div className="pa-hero-meta-item">
                  <Calendar size={15} />
                  <span>
                    Thời gian: {formatDate(program?.start_date)} → {formatDate(program?.end_date)}
                  </span>
                </div>
                {program?.description && (
                  <div className="pa-hero-meta-item">
                    <span>Mô tả: {program.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chỉ tiêu & Tiến độ tiếp nhận */}
            <div className="pa-capacity-box">
              <div className="pa-capacity-labels">
                <span className="pa-capacity-title">Chỉ tiêu tiếp nhận</span>
                <span className="pa-capacity-count">
                  {currentInternCount} / {maxInterns} TTS ({capacityPercent}%)
                </span>
              </div>

              <div className="pa-progress-track">
                <div
                  className={`pa-progress-fill ${
                    capacityPercent >= 100
                      ? 'pa-progress-fill--full'
                      : capacityPercent >= 80
                      ? 'pa-progress-fill--warn'
                      : 'pa-progress-fill--safe'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              <div className="pa-capacity-note">
                <span>Còn lại:</span>
                <strong>{remainingSlots} chỉ tiêu</strong>
                {remainingSlots === 0 && (
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>(Đã đủ số lượng)</span>
                )}
              </div>
            </div>
          </div>

          {/* Cảnh báo nếu kỳ đang đóng */}
          {isClosed && (
            <div className="pa-closed-banner">
              <div className="pa-closed-banner-left">
                <AlertTriangle size={18} />
                <span>
                  Kỳ thực tập này hiện đang <strong>Đóng</strong>. Bạn cần mở lại kỳ thực tập để có thể tiếp nhận thêm TTS mới.
                </span>
              </div>
              <button
                type="button"
                className="pa-action-btn-sm"
                onClick={handleReopenProgram}
                style={{ background: '#ffffff', color: '#92400e', borderColor: '#fde68a' }}
              >
                <Unlock size={14} />
                <span>Mở lại kỳ này</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Tabs Chuyển đổi: Phân công mới vs Thành viên đã gán ── */}
        <div className="pa-tabs">
          <button
            type="button"
            className={`pa-tab-btn ${activeTab === 'assign' ? 'pa-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('assign')}
          >
            <UserCheck size={16} />
            <span>Phân công mới (Gán TTS & Mentor)</span>
          </button>

          <button
            type="button"
            className={`pa-tab-btn ${activeTab === 'members' ? 'pa-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} />
            <span>Danh sách thành viên kỳ này</span>
            <span className="pa-tab-badge">{members.length} TTS</span>
          </button>
        </div>

        {/* ── TAB 1: PHÂN CÔNG MỚI ── */}
        {activeTab === 'assign' && (
          <div className="pa-assign-grid">
            {/* Cột trái: Chọn Mentor & Tổng quan submit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Bước 1: Chọn Mentor */}
              <div className="pa-card">
                <div className="pa-card-header">
                  <div>
                    <h3 className="pa-card-title">
                      <Sparkles size={16} color="#1877f2" />
                      Bước 1: Chọn Mentor hướng dẫn
                    </h3>
                    <p className="pa-card-desc">
                      Chỉ định Mentor đồng hành cùng các TTS được chọn vào kỳ.
                    </p>
                  </div>
                </div>

                <div className="pa-mentor-select-box">
                  <select
                    className="pa-select-input"
                    data-testid="mentor-select"
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                  >
                    <option value="">-- Chưa chỉ định Mentor (Gán sau) --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.department || 'Bộ phận chuyên môn'}) • Đang hướng dẫn:{' '}
                        {m.intern_count || 0}/5 TTS
                      </option>
                    ))}
                  </select>

                  {/* Card chi tiết Mentor được chọn */}
                  {currentSelectedMentor ? (
                    <div className="pa-mentor-preview">
                      <div className="pa-mentor-avatar">
                        {getInitials(currentSelectedMentor.full_name)}
                      </div>
                      <div className="pa-mentor-preview-info">
                        <div className="pa-mentor-preview-name">
                          {currentSelectedMentor.full_name}
                        </div>
                        <div className="pa-mentor-preview-dept">
                          {currentSelectedMentor.department || 'Bộ phận kỹ thuật'} •{' '}
                          {currentSelectedMentor.position || 'Mentor'}
                        </div>
                        <div className="pa-mentor-preview-load">
                          Tải hướng dẫn: {currentSelectedMentor.intern_count || 0}/5 TTS
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#64748b',
                        border: '1px dashed #cbd5e1',
                      }}
                    >
                      💡 Bạn có thể gán TTS vào kỳ trước, sau đó chỉ định Mentor chi tiết trong tab "Danh sách thành viên".
                    </div>
                  )}
                </div>
              </div>

              {/* Bước 3: Tổng quan & Nút Submit */}
              <div className="pa-card">
                <div className="pa-card-header">
                  <h3 className="pa-card-title">
                    <CheckCircle2 size={16} color="#10b981" />
                    Bước 3: Tổng quan phân công
                  </h3>
                </div>

                <div className="pa-summary-card">
                  <div className="pa-summary-row">
                    <span className="pa-summary-row-label">Kỳ thực tập:</span>
                    <span className="pa-summary-row-val">{program?.name || '—'}</span>
                  </div>
                  <div className="pa-summary-row">
                    <span className="pa-summary-row-label">Mentor hướng dẫn:</span>
                    <span className="pa-summary-row-val" style={{ color: '#1877f2' }}>
                      {currentSelectedMentor ? currentSelectedMentor.full_name : 'Chưa chỉ định'}
                    </span>
                  </div>
                  <div className="pa-summary-row">
                    <span className="pa-summary-row-label">Số TTS đã chọn:</span>
                    <span
                      className="pa-summary-row-val"
                      style={{
                        fontSize: '16px',
                        color: selectedInternIds.size > remainingSlots ? '#ef4444' : '#10b981',
                      }}
                    >
                      {selectedInternIds.size} TTS
                    </span>
                  </div>
                  <div className="pa-summary-row">
                    <span className="pa-summary-row-label">Chỉ tiêu còn lại:</span>
                    <span className="pa-summary-row-val">{remainingSlots} TTS</span>
                  </div>

                  {/* Cảnh báo số lượng */}
                  {selectedInternIds.size > remainingSlots ? (
                    <div className="pa-capacity-alert pa-capacity-alert--error">
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>
                        Số lượng đã chọn ({selectedInternIds.size}) vượt quá chỉ tiêu còn lại ({remainingSlots} TTS)! Vui lòng bỏ chọn bớt.
                      </span>
                    </div>
                  ) : selectedInternIds.size > 0 ? (
                    <div className="pa-capacity-alert pa-capacity-alert--ok">
                      <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      <span>Đủ điều kiện tiếp nhận vào kỳ thực tập.</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="pa-submit-btn"
                  disabled={
                    submitting ||
                    isClosed ||
                    selectedInternIds.size === 0 ||
                    selectedInternIds.size > remainingSlots
                  }
                  onClick={handleAssignSubmit}
                >
                  <UserCheck size={18} />
                  <span>
                    {submitting
                      ? 'Đang xử lý phân công...'
                      : `Xác nhận gán ${selectedInternIds.size} TTS vào kỳ`}
                  </span>
                </button>
              </div>
            </div>

            {/* Cột phải: Chọn danh sách Thực tập sinh (Multi-select) */}
            <div className="pa-card">
              <div className="pa-card-header">
                <div>
                  <h3 className="pa-card-title">
                    <Users size={16} color="#1877f2" />
                    Bước 2: Chọn Thực tập sinh ({selectedInternIds.size} đã chọn)
                  </h3>
                  <p className="pa-card-desc">
                    Tích chọn một hoặc nhiều thực tập sinh trong danh sách khả dụng để gán vào kỳ.
                  </p>
                </div>

                {/* Nút Chọn / Bỏ chọn nhanh */}
                <div className="pa-select-actions">
                  <button
                    type="button"
                    className="pa-action-btn-sm"
                    onClick={handleSelectAllVisible}
                    disabled={availableInterns.length === 0}
                  >
                    <CheckSquare size={13} />
                    <span>Chọn tất cả ({availableInterns.length})</span>
                  </button>
                  <button
                    type="button"
                    className="pa-action-btn-sm"
                    onClick={handleDeselectAll}
                    disabled={selectedInternIds.size === 0}
                  >
                    <RotateCcw size={13} />
                    <span>Bỏ chọn tất cả</span>
                  </button>
                </div>
              </div>

              {/* Toolbar Tìm kiếm & Lọc */}
              <div className="pa-toolbar">
                <div className="pa-search-wrapper">
                  <Search size={15} className="pa-search-icon" />
                  <input
                    type="text"
                    className="pa-search-input"
                    placeholder="Tìm theo họ tên, mã TTS, email, trường..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="pa-filter-group">
                  <select
                    className="pa-filter-select"
                    value={filterUni}
                    onChange={(e) => setFilterUni(e.target.value)}
                  >
                    <option value="">Tất cả trường ĐH</option>
                    {uniqueUniversities.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>

                  <select
                    className="pa-filter-select"
                    value={filterMajor}
                    onChange={(e) => setFilterMajor(e.target.value)}
                  >
                    <option value="">Tất cả chuyên ngành</option>
                    {uniqueMajors.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bảng danh sách TTS khả dụng */}
              <div className="pa-table-scroll">
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th className="pa-td-check">
                        <button
                          type="button"
                          className="pa-checkbox-btn"
                          onClick={() => {
                            if (selectedInternIds.size === availableInterns.length && availableInterns.length > 0) {
                              handleDeselectAll();
                            } else {
                              handleSelectAllVisible();
                            }
                          }}
                          title="Chọn/Bỏ chọn tất cả"
                        >
                          {selectedInternIds.size > 0 && selectedInternIds.size === availableInterns.length ? (
                            <CheckSquare size={18} color="#1877f2" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th>Thực tập sinh</th>
                      <th>Mã TTS</th>
                      <th>Trường Đại học</th>
                      <th>Chuyên ngành</th>
                      <th style={{ textAlign: 'center' }}>GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="pa-empty-state">
                          Đang tải danh sách thực tập sinh...
                        </td>
                      </tr>
                    ) : availableInterns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="pa-empty-state">
                          <Users size={32} color="#94a3b8" />
                          <span>Không tìm thấy thực tập sinh phù hợp.</span>
                        </td>
                      </tr>
                    ) : (
                      availableInterns.map((intern) => {
                        const isSelected = selectedInternIds.has(intern.id);
                        return (
                          <tr
                            key={intern.id}
                            className={isSelected ? 'pa-tr--selected' : ''}
                            onClick={() => handleToggleSelectOne(intern.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="pa-td-check" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`pa-checkbox-btn ${isSelected ? 'pa-checkbox-btn--checked' : ''}`}
                                onClick={() => handleToggleSelectOne(intern.id)}
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                            </td>
                            <td>
                              <div className="pa-user-cell">
                                <div className="pa-avatar-circle">
                                  {getInitials(intern.full_name)}
                                </div>
                                <div className="pa-user-info">
                                  <span className="pa-user-name">
                                    {intern.full_name || 'TTS Chưa đặt tên'}
                                  </span>
                                  <span className="pa-user-sub">{intern.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="pa-badge-sub">
                                {intern.code || intern.user_code || `TTS${String(intern.id).padStart(4, '0')}`}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <GraduationCap size={13} color="#64748b" />
                                <span>{intern.university || 'ICTU'}</span>
                              </div>
                            </td>
                            <td>{intern.major || 'Công nghệ thông tin'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {intern.gpa ? Number(intern.gpa).toFixed(2) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: THÀNH VIÊN ĐÃ GÁN VÀO KỲ ── */}
        {activeTab === 'members' && (
          <div className="pa-card">
            <div className="pa-card-header">
              <div>
                <h3 className="pa-card-title">
                  <Users size={16} color="#1877f2" />
                  Danh sách thành viên kỳ thực tập ({members.length} TTS)
                </h3>
                <p className="pa-card-desc">
                  Danh sách các thực tập sinh đã tham gia kỳ này cùng Mentor phụ trách tương ứng. Bạn có thể thay đổi Mentor hoặc gỡ TTS khỏi kỳ bất cứ lúc nào.
                </p>
              </div>

              <button
                type="button"
                className="pa-action-btn-sm"
                onClick={() => setActiveTab('assign')}
              >
                <UserCheck size={14} />
                <span>+ Gán thêm TTS vào kỳ</span>
              </button>
            </div>

            <div className="pa-table-scroll">
              <table className="pa-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Thực tập sinh</th>
                    <th>Mã TTS</th>
                    <th>Chuyên ngành & Trường</th>
                    <th>Mentor phụ trách</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="pa-empty-state">
                        <Users size={36} color="#94a3b8" />
                        <span>Kỳ thực tập này hiện chưa có thực tập sinh nào.</span>
                        <button
                          type="button"
                          className="pa-submit-btn"
                          style={{ height: '36px', padding: '0 16px', fontSize: '13px', marginTop: '8px' }}
                          onClick={() => setActiveTab('assign')}
                        >
                          <UserCheck size={16} />
                          <span>Gán TTS & Mentor ngay</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    members.map((member, idx) => (
                      <tr key={member.id || member.intern_user_id}>
                        <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <div className="pa-user-cell">
                            <div className="pa-avatar-circle">
                              {getInitials(member.intern_name)}
                            </div>
                            <div className="pa-user-info">
                              <span className="pa-user-name">{member.intern_name}</span>
                              <span className="pa-user-sub">{member.intern_email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="pa-badge-sub">
                            {member.intern_code || `TTS${String(member.intern_user_id).padStart(4, '0')}`}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{member.major || 'Kỹ thuật phần mềm'}</span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {member.university || 'ICTU'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="pa-mentor-cell">
                            <select
                              className="pa-mentor-select-sm"
                              value={member.mentor_user_id || ''}
                              onChange={(e) =>
                                handleInlineChangeMentor(member.intern_user_id, e.target.value)
                              }
                              title="Thay đổi Mentor hướng dẫn"
                            >
                              <option value="">-- Chưa gán Mentor --</option>
                              {mentors.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.full_name} ({m.department || 'Chuyên môn'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="pa-tag"
                            style={{
                              background:
                                member.status === 'completed'
                                  ? '#dcfce7'
                                  : member.status === 'dropped_out'
                                  ? '#fef2f2'
                                  : member.status === 'failed'
                                  ? '#fff1f2'
                                  : '#eff6ff',
                              color:
                                member.status === 'completed'
                                  ? '#15803d'
                                  : member.status === 'dropped_out'
                                  ? '#991b1b'
                                  : member.status === 'failed'
                                  ? '#be123c'
                                  : '#1d4ed8',
                              border: 'none',
                            }}
                          >
                            {member.status === 'completed'
                              ? 'Đã hoàn thành'
                              : member.status === 'dropped_out'
                              ? 'Bỏ cuộc'
                              : member.status === 'failed'
                              ? 'Không đạt'
                              : 'Đang thực tập'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="pa-btn-remove"
                            onClick={() => handleRemoveMember(member)}
                            title="Gỡ thực tập sinh khỏi kỳ thực tập này"
                          >
                            <Trash2 size={12} />
                            <span>Gỡ</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
