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
  ArrowRight,
  ShieldCheck,
  Clock,
  ChevronRight,
  Check,
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
  checkInternContractSigned,
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

  // State Form chọn phân nhóm (Khu vực 1 - Đích tiếp nhận)
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // State Checkbox chọn TTS (Khu vực 2)
  const [selectedInternIds, setSelectedInternIds] = useState(new Set());
  const [quickGroupSelections, setQuickGroupSelections] = useState({});

  // State bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterUni, setFilterUni] = useState('');
  const [contractTab, setContractTab] = useState('ALL'); // 'ALL' | 'ELIGIBLE' | 'PENDING'

  // Tab xem danh sách thành viên đã phân nhóm (Khu vực 3)
  const [viewAssignedGroupFilter, setViewAssignedGroupFilter] = useState('ALL');
  const [viewAssignedProgramFilter, setViewAssignedProgramFilter] = useState('ALL');

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

      // 4. Xử lý danh sách Thực tập sinh (chờ phân công vs đã phân công)
      let rawInterns = [];
      if (internsRes.ok) {
        rawInterns = Array.isArray(internsRes.data)
          ? internsRes.data
          : (internsRes.data?.items || []);
      }

      // Đọc trạng thái đồng bộ realtime nếu có
      const syncState = getRealtimeSyncState();
      const realtimeAssignments = syncState.mentorAssignments || [];
      const realtimeAssignmentMap = new Map();
      realtimeAssignments.forEach((a) => {
        realtimeAssignmentMap.set(Number(a.intern_id), a);
      });

      const unassigned = [];
      const assigned = [];

      rawInterns.forEach((intern) => {
        const syncAssign = realtimeAssignmentMap.get(Number(intern.id));
        const mentorId = syncAssign ? syncAssign.mentor_id : intern.mentor_id;
        const mentorName = syncAssign ? syncAssign.mentor : intern.mentor_name;

        const assignedMentorObj = loadedMentors.find((m) => m.id === mentorId);
        const assignedGroupObj = mappedGroups.find((g) => g.mentor_id === mentorId);

        const isContractDone = checkInternContractSigned(intern, syncState.contracts);

        const progId = syncAssign?.program_id || intern.program_id || null;
        let progName = syncAssign?.program_name || intern.program_name || null;

        if (!progName && progId) {
          const foundProg = loadedPrograms.find((p) => String(p.id) === String(progId));
          if (foundProg) progName = foundProg.name;
        }

        if (!progName) {
          progName = mentorId ? (loadedPrograms[0]?.name || 'Khóa K20 - Kỳ Thu 2026') : 'Chưa phân kỳ';
        }

        const internData = {
          id: intern.id,
          code: intern.code || `TTS${String(intern.id).padStart(4, '0')}`,
          full_name: intern.full_name || 'Thực tập sinh',
          email: intern.email,
          phone: intern.phone_number || '0988 888 999',
          university: intern.university || 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
          major: intern.major || 'Công nghệ thông tin',
          gpa: intern.gpa ? Number(intern.gpa) : 3.5,
          current_program: progName,
          preferred_department: assignedMentorObj?.department || 'Chưa xếp phòng ban',
          status: mentorId ? 'Đã phân nhóm' : (intern.status === 'active' ? 'Chờ phân nhóm' : intern.status),
          mentor_id: mentorId,
          mentor_name: mentorName || assignedMentorObj?.full_name,
          program_id: progId,
          hasSignedContract: isContractDone,
        };

        if (mentorId) {
          assigned.push({
            ...internData,
            group_id: assignedGroupObj ? assignedGroupObj.id : String(mentorId),
            group_name: assignedGroupObj ? assignedGroupObj.name : `Nhóm ${mentorName || 'Mentor'}`,
            department_name: assignedMentorObj?.department || 'Trung tâm Phát triển Phần mềm',
            program_id: progId,
            program_name: progName,
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

      const matchContract =
        contractTab === 'ALL' ||
        (contractTab === 'ELIGIBLE' && intern.hasSignedContract !== false) ||
        (contractTab === 'PENDING' && intern.hasSignedContract === false);

      return matchSearch && matchMajor && matchUni && matchContract;
    });
  }, [unassignedInterns, searchQuery, filterMajor, filterUni, contractTab]);

  // Danh sách trường & chuyên ngành cho bộ lọc
  const uniqueUniversities = useMemo(() => {
    return Array.from(new Set(unassignedInterns.map((i) => i.university))).filter(Boolean);
  }, [unassignedInterns]);

  const uniqueMajors = useMemo(() => {
    return Array.from(new Set(unassignedInterns.map((i) => i.major))).filter(Boolean);
  }, [unassignedInterns]);

  // Thống kê số lượng theo trạng thái hợp đồng
  const countEligible = useMemo(() => {
    return unassignedInterns.filter((i) => i.hasSignedContract !== false).length;
  }, [unassignedInterns]);

  const countPending = useMemo(() => {
    return unassignedInterns.filter((i) => i.hasSignedContract === false).length;
  }, [unassignedInterns]);

  /* ───────────────────────────────────────────────────────────────────────────
     CHECKBOX HANDLERS (KHU VỰC B & C)
     ─────────────────────────────────────────────────────────────────────────── */
  const eligibleUnassigned = useMemo(() => {
    return filteredUnassignedInterns.filter((i) => i.hasSignedContract !== false);
  }, [filteredUnassignedInterns]);

  const isAllSelected = useMemo(() => {
    if (eligibleUnassigned.length === 0) return false;
    return eligibleUnassigned.every((i) => selectedInternIds.has(i.id));
  }, [eligibleUnassigned, selectedInternIds]);

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
        eligibleUnassigned.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const handleToggleSelectOne = (internId) => {
    const target = unassignedInterns.find((i) => i.id === internId);
    if (target && target.hasSignedContract === false) {
      showToast('Thực tập sinh chưa ký hợp đồng tiếp nhận, chưa thể phân công vào nhóm!', 'warning');
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

  const handleDeselectAll = () => {
    setSelectedInternIds(new Set());
  };

  /* ───────────────────────────────────────────────────────────────────────────
     HÀNH ĐỘNG GỌI API PHÂN CÔNG VÀO NHÓM (KHU VỰC 1)
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

    const hasUnsigned = internIdsArray.some((id) => {
      const it = unassignedInterns.find((i) => i.id === id);
      return it && it.hasSignedContract === false;
    });
    if (hasUnsigned) {
      showToast('Một số thực tập sinh chưa ký hợp đồng tiếp nhận. Vui lòng chỉ chọn thực tập sinh đã ký hợp đồng!', 'warning');
      return;
    }

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
        const progName = currentSelectedProgram?.name || 'Khóa K20 - Kỳ Thu 2026';
        syncMentorAssignment(
          targetMentorId,
          targetGroup.lead_name,
          internIdsArray,
          targetGroup.name,
          {
            programId: targetProgramId,
            programName: progName,
            departmentId: selectedDeptId,
            departmentName: currentSelectedDepartment?.name,
            groupId: targetGroup.id,
            groupName: targetGroup.name,
          }
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
     HÀNH ĐỘNG GỌI API HỦY PHÂN NHÓM (KHU VỰC 3)
     ─────────────────────────────────────────────────────────────────────────── */
  const handleUnassignMember = async (member) => {
    const mentorId = member.mentor_id || member.group_id;
    if (!mentorId) {
      showToast('Không xác định được Mentor phụ trách nhóm.', 'error');
      return;
    }

    try {
      const res = await unassignInternFromMentor(mentorId, member.id, member.program_id || undefined);
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
     HÀNH ĐỘNG GÁN NHANH 1-CLICK TRỰC TIẾP TRÊN DÒNG THỰC TẬP SINH
     ─────────────────────────────────────────────────────────────────────────── */
  const handleQuickGroupChange = (internId, groupId) => {
    setQuickGroupSelections((prev) => ({
      ...prev,
      [internId]: groupId,
    }));
  };

  const handleQuickAssignGroup = async (internId) => {
    const targetIntern = unassignedInterns.find((i) => i.id === internId);
    if (targetIntern && targetIntern.hasSignedContract === false) {
      showToast(`Thực tập sinh ${targetIntern.full_name} chưa ký hợp đồng tiếp nhận, không thể phân nhóm!`, 'warning');
      return;
    }

    const targetGroupId = quickGroupSelections[internId] || selectedGroupId;
    if (!targetGroupId) {
      showToast('Vui lòng chọn Nhóm tiếp nhận cho thực tập sinh!', 'error');
      return;
    }

    const targetGroup = groups.find((g) => String(g.id) === String(targetGroupId));
    if (!targetGroup) return;

    const progId = selectedProgramId || (programs[0]?.id ? String(programs[0].id) : null);
    const targetMentorId = targetGroup.mentor_id ? Number(targetGroup.mentor_id) : null;

    setSubmitting(true);
    try {
      if (progId) {
        try {
          await assignInternsToProgram(Number(progId), [internId]);
        } catch (e) {
          console.warn('API assignInternsToProgram fallback:', e);
        }
      }

      if (targetMentorId) {
        try {
          await assignMentor({
            mentor_id: targetMentorId,
            intern_ids: [internId],
          });
        } catch (e) {
          console.warn('API assignMentor fallback:', e);
        }

        const targetProg = programs.find((p) => String(p.id) === String(progId));
        const progName = targetProg?.name || currentSelectedProgram?.name || 'Khóa K20 - Kỳ Thu 2026';
        syncMentorAssignment(
          targetMentorId,
          targetGroup.lead_name || 'Mentor',
          [internId],
          targetGroup.name,
          {
            programId: progId ? Number(progId) : 1,
            programName: progName,
            departmentId: targetGroup.department_id,
            departmentName: targetGroup.department_name,
            groupId: targetGroup.id,
            groupName: targetGroup.name,
          }
        );
      }

      showToast(`Đã phân công thực tập sinh vào "${targetGroup.name}" thành công!`, 'success');
      await loadData();
    } catch (err) {
      console.error('Lỗi khi phân công nhanh vào nhóm:', err);
      showToast('Không thể phân công thực tập sinh. Vui lòng thử lại!', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
     COMPUTED: Lọc danh sách thành viên đã phân nhóm (Khu vực 3)
     ─────────────────────────────────────────────────────────────────────────── */
  const availableProgramFilterOptions = useMemo(() => {
    const list = [...programs];
    assignedMembers.forEach((m) => {
      if (m.program_name && !list.some((p) => p.name === m.program_name)) {
        list.push({
          id: m.program_id || m.program_name,
          name: m.program_name,
        });
      }
    });
    return list;
  }, [programs, assignedMembers]);

  const filteredAssignedMembers = useMemo(() => {
    return assignedMembers.filter((m) => {
      const matchGroup =
        viewAssignedGroupFilter === 'ALL' || String(m.group_id) === String(viewAssignedGroupFilter);
      const matchProg =
        viewAssignedProgramFilter === 'ALL' ||
        m.program_name === viewAssignedProgramFilter ||
        String(m.program_id) === String(viewAssignedProgramFilter);
      return matchGroup && matchProg;
    });
  }, [assignedMembers, viewAssignedGroupFilter, viewAssignedProgramFilter]);

  const isAssignButtonDisabled =
    submitting ||
    !selectedProgramId ||
    !selectedDeptId ||
    !selectedGroupId ||
    selectedInternIds.size === 0;

  // Cuộn mượt tới khu vực được chọn
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

      {/* ── THANH ĐIỀU HƯỚNG NHANH CÁC BƯỚC (JUMP-TO WORKFLOW) ── */}
      <div className="workflow-quick-nav">
        <button
          type="button"
          className="workflow-nav-btn"
          onClick={() => scrollToSection('step-1-destination')}
        >
          <span className="workflow-nav-badge">Bước 1</span>
          <span>🎯 Chọn đích tiếp nhận</span>
          <ChevronRight size={14} className="workflow-nav-chevron" />
        </button>
        <button
          type="button"
          className="workflow-nav-btn"
          onClick={() => scrollToSection('step-2-interns')}
        >
          <span className="workflow-nav-badge">Bước 2</span>
          <span>👥 Chọn thực tập sinh ({unassignedInterns.length})</span>
          <ChevronRight size={14} className="workflow-nav-chevron" />
        </button>
        <button
          type="button"
          className="workflow-nav-btn"
          onClick={() => scrollToSection('step-3-assigned')}
        >
          <span className="workflow-nav-badge">Bước 3</span>
          <span>📋 Xem danh sách đã gán ({assignedMembers.length})</span>
        </button>
      </div>

      {/* ── BANNER NGUYÊN TẮC ĐIỀU PHỐI TINH GỌN ── */}
      <div className="coordination-crosslink-banner">
        <Sparkles size={16} className="crosslink-icon" />
        <div className="crosslink-content">
          <div className="crosslink-main-text">
            💡 <strong>Quy tắc điều phối Nhóm dự án & Mentor:</strong> Mỗi Nhóm dự án thuộc Phòng ban sẽ có một Mentor làm Trưởng nhóm phụ trách đề tài. Khi bạn phân công sinh viên vào Nhóm, hệ thống sẽ tự động gán sinh viên cho Mentor trưởng nhóm đó để tiện theo dõi và giao việc.
          </div>
          <div className="crosslink-sub-text">
            👉 Nếu bạn chỉ muốn <strong>gán cán bộ hướng dẫn 1-1</strong> và kiểm soát hạn mức tải (tối đa 5 TTS/Mentor), vui lòng dùng trang <a href="/hr/mentor-assignment">Điều phối & Gán Mentor</a>.
          </div>
        </div>
      </div>

      {/* ── HƯỚNG DẪN 3 BƯỚC PHÂN CÔNG NHÓM TRỰC QUAN ── */}
      <div className="coordination-guide-card">
        <div className="guide-step-item">
          <div className="guide-step-badge">1</div>
          <div className="guide-step-text">
            <strong>Chọn Đích tiếp nhận</strong>
            <span>Lựa chọn Kỳ thực tập, Phòng ban và Nhóm dự án ở Form mục 1 bên dưới.</span>
          </div>
        </div>
        <div className="guide-step-arrow">➔</div>
        <div className="guide-step-item">
          <div className="guide-step-badge">2</div>
          <div className="guide-step-text">
            <strong>Chọn sinh viên</strong>
            <span>Gán nhanh 1-Click ngay trên từng dòng, hoặc tick checkbox để phân công hàng loạt.</span>
          </div>
        </div>
        <div className="guide-step-arrow">➔</div>
        <div className="guide-step-item">
          <div className="guide-step-badge">3</div>
          <div className="guide-step-text">
            <strong>Hoàn tất phân công</strong>
            <span>Bấm "Phân công" (hoặc "Gán ngay"). Thông tin nhóm sẽ được cập nhật ngay vào hồ sơ sinh viên.</span>
          </div>
        </div>
      </div>

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

      {/* ── KHU VỰC 1: FORM / PANEL CHỌN ĐÍCH TIẾP NHẬN ── */}
      <section
        id="step-1-destination"
        className="assign-form-panel"
        aria-labelledby="form-panel-heading"
      >
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
            {selectedProgramId && (
              <span className="field-hint text-emerald">
                ✓ Đã chọn kỳ: <strong>{currentSelectedProgram?.name}</strong>
              </span>
            )}
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
            {selectedDeptId && (
              <span className="field-hint text-blue">
                ✓ Phòng: <strong>{currentSelectedDepartment?.name}</strong>
              </span>
            )}
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
            {selectedGroupId && currentSelectedGroup && (
              <span className="field-hint text-emerald">
                ✓ Trưởng nhóm (Mentor): <strong>{currentSelectedGroup.lead_name}</strong>
              </span>
            )}
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
            <div className="group-info-grid">
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

            {/* Thanh tải sức chứa trực quan */}
            <div className="group-capacity-bar-wrap">
              <div className="capacity-bar-labels">
                <span className="capacity-bar-title">Độ phủ chỉ tiêu của nhóm:</span>
                <span className="capacity-bar-percent">
                  {Math.round((currentSelectedGroup.current_slots / currentSelectedGroup.max_slots) * 100)}%
                </span>
              </div>
              <div className="capacity-progress-track">
                <div
                  className="capacity-progress-fill"
                  style={{
                    width: `${Math.min(100, (currentSelectedGroup.current_slots / currentSelectedGroup.max_slots) * 100)}%`,
                    backgroundColor:
                      currentSelectedGroup.current_slots >= currentSelectedGroup.max_slots
                        ? '#ef4444'
                        : currentSelectedGroup.current_slots >= 4
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── KHU VỰC 2: BẢNG DANH SÁCH THỰC TẬP SINH & BỘ ĐẾM SỐ LƯỢNG ĐÃ CHỌN ── */}
      <section
        id="step-2-interns"
        className="interns-table-section"
        aria-labelledby="table-section-heading"
      >
        <div className="section-header-row">
          <div>
            <h2 id="table-section-heading" className="section-title">
              2. Danh sách thực tập sinh chờ phân công ({unassignedInterns.length})
            </h2>
            <p className="section-desc">
              Tích chọn checkbox để chọn thực tập sinh muốn phân công vào nhóm theo phòng ban.
            </p>
          </div>

          {/* BỘ ĐẾM SỐ LƯỢNG ĐÃ CHỌN */}
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

        {/* ── TAB PHÂN LOẠI TRẠNG THÁI HỢP ĐỒNG ── */}
        <div className="contract-status-tabs">
          <button
            type="button"
            className={`contract-tab-btn ${contractTab === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setContractTab('ALL')}
          >
            <span>Tất cả hồ sơ chờ</span>
            <span className="tab-badge">{unassignedInterns.length}</span>
          </button>
          <button
            type="button"
            className={`contract-tab-btn tab-btn--eligible ${contractTab === 'ELIGIBLE' ? 'is-active' : ''}`}
            onClick={() => setContractTab('ELIGIBLE')}
          >
            <ShieldCheck size={14} />
            <span>✓ Đủ điều kiện phân nhóm (Đã ký HĐ)</span>
            <span className="tab-badge badge--green">{countEligible}</span>
          </button>
          <button
            type="button"
            className={`contract-tab-btn tab-btn--pending ${contractTab === 'PENDING' ? 'is-active' : ''}`}
            onClick={() => setContractTab('PENDING')}
          >
            <Clock size={14} />
            <span>⏳ Chờ ký hợp đồng (Tạm khóa)</span>
            <span className="tab-badge badge--amber">{countPending}</span>
          </button>
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
                  <th style={{ width: '46px', textAlign: 'center' }}>
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
                  <th style={{ width: '100px', textAlign: 'center' }}>Mã TTS</th>
                  <th style={{ width: '220px' }}>Họ và tên</th>
                  <th style={{ width: '240px' }}>Email & Điện thoại</th>
                  <th style={{ width: '250px' }}>Trường & Chuyên ngành</th>
                  <th style={{ width: '220px' }}>Chương trình hiện tại</th>
                  <th style={{ width: '200px' }}>Phòng ban nguyện vọng</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '260px', textAlign: 'center' }}>Gán nhanh vào nhóm (1-Click)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnassignedInterns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty-cell">
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
                            setContractTab('ALL');
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
                    const isLocked = intern.hasSignedContract === false;

                    return (
                      <tr
                        key={intern.id}
                        className={`${isSelected ? 'is-row-selected' : ''} ${isLocked ? 'is-row-disabled' : ''}`}
                        onClick={() => !isLocked && handleToggleSelectOne(intern.id)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-row-checkbox"
                            onClick={() => !isLocked && handleToggleSelectOne(intern.id)}
                            disabled={isLocked}
                            title={isLocked ? 'Thực tập sinh chưa ký hợp đồng tiếp nhận, không thể phân nhóm' : isSelected ? 'Bỏ chọn' : 'Chọn thực tập sinh'}
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
                            <span className="intern-email-text">{intern.email}</span>
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
                          <span className={`program-tag ${intern.current_program === 'Chưa phân kỳ' ? 'program-tag--unassigned' : ''}`}>
                            {intern.current_program}
                          </span>
                        </td>
                        <td>
                          <span className="department-tag">{intern.preferred_department}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isLocked ? (
                            <span className="status-badge status-pending" title="TTS chưa hoàn tất ký hợp đồng tiếp nhận, không thể phân công vào nhóm">
                              ⏳ Chờ ký HĐ
                            </span>
                          ) : (
                            <span className="status-badge status-approved" title="Đã ký hợp đồng tiếp nhận — Khả dụng phân nhóm">
                              ✓ Đã ký HĐ
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div className="quick-assign-row">
                            <select
                              className="quick-group-select"
                              value={quickGroupSelections[intern.id] || ''}
                              onChange={(e) => handleQuickGroupChange(intern.id, e.target.value)}
                              aria-label={`Chọn nhóm cho ${intern.full_name}`}
                              disabled={isLocked || submitting}
                              title={isLocked ? 'TTS chưa ký hợp đồng tiếp nhận, không thể phân nhóm' : 'Chọn nhóm'}
                            >
                              <option value="">-- Chọn Nhóm --</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name} ({g.current_slots}/{g.max_slots})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-quick-assign-action"
                              disabled={isLocked || !quickGroupSelections[intern.id] || submitting}
                              onClick={() => handleQuickAssignGroup(intern.id)}
                              title={isLocked ? 'TTS chưa ký hợp đồng tiếp nhận, không thể phân nhóm' : 'Gán ngay thực tập sinh vào nhóm đã chọn'}
                            >
                              <UserCheck size={13} />
                              <span>Gán</span>
                            </button>
                          </div>
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

      {/* ── KHU VỰC 3: KHU VỰC THÀNH VIÊN ĐÃ PHÂN NHÓM ── */}
      <section
        id="step-3-assigned"
        className="assigned-members-section"
        role="region"
        aria-labelledby="assigned-heading"
      >
        <div className="section-header-row">
          <div>
            <h2 id="assigned-heading" className="section-title">
              3. Danh sách thành viên trong nhóm ({filteredAssignedMembers.length})
            </h2>
            <p className="section-desc">
              Theo dõi danh sách thực tập sinh đã được phân bổ thành công vào từng nhóm dự án và phòng ban.
            </p>
          </div>

          <div className="assigned-filters-cluster">
            {/* Lọc theo Kỳ thực tập */}
            <div className="filter-group-dropdown-wrap">
              <label htmlFor="assigned-program-filter" className="group-filter-label">
                Kỳ thực tập:
              </label>
              <select
                id="assigned-program-filter"
                className="group-filter-select"
                value={viewAssignedProgramFilter}
                onChange={(e) => setViewAssignedProgramFilter(e.target.value)}
              >
                <option value="ALL">-- Tất cả kỳ thực tập ({assignedMembers.length} TTS) --</option>
                {availableProgramFilterOptions.map((p) => {
                  const count = assignedMembers.filter(
                    (m) => m.program_name === p.name || (p.id && String(m.program_id) === String(p.id))
                  ).length;
                  return (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} ({count} TTS)
                    </option>
                  );
                })}
              </select>
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
                <option value="ALL">-- Tất cả các nhóm --</option>
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
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '95px', textAlign: 'center' }}>Mã TTS</th>
                  <th style={{ width: '200px' }}>Họ và tên</th>
                  <th style={{ width: '190px' }}>Kỳ thực tập</th>
                  <th style={{ width: '220px' }}>Nhóm dự án</th>
                  <th style={{ width: '200px' }}>Phòng ban trực thuộc</th>
                  <th style={{ width: '170px' }}>Vai trò trong nhóm</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Ngày gán</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
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
                            <span className="intern-email-text" style={{ fontSize: '11.5px', color: '#64748b' }}>{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="assigned-program-pill" title={`Kỳ thực tập: ${member.program_name || 'Khóa K20 - Kỳ Thu 2026'}`}>
                          <FolderKanban size={13} style={{ marginRight: '5px', verticalAlign: 'middle', color: '#2563eb' }} />
                          {member.program_name || 'Khóa K20 - Kỳ Thu 2026'}
                        </span>
                      </td>
                      <td>
                        <span className="assigned-group-pill">{member.group_name}</span>
                        {member.mentor_name && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            Mentor: <strong style={{ color: '#0f172a' }}>{member.mentor_name}</strong>
                          </div>
                        )}
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
