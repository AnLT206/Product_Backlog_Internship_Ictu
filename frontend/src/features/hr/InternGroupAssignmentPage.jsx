import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserCheck,
  CheckSquare,
  Square,
  Search,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UserMinus,
  Filter,
} from 'lucide-react';
import { getPrograms, assignInternsToProgram } from '../../api/programs';
import {
  getDepartments,
  getMentors,
  assignMentor,
  unassignInternFromMentor,
} from '../../api/mentors';
import { getInterns } from '../../api/interns';
import {
  syncMentorAssignment,
  syncUnassignMentor,
  getRealtimeSyncState,
  subscribeRealtimeEvents,
} from '../../utils/realtimeSync';
import './InternGroupAssignmentPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER: Tạo ký tự viết tắt từ họ tên (Avatar Initials)
   ───────────────────────────────────────────────────────────────────────────── */
function getInitials(fullName) {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER: Trả về nhãn tiếng Việt & class màu sắc chuẩn cho từng trạng thái TTS
   ───────────────────────────────────────────────────────────────────────────── */
function getStatusInfo(status) {
  if (!status) {
    return { label: 'Chưa rõ', className: 'status-neutral' };
  }
  const s = String(status).toLowerCase().trim();
  if (s.includes('chờ phân nhóm') || s === 'waiting') {
    return { label: 'Chờ phân nhóm', className: 'status-waiting' };
  }
  if (s === 'pending' || s.includes('chờ duyệt') || s === 'applied' || s === 'reviewing') {
    return { label: 'Chờ duyệt', className: 'status-pending' };
  }
  if (s.includes('đã phân nhóm') || s === 'active' || s === 'approved' || s === 'onboarded') {
    return { label: 'Đã phân nhóm', className: 'status-assigned' };
  }
  if (s === 'rejected' || s.includes('từ chối') || s === 'inactive') {
    return { label: 'Đã từ chối', className: 'status-rejected' };
  }
  return { label: status, className: 'status-neutral' };
}

export default function InternGroupAssignmentPage() {
  /* ───────────────────────────────────────────────────────────────────────────
     DATA & API STATE
     ─────────────────────────────────────────────────────────────────────────── */
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [groups, setGroups] = useState([]);

  // Danh sách TTS chờ phân nhóm và danh sách đã phân nhóm
  const [unassignedInterns, setUnassignedInterns] = useState([]);
  const [assignedMembers, setAssignedMembers] = useState([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // State Form chọn phân nhóm (Khu vực A)
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // State Checkbox chọn TTS (Khu vực B & C)
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());

  // State bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterUni, setFilterUni] = useState('');

  // Tab xem danh sách thành viên đã phân nhóm (Khu vực D)
  const [viewAssignedGroupFilter, setViewAssignedGroupFilter] = useState('ALL');

  // Toast thông báo phản hồi thao tác
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  /* ───────────────────────────────────────────────────────────────────────────
     TẢI DỮ LIỆU TỪ BACKEND API
     ─────────────────────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [programsRes, deptsRes, mentorsRes, internsRes] = await Promise.all([
        getPrograms(),
        getDepartments(),
        getMentors(),
        getInterns({ page_size: 100 }),
      ]);

      // 1. Xử lý danh sách Kỳ thực tập
      let loadedPrograms = [];
      if (programsRes.ok && Array.isArray(programsRes.data)) {
        loadedPrograms = programsRes.data.filter((p) => !p.is_deleted);
      }
      setPrograms(loadedPrograms);

      // 2. Xử lý danh sách Phòng ban
      let loadedDepts = [];
      if (deptsRes.ok && Array.isArray(deptsRes.data)) {
        loadedDepts = deptsRes.data;
      }
      setDepartments(loadedDepts);

      // 3. Xử lý danh sách Mentors và cấu trúc Nhóm
      let loadedMentors = [];
      if (mentorsRes.ok && Array.isArray(mentorsRes.data)) {
        loadedMentors = mentorsRes.data;
      }
      setMentors(loadedMentors);

      // Tạo danh sách nhóm dựa trên Mentors và phòng ban
      const mappedGroups = loadedMentors.map((m) => {
        const foundDept = loadedDepts.find((d) => d.id === m.department_id);
        const deptName = m.department || (foundDept ? foundDept.name : 'Toàn cơ quan');
        const groupTitle = m.position
          ? `Nhóm ${m.position} (${m.full_name})`
          : `Nhóm ${m.full_name}`;

        return {
          id: String(m.id),
          mentor_id: m.id,
          name: groupTitle,
          lead_name: m.full_name,
          email: m.email,
          department_id: m.department_id ? String(m.department_id) : '',
          department_name: deptName,
          current_slots: m.intern_count || 0,
          max_slots: 5,
        };
      });
      setGroups(mappedGroups);

      // 4. Xử lý danh sách Thực tập sinh (loại bỏ Ứng viên, chỉ lấy TTS chính thức để phân nhóm)
      let rawInterns = [];
      if (internsRes.ok) {
        rawInterns = Array.isArray(internsRes.data)
          ? internsRes.data
          : (internsRes.data?.items || []);
      }

      // Hàm kiểm tra định danh ứng viên (chưa duyệt, từ chối, hoặc tài khoản demo ứng viên)
      const isApplicantRecord = (item) => {
        if (!item) return false;
        const email = (item.email || '').toLowerCase().trim();
        const code = (item.code || '').toUpperCase().trim();
        const role = (item.role || '').toLowerCase().trim();
        const status = (item.status || '').toLowerCase().trim();

        // 1. Mã ứng viên (bắt đầu bằng UV)
        if (code.startsWith('UV')) return true;

        // 2. Email hoặc role là applicant/ứng viên
        if (
          role === 'applicant' ||
          email.includes('ungvien') ||
          email === 'ungvien@ictu.edu.vn' ||
          Number(item.id) === 7
        ) {
          return true;
        }

        // 3. Hồ sơ ứng viên chưa duyệt hoặc bị từ chối
        if (
          status === 'rejected' ||
          status === 'pending' ||
          status === 'unsubmitted' ||
          status === 'inactive'
        ) {
          return true;
        }

        return false;
      };

      const eligibleInterns = rawInterns.filter((intern) => !isApplicantRecord(intern));

      // Đọc trạng thái đồng bộ realtime nếu có
      const syncState = getRealtimeSyncState();
      const realtimeAssignments = syncState.mentorAssignments || [];
      const realtimeAssignmentMap = new Map();
      realtimeAssignments.forEach((a) => {
        realtimeAssignmentMap.set(Number(a.intern_id), a);
      });

      const unassigned = [];
      const assigned = [];

      eligibleInterns.forEach((intern) => {
        const syncAssign = realtimeAssignmentMap.get(Number(intern.id));
        const mentorId = syncAssign ? syncAssign.mentor_id : intern.mentor_id;
        const mentorName = syncAssign ? syncAssign.mentor : intern.mentor_name;

        const assignedMentorObj = loadedMentors.find((m) => m.id === mentorId);
        const assignedGroupObj = mappedGroups.find((g) => g.mentor_id === mentorId);

        const internData = {
          id: intern.id,
          code: intern.code || `TTS${String(intern.id).padStart(4, '0')}`,
          full_name: intern.full_name || 'Thực tập sinh',
          email: intern.email,
          phone: intern.phone_number || '0988 888 999',
          university: intern.university || 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
          major: intern.major || 'Công nghệ thông tin',
          gpa: intern.gpa ? Number(intern.gpa) : 3.5,
          current_program: syncAssign?.project || 'Kỳ thực tập chuẩn',
          preferred_department: assignedMentorObj?.department || 'Chưa xếp phòng ban',
          status: mentorId ? 'Đã phân nhóm' : 'Chờ phân nhóm',
          mentor_id: mentorId,
          mentor_name: mentorName || assignedMentorObj?.full_name,
        };

        if (mentorId) {
          assigned.push({
            ...internData,
            group_id: assignedGroupObj ? assignedGroupObj.id : String(mentorId),
            group_name: assignedGroupObj ? assignedGroupObj.name : `Nhóm ${mentorName || 'Mentor'}`,
            department_name: assignedMentorObj?.department || 'Trung tâm Phát triển Phần mềm',
            program_name: syncAssign?.project || 'Kỳ thực tập doanh nghiệp',
            role_in_group: `Thành viên / ${intern.major || 'Thực tập sinh'}`,
            assigned_date: syncAssign?.assigned_at
              ? new Date(syncAssign.assigned_at).toLocaleDateString('vi-VN')
              : new Date().toLocaleDateString('vi-VN'),
          });
        } else {
          unassigned.push(internData);
        }
      });

      setUnassignedInterns(unassigned);
      setAssignedMembers(assigned);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu phân công từ API:', err);
      setFetchError('Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Gọi API ban đầu và lắng nghe sự kiện đồng bộ thời gian thực
  useEffect(() => {
    loadData();
    const unsub = subscribeRealtimeEvents(() => {
      loadData();
    });
    return () => {
      unsub();
    };
  }, [loadData]);

  /* ───────────────────────────────────────────────────────────────────────────
     COMPUTED: Danh sách nhóm phù hợp với Phòng ban / Chương trình
     ─────────────────────────────────────────────────────────────────────────── */
  const currentSelectedDepartment = useMemo(() => {
    return departments.find((d) => String(d.id) === String(selectedDeptId)) || null;
  }, [departments, selectedDeptId]);

  const currentSelectedProgram = useMemo(() => {
    return programs.find((p) => String(p.id) === String(selectedProgramId)) || null;
  }, [programs, selectedProgramId]);

  const availableGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!selectedDeptId) return true;
      const matchId = String(g.department_id) === String(selectedDeptId);
      const matchName =
        currentSelectedDepartment &&
        g.department_name &&
        g.department_name.toLowerCase().includes(currentSelectedDepartment.name.toLowerCase());
      return matchId || matchName;
    });
  }, [groups, selectedDeptId, currentSelectedDepartment]);

  // Thông tin chi tiết của nhóm đang được chọn trong Form
  const currentSelectedGroup = useMemo(() => {
    return groups.find((g) => String(g.id) === String(selectedGroupId)) || null;
  }, [groups, selectedGroupId]);

  /* ───────────────────────────────────────────────────────────────────────────
     COMPUTED: Lọc danh sách TTS chờ phân công
     ─────────────────────────────────────────────────────────────────────────── */
  const filteredUnassignedInterns = useMemo(() => {
    return unassignedInterns.filter((intern) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        intern.full_name.toLowerCase().includes(q) ||
        intern.code.toLowerCase().includes(q) ||
        intern.email.toLowerCase().includes(q) ||
        intern.university.toLowerCase().includes(q) ||
        intern.major.toLowerCase().includes(q);

      const matchMajor = !filterMajor || intern.major === filterMajor;
      const matchUni = !filterUni || intern.university === filterUni;

      return matchSearch && matchMajor && matchUni;
    });
  }, [unassignedInterns, searchQuery, filterMajor, filterUni]);

  // Danh sách trường & chuyên ngành cho bộ lọc
  const uniqueUniversities = useMemo(() => {
    return Array.from(new Set(unassignedInterns.map((i) => i.university))).filter(Boolean);
  }, [unassignedInterns]);

  const uniqueMajors = useMemo(() => {
    return Array.from(new Set(unassignedInterns.map((i) => i.major))).filter(Boolean);
  }, [unassignedInterns]);

  /* ───────────────────────────────────────────────────────────────────────────
     CHECKBOX HANDLERS (KHU VỰC B & C)
     ─────────────────────────────────────────────────────────────────────────── */
  const isAllSelected = useMemo(() => {
    if (filteredUnassignedInterns.length === 0) return false;
    return filteredUnassignedInterns.every((i) => selectedInternIds.has(i.id));
  }, [filteredUnassignedInterns, selectedInternIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInternIds((prev) => {
        const next = new Set(prev);
        filteredUnassignedInterns.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedInternIds((prev) => {
        const next = new Set(prev);
        filteredUnassignedInterns.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

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

  const handleDeselectAll = () => {
    setSelectedInternIds(new Set());
  };

  /* ───────────────────────────────────────────────────────────────────────────
     HÀNH ĐỘNG GỌI API PHÂN CÔNG VÀO NHÓM (KHU VỰC A)
     ─────────────────────────────────────────────────────────────────────────── */
  const handleAssignToGroup = async (e) => {
    e.preventDefault();
    if (!selectedProgramId || !selectedDeptId || !selectedGroupId) {
      showToast('Vui lòng chọn đầy đủ Chương trình, Phòng ban và Nhóm tiếp nhận.', 'error');
      return;
    }

    if (selectedInternIds.size === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 thực tập sinh trong bảng.', 'error');
      return;
    }

    const targetGroup = currentSelectedGroup;
    const internIdsArray = Array.from(selectedInternIds).map((id) => Number(id));
    const targetMentorId = targetGroup ? Number(targetGroup.mentor_id) : null;
    const targetProgramId = Number(selectedProgramId);

    setSubmitting(true);
    try {
      // 1. Gọi API Backend phân công TTS vào Kỳ thực tập và Mentor phụ trách nhóm
      let assignResult = null;
      if (targetProgramId && !isNaN(targetProgramId)) {
        assignResult = await assignInternsToProgram(targetProgramId, {
          intern_ids: internIdsArray,
          mentor_id: targetMentorId,
        });
      }

      // 2. Đồng bộ quan hệ Mentor nếu cần
      if (targetMentorId) {
        await assignMentor({
          mentor_id: targetMentorId,
          intern_ids: internIdsArray,
          program_id: targetProgramId || undefined,
        });
      }

      // 3. Phát sự kiện đồng bộ thời gian thực cross-tab
      if (targetMentorId && targetGroup) {
        syncMentorAssignment(
          targetMentorId,
          targetGroup.lead_name,
          internIdsArray,
          currentSelectedProgram?.name || targetGroup.name
        );
      }

      // 4. Thông báo thành công và làm mới dữ liệu
      setSelectedInternIds(new Set());
      const successMessage =
        assignResult?.data?.message ||
        `Đã phân công thành công ${internIdsArray.length} thực tập sinh vào "${targetGroup.name}"!`;
      showToast(successMessage, 'success');

      // Tải lại dữ liệu mới nhất từ API để hiển thị ngay lập tức
      await loadData();
    } catch (err) {
      console.error('Lỗi khi gọi API phân công:', err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Không thể phân công thực tập sinh. Vui lòng kiểm tra lại.';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
     HÀNH ĐỘNG GỌI API HỦY PHÂN NHÓM (KHU VỰC D)
     ─────────────────────────────────────────────────────────────────────────── */
  const handleUnassignMember = async (member) => {
    const mentorId = member.mentor_id || member.group_id;
    if (!mentorId) {
      showToast('Không xác định được Mentor phụ trách nhóm.', 'error');
      return;
    }

    try {
      const res = await unassignInternFromMentor(mentorId, member.id, member.program_id);
      if (res.ok) {
        syncUnassignMentor(member.id);
        showToast(
          res.data?.message || `Đã hủy phân nhóm cho thực tập sinh ${member.full_name}.`,
          'success'
        );
        await loadData();
      } else {
        showToast(res.data?.detail || 'Không thể hủy phân nhóm.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi hủy phân nhóm:', err);
      showToast('Đã xảy ra lỗi khi hủy phân nhóm.', 'error');
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
     COMPUTED: Lọc danh sách thành viên đã phân nhóm (Khu vực D)
     ─────────────────────────────────────────────────────────────────────────── */
  const filteredAssignedMembers = useMemo(() => {
    if (viewAssignedGroupFilter === 'ALL') {
      return assignedMembers;
    }
    return assignedMembers.filter((m) => String(m.group_id) === String(viewAssignedGroupFilter));
  }, [assignedMembers, viewAssignedGroupFilter]);

  const isAssignButtonDisabled =
    submitting ||
    !selectedProgramId ||
    !selectedDeptId ||
    !selectedGroupId ||
    selectedInternIds.size === 0;

  return (
    <div className="intern-group-assign-page">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`assign-toast assign-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="toast-icon" />
          ) : (
            <AlertCircle size={18} className="toast-icon" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER TRANG ── */}
      <header className="page-header-container">
        <div className="page-header-info">
          <div className="page-tag-badge">
            <Sparkles size={14} />
            <span>Phân hệ Quản trị & Điều phối Nhân sự</span>
          </div>
          <h1 className="page-title">Phân công thực tập sinh</h1>
          <p className="page-subtitle">
            Phân công thực tập sinh vào chương trình và nhóm theo phòng ban.
          </p>
        </div>

        {/* Thống kê nhanh */}
        <div className="quick-stats-bar">
          <div className="quick-stat-item">
            <span className="stat-label">Chờ phân nhóm</span>
            <span className="stat-value text-amber">{unassignedInterns.length}</span>
          </div>
          <div className="quick-stat-divider" />
          <div className="quick-stat-item">
            <span className="stat-label">Đã phân nhóm</span>
            <span className="stat-value text-blue">{assignedMembers.length}</span>
          </div>
          <div className="quick-stat-divider" />
          <div className="quick-stat-item">
            <span className="stat-label">Số nhóm dự án</span>
            <span className="stat-value text-emerald">{groups.length}</span>
          </div>
        </div>
      </header>

      {/* Thông báo lỗi tải dữ liệu nếu có */}
      {fetchError && (
        <div className="error-banner-container" role="alert">
          <div className="error-banner-content">
            <AlertCircle size={16} />
            <span>{fetchError}</span>
          </div>
          <button type="button" className="error-retry-btn" onClick={loadData}>
            Tải lại
          </button>
        </div>
      )}

      {/* ── KHU VỰC A: FORM / PANEL CHỌN PHÂN NHÓM ── */}
      <section className="assign-form-panel" aria-labelledby="form-panel-heading">
        <div className="panel-header">
          <div className="panel-header-icon">
            <FolderKanban size={20} />
          </div>
          <div>
            <h2 id="form-panel-heading" className="panel-title">
              1. Chọn Chương trình, Phòng ban và Nhóm tiếp nhận
            </h2>
            <p className="panel-desc">
              Lựa chọn đúng đích phân công trước khi thực hiện gắn các thực tập sinh đã chọn ở bảng bên dưới.
            </p>
          </div>
        </div>

        <form className="assign-form-grid" onSubmit={handleAssignToGroup}>
          {/* Trường 1: Chương trình thực tập */}
          <div className="form-group">
            <label htmlFor="program-select" className="form-label">
              <Layers size={15} />
              <span>Chương trình thực tập <strong className="required-mark">*</strong></span>
            </label>
            <div className="select-container">
              <select
                id="program-select"
                aria-label="Chọn Chương trình thực tập"
                className="form-select"
                value={selectedProgramId}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value);
                  setSelectedGroupId('');
                }}
              >
                <option value="">-- Chọn Chương trình thực tập --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status === 'closed' ? '(Đã đóng)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trường 2: Phòng ban */}
          <div className="form-group">
            <label htmlFor="department-select" className="form-label">
              <Building size={15} />
              <span>Phòng ban <strong className="required-mark">*</strong></span>
            </label>
            <div className="select-container">
              <select
                id="department-select"
                aria-label="Chọn Phòng ban tiếp nhận"
                className="form-select"
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedGroupId('');
                }}
              >
                <option value="">-- Chọn Phòng ban tiếp nhận --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trường 3: Nhóm (Group) */}
          <div className="form-group">
            <label htmlFor="group-select" className="form-label">
              <Users size={15} />
              <span>Nhóm dự án <strong className="required-mark">*</strong></span>
            </label>
            <div className="select-container">
              <select
                id="group-select"
                aria-label="Chọn Nhóm tiếp nhận"
                className="form-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={!selectedDeptId && !selectedProgramId}
              >
                <option value="">
                  {!selectedDeptId && !selectedProgramId
                    ? '-- Vui lòng chọn Chương trình hoặc Phòng ban trước --'
                    : availableGroups.length === 0
                    ? '-- Không có nhóm nào thuộc tiêu chí trên --'
                    : '-- Chọn Nhóm tiếp nhận --'}
                </option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (Đã có: {g.current_slots}/{g.max_slots})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nút Phân công */}
          <div className="form-action-group">
            <button
              type="submit"
              className="btn-assign-action"
              disabled={isAssignButtonDisabled}
              title={
                isAssignButtonDisabled
                  ? 'Vui lòng chọn đầy đủ Chương trình, Phòng ban, Nhóm và tích chọn ít nhất 1 TTS'
                  : 'Tiến hành phân công thực tập sinh vào nhóm'
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
          </div>
        </form>

        {/* Khung tóm tắt thông tin Nhóm đang chọn */}
        {currentSelectedGroup && (
          <div className="group-info-card">
            <div className="group-info-item">
              <span className="info-title">Nhóm đang chọn:</span>
              <strong className="info-value">{currentSelectedGroup.name}</strong>
            </div>
            <div className="group-info-item">
              <span className="info-title">Người phụ trách:</span>
              <span className="info-value">{currentSelectedGroup.lead_name}</span>
            </div>
            <div className="group-info-item">
              <span className="info-title">Sức chứa tối đa:</span>
              <span className="info-badge">
                {currentSelectedGroup.current_slots} / {currentSelectedGroup.max_slots} thành viên
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── KHU VỰC B & C: BẢNG DANH SÁCH THỰC TẬP SINH & BỘ ĐẾM SỐ LƯỢNG ĐÃ CHỌN ── */}
      <section className="interns-table-section" aria-labelledby="table-section-heading">
        <div className="section-header-row">
          <div>
            <h2 id="table-section-heading" className="section-title">
              2. Danh sách thực tập sinh chờ phân công ({unassignedInterns.length})
            </h2>
            <p className="section-desc">
              Tích chọn checkbox để chọn thực tập sinh muốn phân công vào nhóm theo phòng ban.
            </p>
          </div>

          {/* KHU VỰC C: THÔNG TIN SỐ LƯỢNG ĐÃ CHỌN */}
          <div className="selection-counter-card">
            <div className="counter-pill">
              <CheckSquare size={16} />
              <span>
                Đã chọn: <strong className="counter-number">{selectedInternIds.size}</strong> thực tập sinh
              </span>
            </div>
            {selectedInternIds.size > 0 && (
              <button
                type="button"
                className="btn-deselect"
                onClick={handleDeselectAll}
                title="Bỏ chọn toàn bộ"
              >
                <RotateCcw size={13} />
                <span>Bỏ chọn</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh công cụ tìm kiếm và bộ lọc */}
        <div className="table-filter-bar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm theo họ tên, mã TTS, email, trường hoặc chuyên ngành..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                title="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </div>

          <div className="filters-cluster">
            {/* Bộ lọc chuyên ngành */}
            <div className="filter-select-wrap">
              <Filter size={14} className="filter-icon" />
              <select
                className="filter-select"
                value={filterMajor}
                onChange={(e) => setFilterMajor(e.target.value)}
                aria-label="Lọc theo chuyên ngành"
              >
                <option value="">Tất cả chuyên ngành</option>
                {uniqueMajors.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Bộ lọc trường đại học */}
            <div className="filter-select-wrap">
              <GraduationCap size={14} className="filter-icon" />
              <select
                className="filter-select"
                value={filterUni}
                onChange={(e) => setFilterUni(e.target.value)}
                aria-label="Lọc theo trường đại học"
              >
                <option value="">Tất cả trường</option>
                {uniqueUniversities.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bảng danh sách TTS có checkbox */}
        <div className="table-responsive-wrapper">
          {loading ? (
            <div className="loading-state-container">
              <span className="loading-spinner" />
              <span>Đang tải danh sách thực tập sinh từ hệ thống...</span>
            </div>
          ) : (
            <table className="interns-selection-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-header-checkbox"
                      onClick={handleToggleSelectAll}
                      title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      disabled={filteredUnassignedInterns.length === 0}
                      aria-label={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    >
                      {isAllSelected ? (
                        <CheckSquare size={18} className="checkbox-icon checked" />
                      ) : (
                        <Square size={18} className="checkbox-icon" />
                      )}
                    </button>
                  </th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Mã TTS</th>
                  <th style={{ width: '220px' }}>Họ và tên</th>
                  <th style={{ width: '260px' }}>Email & Điện thoại</th>
                  <th style={{ width: '260px' }}>Trường & Chuyên ngành</th>
                  <th style={{ width: '200px' }}>Chương trình hiện tại</th>
                  <th style={{ width: '200px' }}>Phòng ban nguyện vọng</th>
                  <th style={{ width: '170px', textAlign: 'center' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnassignedInterns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty-cell">
                      <div className="empty-state-content">
                        <Users size={32} className="empty-icon" />
                        <p className="empty-text">Không tìm thấy thực tập sinh nào phù hợp với bộ lọc</p>
                        <button
                          type="button"
                          className="btn-reset-filters"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterMajor('');
                            setFilterUni('');
                          }}
                        >
                          Đặt lại bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUnassignedInterns.map((intern) => {
                    const isSelected = selectedInternIds.has(intern.id);
                    return (
                      <tr
                        key={intern.id}
                        className={isSelected ? 'is-row-selected' : ''}
                        onClick={() => handleToggleSelectOne(intern.id)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-row-checkbox"
                            onClick={() => handleToggleSelectOne(intern.id)}
                            aria-label={`Chọn ${intern.full_name}`}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="checkbox-icon checked" />
                            ) : (
                              <Square size={18} className="checkbox-icon" />
                            )}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="intern-code-badge">{intern.code}</span>
                        </td>
                        <td>
                          <div className="intern-name-cell">
                            <div className="intern-avatar-circle">
                              {getInitials(intern.full_name)}
                            </div>
                            <div>
                              <div className="intern-name-text">{intern.full_name}</div>
                              <span className="intern-gpa-badge">GPA: {intern.gpa}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="intern-contact-cell">
                            <span className="intern-email-text" title={intern.email}>{intern.email}</span>
                            <span className="intern-phone-text">{intern.phone}</span>
                          </div>
                        </td>
                        <td>
                          <div className="intern-edu-cell">
                            <span className="intern-major-text">{intern.major}</span>
                            <span className="intern-uni-text">{intern.university}</span>
                          </div>
                        </td>
                        <td>
                          <span className="program-tag">{intern.current_program}</span>
                        </td>
                        <td>
                          <span
                            className={`department-tag ${
                              intern.preferred_department === 'Chưa xếp phòng ban'
                                ? 'department-tag--unassigned'
                                : 'department-tag--assigned'
                            }`}
                          >
                            {intern.preferred_department}
                          </span>
                        </td>
                        <td className="intern-status-cell">
                          {(() => {
                            const { label, className } = getStatusInfo(intern.status);
                            return (
                              <span className={`status-badge ${className}`}>
                                <span className="status-dot" />
                                <span>{label}</span>
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── KHU VỰC D: KHU VỰC THÀNH VIÊN ĐÃ PHÂN NHÓM ── */}
      <section className="assigned-members-section" aria-labelledby="assigned-heading">
        <div className="section-header-row">
          <div>
            <h2 id="assigned-heading" className="section-title">
              3. Danh sách thành viên trong nhóm ({filteredAssignedMembers.length})
            </h2>
            <p className="section-desc">
              Theo dõi danh sách thực tập sinh đã được phân bổ thành công vào từng nhóm dự án và phòng ban.
            </p>
          </div>

          {/* Lọc theo nhóm */}
          <div className="filter-group-dropdown-wrap">
            <label htmlFor="assigned-group-filter" className="group-filter-label">
              Xem theo nhóm:
            </label>
            <select
              id="assigned-group-filter"
              className="group-filter-select"
              value={viewAssignedGroupFilter}
              onChange={(e) => setViewAssignedGroupFilter(e.target.value)}
            >
              <option value="ALL">-- Tất cả các nhóm ({assignedMembers.length} TTS) --</option>
              {groups.map((g) => {
                const count = assignedMembers.filter((m) => String(m.group_id) === String(g.id)).length;
                return (
                  <option key={g.id} value={g.id}>
                    {g.name} ({count} thành viên)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Bảng thành viên đã phân nhóm */}
        <div className="table-responsive-wrapper">
          {loading ? (
            <div className="loading-state-container">
              <span className="loading-spinner" />
              <span>Đang tải danh sách thành viên...</span>
            </div>
          ) : (
            <table className="assigned-members-table">
              <thead>
                <tr>
                  <th style={{ width: '56px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Mã TTS</th>
                  <th style={{ width: '220px' }}>Họ và tên</th>
                  <th style={{ width: '240px' }}>Email liên hệ</th>
                  <th style={{ width: '240px' }}>Nhóm dự án</th>
                  <th style={{ width: '220px' }}>Phòng ban trực thuộc</th>
                  <th style={{ width: '200px' }}>Vai trò trong nhóm</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Ngày gán</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty-cell">
                      <div className="empty-state-content">
                        <Users size={32} className="empty-icon" />
                        <p className="empty-text">Chưa có thành viên nào trong nhóm này</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAssignedMembers.map((member, index) => (
                    <tr key={member.id}>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="intern-code-badge">{member.code}</span>
                      </td>
                      <td>
                        <div className="intern-name-cell">
                          <div className="intern-avatar-circle avatar-assigned">
                            {getInitials(member.full_name)}
                          </div>
                          <div>
                            <div className="intern-name-text">{member.full_name}</div>
                            <span className="intern-uni-text">{member.major}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="intern-email-text">{member.email}</span>
                      </td>
                      <td>
                        <span className="assigned-group-pill">{member.group_name}</span>
                      </td>
                      <td>
                        <span className="assigned-dept-text">{member.department_name}</span>
                      </td>
                      <td>
                        <span className="role-tag">{member.role_in_group}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                        {member.assigned_date}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-remove-member"
                          onClick={() => handleUnassignMember(member)}
                          title="Hủy phân nhóm và đưa lại danh sách chờ"
                        >
                          <UserMinus size={14} />
                          <span>Gỡ</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
