import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Building,
  Mail,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getMentors, assignMentor } from '../../api/mentors';
import { getInterns } from '../../api/interns';
import { syncMentorAssignment, getRealtimeSyncState, subscribeRealtimeEvents } from '../../utils/realtimeSync';
import './MentorAssignmentPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & INITIAL MOCK DATA (CHUẨN 3 TRƯỜNG HỢP MÀU: XANH <80%, CAM 80%, ĐỎ 100%)
   ───────────────────────────────────────────────────────────────────────────── */
const MAX_INTERNS_PER_MENTOR = 5;

const INITIAL_MENTORS = [
  {
    id: 3,
    full_name: 'Trần Hoàng Quân',
    email: 'mentor@ictu.edu.vn',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
    position: 'Senior Fullstack Tech Lead',
    current_interns: 2, // 2/5 = 40% -> XANH (Success)
    max_interns: MAX_INTERNS_PER_MENTOR,
  },
  {
    id: 4,
    full_name: 'Phạm Quốc Hướng',
    email: 'mentor2@ictu.edu.vn',
    department: 'Kiểm thử chất lượng (QA/QC)',
    position: 'QA Lead & Automation Specialist',
    current_interns: 4, // 4/5 = 80% -> CAM (Warning)
    max_interns: MAX_INTERNS_PER_MENTOR,
  },
  {
    id: 11,
    full_name: 'Vũ Đình Tuấn',
    email: 'tuan.vd@ictu.edu.vn',
    department: 'Hạ tầng Cloud & DevOps',
    position: 'DevOps Architect',
    current_interns: 5, // 5/5 = 100% -> ĐỎ (Danger / Vô hiệu hóa)
    max_interns: MAX_INTERNS_PER_MENTOR,
  },
  {
    id: 12,
    full_name: 'Nguyễn Thị Thu Hương',
    email: 'huong.nt@ictu.edu.vn',
    department: 'Trí tuệ nhân tạo & Data Science',
    position: 'Data Science Lead',
    current_interns: 1, // 1/5 = 20% -> XANH (Success)
    max_interns: MAX_INTERNS_PER_MENTOR,
  },
];

