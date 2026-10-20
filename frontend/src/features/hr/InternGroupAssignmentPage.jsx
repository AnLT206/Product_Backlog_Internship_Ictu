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
  Plus,
  Trash2,
  FolderPlus,
  X,
} from 'lucide-react';
import { getPrograms, assignInternsToProgram, removeInternFromProgram } from '../../api/programs';
import {
  getInternshipGroups,
  createInternshipGroup,
  assignInternsToGroup,
  removeInternFromGroup,
} from '../../api/groups';
import {
  getDepartments,
  getMentors,
  assignMentor,
  unassignInternFromMentor,
  getMentorWorkload,
} from '../../api/mentors';
import { getInterns } from '../../api/interns';
import {
  syncMentorAssignment,
  syncUnassignMentor,
  syncCreateInternshipGroup,
  getRealtimeSyncState,
  subscribeRealtimeEvents,
  emitRealtimeEvent,
  SYNC_EVENTS,
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
     TAB ĐIỀU HƯỚNG CHÍNH (Phân công vs Tab Tạo & Quản lý nhóm riêng biệt)
     ─────────────────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'create_and_manage' | 'assigned_list'

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

  // State Form Tạo nhóm thực tập mới (Dành riêng cho Tab 2)
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    code: '',
    department_id: '',
    program_id: '',
    mentor_id: '',
    max_members: 5,
    description: '',
  });
  const [createGroupSubmitting, setCreateGroupSubmitting] = useState(false);

  // State Form chọn phân nhóm (Khu vực 1 - Đích tiếp nhận)
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Hàm chọn nhóm và tự động đồng bộ Kỳ thực tập + Phòng ban từ nhóm đó
  const handleSelectGroup = useCallback((groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) return;
    const target = groups.find((g) => String(g.id) === String(groupId));
    if (target) {
      if (target.program_id) setSelectedProgramId(String(target.program_id));
      if (target.department_id) setSelectedDeptId(String(target.department_id));
    }
  }, [groups]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

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

  // State bộ lọc và tìm kiếm cho Tab 2 (Tạo & Quản lý Nhóm Thực tập)
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupDeptFilter, setGroupDeptFilter] = useState('ALL');

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
      const [programsRes, deptsRes, mentorsRes, internsRes, dbGroupsRes] = await Promise.all([
        getPrograms(),
        getDepartments(),
        getMentors(),
        getInterns({ page_size: 100 }),
        getInternshipGroups().catch(() => ({ ok: true, data: [] })),
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

      // Nhóm thực tập từ CSDL Backend (internship_groups) kết hợp Realtime Sync
      const dbGroups = (dbGroupsRes && dbGroupsRes.ok && Array.isArray(dbGroupsRes.data)) ? dbGroupsRes.data : [];
      const syncState = getRealtimeSyncState();
      const localGroups = Array.isArray(syncState.groups) ? syncState.groups : [];

      const combinedGroupsMap = new Map();
      dbGroups.forEach((g) => {
        combinedGroupsMap.set(String(g.id), g);
      });
      localGroups.forEach((g) => {
        if (!combinedGroupsMap.has(String(g.id))) {
          combinedGroupsMap.set(String(g.id), g);
        }
      });
      const allRawGroups = Array.from(combinedGroupsMap.values());

      const mappedGroups = allRawGroups.map((g) => {
        const foundDept = loadedDepts.find((d) => String(d.id) === String(g.department_id));
        const deptName = g.department_name || (foundDept ? foundDept.name : 'Toàn cơ quan');
        return {
          id: String(g.id),
          mentor_id: g.leader_user_id || g.mentor_id || null,
          name: g.name,
          code: g.code || `GRP-${g.id}`,
          lead_name: g.leader_name || g.lead_name || 'Tech Lead',
          department_id: g.department_id ? String(g.department_id) : '',
          department_name: deptName,
          program_id: g.program_id ? String(g.program_id) : '',
          program_name: g.program_name || '',
          description: g.description || '',
          current_slots: g.current_members_count || 0,
          max_slots: g.max_members || g.max_slots || 5,
        };
      });

      // Bổ sung các nhóm theo mentor nếu mentor chưa có nhóm nào trong danh sách
      loadedMentors.forEach((m) => {
        const foundDept = loadedDepts.find((d) => d.id === m.department_id);
        const deptName = m.department || (foundDept ? foundDept.name : 'Toàn cơ quan');
        const groupTitle = m.position
          ? `Nhóm ${m.position} (${m.full_name})`
          : `Nhóm ${m.full_name}`;

        if (!mappedGroups.some((g) => Number(g.mentor_id) === Number(m.id) || g.name.includes(m.full_name))) {
          mappedGroups.push({
            id: String(m.id),
            mentor_id: m.id,
            name: groupTitle,
            code: `GRP-M${m.id}`,
            lead_name: m.full_name,
            email: m.email,
            department_id: m.department_id ? String(m.department_id) : '',
            department_name: deptName,
            current_slots: m.intern_count || 0,
            max_slots: 5,
          });
        }
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
      const unassignedSet = new Set((syncState.unassigned_intern_ids || []).map(Number));
      const realtimeAssignments = syncState.mentorAssignments || [];
      const realtimeAssignmentMap = new Map();
      realtimeAssignments.forEach((a) => {
        if (!unassignedSet.has(Number(a.intern_id))) {
          realtimeAssignmentMap.set(Number(a.intern_id), a);
        }
      });

      const unassigned = [];
      const assigned = [];

      eligibleInterns.forEach((intern) => {
        const internIdNum = Number(intern.id);
        const isExplicitlyUnassigned = unassignedSet.has(internIdNum);

        const syncAssign = isExplicitlyUnassigned ? null : realtimeAssignmentMap.get(internIdNum);
        let mentorId = isExplicitlyUnassigned ? null : (syncAssign ? syncAssign.mentor_id : intern.mentor_id);
        let mentorName = isExplicitlyUnassigned ? null : (syncAssign ? syncAssign.mentor : intern.mentor_name);

        if (isExplicitlyUnassigned) {
          mentorId = null;
          mentorName = null;
        }

        // Ưu tiên tìm đúng nhóm theo group_id / group_name (Tránh gán nhầm nhóm cũ của cùng mentor)
        const targetGroupId = isExplicitlyUnassigned ? null : (syncAssign?.group_id || intern.group_id || null);
        let assignedGroupObj = null;
        if (targetGroupId) {
          assignedGroupObj = mappedGroups.find((g) => String(g.id) === String(targetGroupId));
        }
        if (!assignedGroupObj && syncAssign?.group_name) {
          assignedGroupObj = mappedGroups.find((g) => g.name === syncAssign.group_name);
        }
        if (!assignedGroupObj && intern.group_name) {
          assignedGroupObj = mappedGroups.find((g) => g.name === intern.group_name);
        }
        if (!assignedGroupObj && mentorId) {
          // Chỉ fallback theo mentor nếu không có bất kỳ thông tin group_id nào
          assignedGroupObj = mappedGroups.find((g) => Number(g.mentor_id) === Number(mentorId));
        }

        // Nếu sinh viên chưa có mentor_id nhưng nhóm có mentor phụ trách thì tự động gán
        if (!mentorId && assignedGroupObj?.mentor_id) {
          mentorId = assignedGroupObj.mentor_id;
          mentorName = assignedGroupObj.lead_name;
        }

        const assignedMentorObj = loadedMentors.find((m) => m.id === mentorId);
        const isContractDone = checkInternContractSigned(intern, syncState.contracts);

        const progId = syncAssign?.program_id || intern.program_id || assignedGroupObj?.program_id || null;
        let progName = syncAssign?.program_name || intern.program_name || assignedGroupObj?.program_name || null;

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
          preferred_department: assignedGroupObj?.department_name || assignedMentorObj?.department || 'Chưa xếp phòng ban',
          status: (mentorId || assignedGroupObj) ? 'Đã phân nhóm' : (intern.status === 'active' ? 'Chờ phân nhóm' : intern.status),
          mentor_id: mentorId,
          mentor_name: mentorName || assignedMentorObj?.full_name || assignedGroupObj?.lead_name,
          program_id: progId,
          hasSignedContract: isContractDone,
        };

        if (mentorId || assignedGroupObj) {
          const finalGroupId = assignedGroupObj ? assignedGroupObj.id : (targetGroupId ? String(targetGroupId) : String(mentorId));
          const finalGroupName = assignedGroupObj ? assignedGroupObj.name : (syncAssign?.group_name || intern.group_name || `Nhóm ${mentorName || 'Mentor'}`);
          assigned.push({
            ...internData,
            group_id: finalGroupId,
            group_name: finalGroupName,
            department_name: assignedGroupObj?.department_name || assignedMentorObj?.department || 'Trung tâm Phát triển Phần mềm',
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

      // Cập nhật lại số lượng sĩ số thực tế (current_slots) cho từng nhóm theo đúng group_id
      const groupsWithAccurateSlots = mappedGroups.map((g) => {
        const actualAssignedCount = assigned.filter((a) =>
          String(a.group_id) === String(g.id) || (a.group_name && a.group_name === g.name)
        ).length;
        return {
          ...g,
          current_slots: actualAssignedCount,
        };
      });
      setGroups(groupsWithAccurateSlots);

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

  // Cân bằng tải Mentor: Khi HR chọn kỳ thực tập, tự động nạp workload chính xác cho kỳ đó
  useEffect(() => {
    if (!selectedProgramId) return;
    let cancelled = false;
    async function loadProgramWorkload() {
      try {
        const res = await getMentorWorkload(Number(selectedProgramId));
        if (!cancelled && res.ok && Array.isArray(res.data)) {
          const workloadMap = new Map();
          res.data.forEach((w) => {
            workloadMap.set(Number(w.mentor_id), w.active_intern_count);
          });
          setGroups((prevGroups) =>
            prevGroups.map((g) => ({
              ...g,
              current_slots: workloadMap.has(Number(g.mentor_id))
                ? workloadMap.get(Number(g.mentor_id))
                : g.current_slots,
            }))
          );
        }
      } catch (err) {
        console.warn('Lỗi khi tải workload theo kỳ thực tập:', err);
      }
    }
    loadProgramWorkload();
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

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

  // Thông tin chi tiết của nhóm đang được chọn trong Form & Kiểm soát hạn mức tải
  const currentSelectedGroup = useMemo(() => {
    return groups.find((g) => String(g.id) === String(selectedGroupId)) || null;
  }, [groups, selectedGroupId]);

  const remainingSlots = useMemo(() => {
    if (!currentSelectedGroup) return 0;
    return Math.max(0, (currentSelectedGroup.max_slots || 5) - (currentSelectedGroup.current_slots || 0));
  }, [currentSelectedGroup]);

  const isOverloaded = useMemo(() => {
    if (!currentSelectedGroup || selectedInternIds.size === 0) return false;
    return selectedInternIds.size > remainingSlots;
  }, [currentSelectedGroup, selectedInternIds.size, remainingSlots]);


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
    if (!selectedGroupId) {
      showToast('Vui lòng chọn Nhóm tiếp nhận để phân công.', 'error');
      return;
    }

    if (selectedInternIds.size === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 thực tập sinh trong bảng.', 'error');
      return;
    }

    const targetGroup = currentSelectedGroup;
    if (!targetGroup) return;

    const internIdsArray = Array.from(selectedInternIds).map((id) => Number(id));

    if (isOverloaded) {
      showToast(
        `Không thể phân công: Nhóm "${targetGroup.name}" chỉ còn tiếp nhận tối đa ${remainingSlots} TTS (bạn đã chọn ${selectedInternIds.size} TTS)!`,
        'error'
      );
      return;
    }

    const hasUnsigned = internIdsArray.some((id) => {
      const it = unassignedInterns.find((i) => i.id === id);
      return it && it.hasSignedContract === false;
    });
    if (hasUnsigned) {
      showToast('Một số thực tập sinh chưa ký hợp đồng tiếp nhận. Vui lòng chỉ chọn thực tập sinh đã ký hợp đồng!', 'warning');
      return;
    }

    const targetMentorId = targetGroup ? Number(targetGroup.mentor_id) : null;
    const targetProgramId = targetGroup?.program_id
      ? Number(targetGroup.program_id)
      : (selectedProgramId ? Number(selectedProgramId) : (programs[0]?.id ? Number(programs[0].id) : 1));
    const targetDeptId = targetGroup?.department_id || selectedDeptId;

    setSubmitting(true);
    try {
      // 1. Gán vào CSDL bảng internship_groups (InternProfileGroup)
      if (targetGroup && targetGroup.id) {
        try {
          await assignInternsToGroup({
            group_id: Number(targetGroup.id),
            intern_ids: internIdsArray,
          });
        } catch (groupAssignErr) {
          console.warn('API assignInternsToGroup fallback:', groupAssignErr);
        }
      }

      // 2. Gọi API Backend phân công TTS vào Kỳ thực tập và Mentor phụ trách nhóm
      let assignResult = null;
      if (targetProgramId && !isNaN(targetProgramId)) {
        assignResult = await assignInternsToProgram(targetProgramId, {
          intern_ids: internIdsArray,
          mentor_id: targetMentorId,
        });
      }

      // 3. Đồng bộ quan hệ Mentor nếu cần
      if (targetMentorId) {
        await assignMentor({
          mentor_id: targetMentorId,
          intern_ids: internIdsArray,
          program_id: targetProgramId || undefined,
        });
      }

      // 4. Phát sự kiện đồng bộ thời gian thực cross-tab
      if (targetMentorId && targetGroup) {
        const progName =
          targetGroup.program_name ||
          currentSelectedProgram?.name ||
          'Khóa K20 - Kỳ Thu 2026';
        syncMentorAssignment(
          targetMentorId,
          targetGroup.lead_name,
          internIdsArray,
          targetGroup.name,
          {
            programId: targetProgramId,
            programName: progName,
            departmentId: targetDeptId,
            departmentName: targetGroup.department_name || currentSelectedDepartment?.name,
            groupId: targetGroup.id,
            groupName: targetGroup.name,
          }
        );
      }

      emitRealtimeEvent('SYNC_GROUPS_UPDATED', {
        groupId: targetGroup?.id,
        internIds: internIdsArray,
        mentorId: targetMentorId,
      });

      // 5. Thông báo thành công và làm mới dữ liệu
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
    const internIdNum = Number(member.id);
    const mentorIdNum = mentorId ? Number(mentorId) : null;
    const progId = member.program_id ? Number(member.program_id) : undefined;
    const groupId = member.group_id ? Number(member.group_id) : null;

    // Cập nhật UI tức thì
    setAssignedMembers((prev) => prev.filter((m) => Number(m.id) !== internIdNum));
    setUnassignedInterns((prev) => [
      ...prev.filter((m) => Number(m.id) !== internIdNum),
      {
        ...member,
        mentor_id: null,
        mentor_name: null,
        group_id: null,
        group_name: null,
        status: 'Chờ phân nhóm',
      },
    ]);
    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        current_slots: Number(g.mentor_id) === mentorIdNum ? Math.max(0, (g.current_slots || 1) - 1) : g.current_slots,
      }))
    );

    try {
      if (groupId) {
        try {
          await removeInternFromGroup(groupId, internIdNum);
        } catch (grpErr) {
          console.warn('API removeInternFromGroup fallback:', grpErr);
        }
      }
      if (mentorIdNum) {
        await unassignInternFromMentor(mentorIdNum, internIdNum, progId);
      }
      syncUnassignMentor(internIdNum);
      emitRealtimeEvent('SYNC_GROUPS_UPDATED', { unassignedInternId: internIdNum, groupId });
      showToast(
        `Đã hủy phân nhóm cho thực tập sinh ${member.full_name}.`,
        'success'
      );
      await loadData();
    } catch (err) {
      console.warn('Lỗi API hủy phân nhóm, thực hiện đồng bộ cục bộ fallback:', err);
      syncUnassignMentor(internIdNum);
      emitRealtimeEvent('SYNC_GROUPS_UPDATED', { unassignedInternId: internIdNum });
      showToast(`Đã hủy phân nhóm cho thực tập sinh ${member.full_name}.`, 'success');
      await loadData();
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
     HÀNH ĐỘNG GỠ HOÀN TOÀN THỰC TẬP SINH KHỎI KỲ THỰC TẬP (REMOVE FROM PROGRAM)
     ─────────────────────────────────────────────────────────────────────────── */
  const handleRemoveFromProgram = async (member) => {
    const internIdNum = Number(member.id);
    const progId = member.program_id ? Number(member.program_id) : (selectedProgramId ? Number(selectedProgramId) : 1);
    const groupId = member.group_id ? Number(member.group_id) : null;

    if (!window.confirm(`Bạn có chắc chắn muốn gỡ hoàn toàn thực tập sinh "${member.full_name}" khỏi kỳ thực tập không?\n\nSinh viên sẽ bị hủy phân công khỏi kỳ, nhóm và người hướng dẫn, chuyển về danh sách chưa tham gia kỳ nào.`)) {
      return;
    }

    try {
      if (groupId) {
        try {
          await removeInternFromGroup(groupId, internIdNum);
        } catch (grpErr) {
          console.warn('API removeInternFromGroup fallback:', grpErr);
        }
      }
      const res = await removeInternFromProgram(progId, internIdNum);
      syncUnassignMentor(internIdNum);
      emitRealtimeEvent('SYNC_GROUPS_UPDATED', { unassignedInternId: internIdNum, groupId });
      showToast(
        res?.data?.message || `Đã gỡ thực tập sinh ${member.full_name} khỏi kỳ thực tập thành công.`,
        'success'
      );
      await loadData();
    } catch (err) {
      console.warn('Lỗi API gỡ khỏi kỳ thực tập, thực hiện đồng bộ cục bộ fallback:', err);
      syncUnassignMentor(internIdNum);
      emitRealtimeEvent('SYNC_GROUPS_UPDATED', { unassignedInternId: internIdNum });
      showToast(`Đã gỡ thực tập sinh ${member.full_name} khỏi kỳ thực tập.`, 'success');
      await loadData();
    }
  };

  /* ───────────────────────────────────────────────────────────────────────────
     HÀNH ĐỘNG TẠO NHÓM THỰC TẬP MỚI (CREATE INTERNSHIP GROUP)
     ─────────────────────────────────────────────────────────────────────────── */
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupData.name.trim()) {
      showToast('Vui lòng nhập tên nhóm thực tập.', 'error');
      return;
    }

    setCreateGroupSubmitting(true);
    try {
      const payload = {
        name: newGroupData.name.trim(),
        code: newGroupData.code.trim() || undefined,
        department_id: newGroupData.department_id ? Number(newGroupData.department_id) : undefined,
        program_id: newGroupData.program_id ? Number(newGroupData.program_id) : (selectedProgramId ? Number(selectedProgramId) : undefined),
        leader_user_id: newGroupData.mentor_id ? Number(newGroupData.mentor_id) : undefined,
        description: newGroupData.description.trim() || undefined,
        max_members: Number(newGroupData.max_members) || 5,
      };

      const res = await createInternshipGroup(payload);
      if (res.ok) {
        showToast(`Đã tạo nhóm thực tập "${payload.name}" thành công!`, 'success');
        setNewGroupData({
          name: '',
          code: '',
          department_id: '',
          program_id: '',
          mentor_id: '',
          max_members: 5,
          description: '',
        });

        const selectedDept = departments.find((d) => Number(d.id) === Number(payload.department_id));
        const selectedMentor = mentors.find((m) => Number(m.id) === Number(payload.leader_user_id));
        const selectedProg = programs.find((p) => Number(p.id) === Number(payload.program_id));

        // Lưu vào realtimeSync state để Mentor Dashboard và TTS Portal nhận diện nhóm ngay lập tức
        syncCreateInternshipGroup({
          id: res.data?.id || Date.now(),
          name: payload.name,
          code: payload.code || res.data?.code,
          department_id: payload.department_id,
          department_name: selectedDept?.name || '',
          program_id: payload.program_id,
          program_name: selectedProg?.name || '',
          leader_user_id: payload.leader_user_id,
          mentor_id: payload.leader_user_id,
          lead_name: selectedMentor?.full_name || 'Mentor',
          leader_name: selectedMentor?.full_name || 'Mentor',
          max_members: payload.max_members,
          description: payload.description,
        });

        // Phát sự kiện đồng bộ thời gian thực cho Mentor Dashboard và TTS Portal
        emitRealtimeEvent('SYNC_GROUPS_UPDATED', {
          groupId: res.data?.id,
          name: payload.name,
          mentorId: payload.leader_user_id,
        });
        emitRealtimeEvent(SYNC_EVENTS.MENTOR_ASSIGNED, {
          groupId: res.data?.id,
        });

        await loadData();
        if (res.data?.id) {
          setSelectedGroupId(String(res.data.id));
        }
      } else {
        showToast(res.data?.detail || 'Không thể tạo nhóm thực tập. Vui lòng thử lại!', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi tạo nhóm mới:', err);
      showToast('Lỗi kết nối máy chủ khi tạo nhóm mới.', 'error');
    } finally {
      setCreateGroupSubmitting(false);
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

    if (targetGroup.current_slots >= targetGroup.max_slots) {
      showToast(`Mentor phụ trách "${targetGroup.name}" đã đủ chỉ tiêu tiếp nhận (${targetGroup.max_slots}/${targetGroup.max_slots} TTS)!`, 'error');
      return;
    }

    const progId = targetGroup.program_id || selectedProgramId || (programs[0]?.id ? String(programs[0].id) : 1);
    const targetMentorId = targetGroup.mentor_id ? Number(targetGroup.mentor_id) : null;

    setSubmitting(true);
    try {
      // 1. Gán vào CSDL bảng internship_groups (InternProfileGroup)
      if (targetGroup.id) {
        try {
          await assignInternsToGroup({
            group_id: Number(targetGroup.id),
            intern_ids: [internId],
          });
        } catch (e) {
          console.warn('API assignInternsToGroup fallback:', e);
        }
      }

      // 2. Gán vào Kỳ thực tập
      if (progId) {
        try {
          await assignInternsToProgram(Number(progId), [internId]);
        } catch (e) {
          console.warn('API assignInternsToProgram fallback:', e);
        }
      }

      // 3. Gán Mentor
      if (targetMentorId) {
        try {
          await assignMentor({
            mentor_id: targetMentorId,
            intern_ids: [internId],
            program_id: Number(progId) || undefined,
          });
        } catch (e) {
          console.warn('API assignMentor fallback:', e);
        }

        const progName = targetGroup.program_name || currentSelectedProgram?.name || 'Khóa K20 - Kỳ Thu 2026';
        syncMentorAssignment(
          targetMentorId,
          targetGroup.lead_name || 'Mentor',
          [internId],
          targetGroup.name,
          {
            programId: Number(progId) || 1,
            programName: progName,
            departmentId: targetGroup.department_id,
            departmentName: targetGroup.department_name,
            groupId: targetGroup.id,
            groupName: targetGroup.name,
          }
        );
      }

      emitRealtimeEvent('SYNC_GROUPS_UPDATED', {
        groupId: targetGroup.id,
        internIds: [internId],
        mentorId: targetMentorId,
      });

      // Xóa lựa chọn gán nhanh của dòng này
      setQuickGroupSelections((prev) => {
        const next = { ...prev };
        delete next[internId];
        return next;
      });

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

  // Danh sách nhóm được lọc trong Tab 2 (Tạo & Quản lý Nhóm Thực tập)
  const filteredTab2Groups = useMemo(() => {
    return groups.filter((g) => {
      const matchDept = groupDeptFilter === 'ALL' || String(g.department_id) === String(groupDeptFilter);
      const q = groupSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        g.name?.toLowerCase().includes(q) ||
        g.code?.toLowerCase().includes(q) ||
        g.lead_name?.toLowerCase().includes(q) ||
        g.department_name?.toLowerCase().includes(q);
      return matchDept && matchQuery;
    });
  }, [groups, groupDeptFilter, groupSearchQuery]);

  const isAssignButtonDisabled =
    submitting ||
    !selectedGroupId ||
    selectedInternIds.size === 0 ||
    isOverloaded;


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

        {/* Nút hành động Tạo nhóm mới & Thống kê nhanh */}
        {/* Nút hành động Tạo nhóm mới & Thống kê nhanh */}
        <div className="page-header-actions-cluster">
          <button
            type="button"
            className="btn-create-group-primary"
            onClick={() => setActiveTab('create_and_manage')}
            title="Tạo nhóm thực tập mới theo phòng ban / dự án (Tab riêng biệt)"
          >
            <FolderPlus size={16} />
            <span>+ Tạo nhóm mới</span>
          </button>

          <div className="quick-stats-bar">
            <div
              className={`quick-stat-item ${activeTab === 'assign' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('assign')}
              style={{ cursor: 'pointer' }}
              title="Xem danh sách chờ phân nhóm"
            >
              <span className="stat-label">Chờ phân nhóm</span>
              <span className="stat-value text-amber">{unassignedInterns.length}</span>
            </div>
            <div className="quick-stat-divider" />
            <div
              className={`quick-stat-item ${activeTab === 'assigned_list' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('assigned_list')}
              style={{ cursor: 'pointer' }}
              title="Xem danh sách đã phân nhóm"
            >
              <span className="stat-label">Đã phân nhóm</span>
              <span className="stat-value text-blue">{assignedMembers.length}</span>
            </div>
            <div className="quick-stat-divider" />
            <div
              className={`quick-stat-item ${activeTab === 'create_and_manage' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('create_and_manage')}
              style={{ cursor: 'pointer' }}
              title="Quản lý và tạo nhóm thực tập"
            >
              <span className="stat-label">Số nhóm dự án</span>
              <span className="stat-value text-emerald">{groups.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── THANH TAB ĐIỀU HƯỚNG CHÍNH (PHÂN BIỆT RÕ: PHÂN CÔNG vs TẠO & QUẢN LÝ NHÓM vs DANH SÁCH ĐÃ GÁN) ── */}
      <div className="group-assignment-main-tabs" role="tablist" aria-label="Phân hệ phân công và quản lý nhóm">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assign'}
          className={`main-tab-nav-btn ${activeTab === 'assign' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          <Users size={16} />
          <span>👥 Phân công Thực tập sinh</span>
          <span className="tab-pill-counter">{unassignedInterns.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'create_and_manage'}
          className={`main-tab-nav-btn ${activeTab === 'create_and_manage' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('create_and_manage')}
        >
          <FolderPlus size={16} />
          <span>➕ Tạo &amp; Quản lý Nhóm Thực tập</span>
          <span className="tab-pill-counter pill-green">{groups.length} nhóm</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assigned_list'}
          className={`main-tab-nav-btn ${activeTab === 'assigned_list' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('assigned_list')}
        >
          <CheckSquare size={16} />
          <span>📋 Danh sách Sinh viên Đã Phân nhóm</span>
          <span className="tab-pill-counter pill-blue">{assignedMembers.length}</span>
        </button>
      </div>

      {/* ── TAB 2: TẠO VÀ QUẢN LÝ NHÓM THỰC TẬP RIÊNG BIỆT ── */}
      {activeTab === 'create_and_manage' && (
        <section className="group-mgmt-tab-view" aria-label="Quản lý và tạo nhóm thực tập">
          <div className="group-mgmt-intro-banner">
            <div className="mgmt-intro-icon">
              <FolderPlus size={24} className="text-blue" />
            </div>
            <div className="mgmt-intro-text">
              <h2 className="mgmt-intro-title">Tạo &amp; Quản lý Danh mục Nhóm Thực tập theo Phòng ban</h2>
              <p className="mgmt-intro-desc">
                Khu vực riêng biệt để thiết lập nhóm đề tài dự án mới, phân bổ chỉ tiêu sĩ số và chỉ định Mentor phụ trách.
                <strong> 1 Mentor có thể hướng dẫn đồng thời nhiều nhóm đề tài khác nhau</strong> mà không bị ghi đè hoặc xung đột dữ liệu.
              </p>
            </div>
          </div>

          <div className="group-mgmt-split-grid">
            {/* CỘT TRÁI: FORM EMBEDDED TẠO NHÓM MỚI */}
            <div className="create-group-card-embedded">
              <div className="embedded-card-header">
                <div className="embedded-icon-box">
                  <FolderPlus size={20} className="text-blue" />
                </div>
                <div>
                  <h3 className="embedded-card-title">Tạo nhóm thực tập mới</h3>
                  <p className="embedded-card-desc">Thiết lập nhóm đề tài dự án và gán Mentor phụ trách</p>
                </div>
              </div>

              <form onSubmit={handleCreateGroupSubmit} className="embedded-group-form">
                <div className="form-group-field">
                  <label className="field-label">
                    Tên nhóm thực tập <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Ví dụ: Nhóm Phát triển Ứng dụng Cloud & AI"
                    value={newGroupData.name}
                    onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                    required
                    disabled={createGroupSubmitting}
                  />
                </div>

                <div className="form-row-2col">
                  <div className="form-group-field">
                    <label className="field-label">Mã nhóm (Tùy chọn)</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Ví dụ: GRP-CLOUD-01"
                      value={newGroupData.code}
                      onChange={(e) => setNewGroupData({ ...newGroupData, code: e.target.value })}
                      disabled={createGroupSubmitting}
                    />
                  </div>
                  <div className="form-group-field">
                    <label className="field-label">Số lượng TTS tối đa</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="field-input"
                      value={newGroupData.max_members}
                      onChange={(e) => setNewGroupData({ ...newGroupData, max_members: e.target.value })}
                      disabled={createGroupSubmitting}
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-group-field">
                    <label className="field-label">Phòng ban tiếp nhận</label>
                    <select
                      className="field-select"
                      value={newGroupData.department_id}
                      onChange={(e) => setNewGroupData({ ...newGroupData, department_id: e.target.value })}
                      disabled={createGroupSubmitting}
                    >
                      <option value="">-- Chọn Phòng ban --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-field">
                    <label className="field-label">Kỳ thực tập</label>
                    <select
                      className="field-select"
                      value={newGroupData.program_id}
                      onChange={(e) => setNewGroupData({ ...newGroupData, program_id: e.target.value })}
                      disabled={createGroupSubmitting}
                    >
                      <option value="">-- Chọn Kỳ thực tập --</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group-field">
                  <label className="field-label">Mentor / Tech Lead phụ trách nhóm</label>
                  <select
                    className="field-select"
                    value={newGroupData.mentor_id}
                    onChange={(e) => setNewGroupData({ ...newGroupData, mentor_id: e.target.value })}
                    disabled={createGroupSubmitting}
                  >
                    <option value="">-- Chọn Người hướng dẫn phụ trách --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.position || 'Mentor'}) — Đang kèm {m.intern_count || 0}/5 TTS
                      </option>
                    ))}
                  </select>
                  <span className="field-subhint text-slate-500" style={{ fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    💡 1 Mentor có thể phụ trách nhiều nhóm đề tài cùng lúc.
                  </span>
                </div>

                <div className="form-group-field">
                  <label className="field-label">Mô tả mục tiêu / Đề tài của nhóm</label>
                  <textarea
                    className="field-textarea"
                    rows="3"
                    placeholder="Mô tả tóm tắt nội dung thực tập, nhiệm vụ chính hoặc công nghệ áp dụng..."
                    value={newGroupData.description}
                    onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                    disabled={createGroupSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-create-group-embedded-submit"
                  disabled={createGroupSubmitting}
                >
                  <FolderPlus size={16} />
                  <span>{createGroupSubmitting ? 'Đang tạo nhóm...' : '🚀 Lưu & Tạo nhóm thực tập'}</span>
                </button>
              </form>
            </div>

            {/* CỘT PHẢI: DANH SÁCH TẤT CẢ CÁC NHÓM & SĨ SỐ THỰC TẾ */}
            <div className="groups-directory-panel">
              <div className="directory-header-row">
                <div>
                  <h3 className="directory-title">
                    Danh mục Nhóm Thực tập Hiện có ({filteredTab2Groups.length}/{groups.length} nhóm)
                  </h3>
                  <p className="directory-desc">
                    Theo dõi các nhóm đã thành lập, sĩ số tiếp nhận và các thành viên đã được phân bổ vào từng nhóm.
                  </p>
                </div>
              </div>

              {/* Bộ lọc phòng ban & ô tìm kiếm trong Tab 2 */}
              <div className="directory-filter-bar">
                <div className="directory-search-box">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    className="directory-search-input"
                    placeholder="Tìm theo tên nhóm, mã nhóm, mentor phụ trách..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                  />
                </div>

                <div className="directory-dept-select-wrap">
                  <select
                    className="directory-dept-select"
                    value={groupDeptFilter}
                    onChange={(e) => setGroupDeptFilter(e.target.value)}
                  >
                    <option value="ALL">-- Tất cả phòng ban --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid các thẻ nhóm */}
              <div className="directory-cards-grid">
                {filteredTab2Groups.length === 0 ? (
                  <div className="directory-empty-card">
                    <FolderKanban size={36} color="#94a3b8" />
                    <h4>Không tìm thấy nhóm thực tập nào phù hợp</h4>
                    <p>Hãy tạo nhóm mới bằng biểu mẫu bên trái hoặc điều chỉnh từ khóa tìm kiếm.</p>
                  </div>
                ) : (
                  filteredTab2Groups.map((grp) => {
                    const groupMembers = assignedMembers.filter((m) => String(m.group_id) === String(grp.id) || m.group_name === grp.name);
                    const actualCount = Math.max(grp.current_slots || 0, groupMembers.length);
                    const maxSlots = grp.max_slots || 5;
                    const percent = Math.min(100, Math.round((actualCount / maxSlots) * 100));
                    const isFull = actualCount >= maxSlots;

                    return (
                      <div key={grp.id} className="directory-group-card">
                        <div className="dir-card-header">
                          <div className="dir-card-title-box">
                            <h4 className="dir-group-name">{grp.name}</h4>
                            <span className="dir-group-code-pill">{grp.code || `GRP-${grp.id}`}</span>
                          </div>
                          {isFull ? (
                            <span className="dir-badge-full">Đã đủ sĩ số</span>
                          ) : (
                            <span className="dir-badge-open">Còn {maxSlots - actualCount} chỗ</span>
                          )}
                        </div>

                        <div className="dir-card-meta-chips">
                          {grp.department_name && (
                            <span className="dir-meta-chip">
                              <Building size={12} /> {grp.department_name}
                            </span>
                          )}
                          <span className="dir-meta-chip text-blue">
                            <UserCheck size={12} /> Mentor: <strong>{grp.lead_name}</strong>
                          </span>
                        </div>

                        {/* Thanh chỉ tiêu sĩ số */}
                        <div className="dir-capacity-box">
                          <div className="dir-capacity-labels">
                            <span>Sĩ số thành viên:</span>
                            <strong>{actualCount} / {maxSlots} TTS ({percent}%)</strong>
                          </div>
                          <div className="dir-capacity-track">
                            <div
                              className={`dir-capacity-fill ${isFull ? 'fill-red' : percent >= 70 ? 'fill-amber' : 'fill-green'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Danh sách thành viên tóm tắt */}
                        <div className="dir-members-summary">
                          <span className="dir-members-heading">Thành viên trong nhóm ({groupMembers.length}):</span>
                          {groupMembers.length === 0 ? (
                            <span className="dir-no-members-text">Chưa có sinh viên nào trong nhóm</span>
                          ) : (
                            <div className="dir-members-chips-wrap">
                              {groupMembers.map((m) => (
                                <span key={m.id} className="dir-member-chip" title={`${m.full_name} (${m.code})`}>
                                  <span className="dir-avatar-micro">{getInitials(m.full_name)}</span>
                                  <span className="dir-member-chip-name">{m.full_name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Nút hành động gán sinh viên vào nhóm này */}
                        <div className="dir-card-footer">
                          <button
                            type="button"
                            className="btn-assign-into-this-group"
                            onClick={() => {
                              setSelectedGroupId(String(grp.id));
                              if (grp.department_id) setSelectedDeptId(String(grp.department_id));
                              if (grp.program_id) setSelectedProgramId(String(grp.program_id));
                              setActiveTab('assign');
                              setTimeout(() => scrollToSection('step-2-interns'), 150);
                              showToast(`Đã chọn "${grp.name}". Hãy chọn sinh viên ở Bước 2 để phân công!`, 'info');
                            }}
                          >
                            <ArrowRight size={14} />
                            <span>👉 Phân công sinh viên vào nhóm này</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BANNER TAB 3: DANH SÁCH THỰC TẬP SINH ĐÃ GÁN ── */}
      {activeTab === 'assigned_list' && (
        <div className="assigned-tab-header-banner">
          <div className="banner-icon-badge">
            <CheckSquare size={20} className="text-blue" />
          </div>
          <div>
            <h3 className="banner-title">Danh sách Thực tập sinh Đã Phân Nhóm &amp; Bàn giao Mentor</h3>
            <p className="banner-desc">Tra cứu chi tiết tình trạng phân nhóm, kỳ thực tập và thực hiện gỡ hoặc điều chuyển sinh viên.</p>
          </div>
        </div>
      )}

      {/* ── THANH ĐIỀU HƯỚNG NHANH CÁC BƯỚC (JUMP-TO WORKFLOW - CHỈ HIỂN THỊ Ở TAB PHÂN CÔNG) ── */}
      {activeTab === 'assign' && (
        <>
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

      {/* ── KHU VỰC 1: PANEL CHỌN ĐÍCH TIẾP NHẬN THEO NHÓM ── */}
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
              1. Chọn Nhóm tiếp nhận phân công
            </h2>
            <p className="panel-desc">
              Lựa chọn Nhóm dự án tiếp nhận thực tập sinh. Kỳ thực tập, Phòng ban và Mentor được tự động kế thừa từ nhóm đã chọn.
            </p>
          </div>
        </div>

        <form className="assign-form-streamlined" onSubmit={handleAssignToGroup}>
          <div className="group-select-primary-row">
            <div className="form-group group-select-main-field">
              <label htmlFor="group-select" className="form-label">
                <Users size={15} />
                <span>Nhóm tiếp nhận <strong className="required-mark">*</strong></span>
              </label>
              <div className="select-container">
                <select
                  id="group-select"
                  aria-label="Chọn Nhóm tiếp nhận"
                  className="form-select form-select-large"
                  value={selectedGroupId}
                  onChange={(e) => handleSelectGroup(e.target.value)}
                >
                  <option value="">-- Chọn Nhóm dự án / tiếp nhận --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.department_name || 'Phòng ban'} (Mentor: {g.lead_name} • Đã có: {g.current_slots}/{g.max_slots})
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
                    ? 'Vui lòng chọn Nhóm tiếp nhận và tích chọn ít nhất 1 TTS'
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
          </div>

          {/* Khung tóm tắt thông tin đồng bộ của Nhóm đang chọn */}
          {currentSelectedGroup ? (
            <div className="group-info-card group-info-card--autofilled">
              <div className="group-autofill-banner">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>Hệ thống tự động liên kết Kỳ thực tập, Phòng ban và Mentor từ <strong>{currentSelectedGroup.name}</strong></span>
              </div>

              <div className="group-info-meta-chips">
                <div className="group-meta-pill">
                  <Layers size={14} className="text-indigo" />
                  <span className="meta-pill-label">Kỳ thực tập:</span>
                  <strong className="meta-pill-value">
                    {currentSelectedGroup.program_name || currentSelectedProgram?.name || 'Khóa K20 - Kỳ Thu 2026'}
                  </strong>
                </div>

                <div className="group-meta-pill">
                  <Building size={14} className="text-blue" />
                  <span className="meta-pill-label">Phòng ban:</span>
                  <strong className="meta-pill-value">
                    {currentSelectedGroup.department_name || 'Trung tâm Phát triển Phần mềm'}
                  </strong>
                </div>

                <div className="group-meta-pill">
                  <UserCheck size={14} className="text-emerald" />
                  <span className="meta-pill-label">Mentor trưởng nhóm:</span>
                  <strong className="meta-pill-value">{currentSelectedGroup.lead_name}</strong>
                </div>

                <div className="group-meta-pill">
                  <Users size={14} className="text-amber" />
                  <span className="meta-pill-label">Sĩ số tiếp nhận:</span>
                  <strong className="meta-pill-value">
                    {currentSelectedGroup.current_slots} / {currentSelectedGroup.max_slots} TTS
                  </strong>
                </div>
              </div>

              {/* Thanh tải sức chứa trực quan */}
              <div className="group-capacity-bar-wrap">
                <div className="capacity-bar-labels">
                  <span className="capacity-bar-title">Độ phủ chỉ tiêu hiện tại của nhóm:</span>
                  <span className="capacity-bar-percent">
                    {Math.round((currentSelectedGroup.current_slots / currentSelectedGroup.max_slots) * 100)}% ({currentSelectedGroup.current_slots}/{currentSelectedGroup.max_slots} TTS)
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

                {/* Dự kiến tải sau khi gán & Cảnh báo vượt trần phân công */}
                {selectedInternIds.size > 0 && (
                  <div className={`assignment-workload-preview-card ${isOverloaded ? 'is-overloaded' : 'is-safe'}`}>
                    {isOverloaded ? (
                      <div className="workload-preview-alert">
                        <AlertCircle size={16} className="text-danger" />
                        <div>
                          <strong>Cảnh báo vượt chỉ tiêu phân công:</strong>
                          <p>
                            Bạn đang chọn <strong>{selectedInternIds.size} TTS</strong> trong khi Mentor <strong>{currentSelectedGroup.lead_name}</strong> chỉ còn tiếp nhận tối đa <strong>{remainingSlots} chỗ</strong>. Vui lòng giảm bớt sinh viên để hệ thống bảo đảm cân bằng khối lượng công việc.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="workload-preview-ok">
                        <CheckCircle2 size={16} className="text-emerald" />
                        <div>
                          <strong>Dự kiến sau khi phân công:</strong>
                          <p>
                            Tải nhóm sẽ tăng lên <strong>{currentSelectedGroup.current_slots + selectedInternIds.size} / {currentSelectedGroup.max_slots} TTS</strong> ({Math.round(((currentSelectedGroup.current_slots + selectedInternIds.size) / currentSelectedGroup.max_slots) * 100)}%). Tải công việc nằm trong ngưỡng an toàn.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="group-select-prompt-card">
              <FolderKanban size={18} className="text-slate-400" />
              <span>Hãy chọn một <strong>Nhóm tiếp nhận</strong> ở trên hoặc nhấp vào thẻ nhóm bên dưới. Thông tin Kỳ thực tập &amp; Phòng ban sẽ được tự động liên kết.</span>
            </div>
          )}
        </form>

        {/* ── KHU VỰC TRỰC QUAN: THẺ NHÓM DỰ ÁN ĐỂ NHẤP CHỌN NHANH ── */}
        <div className="group-selection-visual-section">
          <div className="section-sub-header">
            <div>
              <h3 className="section-sub-title">
                🏢 Danh mục Nhóm Thực tập ({groups.length} nhóm khả dụng)
              </h3>
              <p className="section-sub-desc">
                Nhấp vào bất kỳ thẻ nhóm nào để chọn nhanh đích phân công.
              </p>
            </div>
            <button
              type="button"
              className="btn-switch-tab-link"
              onClick={() => setActiveTab('create_and_manage')}
              title="Chuyển sang Tab Tạo & Quản lý nhóm để thiết lập nhóm mới"
            >
              <FolderPlus size={15} />
              <span>+ Tạo thêm nhóm mới (Tab 2)</span>
            </button>
          </div>

          <div className="visual-group-cards-grid">
            {groups.length === 0 ? (
              <div className="empty-group-cards-box">
                <Users size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Chưa có nhóm thực tập nào trong hệ thống.</p>
                <button
                  type="button"
                  className="btn-switch-create-tab"
                  onClick={() => setActiveTab('create_and_manage')}
                >
                  <Plus size={15} /> Chuyển sang Tab Tạo nhóm để thiết lập nhóm đầu tiên
                </button>
              </div>
            ) : (
              groups.map((grp) => {
                const isSelected = String(grp.id) === String(selectedGroupId);
                const isFull = grp.current_slots >= grp.max_slots;
                const slotPercent = Math.min(100, Math.round((grp.current_slots / grp.max_slots) * 100));

                return (
                  <div
                    key={grp.id}
                    className={`visual-group-card ${isSelected ? 'is-selected-card' : ''} ${isFull ? 'is-full-card' : ''}`}
                    onClick={() => handleSelectGroup(String(grp.id))}
                    role="button"
                    tabIndex={0}
                    aria-label={`Chọn nhóm ${grp.name}`}
                  >
                    <div className="group-card-top-row">
                      <div className="group-card-title-wrap">
                        <h4 className="group-card-name">{grp.name}</h4>
                        <span className="group-code-pill">{grp.code || `GRP-${grp.id}`}</span>
                      </div>
                      {isSelected ? (
                        <span className="badge-selected-glowing">
                          <Check size={13} /> Đang chọn
                        </span>
                      ) : isFull ? (
                        <span className="badge-slots-full">Đã đủ</span>
                      ) : (
                        <span className="badge-slots-open">
                          Còn {grp.max_slots - grp.current_slots} chỗ
                        </span>
                      )}
                    </div>

                    <div className="group-card-meta-row">
                      <div className="meta-item">
                        <Building size={13} />
                        <span>{grp.department_name}</span>
                      </div>
                      <div className="meta-item text-primary">
                        <UserCheck size={13} />
                        <span>Mentor: <strong>{grp.lead_name}</strong></span>
                      </div>
                    </div>

                    {/* Thanh tiến độ sĩ số */}
                    <div className="group-card-slot-bar-wrap">
                      <div className="slot-label-row">
                        <span>Sĩ số tiếp nhận:</span>
                        <strong>{grp.current_slots}/{grp.max_slots} TTS ({slotPercent}%)</strong>
                      </div>
                      <div className="slot-track">
                        <div
                          className={`slot-fill ${isFull ? 'fill-full' : slotPercent > 70 ? 'fill-warning' : 'fill-ok'}`}
                          style={{ width: `${slotPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="group-card-action-bar">
                      <button
                        type="button"
                        className={`btn-select-group-action ${isSelected ? 'is-active-btn' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectGroup(String(grp.id));
                        }}
                      >
                        {isSelected ? '✓ Đang chọn nhóm này' : '👉 Chọn nhóm này'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
                          <span className={`program-tag ${intern.current_program === 'Chưa phân kỳ' ? 'program-tag--unassigned' : ''}`}>
                            {intern.current_program}
                          </span>
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
      </>
      )}

      {/* ── KHU VỰC 3: KHU VỰC THÀNH VIÊN ĐÃ PHÂN NHÓM ── */}
      {(activeTab === 'assign' || activeTab === 'assigned_list') && (
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
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-remove-member"
                            onClick={() => handleUnassignMember(member)}
                            title="Gỡ khỏi nhóm (về trạng thái chờ phân nhóm lại)"
                          >
                            <UserMinus size={13} />
                            <span>Gỡ nhóm</span>
                          </button>
                          <button
                            type="button"
                            className="btn-remove-program-action"
                            onClick={() => handleRemoveFromProgram(member)}
                            title="Gỡ hoàn toàn thực tập sinh khỏi kỳ thực tập này"
                          >
                            <Trash2 size={13} />
                            <span>Gỡ kỳ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
      )}


    </div>
  );
}
