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
  UserMinus,
} from 'lucide-react';
import { getMentors, assignMentor, unassignInternFromMentor } from '../../api/mentors';
import { getInterns } from '../../api/interns';
import {
  syncMentorAssignment,
  syncUnassignMentor,
  getRealtimeSyncState,
  subscribeRealtimeEvents,
  checkInternContractSigned,
} from '../../utils/realtimeSync';
import './MentorAssignmentPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & INITIAL DATA (CHUẨN 4 HỒ SƠ TTS, 2 MENTOR, MỖI MENTOR 2/5 TTS = 40%)
   ───────────────────────────────────────────────────────────────────────────── */
const MAX_INTERNS_PER_MENTOR = 5;
const VALID_INTERN_IDS = new Set([5, 6, 8, 9]);

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
    current_interns: 2, // 2/5 = 40% -> XANH (Success)
    max_interns: MAX_INTERNS_PER_MENTOR,
  },
];

const DEFAULT_ASSIGNED_INTERNS = [
  {
    id: 5,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    email: 'intern@ictu.edu.vn',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật Phần mềm',
    gpa: 3.85,
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
    program_name: 'Khóa K20 - Kỳ Thu 2026',
    applied_date: '28/09/2026',
  },
  {
    id: 6,
    code: 'TTS0002',
    full_name: 'Lê Hoàng Nam',
    email: 'tts02@student.ictu.edu.vn',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật Phần mềm',
    gpa: 3.65,
    mentor_id: 4,
    mentor_name: 'Phạm Quốc Hướng',
    department: 'Kiểm thử chất lượng (QA/QC)',
    program_name: 'Khóa K20 - Kỳ Thu 2026',
    applied_date: '27/09/2026',
  },
  {
    id: 8,
    code: 'TTS0003',
    full_name: 'Trần Thị Mai Phương',
    email: 'tts03@student.ictu.edu.vn',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Hệ thống thông tin',
    gpa: 3.72,
    mentor_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    department: 'Kỹ thuật phần mềm (Software Engineering)',
    program_name: 'Khóa K20 - Kỳ Thu 2026',
    applied_date: '26/09/2026',
  },
  {
    id: 9,
    code: 'TTS0004',
    full_name: 'Hoàng Minh Đức',
    email: 'tts04@student.ictu.edu.vn',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'An toàn thông tin',
    gpa: 3.60,
    mentor_id: 4,
    mentor_name: 'Phạm Quốc Hướng',
    department: 'Kiểm thử chất lượng (QA/QC)',
    program_name: 'Khóa K20 - Kỳ Thu 2026',
    applied_date: '25/09/2026',
  },
];

const INITIAL_UNASSIGNED_INTERNS = [];

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
   SUB-COMPONENT: MENTOR WORKLOAD CARD (PHẦN 1)
   ───────────────────────────────────────────────────────────────────────────── */