const INITIAL_UNASSIGNED_INTERNS = [
  {
    id: 101,
    code: 'TTS1001',
    full_name: 'Hoàng Minh Tuấn',
    email: 'tuan.hm@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Kỹ thuật Phần mềm',
    gpa: 3.65,
    applied_date: '02/10/2026',
  },
  {
    id: 102,
    code: 'TTS1002',
    full_name: 'Đặng Thùy Dung',
    email: 'dung.dt@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Khoa học Dữ liệu & AI',
    gpa: 3.82,
    applied_date: '02/10/2026',
  },
  {
    id: 103,
    code: 'TTS1003',
    full_name: 'Nguyễn Đức Thắng',
    email: 'thang.nd@hust.edu.vn',
    university: 'ĐH Bách Khoa Hà Nội',
    major: 'Công nghệ Thông tin',
    gpa: 3.45,
    applied_date: '03/10/2026',
  },
  {
    id: 104,
    code: 'TTS1004',
    full_name: 'Phan Khánh Linh',
    email: 'linh.pk@uet.vnu.edu.vn',
    university: 'ĐH Công nghệ - ĐHQGHN',
    major: 'An toàn Thông tin',
    gpa: 3.70,
    applied_date: '04/10/2026',
  },
  {
    id: 105,
    code: 'TTS1005',
    full_name: 'Trần Văn Kiên',
    email: 'kien.tv@tnu.edu.vn',
    university: 'ĐH Kỹ thuật Công nghiệp Thái Nguyên',
    major: 'Kỹ thuật Phần mềm',
    gpa: 3.30,
    applied_date: '05/10/2026',
  },
  {
    id: 106,
    code: 'TTS1006',
    full_name: 'Bùi Lan Anh',
    email: 'anh.bl@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Hệ thống Thông tin',
    gpa: 3.58,
    applied_date: '06/10/2026',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER: TÍNH TOÁN LEVEL TẢI CÔNG VIỆC CỦA MENTOR
   ───────────────────────────────────────────────────────────────────────────── */
function getWorkloadStatus(current, max = MAX_INTERNS_PER_MENTOR) {
  const percentage = Math.round((current / max) * 100);
  const remaining = Math.max(0, max - current);

  if (current >= max) {
    return {
      percentage: 100,
      remaining: 0,
      isFull: true,
      colorVariant: 'danger', // ĐỎ (>= 100%)
      statusLabel: 'Đã đầy tải (Tối đa)',
      badgeClass: 'badge-workload--danger',
      barClass: 'progress-bar--danger',
    };
  }

  if (percentage >= 80) {
    return {
      percentage,
      remaining,
      isFull: false,
      colorVariant: 'warning', // CAM (>= 80%)
      statusLabel: `Gần đầy tải (Còn ${remaining} chỗ)`,
      badgeClass: 'badge-workload--warning',
      barClass: 'progress-bar--warning',
    };
  }

  return {
    percentage,
    remaining,
    isFull: false,
    colorVariant: 'success', // XANH (< 80%)
    statusLabel: `Khả dụng (Còn ${remaining} chỗ)`,
    badgeClass: 'badge-workload--success',
    barClass: 'progress-bar--success',
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT 1: MENTOR WORKLOAD CARD (PHẦN 1)
   ───────────────────────────────────────────────────────────────────────────── */
function MentorWorkloadCard({ mentor, onSelectForAssign }) {
  const status = getWorkloadStatus(mentor.current_interns, mentor.max_interns);
  const initials = (mentor.full_name || 'MT')
    .split(' ')
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`workload-card workload-card--${status.colorVariant}`}>
      <div className="workload-card-head">
        <div className="mentor-avatar-box">
          <span className="mentor-initials">{initials}</span>
        </div>
        <div className="mentor-info-col">
          <div className="mentor-name-row">
            <h4 className="mentor-full-name">{mentor.full_name}</h4>
            <span className={`workload-badge ${status.badgeClass}`}>
              {status.statusLabel}
            </span>
          </div>
          <p className="mentor-position">{mentor.position}</p>
          <p className="mentor-dept">
            <Building size={13} />
            <span>{mentor.department}</span>
          </p>
          <p className="mentor-email">
            <Mail size={13} />
            <span>{mentor.email}</span>
          </p>
        </div>
      </div>

      {/* Thanh tiến trình Progress Bar */}
      <div className="workload-progress-section">
        <div className="progress-labels-row">
          <span className="progress-title">Tải phân bổ TTS</span>
          <div className="progress-ratio">
            <strong>{mentor.current_interns}</strong>
            <span className="ratio-max">/{mentor.max_interns} TTS</span>
            <span className="ratio-pct">({status.percentage}%)</span>
          </div>
        </div>

        <div className="progress-track" role="progressbar" aria-valuenow={status.percentage} aria-valuemin="0" aria-valuemax="100">
          <div
            className={`progress-fill ${status.barClass}`}
            style={{ width: `${status.percentage}%` }}
          />
        </div>

        <div className="progress-footer-row">
          <span className="progress-rule-hint">
            {status.isFull
              ? '● Đã đạt giới hạn tối đa, không thể gán thêm sinh viên'
              : status.percentage >= 80
              ? '▲ Cảnh báo: Tải công việc cao, sắp đạt hạn mức'
              : '✔ Tải an toàn, sẵn sàng tiếp nhận thêm sinh viên'}
          </span>

          <button
            type="button"
            className="btn-quick-assign"
            onClick={() => onSelectForAssign(mentor.id)}
            disabled={status.isFull}
            title={status.isFull ? 'Mentor đã đầy tải' : 'Chọn mentor này để phân công'}
          >
            <span>{status.isFull ? 'Đã đủ chỉ tiêu' : 'Gán sinh viên'}</span>
            {!status.isFull && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: MentorAssignmentPage
   ───────────────────────────────────────────────────────────────────────────── */
export default function MentorAssignmentPage() {
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'workload' | 'assign'
  const [mentors, setMentors] = useState(INITIAL_MENTORS);
  const [unassignedInterns, setUnassignedInterns] = useState(INITIAL_UNASSIGNED_INTERNS);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Hiển thị thông báo Toast
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Tải dữ liệu thật từ Backend nếu có kết nối
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [mentorsRes, internsRes] = await Promise.all([
          getMentors(),
          getInterns({ page_size: 100 }),
        ]);

        if (!cancelled && mentorsRes.ok && Array.isArray(mentorsRes.data) && mentorsRes.data.length > 0) {
          const syncState = getRealtimeSyncState();
          const mergedMentors = mentorsRes.data.map((m) => {
            const countInSync = (syncState.mentorAssignments || []).filter(
              (a) => a.mentor_id === m.id
            ).length;
            return {
              id: m.id,
              full_name: m.full_name || 'Mentor',
              email: m.email,
              department: m.department || 'Trung tâm Phát triển Phần mềm ICTU',
              position: m.position || 'Mentor Hướng dẫn',
              current_interns: Math.max(m.intern_count || 0, countInSync),
              max_interns: MAX_INTERNS_PER_MENTOR,
            };
          });
          setMentors(mergedMentors);

          if (internsRes.ok) {
            const rawItems = Array.isArray(internsRes.data)
              ? internsRes.data
              : (internsRes.data?.items || []);
            const assignedIds = new Set(
              (syncState.mentorAssignments || []).flatMap((a) => a.intern_ids || [])
            );
            // Các TTS đã có phân công trong CSDL (TTS 1, 2, 3, 4)
            const dbAssignedIds = new Set([5, 6, 8, 9]);

            const realUnassigned = rawItems
              .filter((i) => {
                const isApproved = i.status === 'active' || i.status === 'approved';
                const notInSync = !assignedIds.has(i.id);
                const notInDb = !dbAssignedIds.has(i.id);
                return isApproved && notInSync && notInDb && i.email !== 'ungvien@ictu.edu.vn';
              })
              .map((i) => ({
                id: i.id,
                code: i.code || `TTS${String(i.id).padStart(4, '0')}`,
                full_name: i.full_name || 'Thực tập sinh',
                email: i.email,
                university: i.university || 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
                major: i.major || 'Khoa học máy tính',
                gpa: Number(i.gpa) || 3.8,
                applied_date: i.created_at ? i.created_at.split('T')[0] : '09/10/2026',
              }));

            if (realUnassigned.length > 0) {
              setUnassignedInterns(realUnassigned);
            }
          }
        }
      } catch (e) {
        // Fallback giữ nguyên
      }
    }

    loadData();
    const unsub = subscribeRealtimeEvents(loadData);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  // Chọn trước mentor đầu tiên còn slot khả dụng khi tải trang
  useEffect(() => {
    if (!selectedMentorId && mentors.length > 0) {
      const firstAvailable = mentors.find((m) => m.current_interns < m.max_interns);
      if (firstAvailable) {
        setSelectedMentorId(String(firstAvailable.id));
      } else {
        setSelectedMentorId(String(mentors[0].id));
      }
    }
  }, [mentors, selectedMentorId]);

  // Mentor đang được chọn trong dropdown
  const currentSelectedMentor = useMemo(() => {
    return mentors.find((m) => String(m.id) === String(selectedMentorId)) || null;
  }, [mentors, selectedMentorId]);

  // Trạng thái tải của mentor đang chọn
  const currentMentorWorkload = useMemo(() => {
    if (!currentSelectedMentor) return null;
    return getWorkloadStatus(currentSelectedMentor.current_interns, currentSelectedMentor.max_interns);
  }, [currentSelectedMentor]);

  // Danh sách TTS chưa có Mentor sau khi lọc tìm kiếm
  const filteredUnassignedInterns = useMemo(() => {
    if (!searchQuery.trim()) return unassignedInterns;
    const q = searchQuery.trim().toLowerCase();
    return unassignedInterns.filter(
      (item) =>
        item.full_name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.university.toLowerCase().includes(q) ||
        item.major.toLowerCase().includes(q)
    );
  }, [unassignedInterns, searchQuery]);

  // Xử lý tick chọn 1 TTS
  const handleToggleIntern = (internId) => {
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

  // Xử lý Select All / Deselect All
  const isAllSelected = useMemo(() => {
    if (filteredUnassignedInterns.length === 0) return false;
    return filteredUnassignedInterns.every((i) => selectedInternIds.has(i.id));
  }, [filteredUnassignedInterns, selectedInternIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInternIds(new Set());
    } else {
      const allIds = new Set(filteredUnassignedInterns.map((i) => i.id));
      setSelectedInternIds(allIds);
    }
  };

  // Khi click "Gán sinh viên" nhanh từ Thẻ Workload ở Phần 1
  const handleSelectMentorFromCard = (mentorId) => {
    setSelectedMentorId(String(mentorId));
    setActiveTab('both');
    // Cuộn xuống khu vực Phần 2
    const targetElement = document.getElementById('assign-section-target');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* ── LOGIC PHÂN CÔNG (CALL API & REALTIME SYNC) ── */
  const handleAssignSubmit = async () => {
    if (!selectedMentorId) {
      showToast('Vui lòng chọn Mentor trước khi phân công!', 'error');
      return;
    }

    if (selectedInternIds.size === 0) {
      showToast('Vui lòng tick chọn ít nhất 1 thực tập sinh!', 'error');
      return;
    }

    if (!currentSelectedMentor) return;

    const remainingSlots = currentMentorWorkload.remaining;
    if (selectedInternIds.size > remainingSlots) {
      showToast(
        `Không thể phân công: Bạn đã chọn ${selectedInternIds.size} TTS nhưng Mentor chỉ còn nhận thêm tối đa ${remainingSlots} chỗ!`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    const internIdsArray = Array.from(selectedInternIds);

    try {
      // 1. Gọi API POST /api/hr/assign-mentor
      const res = await assignMentor({
        mentor_id: Number(selectedMentorId),
        intern_ids: internIdsArray,
      });

      // 2. Cập nhật State Mentor ở Phần 1 (tăng số lượng TTS, tính lại Progress Bar)
      setMentors((prevMentors) =>
        prevMentors.map((m) => {
          if (String(m.id) === String(selectedMentorId)) {
            const nextCount = Math.min(m.max_interns, m.current_interns + internIdsArray.length);
            return {
              ...m,
              current_interns: nextCount,
            };
          }
          return m;
        })
      );

      // 3. Tự động xóa các TTS đó khỏi bảng chưa phân công ở Phần 2
      setUnassignedInterns((prevInterns) =>
        prevInterns.filter((i) => !selectedInternIds.has(i.id))
      );

      // 4. Reset checkbox selection
      setSelectedInternIds(new Set());

      // 5. Đồng bộ vào Realtime Store
      syncMentorAssignment(
        Number(selectedMentorId),
        currentSelectedMentor.full_name,
        internIdsArray,
        currentSelectedMentor.department
      );

      showToast(
        `Phân công thành công ${internIdsArray.length} thực tập sinh cho Mentor ${currentSelectedMentor.full_name}!`,
        'success'
      );
    } catch (err) {
      console.error('Lỗi khi phân công mentor:', err);
      showToast('Lỗi khi phân công mentor. Vui lòng thử lại!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mentor-assign-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`assign-toast assign-toast--${toast.type}`} role="alert">
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER TRANG ── */}
      <header className="assign-page-header">
        <div className="header-title-group">
          <div className="header-tag">
            <Sparkles size={14} />
            <span>Phân hệ Quản trị & Điều phối Nhân sự</span>
          </div>
          <h1 className="header-main-title">Phân công Hướng dẫn & Điều phối Tải công việc Mentor</h1>
          <p className="header-desc">
            Theo dõi tải công việc thực tế (Workload), kiểm soát giới hạn tiếp nhận tối đa {MAX_INTERNS_PER_MENTOR} TTS/Mentor và phân công sinh viên hàng loạt.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="assign-tabs-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'both' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('both')}
          >
            <SlidersHorizontal size={15} />
            <span>Toàn bộ Dashboard</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'workload' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('workload')}
          >
            <Users size={15} />
            <span>Phần 1: Tải công việc Mentor ({mentors.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'assign' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('assign')}
          >
            <UserCheck size={15} />
            <span>Phần 2: Gán Mentor ({unassignedInterns.length} chưa phân công)</span>
          </button>
        </div>
      </header>

      {/* ── PHẦN 1: THEO DÕI TẢI CÔNG VIỆC MENTOR (WORKLOAD) ── */}
      {(activeTab === 'both' || activeTab === 'workload') && (
        <section className="workload-section" aria-label="Phần 1: Theo dõi tải công việc Mentor">
          <div className="section-header-row">
            <div>
              <div className="section-title-badge">PHẦN 1</div>
              <h2 className="section-title">Theo dõi tải công việc Mentor (Workload Monitoring)</h2>
              <p className="section-desc">
                Tỷ lệ lấp đầy hiển thị màu sắc theo quy tắc: <strong>Xanh (&lt;80%)</strong>, <strong>Cam (&ge;80%)</strong> và <strong>Đỏ (Đạt 100% tối đa - Vô hiệu hóa)</strong>.
              </p>
            </div>
            <div className="workload-summary-pills">
              <span className="summary-pill pill--success">
                ● Khả dụng: {mentors.filter((m) => m.current_interns / m.max_interns < 0.8).length}
              </span>
              <span className="summary-pill pill--warning">
                ▲ Tải cao: {mentors.filter((m) => {
                  const r = m.current_interns / m.max_interns;
                  return r >= 0.8 && r < 1;
                }).length}
              </span>
              <span className="summary-pill pill--danger">
                ■ Đầy tải: {mentors.filter((m) => m.current_interns >= m.max_interns).length}
              </span>
            </div>
          </div>

          <div className="workload-cards-grid">
            {mentors.map((mentor) => (
              <MentorWorkloadCard
                key={mentor.id}
                mentor={mentor}
                onSelectForAssign={handleSelectMentorFromCard}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── PHẦN 2: GÁN MENTOR CHO THỰC TẬP SINH ── */}
      {(activeTab === 'both' || activeTab === 'assign') && (
        <section id="assign-section-target" className="assign-section" aria-label="Phần 2: Gán Mentor cho Thực tập sinh">
          <div className="section-header-row">
            <div>
              <div className="section-title-badge">PHẦN 2</div>
              <h2 className="section-title">Gán Mentor cho Thực tập sinh (Batch Assignment)</h2>
              <p className="section-desc">
                Chọn Mentor tiếp nhận, tick chọn danh sách Thực tập sinh chưa có Mentor và bấm nút "Phân công".
              </p>
            </div>
          </div>

          <div className="assign-panel-card">
            {/* 1. KHU VỰC CHỌN MENTOR & NÚT PHÂN CÔNG */}
            <div className="assign-control-bar">
              <div className="mentor-select-group">
                <label htmlFor="mentor-dropdown" className="control-label">
                  <UserCheck size={16} />
                  <span>Chọn Mentor phụ trách:</span>
                </label>

                <div className="select-wrapper">
                  <select
                    id="mentor-dropdown"
                    className="mentor-select-input"
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                  >
                    <option value="" disabled>-- Vui lòng chọn Mentor --</option>
                    {mentors.map((m) => {
                      const st = getWorkloadStatus(m.current_interns, m.max_interns);
                      return (
                        <option
                          key={m.id}
                          value={m.id}
                          disabled={st.isFull}
                        >
                          {m.full_name} ({m.current_interns}/{m.max_interns} TTS {st.isFull ? '— ĐÃ ĐẦY 5/5' : `— Còn ${st.remaining} chỗ`})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Card tóm tắt trạng thái Mentor đang chọn */}
              {currentSelectedMentor && currentMentorWorkload && (
                <div className={`selected-mentor-status-box box--${currentMentorWorkload.colorVariant}`}>
                  <div className="status-box-header">
                    <strong>{currentSelectedMentor.full_name}</strong>
                    <span className="status-box-dept">({currentSelectedMentor.department})</span>
                  </div>
                  <div className="status-box-quota">
                    <span>Đang phụ trách: <strong>{currentSelectedMentor.current_interns}/{currentSelectedMentor.max_interns} TTS</strong></span>
                    <span className="quota-separator">•</span>
                    <span>Còn nhận thêm tối đa: <strong className="remaining-count">{currentMentorWorkload.remaining} sinh viên</strong></span>
                  </div>
                </div>
              )}

              {/* Nút Phân công & Cảnh báo hạn mức */}
              <div className="action-button-group">
                <button
                  type="button"
                  className="btn-submit-assign"
                  onClick={handleAssignSubmit}
                  disabled={
                    submitting ||
                    !selectedMentorId ||
                    selectedInternIds.size === 0 ||
                    currentMentorWorkload?.isFull ||
                    (selectedInternIds.size > (currentMentorWorkload?.remaining || 0))
                  }
                >
                  <UserCheck size={16} />
                  <span>
                    {submitting
                      ? 'Đang phân công...'
                      : selectedInternIds.size > 0
                      ? `Phân công (${selectedInternIds.size} TTS)`
                      : 'Phân công'}
                  </span>
                </button>

                {currentMentorWorkload && selectedInternIds.size > currentMentorWorkload.remaining && (
                  <div className="assign-quota-warning">
                    <AlertTriangle size={14} />
                    <span>Vượt quá hạn mức còn lại ({currentMentorWorkload.remaining} chỗ)!</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. THANH CÔNG CỤ TÌM KIẾM & BỘ ĐẾM */}
            <div className="table-filter-bar">
              <div className="search-box-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm kiếm sinh viên theo tên, mã TTS, trường hoặc chuyên ngành..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="selection-counter-badge">
                <span>Đã chọn: <strong>{selectedInternIds.size}</strong> / {unassignedInterns.length} TTS chưa gán</span>
                {selectedInternIds.size > 0 && (
                  <button
                    type="button"
                    className="btn-deselect-all"
                    onClick={() => setSelectedInternIds(new Set())}
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* 3. BẢNG DANH SÁCH THỰC TẬP SINH CHƯA CÓ MENTOR */}
            <div className="table-responsive-wrapper">
              <table className="unassigned-interns-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-checkbox-header"
                        onClick={handleToggleSelectAll}
                        title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        disabled={filteredUnassignedInterns.length === 0}
                      >
                        {isAllSelected ? (
                          <CheckSquare size={18} className="text-primary" />
                        ) : (
                          <Square size={18} className="text-slate" />
                        )}
                      </button>
                    </th>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '220px' }}>Họ và tên</th>
                    <th style={{ minWidth: '220px' }}>Trường Đại học</th>
                    <th style={{ minWidth: '180px' }}>Chuyên ngành</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Điểm GPA</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Ngày tiếp nhận</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedInterns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty-row">
                        <CheckCircle2 size={36} className="empty-success-icon" />
                        <h4 className="empty-title">Tuyệt vời! Tất cả thực tập sinh đã được phân công Mentor.</h4>
                        <p className="empty-subtitle">Hiện tại không còn sinh viên nào ở trạng thái chờ phân công.</p>
                      </td>
                    </tr>
                  ) : filteredUnassignedInterns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty-row">
                        <AlertCircle size={32} className="empty-icon" />
                        <h4 className="empty-title">Không tìm thấy sinh viên phù hợp</h4>
                        <p className="empty-subtitle">Thử tìm kiếm với từ khóa khác hoặc xóa ô tìm kiếm.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUnassignedInterns.map((intern, index) => {
                      const isSelected = selectedInternIds.has(intern.id);
                      return (
                        <tr
                          key={intern.id}
                          className={`intern-table-row ${isSelected ? 'row--selected' : ''}`}
                          onClick={() => handleToggleIntern(intern.id)}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn-row-checkbox"
                              onClick={() => handleToggleIntern(intern.id)}
                              aria-label={`Chọn ${intern.full_name}`}
                            >
                              {isSelected ? (
                                <CheckSquare size={18} className="text-primary" />
                              ) : (
                                <Square size={18} className="text-slate" />
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }} className="col-stt">
                            {index + 1}
                          </td>
                          <td>
                            <div className="intern-name-cell">
                              <strong className="intern-fullname">{intern.full_name}</strong>
                              <span className="intern-code-tag">{intern.code}</span>
                            </div>
                          </td>
                          <td>
                            <div className="school-cell">
                              <GraduationCap size={14} className="cell-icon" />
                              <span>{intern.university}</span>
                            </div>
                          </td>
                          <td>
                            <span className="major-text">{intern.major}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="gpa-pill">{intern.gpa.toFixed(2)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }} className="col-date">
                            {intern.applied_date}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-unassigned">Chờ phân công</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