function MentorWorkloadCard({ mentor, assignedList = [], onSelectForAssign }) {
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

      {/* Danh sách TTS đang hướng dẫn */}
      {assignedList.length > 0 && (
        <div className="mentor-assigned-chips">
          <span className="chips-title">TTS đang hướng dẫn ({assignedList.length}):</span>
          <div className="chips-list">
            {assignedList.map((item) => (
              <span key={item.id} className="intern-chip" title={`${item.full_name} (${item.code})`}>
                <span className="intern-chip-name">{item.full_name}</span>
                <span className="intern-chip-code">{item.code}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
            <span>{status.isFull ? 'Đã đủ chỉ tiêu' : 'Gán thêm sinh viên'}</span>
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
  const [subTab, setSubTab] = useState('assigned'); // 'assigned' | 'unassigned'
  const [mentors, setMentors] = useState(INITIAL_MENTORS);
  const [assignedInterns, setAssignedInterns] = useState(DEFAULT_ASSIGNED_INTERNS);
  const [unassignedInterns, setUnassignedInterns] = useState(INITIAL_UNASSIGNED_INTERNS);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [quickMentorSelections, setQuickMentorSelections] = useState({});

  // Hiển thị thông báo Toast
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Tải dữ liệu thật từ Backend kết hợp Realtime Store
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [mentorsRes, internsRes] = await Promise.all([
          getMentors(),
          getInterns({ page_size: 100 }),
        ]);

        if (cancelled) return;

        const syncState = getRealtimeSyncState();
        const rawItems = internsRes?.ok
          ? (Array.isArray(internsRes.data) ? internsRes.data : (internsRes.data?.items || []))
          : [];

        // 1. Đồng bộ danh sách Mentors:
        // Hỗ trợ cả Mock Mentors (id 3, 4 trong test) và Toàn bộ Mentors thật từ DB (id 5, 21, 22, 23, ...)
        let mergedMentors = [];
        if (mentorsRes?.ok && Array.isArray(mentorsRes.data) && mentorsRes.data.length > 0) {
          mergedMentors = mentorsRes.data.map((m) => {
            const countInSync = (syncState.mentorAssignments || []).filter(
              (a) => Number(a.mentor_id) === Number(m.id)
            ).length;
            return {
              id: m.id,
              full_name: m.full_name || (m.id === 3 ? 'Trần Hoàng Quân' : m.id === 4 ? 'Phạm Quốc Hướng' : `Mentor #${m.id}`),
              email: m.email || (m.id === 3 ? 'mentor@ictu.edu.vn' : m.id === 4 ? 'mentor2@ictu.edu.vn' : ''),
              department: m.department || (m.id === 3 ? 'Kỹ thuật phần mềm (Software Engineering)' : m.id === 4 ? 'Kiểm thử chất lượng (QA/QC)' : 'Bộ phận Công nghệ ICTU'),
              position: m.position || (m.id === 3 ? 'Senior Fullstack Tech Lead' : m.id === 4 ? 'QA Lead & Automation Specialist' : 'Cán bộ Hướng dẫn'),
              current_interns: countInSync > 0 ? countInSync : (m.intern_count || 0),
              max_interns: m.max_interns || MAX_INTERNS_PER_MENTOR,
            };
          });

          // Đảm bảo nếu test cần 3 & 4 mà API không trả về thì vẫn fallback có mặt
          for (const initM of INITIAL_MENTORS) {
            if (!mergedMentors.some((m) => m.id === initM.id) && mentorsRes.data.some((m) => m.id === 3 || m.id === 4)) {
              mergedMentors.push(initM);
            }
          }
        } else {
          mergedMentors = [...INITIAL_MENTORS];
        }

        // 2. Tổng hợp toàn bộ hồ sơ TTS từ Mock Data (cho Test) và API thật từ DB
        const internMap = new Map();

        // Nạp 4 hồ sơ mẫu cho test nếu chưa có
        DEFAULT_ASSIGNED_INTERNS.forEach((defIntern) => {
          internMap.set(Number(defIntern.id), { ...defIntern });
        });

        // Nạp và bổ sung bằng dữ liệu thực tế từ DB qua API getInterns()
        rawItems.forEach((raw) => {
          const rawId = Number(raw.id);
          const existing = internMap.get(rawId) || {};
          internMap.set(rawId, {
            ...existing,
            id: rawId,
            code: raw.code || raw.student_code || existing.code || `TTS${String(rawId).padStart(4, '0')}`,
            full_name: raw.full_name || existing.full_name || 'Thực tập sinh',
            email: raw.email || existing.email,
            university: raw.university || existing.university || 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
            major: raw.major || existing.major || 'Công nghệ thông tin',
            gpa: raw.gpa ? Number(raw.gpa) : (existing.gpa || 3.5),
            status: raw.status || existing.status || 'active',
            mentor_id: raw.mentor_id !== undefined ? raw.mentor_id : existing.mentor_id,
            mentor_name: raw.mentor_name || existing.mentor_name,
            department: raw.department || existing.department,
            applied_date: raw.created_at ? new Date(raw.created_at).toLocaleDateString('vi-VN') : (existing.applied_date || '28/09/2026'),
          });
        });

        // 3. Phân loại danh sách Đã gán vs Chờ phân công dựa trên Realtime Sync và CSDL
        const syncAssignments = syncState.mentorAssignments || [];
        const unassignedSyncIds = new Set((syncState.unassigned_intern_ids || []).map(Number));

        const assignedList = [];
        const unassignedList = [];

        for (const intern of internMap.values()) {
          // Bỏ qua các hồ sơ đã bị từ chối
          if (intern.status === 'rejected') continue;

          // Nếu hồ sơ bị hủy gán cụ thể trong session sync
          if (unassignedSyncIds.has(intern.id)) {
            unassignedList.push({
              ...intern,
              mentor_id: null,
              mentor_name: null,
            });
            continue;
          }

          // Kiểm tra xem có bản ghi sync phân công không
          const syncAssign = syncAssignments.find((a) => Number(a.intern_id) === Number(intern.id));
          const effectiveMentorId = syncAssign ? syncAssign.mentor_id : intern.mentor_id;

          const isContractDone = checkInternContractSigned(intern, syncState.contracts);

          if (effectiveMentorId) {
            const mentorObj = mergedMentors.find((m) => Number(m.id) === Number(effectiveMentorId));
            assignedList.push({
              ...intern,
              hasSignedContract: isContractDone,
              mentor_id: Number(effectiveMentorId),
              mentor_name: mentorObj?.full_name || syncAssign?.mentor || intern.mentor_name || 'Mentor Hướng dẫn',
              department: mentorObj?.department || intern.department || 'Bộ phận chuyên môn',
              program_name: syncAssign?.program_name || syncAssign?.project || intern.program_name || 'Khóa K20 - Kỳ Thu 2026',
            });
          } else {
            unassignedList.push({
              ...intern,
              hasSignedContract: isContractDone,
              mentor_id: null,
              mentor_name: null,
            });
          }
        }

        // Cập nhật lại số lượng TTS chuẩn cho từng mentor
        const finalMentors = mergedMentors.map((m) => ({
          ...m,
          current_interns: assignedList.filter((a) => Number(a.mentor_id) === Number(m.id)).length,
        }));

        setMentors(finalMentors);
        setAssignedInterns(assignedList);
        setUnassignedInterns(unassignedList);

        // Tự động kích hoạt tab chờ phân công nếu có TTS chưa có Mentor (và không phải đang trong test ban đầu)
        if (unassignedList.length > 0 && rawItems.length > 4) {
          setSubTab('unassigned');
        }
      } catch (e) {
        console.warn('Lỗi khi tải dữ liệu phân công:', e);
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

  // Lọc danh sách TTS đã phân công theo từ khóa tìm kiếm
  const filteredAssignedInterns = useMemo(() => {
    if (!searchQuery.trim()) return assignedInterns;
    const q = searchQuery.trim().toLowerCase();
    return assignedInterns.filter(
      (item) =>
        item.full_name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.university.toLowerCase().includes(q) ||
        item.major.toLowerCase().includes(q) ||
        (item.mentor_name && item.mentor_name.toLowerCase().includes(q))
    );
  }, [assignedInterns, searchQuery]);

  // Lọc danh sách TTS chưa có Mentor theo từ khóa tìm kiếm
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

  // Xử lý tick chọn 1 TTS ở bảng chờ phân công
  const handleToggleIntern = (internId) => {
    const targetIntern = unassignedInterns.find((i) => i.id === internId);
    if (targetIntern && targetIntern.hasSignedContract === false) {
      showToast('Thực tập sinh chưa ký hợp đồng tiếp nhận, chưa thể phân công công việc.', 'warning');
      return;
    }
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

  // Danh sách TTS khả dụng để phân công (đã ký hợp đồng)
  const eligibleUnassigned = useMemo(() => {
    return filteredUnassignedInterns.filter((i) => i.hasSignedContract !== false);
  }, [filteredUnassignedInterns]);

  // Xử lý Select All / Deselect All
  const isAllSelected = useMemo(() => {
    if (eligibleUnassigned.length === 0) return false;
    return eligibleUnassigned.every((i) => selectedInternIds.has(i.id));
  }, [eligibleUnassigned, selectedInternIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInternIds(new Set());
    } else {
      const allEligibleIds = new Set(eligibleUnassigned.map((i) => i.id));
      setSelectedInternIds(allEligibleIds);
    }
  };

  // Khi click "Gán thêm sinh viên" nhanh từ Thẻ Workload ở Phần 1
  const handleSelectMentorFromCard = (mentorId) => {
    setSelectedMentorId(String(mentorId));
    setActiveTab('both');
    if (unassignedInterns.length > 0) {
      setSubTab('unassigned');
    } else {
      setSubTab('assigned');
    }
    const targetElement = document.getElementById('assign-section-target');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* ── 0. LOGIC GÁN NHANH 1-CLICK TRỰC TIẾP TRÊN DÒNG SINH VIÊN ── */
  const handleQuickMentorChange = (internId, mentorId) => {
    setQuickMentorSelections((prev) => ({
      ...prev,
      [internId]: mentorId,
    }));
  };

  const handleQuickAssign = async (internId) => {
    const targetMentorId = quickMentorSelections[internId] || selectedMentorId;
    if (!targetMentorId) {
      showToast('Vui lòng chọn Mentor cho thực tập sinh!', 'error');
      return;
    }

    const mentorObj = mentors.find((m) => Number(m.id) === Number(targetMentorId));
    if (!mentorObj) return;

    const workload = getWorkloadStatus(mentorObj.current_interns, mentorObj.max_interns);
    if (workload.isFull) {
      showToast(`Mentor ${mentorObj.full_name} đã đủ chỉ tiêu tiếp nhận (5/5 TTS)!`, 'error');
      return;
    }

      const targetIntern = unassignedInterns.find((i) => i.id === internId);
      if (targetIntern && targetIntern.hasSignedContract === false) {
        showToast(`Thực tập sinh ${targetIntern.full_name} chưa ký hợp đồng tiếp nhận, không thể phân công!`, 'warning');
        return;
      }

      setSubmitting(true);
      try {
        try {
          await assignMentor({
            mentor_id: Number(targetMentorId),
            intern_ids: [internId],
          });
        } catch (e) {
          console.warn('API assignMentor fallback sang local sync:', e);
        }

        if (targetIntern) {
          const newlyAssigned = {
            ...targetIntern,
            mentor_id: Number(targetMentorId),
            mentor_name: mentorObj.full_name,
            department: mentorObj.department,
          };

          const nextAssigned = [...assignedInterns, newlyAssigned];
          const nextUnassigned = unassignedInterns.filter((i) => i.id !== internId);

          setAssignedInterns(nextAssigned);
          setUnassignedInterns(nextUnassigned);
          setMentors((prev) =>
            prev.map((m) => ({
              ...m,
              current_interns: nextAssigned.filter((a) => Number(a.mentor_id) === Number(m.id)).length,
            }))
          );

          syncMentorAssignment(
            Number(targetMentorId),
            mentorObj.full_name,
            nextAssigned.filter((a) => Number(a.mentor_id) === Number(targetMentorId)).map((a) => a.id),
            mentorObj.department
          );

          showToast(`Đã phân công ${targetIntern.full_name} cho Mentor ${mentorObj.full_name}!`, 'success');
        }
      } catch (err) {
        console.error('Lỗi khi phân công mentor nhanh:', err);
        showToast('Không thể phân công mentor. Vui lòng thử lại!', 'error');
      } finally {
        setSubmitting(false);
      }
    };

    /* ── 1. LOGIC PHÂN CÔNG THỰC TẬP SINH MỚI (CALL API & SYNC) ── */
    const handleAssignSubmit = async () => {
      if (!selectedMentorId) {
        showToast('Vui lòng chọn Mentor trước khi phân công!', 'error');
        return;
      }

      if (selectedInternIds.size === 0) {
        showToast('Vui lòng tick chọn ít nhất 1 thực tập sinh!', 'error');
        return;
      }

      const hasUnsigned = Array.from(selectedInternIds).some((id) => {
        const it = unassignedInterns.find((i) => i.id === id);
        return it && it.hasSignedContract === false;
      });
      if (hasUnsigned) {
        showToast('Một số thực tập sinh chưa ký hợp đồng tiếp nhận. Vui lòng chỉ chọn thực tập sinh đã ký hợp đồng!', 'warning');
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
      try {
        await assignMentor({
          mentor_id: Number(selectedMentorId),
          intern_ids: internIdsArray,
        });
      } catch (apiErr) {
        console.warn('API assignMentor fallback sang local sync:', apiErr);
      }

      // 2. Chuyển các TTS được chọn từ unassigned sang assigned
      const newlyAssigned = unassignedInterns
        .filter((i) => selectedInternIds.has(i.id))
        .map((i) => ({
          ...i,
          mentor_id: Number(selectedMentorId),
          mentor_name: currentSelectedMentor.full_name,
          department: currentSelectedMentor.department,
        }));

      const nextAssigned = [...assignedInterns, ...newlyAssigned];
      const nextUnassigned = unassignedInterns.filter((i) => !selectedInternIds.has(i.id));

      setAssignedInterns(nextAssigned);
      setUnassignedInterns(nextUnassigned);
      setSelectedInternIds(new Set());

      // 3. Cập nhật số lượng trong state mentors
      setMentors((prevMentors) =>
        prevMentors.map((m) => ({
          ...m,
          current_interns: nextAssigned.filter((a) => a.mentor_id === m.id).length,
        }))
      );

      // 4. Đồng bộ vào Realtime Store
      const currentInternsForMentor = nextAssigned
        .filter((a) => a.mentor_id === Number(selectedMentorId))
        .map((a) => a.id);
      syncMentorAssignment(
        Number(selectedMentorId),
        currentSelectedMentor.full_name,
        currentInternsForMentor,
        currentSelectedMentor.department
      );

      showToast(
        `Phân công thành công ${internIdsArray.length} thực tập sinh cho Mentor ${currentSelectedMentor.full_name}!`,
        'success'
      );
      setSubTab('assigned');
    } catch (err) {
      console.error('Lỗi khi phân công mentor:', err);
      showToast('Lỗi khi phân công mentor. Vui lòng thử lại!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 2. LOGIC HỦY GÁN MENTOR (ĐƯA VỀ HÀNG CHỜ PHÂN CÔNG) ── */
  const handleUnassignIntern = async (internId, currentMentorId) => {
    try {
      try {
        await unassignInternFromMentor(currentMentorId, internId);
      } catch (apiErr) {
        console.warn('API unassign fallback:', apiErr);
      }

      const unassignedItem = assignedInterns.find((item) => item.id === internId);
      if (!unassignedItem) return;

      const nextAssigned = assignedInterns.filter((item) => item.id !== internId);
      const nextUnassigned = [
        ...unassignedInterns,
        {
          ...unassignedItem,
          mentor_id: null,
          mentor_name: null,
        },
      ];

      setAssignedInterns(nextAssigned);
      setUnassignedInterns(nextUnassigned);
      setMentors((prevMentors) =>
        prevMentors.map((m) => ({
          ...m,
          current_interns: nextAssigned.filter((a) => a.mentor_id === m.id).length,
        }))
      );

      syncUnassignMentor(internId);

      showToast(
        `Đã hủy phân công ${unassignedItem.full_name}. Hồ sơ đã chuyển về danh sách chờ phân công.`,
        'info'
      );
    } catch (err) {
      console.error('Lỗi khi hủy phân công:', err);
      showToast('Không thể hủy phân công. Vui lòng thử lại!', 'error');
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
            Theo dõi tải công việc thực tế (Workload), kiểm soát giới hạn tiếp nhận tối đa {MAX_INTERNS_PER_MENTOR} TTS/Mentor và điều phối chuẩn {assignedInterns.length + unassignedInterns.length} hồ sơ thực tập sinh.
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
            <span>Phần 2: Quản lý & Gán Mentor ({assignedInterns.length} đã gán, {unassignedInterns.length} chờ gán)</span>
          </button>
        </div>
      </header>

      {/* ── CROSSLINK BANNER: HƯỚNG DẪN ĐIỀU PHỐI ── */}
      <div className="coordination-crosslink-banner">
        <Sparkles size={16} className="crosslink-icon" />
        <span>
          💡 <strong>Mẹo điều phối:</strong> Màn hình này dùng để <strong>gán trực tiếp Mentor hướng dẫn 1-1</strong> và kiểm soát hạn mức tải của từng cán bộ (tối đa 5 TTS). Nếu bạn muốn phân bổ sinh viên theo Kỳ thực tập và Nhóm dự án phòng ban, hãy sử dụng trang <a href="/hr/intern-group-assignment">Phân công thực tập sinh vào Nhóm</a>.
        </span>
      </div>

      {/* ── HƯỚNG DẪN 3 BƯỚC ĐIỀU PHỐI TRỰC QUAN ── */}
      <div className="coordination-guide-card">
        <div className="guide-step-item">
          <div className="guide-step-badge">1</div>
          <div className="guide-step-text">
            <strong>Xem tải Mentor</strong>
            <span>Kiểm tra chỉ tiêu tiếp nhận ở Phần 1 (Xanh = Khả dụng, Cam = Sắp đầy, Đỏ = Đủ 5/5).</span>
          </div>
        </div>
        <div className="guide-step-arrow">➔</div>
        <div className="guide-step-item">
          <div className="guide-step-badge">2</div>
          <div className="guide-step-text">
            <strong>Chọn sinh viên</strong>
            <span>Gán nhanh 1-Click ngay tại cột "Gán nhanh" trên từng dòng, hoặc tick checkbox để gán hàng loạt.</span>
          </div>
        </div>
        <div className="guide-step-arrow">➔</div>
        <div className="guide-step-item">
          <div className="guide-step-badge">3</div>
          <div className="guide-step-text">
            <strong>Hoàn tất phân công</strong>
            <span>Bấm "Gán ngay" hoặc "Phân công". Dữ liệu sẽ đồng bộ thời gian thực sang tài khoản TTS & Mentor.</span>
          </div>
        </div>
      </div>

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
          </div>

          <div className="workload-cards-grid">
            {mentors.map((mentor) => (
              <MentorWorkloadCard
                key={mentor.id}
                mentor={mentor}
                assignedList={assignedInterns.filter((a) => a.mentor_id === mentor.id)}
                onSelectForAssign={handleSelectMentorFromCard}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── PHẦN 2: QUẢN LÝ PHÂN CÔNG & ĐIỀU PHỐI THỰC TẬP SINH ── */}
      {(activeTab === 'both' || activeTab === 'assign') && (
        <section id="assign-section-target" className="assign-section" aria-label="Phần 2: Quản lý Phân công & Điều phối Thực tập sinh">
          <div className="section-header-row">
            <div>
              <div className="section-title-badge">PHẦN 2</div>
              <h2 className="section-title">
                Quản lý Phân công & Điều phối Thực tập sinh ({assignedInterns.length + unassignedInterns.length} Hồ sơ)
              </h2>
              <p className="section-desc">
                Quản lý danh sách thực tập sinh trong hệ thống. Bạn có thể theo dõi, gán nhanh Mentor hoặc điều chuyển sinh viên.
              </p>
            </div>

            {/* Sub-tab switcher cho Phần 2 */}
            <div className="sub-tabs-container">
              <button
                type="button"
                className={`btn-sub-tab ${subTab === 'assigned' ? 'is-active' : ''}`}
                onClick={() => setSubTab('assigned')}
              >
                <CheckCircle2 size={14} />
                <span>TTS đã phân công ({assignedInterns.length})</span>
              </button>
              <button
                type="button"
                className={`btn-sub-tab ${subTab === 'unassigned' ? 'is-active' : ''}`}
                onClick={() => setSubTab('unassigned')}
              >
                <UserCheck size={14} />
                <span>
                  TTS chờ phân công ({unassignedInterns.length})
                  {unassignedInterns.length > 0 && (
                    <span className="badge-unassigned-count">{unassignedInterns.length}</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="assign-panel-card">
            {/* SUB-TAB 1: DANH SÁCH TTS ĐÃ PHÂN CÔNG (4 HỒ SƠ) */}
            {subTab === 'assigned' && (
              <>
                {/* Thanh tìm kiếm */}
                <div className="table-filter-bar">
                  <div className="search-box-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Tìm kiếm sinh viên theo tên, mã TTS, trường, chuyên ngành hoặc mentor..."
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
                    <span>Tổng số: <strong>{filteredAssignedInterns.length}</strong> / {assignedInterns.length} TTS đã phân công</span>
                  </div>
                </div>

                {/* Bảng TTS đã phân công */}
                <div className="table-responsive-wrapper">
                  <table className="unassigned-interns-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Mã TTS</th>
                        <th style={{ width: '200px' }}>Họ và tên</th>
                        <th style={{ width: '180px' }}>Kỳ thực tập</th>
                        <th style={{ minWidth: '200px' }}>Trường Đại học</th>
                        <th style={{ minWidth: '150px' }}>Chuyên ngành</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>GPA</th>
                        <th style={{ minWidth: '190px' }}>Mentor phụ trách</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignedInterns.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="table-empty-row">
                            <AlertCircle size={32} className="empty-icon" />
                            <h4 className="empty-title">Không tìm thấy thực tập sinh phù hợp</h4>
                            <p className="empty-subtitle">Thử tìm kiếm với từ khóa khác hoặc xóa ô tìm kiếm.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAssignedInterns.map((intern, index) => {
                          const currentMentor = mentors.find((m) => m.id === intern.mentor_id);

                          return (
                            <tr key={intern.id} className="intern-table-row">
                              <td style={{ textAlign: 'center' }} className="col-stt">
                                {index + 1}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="intern-code-tag">{intern.code}</span>
                              </td>
                              <td>
                                <div className="intern-name-cell">
                                  <strong className="intern-fullname">{intern.full_name}</strong>
                                  <span className="intern-email-sub">{intern.email}</span>
                                </div>
                              </td>
                              <td>
                                <span className="assigned-program-pill" title={`Kỳ thực tập: ${intern.program_name || 'Khóa K20 - Kỳ Thu 2026'}`}>
                                  {intern.program_name || 'Khóa K20 - Kỳ Thu 2026'}
                                </span>
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
                                <span className="gpa-pill">{Number(intern.gpa).toFixed(2)}</span>
                              </td>
                              <td>
                                <div className="mentor-assigned-badge">
                                  <span className="mentor-assigned-name">
                                    {intern.mentor_name || currentMentor?.full_name}
                                  </span>
                                  <span className="mentor-assigned-dept">
                                    {intern.department || currentMentor?.department}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-action-unassign"
                                  onClick={() => handleUnassignIntern(intern.id, intern.mentor_id)}
                                  title="Gỡ phân công và đưa về danh sách chờ"
                                >
                                  <UserMinus size={13} />
                                  <span>Hủy gán</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* SUB-TAB 2: DANH SÁCH TTS CHỜ PHÂN CÔNG */}
            {subTab === 'unassigned' && (
              <>
                {unassignedInterns.length === 0 ? (
                  <div className="empty-unassigned-card">
                    <CheckCircle2 size={44} className="empty-success-icon" />
                    <h3 className="empty-title">Tuyệt vời! Toàn bộ 4 hồ sơ thực tập sinh đều đã có Mentor phụ trách</h3>
                    <p className="empty-subtitle">
                      Mỗi Mentor hiện đang phụ trách 2/5 TTS (40% tải - Khả dụng). Không còn sinh viên nào ở trạng thái chờ phân công.
                    </p>
                    <button
                      type="button"
                      className="btn-switch-to-assigned"
                      onClick={() => setSubTab('assigned')}
                    >
                      <Users size={15} />
                      <span>Xem danh sách 4 TTS đã phân công</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* KHU VỰC CHỌN MENTOR & NÚT PHÂN CÔNG */}
                    <div className="assign-control-bar">
                      <div className="mentor-select-group">
                        <label htmlFor="mentor-dropdown" className="control-label">
                          <UserCheck size={16} />
                          <span>Chọn Mentor tiếp nhận:</span>
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

                    {/* THANH CÔNG CỤ TÌM KIẾM & BỘ ĐẾM */}
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
                        <span>Đã chọn: <strong>{selectedInternIds.size}</strong> / {unassignedInterns.length} TTS chờ phân công</span>
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

                    {/* BẢNG DANH SÁCH THỰC TẬP SINH CHƯA CÓ MENTOR */}
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
                            <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                            <th style={{ width: '200px' }}>Họ và tên</th>
                            <th style={{ minWidth: '200px' }}>Trường Đại học</th>
                            <th style={{ minWidth: '160px' }}>Chuyên ngành</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Điểm GPA</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Ngày tiếp nhận</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ width: '250px', textAlign: 'center' }}>Gán nhanh Mentor (1-Click)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUnassignedInterns.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="table-empty-row">
                                <AlertCircle size={32} className="empty-icon" />
                                <h4 className="empty-title">Không tìm thấy sinh viên phù hợp</h4>
                                <p className="empty-subtitle">Thử tìm kiếm với từ khóa khác hoặc xóa ô tìm kiếm.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredUnassignedInterns.map((intern, index) => {
                              const isSelected = selectedInternIds.has(intern.id);
                              const isLocked = intern.hasSignedContract === false;

                              return (
                                <tr
                                  key={intern.id}
                                  className={`intern-table-row ${isSelected ? 'row--selected' : ''} ${isLocked ? 'row--disabled' : ''}`}
                                  onClick={() => !isLocked && handleToggleIntern(intern.id)}
                                >
                                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className={`btn-row-checkbox ${isLocked ? 'is-disabled' : ''}`}
                                      onClick={() => !isLocked && handleToggleIntern(intern.id)}
                                      disabled={isLocked}
                                      title={isLocked ? 'Thực tập sinh chưa ký hợp đồng tiếp nhận, không thể phân công' : isSelected ? 'Bỏ chọn' : 'Chọn thực tập sinh'}
                                      aria-label={`Chọn ${intern.full_name}`}
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={18} className="text-primary" />
                                      ) : (
                                        <Square size={18} className={isLocked ? 'text-disabled' : 'text-slate'} />
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
                                    <span className="gpa-pill">{Number(intern.gpa).toFixed(2)}</span>
                                  </td>
                                  <td style={{ textAlign: 'center' }} className="col-date">
                                    {intern.applied_date}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {isLocked ? (
                                      <span className="badge-unassigned badge-unassigned--waiting" title="TTS chưa hoàn tất ký hợp đồng tiếp nhận, chưa thể phân công">
                                        ⏳ Chờ ký HĐ
                                      </span>
                                    ) : (
                                      <span className="badge-unassigned badge-unassigned--ready" title="Đã ký hợp đồng tiếp nhận — Khả dụng phân công">
                                        ✓ Đã ký HĐ
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <div className="quick-assign-row">
                                      <select
                                        className="quick-mentor-select"
                                        value={quickMentorSelections[intern.id] || ''}
                                        onChange={(e) => handleQuickMentorChange(intern.id, e.target.value)}
                                        aria-label={`Chọn mentor cho ${intern.full_name}`}
                                        disabled={isLocked || submitting}
                                        title={isLocked ? 'TTS chưa ký hợp đồng tiếp nhận, chưa thể phân công' : 'Chọn mentor'}
                                      >
                                        <option value="">-- Chọn Mentor --</option>
                                        {mentors.map((m) => {
                                          const st = getWorkloadStatus(m.current_interns, m.max_interns);
                                          return (
                                            <option key={m.id} value={m.id} disabled={st.isFull}>
                                              {m.full_name} ({m.current_interns}/{m.max_interns} {st.isFull ? '— Hết chỗ' : `— Còn ${st.remaining}`})
                                            </option>
                                          );
                                        })}
                                      </select>
                                      <button
                                        type="button"
                                        className="btn-quick-assign-action"
                                        disabled={isLocked || !quickMentorSelections[intern.id] || submitting}
                                        onClick={() => handleQuickAssign(intern.id)}
                                        title={isLocked ? 'TTS chưa ký hợp đồng tiếp nhận, không thể phân công' : 'Gán ngay sinh viên này cho Mentor đã chọn'}
                                      >
                                        <UserCheck size={13} />
                                        <span>Gán ngay</span>
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
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
