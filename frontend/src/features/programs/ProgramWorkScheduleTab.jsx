/**
 * ProgramWorkScheduleTab.jsx
 *
 * Quản lý lịch làm việc theo từng phiên hằng tuần gắn với kỳ thực tập (HR):
 * - Xem theo ma trận lịch biểu 7 ngày trong tuần (T2 - CN) hoặc dạng thẻ danh sách
 * - Lọc theo kỳ thực tập cụ thể hoặc xem toàn bộ
 * - Thêm mới, chỉnh sửa, xóa phiên làm việc
 * - Bật/tắt trạng thái ca làm việc nhanh chóng
 * - Khởi tạo nhanh mẫu ca chuẩn ICTU (Ca sáng 08:00-12:00, Ca chiều 13:30-17:30 T2-T6)
 * - Tự động tính toán tổng số giờ làm việc chuẩn mỗi tuần
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  CalendarDays,
  Filter,
  Check,
  ChevronRight,
  Sun,
  Sunset,
  Briefcase,
  Zap,
  Info,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import apiFetch from '../../api/client';
import {
  getProgramWorkSchedules,
  createWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule
} from '../../api/programs';
import { getInternshipGroups } from '../../api/groups';
import { syncWorkScheduleChange } from '../../utils/realtimeSync';
import './ProgramWorkScheduleTab.css';

// Cấu hình các ngày trong tuần
export const WEEK_DAYS = [
  { key: '2', short: 'T2', full: 'Thứ 2', label: 'Thứ Hai' },
  { key: '3', short: 'T3', full: 'Thứ 3', label: 'Thứ Ba' },
  { key: '4', short: 'T4', full: 'Thứ 4', label: 'Thứ Tư' },
  { key: '5', short: 'T5', full: 'Thứ 5', label: 'Thứ Năm' },
  { key: '6', short: 'T6', full: 'Thứ 6', label: 'Thứ Sáu' },
  { key: '7', short: 'T7', full: 'Thứ 7', label: 'Thứ Bảy' },
  { key: 'CN', alt: '8', short: 'CN', full: 'Chủ Nhật', label: 'Chủ Nhật' },
];

// Định nghĩa loại ca làm việc
export const SHIFT_TYPES = {
  morning: {
    label: 'Ca sáng',
    icon: Sun,
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    defaultStart: '08:00',
    defaultEnd: '12:00',
    desc: 'Phiên làm việc buổi sáng (thường 08:00 - 12:00)'
  },
  afternoon: {
    label: 'Ca chiều',
    icon: Sunset,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    defaultStart: '13:30',
    defaultEnd: '17:30',
    desc: 'Phiên làm việc buổi chiều (thường 13:30 - 17:30)'
  },
  full_time: {
    label: 'Toàn thời gian',
    icon: Briefcase,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    defaultStart: '08:00',
    defaultEnd: '17:30',
    desc: 'Cả ngày gồm giờ nghỉ trưa (08:00 - 17:30)'
  },
  flexible: {
    label: 'Linh hoạt',
    icon: Zap,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    defaultStart: '08:30',
    defaultEnd: '17:00',
    desc: 'Ca linh hoạt theo thỏa thuận hoặc tự do đăng ký'
  }
};

/** Cắt chuỗi giờ HH:MM:SS thành HH:MM */
function formatHour(timeStr) {
  if (!timeStr) return '--:--';
  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
}

/** Tính thời lượng ca (giờ và phút) */
function getShiftDuration(startTime, endTime) {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diffMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
  if (diffMinutes <= 0) return '';
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) return `${hours} giờ`;
  return `${hours}h ${mins}p`;
}

/** Kiểm tra ca có áp dụng vào ngày trong tuần hay không */
function isShiftOnDay(daysOfWeekStr, dayKey, altKey) {
  if (!daysOfWeekStr) return false;
  const list = daysOfWeekStr.split(',').map((s) => s.trim().toUpperCase());
  return list.includes(dayKey.toUpperCase()) || (altKey && list.includes(altKey.toUpperCase()));
}

export default function ProgramWorkScheduleTab({ programs = [], initialProgramId = null }) {
  // Kỳ thực tập đang chọn lọc ('all' hoặc ID cụ thể)
  const [selectedProgramId, setSelectedProgramId] = useState(() => {
    if (initialProgramId) return String(initialProgramId);
    if (programs.length > 0) {
      const active = programs.find((p) => p.status === 'open') || programs[0];
      return String(active.id);
    }
    return 'all';
  });

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'cards'
  const [toast, setToast] = useState(null);

  // Danh sách nhóm và bộ lọc nhóm
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');

  // State cho Modal Thêm / Sửa ca
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    id: null,
    group_name: '',
    program_id: '',
    group_id: '',
    shift_type: 'morning',
    start_time: '08:00',
    end_time: '12:00',
    selected_days: ['2', '3', '4', '5', '6'],
    flexible_minutes: 15,
    is_active: true
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, submitting]);

  // Cập nhật selectedProgramId nếu programs ban đầu nạp chậm
  useEffect(() => {
    if (selectedProgramId === 'all' && programs.length > 0) {
      const active = programs.find((p) => p.status === 'open') || programs[0];
      if (active) setSelectedProgramId(String(active.id));
    }
  }, [programs, selectedProgramId]);

  // Tải danh sách ca làm việc từ API
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const progId = selectedProgramId !== 'all' ? selectedProgramId : null;
      const res = await getProgramWorkSchedules(progId);
      if (res.ok && Array.isArray(res.data)) {
        setSchedules(res.data);
      } else {
        setSchedules([]);
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Tải danh sách nhóm khi đổi kỳ thực tập
  useEffect(() => {
    setSelectedGroupId('all');
    if (selectedProgramId && selectedProgramId !== 'all') {
      getInternshipGroups({ program_id: selectedProgramId })
        .then((res) => {
          if (res.ok && Array.isArray(res.data)) {
            setGroups(res.data);
          } else {
            setGroups([]);
          }
        })
        .catch(() => setGroups([]));
    } else {
      setGroups([]);
    }
  }, [selectedProgramId]);

  // Thông tin kỳ thực tập đang chọn
  const currentProgram = useMemo(() => {
    if (selectedProgramId === 'all') return null;
    return programs.find((p) => String(p.id) === String(selectedProgramId)) || null;
  }, [programs, selectedProgramId]);

  // Danh sách ca làm việc đã lọc theo nhóm và sắp xếp tăng dần theo giờ bắt đầu
  const filteredSchedules = useMemo(() => {
    let list = [...schedules];
    if (selectedGroupId !== 'all') {
      const gId = parseInt(selectedGroupId, 10);
      list = list.filter((s) => s.group_id === gId || !s.group_id);
    }
    return list.sort((a, b) => {
      const timeComp = (a.start_time || '').localeCompare(b.start_time || '');
      if (timeComp !== 0) return timeComp;
      return a.id - b.id;
    });
  }, [schedules, selectedGroupId]);

  // Thống kê phiên
  const activeSchedulesCount = filteredSchedules.filter((s) => s.is_active).length;
  
  // Tính tổng số giờ làm việc trung bình mỗi tuần theo bộ lọc
  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    filteredSchedules.forEach((s) => {
      if (!s.is_active) return;
      const [sh, sm] = formatHour(s.start_time).split(':').map(Number);
      const [eh, em] = formatHour(s.end_time).split(':').map(Number);
      const diffHrs = ((eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))) / 60;
      if (diffHrs > 0 && s.days_of_week) {
        const daysCount = s.days_of_week.split(',').filter(Boolean).length;
        total += diffHrs * daysCount;
      }
    });
    return Math.round(total * 10) / 10;
  }, [filteredSchedules]);

  // Mở modal tạo mới
  const handleOpenCreateModal = (defaultShiftType = 'morning', defaultDay = null) => {
    setModalMode('create');
    setModalError('');
    const shiftConfig = SHIFT_TYPES[defaultShiftType] || SHIFT_TYPES.morning;
    setFormData({
      id: null,
      group_name: defaultShiftType === 'morning' ? 'Ca sáng tiêu chuẩn' : defaultShiftType === 'afternoon' ? 'Ca chiều tiêu chuẩn' : 'Phiên làm việc chuyên môn',
      program_id: selectedProgramId !== 'all' ? selectedProgramId : (programs[0]?.id ? String(programs[0].id) : ''),
      group_id: selectedGroupId !== 'all' ? selectedGroupId : '',
      shift_type: defaultShiftType,
      start_time: shiftConfig.defaultStart,
      end_time: shiftConfig.defaultEnd,
      selected_days: defaultDay ? [defaultDay] : ['2', '3', '4', '5', '6'],
      flexible_minutes: 15,
      is_active: true
    });
    setModalOpen(true);
  };

  // Mở modal sửa ca
  const handleOpenEditModal = (shift) => {
    setModalMode('edit');
    setModalError('');
    const daysArr = shift.days_of_week
      ? shift.days_of_week.split(',').map((s) => s.trim())
      : ['2', '3', '4', '5', '6'];

    setFormData({
      id: shift.id,
      group_name: shift.group_name || '',
      program_id: shift.program_id ? String(shift.program_id) : '',
      group_id: shift.group_id ? String(shift.group_id) : '',
      shift_type: shift.shift_type || 'morning',
      start_time: formatHour(shift.start_time),
      end_time: formatHour(shift.end_time),
      selected_days: daysArr,
      flexible_minutes: shift.flexible_minutes ?? 15,
      is_active: shift.is_active ?? true
    });
    setModalOpen(true);
  };

  // Đóng modal
  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setModalError('');
  };

  // Xử lý thay đổi shift_type tự động gợi ý giờ chuẩn
  const handleShiftTypeChange = (newType) => {
    const config = SHIFT_TYPES[newType];
    setFormData((prev) => ({
      ...prev,
      shift_type: newType,
      start_time: config?.defaultStart || prev.start_time,
      end_time: config?.defaultEnd || prev.end_time
    }));
  };

  // Toggle chọn ngày làm việc trong modal
  const handleToggleDay = (dayKey) => {
    const DAY_ORDER = ['2', '3', '4', '5', '6', '7', 'CN'];
    setFormData((prev) => {
      const exists = prev.selected_days.includes(dayKey);
      let updated;
      if (exists) {
        if (prev.selected_days.length === 1) return prev; // giữ ít nhất 1 ngày
        updated = prev.selected_days.filter((d) => d !== dayKey);
      } else {
        updated = [...prev.selected_days, dayKey];
      }
      updated.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
      return { ...prev, selected_days: updated };
    });
  };

  // Chọn mẫu ngày nhanh
  const handleApplyDayPreset = (preset) => {
    if (preset === 'weekdays') {
      setFormData((prev) => ({ ...prev, selected_days: ['2', '3', '4', '5', '6'] }));
    } else if (preset === 'all') {
      setFormData((prev) => ({ ...prev, selected_days: ['2', '3', '4', '5', '6', '7', 'CN'] }));
    } else if (preset === 'weekend') {
      setFormData((prev) => ({ ...prev, selected_days: ['7', 'CN'] }));
    }
  };

  // Lưu form (Tạo mới / Cập nhật)
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.group_name.trim()) {
      setModalError('Vui lòng nhập tên phiên làm việc hoặc tên nhóm.');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setModalError('Vui lòng chọn đầy đủ giờ bắt đầu và giờ kết thúc.');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      setModalError('Giờ bắt đầu phải trước giờ kết thúc ca làm việc.');
      return;
    }
    if (!formData.selected_days || formData.selected_days.length === 0) {
      setModalError('Vui lòng chọn ít nhất một ngày làm việc trong tuần.');
      return;
    }

    const payload = {
      group_name: formData.group_name.trim(),
      program_id: formData.program_id ? parseInt(formData.program_id, 10) : null,
      group_id: formData.group_id ? parseInt(formData.group_id, 10) : null,
      shift_type: formData.shift_type,
      start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
      end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time,
      days_of_week: formData.selected_days.join(','),
      flexible_minutes: parseInt(formData.flexible_minutes, 10) || 0,
      is_active: Boolean(formData.is_active)
    };

    setSubmitting(true);
    try {
      if (modalMode === 'edit') {
        const res = await updateWorkSchedule(formData.id, payload);
        if (res.ok) {
          showToast(`Đã cập nhật ca làm việc "${formData.group_name}" thành công!`);
          setModalOpen(false);
          fetchSchedules();
          syncWorkScheduleChange({ action: 'update_shift', program_id: formData.program_id });
        } else {
          setModalError(res.data?.detail || 'Không thể cập nhật phiên làm việc.');
        }
      } else {
        const res = await createWorkSchedule(payload);
        if (res.ok) {
          showToast(`Đã tạo phiên làm việc "${formData.group_name}" thành công!`);
          setModalOpen(false);
          fetchSchedules();
          syncWorkScheduleChange({ action: 'create_shift', program_id: formData.program_id });
        } else {
          setModalError(res.data?.detail || 'Không thể tạo mới phiên làm việc.');
        }
      }
    } catch {
      setModalError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bật/tắt trạng thái kích hoạt nhanh
  const handleToggleActive = async (shift) => {
    try {
      const nextActive = !shift.is_active;
      const res = await updateWorkSchedule(shift.id, { is_active: nextActive });
      if (res.ok) {
        showToast(
          nextActive
            ? `Đã kích hoạt ca "${shift.group_name}"`
            : `Đã tạm ngưng ca "${shift.group_name}"`,
          'success'
        );
        // Cập nhật trực tiếp vào state tránh giật màn hình
        setSchedules((prev) =>
          prev.map((item) => (item.id === shift.id ? { ...item, is_active: nextActive } : item))
        );
        syncWorkScheduleChange({ action: 'toggle_active', shift_id: shift.id, is_active: nextActive });
      } else {
        showToast('Không thể thay đổi trạng thái ca.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi đổi trạng thái ca.', 'error');
    }
  };

  // Xóa ca làm việc
  const handleDeleteShift = async (shift) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa phiên làm việc "${shift.group_name}" (${formatHour(shift.start_time)} - ${formatHour(shift.end_time)}) không?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteWorkSchedule(shift.id);
      if (res.ok || res.status === 200 || res.status === 204) {
        showToast(`Đã xóa ca làm việc "${shift.group_name}" thành công!`);
        fetchSchedules();
        syncWorkScheduleChange({ action: 'delete_shift', shift_id: shift.id });
      } else {
        showToast(res.data?.detail || 'Không thể xóa ca làm việc.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa ca làm việc.', 'error');
    }
  };

  // Khởi tạo nhanh mẫu ca chuẩn ICTU (Ca sáng 08:00-12:00 + Ca chiều 13:30-17:30 T2-T6)
  const handleInitDefaultShifts = async () => {
    if (selectedProgramId === 'all') {
      alert('Vui lòng chọn một kỳ thực tập cụ thể trước khi áp dụng ca chuẩn.');
      return;
    }
    const progId = parseInt(selectedProgramId, 10);
    const prog = programs.find((p) => p.id === progId);
    const progName = prog ? prog.name : `Kỳ #${progId}`;

    const confirmMsg = `Hệ thống sẽ tự động tạo 2 ca chuẩn ICTU (Thứ 2 đến Thứ 6) cho:\n\n👉 "${progName}"\n- Ca Sáng: 08:00 - 12:00 (Linh hoạt 15 phút)\n- Ca Chiều: 13:30 - 17:30 (Linh hoạt 15 phút)\n\nBạn có muốn tiếp tục không?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      // 1. Tạo ca sáng
      await createWorkSchedule({
        group_name: `Ca Sáng tiêu chuẩn (${prog?.department || 'ICTU'})`,
        program_id: progId,
        shift_type: 'morning',
        start_time: '08:00:00',
        end_time: '12:00:00',
        days_of_week: '2,3,4,5,6',
        flexible_minutes: 15,
        is_active: true
      });

      // 2. Tạo ca chiều
      await createWorkSchedule({
        group_name: `Ca Chiều tiêu chuẩn (${prog?.department || 'ICTU'})`,
        program_id: progId,
        shift_type: 'afternoon',
        start_time: '13:30:00',
        end_time: '17:30:00',
        days_of_week: '2,3,4,5,6',
        flexible_minutes: 15,
        is_active: true
      });

      // Tự động đồng bộ sang lịch thực tập cá nhân của TTS trong các nhóm
      try {
        await apiFetch(`/api/hr/work-schedules/generate-weekly?program_id=${progId}`, {
          method: 'POST',
        });
      } catch {
        // Ignored
      }

      showToast('Đã khởi tạo thành công ca chuẩn và đồng bộ lịch cho TTS theo nhóm!');
      fetchSchedules();
      syncWorkScheduleChange({ action: 'init_default', program_id: progId });
    } catch {
      showToast('Lỗi khi khởi tạo ca chuẩn. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Đồng bộ lịch làm việc của nhóm sang lịch cá nhân của TTS
  const handleSyncWeeklyFromGroups = async () => {
    if (selectedProgramId === 'all') {
      alert('Vui lòng chọn một kỳ thực tập cụ thể trước khi đồng bộ lịch.');
      return;
    }
    const progId = parseInt(selectedProgramId, 10);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/hr/work-schedules/generate-weekly?program_id=${progId}`, {
        method: 'POST',
      });
      if (res && (res.ok || res.data?.success)) {
        showToast(res.data?.message || 'Đã đồng bộ thành công lịch thực tập cá nhân cho TTS theo nhóm!', 'success');
      } else {
        showToast('Đã gửi yêu cầu đồng bộ lịch nhóm.', 'success');
      }
      syncWorkScheduleChange({ action: 'sync_weekly', program_id: progId });
    } catch {
      showToast('Lỗi khi đồng bộ lịch nhóm. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="work-schedule-container">
      {/* Toast thông báo */}
      {toast && (
        <div className={`work-schedule-toast work-schedule-toast--${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Bar: Bộ lọc kỳ thực tập + Chế độ xem + Nút thao tác ── */}
      <div className="work-schedule-toolbar">
        <div className="work-schedule-filter-group">
          <div className="work-schedule-select-wrapper">
            <Filter size={16} className="work-schedule-select-icon" />
            <select
              className="work-schedule-select"
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              aria-label="Chọn kỳ thực tập"
            >
              <option value="all">📂 Tất cả các kỳ thực tập ({programs.length})</option>
              <optgroup label="Danh sách kỳ thực tập hiện có">
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department || 'Chung'}) — {p.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {groups.length > 0 && (
            <div className="work-schedule-select-wrapper">
              <Layers size={16} className="work-schedule-select-icon" />
              <select
                className="work-schedule-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                aria-label="Lọc theo nhóm thực tập"
              >
                <option value="all">👥 Tất cả nhóm / Chuẩn toàn kỳ</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentProgram && (
            <div className="work-schedule-prog-tag">
              <span className={`work-schedule-status-dot work-schedule-status-dot--${currentProgram.status}`} />
              <span className="work-schedule-prog-name">{currentProgram.name}</span>
              <span className="work-schedule-prog-slots">
                Chỉ tiêu: {currentProgram.max_interns || 50} TTS • {currentProgram.max_mentors || 10} Mentor
              </span>
            </div>
          )}
        </div>

        <div className="work-schedule-actions">
          {/* Nút chuyển chế độ xem Ma trận / Thẻ */}
          <div className="work-schedule-view-toggle">
            <button
              type="button"
              className={`work-schedule-view-btn ${viewMode === 'matrix' ? 'work-schedule-view-btn--active' : ''}`}
              onClick={() => setViewMode('matrix')}
              title="Xem theo ma trận lịch biểu 7 ngày"
            >
              <CalendarDays size={16} />
              <span>Ma trận tuần</span>
            </button>
            <button
              type="button"
              className={`work-schedule-view-btn ${viewMode === 'cards' ? 'work-schedule-view-btn--active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Xem danh sách ca dạng thẻ"
            >
              <LayoutGrid size={16} />
              <span>Danh sách thẻ</span>
            </button>
          </div>

          {/* Nút Khởi tạo ca chuẩn */}
          {selectedProgramId !== 'all' && (
            <>
              <button
                type="button"
                className="work-schedule-preset-btn"
                onClick={handleInitDefaultShifts}
                title="Tự động thêm 2 ca chuẩn ICTU (Sáng 08:00-12:00 & Chiều 13:30-17:30 T2-T6)"
              >
                <Sparkles size={16} />
                <span>Khởi tạo ca chuẩn</span>
              </button>

              <button
                type="button"
                className="work-schedule-preset-btn"
                onClick={handleSyncWeeklyFromGroups}
                title="Đồng bộ lịch ca làm việc theo nhóm sang lịch cá nhân của từng TTS trong nhóm"
                style={{ backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
              >
                <RotateCcw size={16} />
                <span>Đồng bộ lịch TTS</span>
              </button>
            </>
          )}

          {/* Nút Thêm phiên mới */}
          <button
            type="button"
            className="work-schedule-add-btn"
            onClick={() => handleOpenCreateModal('morning')}
          >
            <Plus size={16} />
            <span>Thêm phiên làm việc</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê trực quan ca làm việc ── */}
      <div className="work-schedule-stats-row">
        <div className="work-schedule-stat-item">
          <div className="work-schedule-stat-icon work-schedule-stat-icon--shifts">
            <Clock size={20} />
          </div>
          <div className="work-schedule-stat-text">
            <span className="work-schedule-stat-val">{schedules.length}</span>
            <span className="work-schedule-stat-lbl">Tổng số ca đã thiết lập</span>
          </div>
        </div>

        <div className="work-schedule-stat-item">
          <div className="work-schedule-stat-icon work-schedule-stat-icon--active">
            <CheckCircle2 size={20} />
          </div>
          <div className="work-schedule-stat-text">
            <span className="work-schedule-stat-val" style={{ color: '#16a34a' }}>
              {activeSchedulesCount}
            </span>
            <span className="work-schedule-stat-lbl">Ca đang hoạt động</span>
          </div>
        </div>

        <div className="work-schedule-stat-item">
          <div className="work-schedule-stat-icon work-schedule-stat-icon--hours">
            <Layers size={20} />
          </div>
          <div className="work-schedule-stat-text">
            <span className="work-schedule-stat-val" style={{ color: '#2563eb' }}>
              {totalWeeklyHours} giờ/tuần
            </span>
            <span className="work-schedule-stat-lbl">Khối lượng giờ làm việc chuẩn</span>
          </div>
        </div>

        <div className="work-schedule-stat-item">
          <div className="work-schedule-stat-icon work-schedule-stat-icon--info">
            <Info size={20} />
          </div>
          <div className="work-schedule-stat-text">
            <span className="work-schedule-stat-val" style={{ color: '#9333ea', fontSize: '15px' }}>
              Điểm danh linh hoạt ±15 phút
            </span>
            <span className="work-schedule-stat-lbl">Cơ chế quản lý chuyên cần Scrum</span>
          </div>
        </div>
      </div>

      {/* ── Nội dung chính: Ma trận tuần hoặc Danh sách thẻ ── */}
      {loading ? (
        <div className="work-schedule-empty">
          <div className="work-schedule-spinner" />
          <span>Đang tải lịch làm việc theo phiên hằng tuần...</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="work-schedule-empty-state">
          <div className="work-schedule-empty-icon">
            <Calendar size={48} />
          </div>
          <h3>Chưa có phiên làm việc nào được thiết lập</h3>
          <p>
            {selectedProgramId !== 'all' && currentProgram
              ? `Kỳ thực tập "${currentProgram.name}" chưa được cấu hình lịch làm việc theo phiên hàng tuần.`
              : 'Hãy chọn một kỳ thực tập và thiết lập các phiên làm việc (Ca sáng, Ca chiều, Toàn thời gian) cho sinh viên.'}
          </p>
          <div className="work-schedule-empty-actions">
            {selectedProgramId !== 'all' && (
              <button
                type="button"
                className="work-schedule-btn-primary"
                onClick={handleInitDefaultShifts}
              >
                <Sparkles size={16} />
                <span>Áp dụng ngay ca chuẩn ICTU (T2 - T6)</span>
              </button>
            )}
            <button
              type="button"
              className="work-schedule-btn-outline"
              onClick={() => handleOpenCreateModal('morning')}
            >
              <Plus size={16} />
              <span>Tạo phiên làm việc thủ công</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'matrix' ? (
        /* ── CHẾ ĐỘ MA TRẬN 7 NGÀY TRONG TUẦN ── */
        <div className="work-schedule-matrix-card">
          <div className="work-schedule-matrix-header">
            <div className="work-schedule-matrix-title">
              <CalendarDays size={18} />
              <span>Ma trận lịch làm việc các phiên trong tuần (Thứ 2 đến Chủ Nhật)</span>
            </div>
            <span className="work-schedule-matrix-sub">
              Nhấp vào phiên để sửa thông tin hoặc bấm <strong>+</strong> ở chân cột để thêm ca cho ngày đó
            </span>
          </div>

          <div className="work-schedule-matrix-grid">
            {WEEK_DAYS.map((day) => {
              // Lọc các ca áp dụng vào ngày này và sắp xếp ca sáng trước, ca chiều sau
              const dayShifts = filteredSchedules
                .filter((s) => isShiftOnDay(s.days_of_week, day.key, day.alt))
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
              const isWeekend = day.key === '7' || day.key === 'CN';

              return (
                <div
                  key={day.key}
                  className={`work-schedule-day-col ${isWeekend ? 'work-schedule-day-col--weekend' : ''}`}
                >
                  {/* Cột tiêu đề ngày */}
                  <div className="work-schedule-day-header">
                    <span className="work-schedule-day-short">{day.short}</span>
                    <span className="work-schedule-day-name">{day.label}</span>
                    <span className="work-schedule-day-count" title={`${dayShifts.length} phiên làm việc`}>
                      {dayShifts.length} ca
                    </span>
                  </div>

                  {/* Danh sách các ca trong ngày */}
                  <div className="work-schedule-day-body">
                    {dayShifts.length === 0 ? (
                      <div className="work-schedule-day-rest">
                        <span>{isWeekend ? 'Nghỉ cuối tuần' : 'Chưa có ca'}</span>
                      </div>
                    ) : (
                      dayShifts.map((shift) => {
                        const shiftTypeInfo = SHIFT_TYPES[shift.shift_type] || SHIFT_TYPES.morning;
                        const ShiftIcon = shiftTypeInfo.icon;
                        const duration = getShiftDuration(formatHour(shift.start_time), formatHour(shift.end_time));

                        return (
                          <div
                            key={shift.id}
                            className={`work-schedule-item-card ${!shift.is_active ? 'work-schedule-item-card--inactive' : ''}`}
                            style={{
                              borderColor: shift.is_active ? shiftTypeInfo.border : '#e2e8f0',
                              backgroundColor: shift.is_active ? shiftTypeInfo.bg : '#f8fafc'
                            }}
                          >
                            <div className="work-schedule-item-top">
                              <span
                                className="work-schedule-item-badge"
                                style={{
                                  color: shift.is_active ? shiftTypeInfo.color : '#94a3b8',
                                  borderColor: shift.is_active ? shiftTypeInfo.border : '#e2e8f0'
                                }}
                              >
                                <ShiftIcon size={12} />
                                {shiftTypeInfo.label}
                              </span>

                              {/* Nút hành động nhanh */}
                              <div className="work-schedule-item-actions">
                                <button
                                  type="button"
                                  className="work-schedule-icon-btn"
                                  onClick={() => handleOpenEditModal(shift)}
                                  title="Chỉnh sửa ca này"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="work-schedule-icon-btn work-schedule-icon-btn--delete"
                                  onClick={() => handleDeleteShift(shift)}
                                  title="Xóa ca này"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <div className="work-schedule-item-name" title={shift.group_name}>
                              {shift.group_name}
                            </div>
                            {shift.group_id && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>👥 {groups.find((g) => g.id === shift.group_id)?.code || `Nhóm #${shift.group_id}`}</span>
                              </div>
                            )}

                            <div className="work-schedule-item-time">
                              <Clock size={12} />
                              <strong>
                                {formatHour(shift.start_time)} – {formatHour(shift.end_time)}
                              </strong>
                              {duration && <span className="work-schedule-item-dur">({duration})</span>}
                            </div>

                            <div className="work-schedule-item-footer">
                              <span
                                className="work-schedule-item-flex"
                                title={`Biên độ linh hoạt điểm danh ±${shift.flexible_minutes || 0} phút`}
                              >
                                ±{shift.flexible_minutes || 0}p
                              </span>

                              {/* Toggle active / inactive */}
                              <button
                                type="button"
                                className={`work-schedule-toggle-btn ${shift.is_active ? 'work-schedule-toggle-btn--active' : ''}`}
                                onClick={() => handleToggleActive(shift)}
                                title={shift.is_active ? 'Bấm để tạm ngưng ca' : 'Bấm để kích hoạt lại ca'}
                              >
                                {shift.is_active ? 'Đang bật' : 'Tạm tắt'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Nút thêm ca nhanh cho ngày này */}
                  <div className="work-schedule-day-footer">
                    <button
                      type="button"
                      className="work-schedule-day-add-btn"
                      onClick={() => handleOpenCreateModal('morning', day.key)}
                      title={`Thêm phiên làm việc mới cho ${day.label}`}
                    >
                      <Plus size={13} />
                      <span>Thêm ca {day.short}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── CHẾ ĐỘ DANH SÁCH THẺ (CARDS GRID) ── */
        <div className="work-schedule-cards-grid">
          {filteredSchedules.map((shift) => {
            const shiftTypeInfo = SHIFT_TYPES[shift.shift_type] || SHIFT_TYPES.morning;
            const ShiftIcon = shiftTypeInfo.icon;
            const duration = getShiftDuration(formatHour(shift.start_time), formatHour(shift.end_time));
            const prog = programs.find((p) => p.id === shift.program_id);

            return (
              <div
                key={shift.id}
                className={`work-schedule-card ${!shift.is_active ? 'work-schedule-card--inactive' : ''}`}
              >
                <div className="work-schedule-card-header">
                  <div className="work-schedule-card-badge-group">
                    <span
                      className="work-schedule-type-pill"
                      style={{
                        color: shiftTypeInfo.color,
                        backgroundColor: shiftTypeInfo.bg,
                        borderColor: shiftTypeInfo.border
                      }}
                    >
                      <ShiftIcon size={14} />
                      <span>{shiftTypeInfo.label}</span>
                    </span>

                    <span className={`work-schedule-status-pill ${shift.is_active ? 'work-schedule-status-pill--active' : ''}`}>
                      {shift.is_active ? 'Đang kích hoạt' : 'Tạm ngưng'}
                    </span>
                  </div>

                  <div className="work-schedule-card-actions">
                    <button
                      type="button"
                      className="work-schedule-card-btn"
                      onClick={() => handleOpenEditModal(shift)}
                      title="Chỉnh sửa ca"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="work-schedule-card-btn work-schedule-card-btn--danger"
                      onClick={() => handleDeleteShift(shift)}
                      title="Xóa ca"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="work-schedule-card-title">
                  <h4>{shift.group_name}</h4>
                  <p className="work-schedule-card-prog">
                    {prog ? `Gắn với: ${prog.name}` : 'Áp dụng chung cho sinh viên'}
                  </p>
                </div>

                {/* Khung giờ làm việc */}
                <div className="work-schedule-card-timebox">
                  <Clock size={16} />
                  <div className="work-schedule-card-hours">
                    <span className="work-schedule-time-val">
                      {formatHour(shift.start_time)} – {formatHour(shift.end_time)}
                    </span>
                    {duration && <span className="work-schedule-time-dur">{duration} / phiên</span>}
                  </div>
                </div>

                {/* Các ngày áp dụng trong tuần */}
                <div className="work-schedule-card-days">
                  <span className="work-schedule-days-lbl">Ngày áp dụng:</span>
                  <div className="work-schedule-days-chips">
                    {WEEK_DAYS.map((d) => {
                      const activeOnDay = isShiftOnDay(shift.days_of_week, d.key, d.alt);
                      return (
                        <span
                          key={d.key}
                          className={`work-schedule-day-chip ${activeOnDay ? 'work-schedule-day-chip--active' : ''}`}
                        >
                          {d.short}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Chân thẻ: Biên độ linh hoạt & Nút đổi trạng thái */}
                <div className="work-schedule-card-footer">
                  <div className="work-schedule-card-flexinfo">
                    <Zap size={14} />
                    <span>Linh hoạt: <strong>±{shift.flexible_minutes ?? 15} phút</strong></span>
                  </div>

                  <button
                    type="button"
                    className={`work-schedule-toggle-switch ${shift.is_active ? 'work-schedule-toggle-switch--on' : ''}`}
                    onClick={() => handleToggleActive(shift)}
                  >
                    <span>{shift.is_active ? 'Bật' : 'Tắt'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Thêm / Chỉnh sửa Phiên làm việc ── */}
      {modalOpen && (
        <div className="work-schedule-modal-overlay" onClick={handleCloseModal}>
          <form
            className="work-schedule-modal"
            onSubmit={handleSubmitModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="work-schedule-modal-header">
              <div className="work-schedule-modal-title">
                <Clock size={20} />
                <h3>{modalMode === 'edit' ? 'Chỉnh sửa phiên làm việc' : 'Thêm phiên làm việc mới'}</h3>
              </div>
              <button
                type="button"
                className="work-schedule-modal-close"
                onClick={handleCloseModal}
                disabled={submitting}
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            <div className="work-schedule-modal-body">
                {modalError && (
                  <div className="work-schedule-form-error">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Tên ca / nhóm */}
                <div className="work-schedule-field">
                  <label className="work-schedule-label">
                    Tên phiên / Tên nhóm làm việc <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="work-schedule-input"
                    placeholder="VD: Ca sáng tiêu chuẩn, Nhóm Web Frontend, Ca chiều thực hành..."
                    value={formData.group_name}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    required
                  />
                  <span className="work-schedule-field-hint">
                    Tên để nhận diện phiên làm việc trên lịch biểu và danh sách điểm danh.
                  </span>
                </div>

                {/* Thuộc Kỳ thực tập */}
                <div className="work-schedule-field">
                  <label className="work-schedule-label">Kỳ thực tập liên kết</label>
                  <select
                    className="work-schedule-input"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  >
                    <option value="">-- Dành cho toàn bộ sinh viên (Chung) --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.department || 'Chung'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thuộc Nhóm thực tập */}
                {groups.length > 0 && (
                  <div className="work-schedule-field">
                    <label className="work-schedule-label">Nhóm thực tập áp dụng</label>
                    <select
                      className="work-schedule-input"
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    >
                      <option value="">🏢 Toàn bộ kỳ thực tập (Khung chuẩn 40h/tuần)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          👥 {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                    <span className="work-schedule-field-hint">
                      Chọn nhóm cụ thể nếu muốn cấu hình phiên đặc thù cho nhóm đó, hoặc để mặc định để áp dụng chuẩn toàn kỳ.
                    </span>
                  </div>
                )}

                {/* Chọn Loại ca làm việc */}
                <div className="work-schedule-field">
                  <label className="work-schedule-label">Loại phiên làm việc</label>
                  <div className="work-schedule-type-grid">
                    {Object.entries(SHIFT_TYPES).map(([typeKey, typeInfo]) => {
                      const TypeIcon = typeInfo.icon;
                      const isSelected = formData.shift_type === typeKey;
                      return (
                        <button
                          key={typeKey}
                          type="button"
                          className={`work-schedule-type-card ${isSelected ? 'work-schedule-type-card--selected' : ''}`}
                          style={{
                            borderColor: isSelected ? typeInfo.color : '#e2e8f0',
                            backgroundColor: isSelected ? typeInfo.bg : '#ffffff'
                          }}
                          onClick={() => handleShiftTypeChange(typeKey)}
                        >
                          <div className="work-schedule-type-icon" style={{ color: typeInfo.color }}>
                            <TypeIcon size={18} />
                          </div>
                          <span className="work-schedule-type-title">{typeInfo.label}</span>
                          <span className="work-schedule-type-time">
                            {typeInfo.defaultStart} – {typeInfo.defaultEnd}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khung giờ bắt đầu & kết thúc */}
                <div className="work-schedule-grid-2">
                  <div className="work-schedule-field">
                    <label className="work-schedule-label">
                      Giờ bắt đầu ca <span className="req">*</span>
                    </label>
                    <input
                      type="time"
                      className="work-schedule-input"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="work-schedule-field">
                    <label className="work-schedule-label">
                      Giờ kết thúc ca <span className="req">*</span>
                    </label>
                    <input
                      type="time"
                      className="work-schedule-input"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Thời lượng ca tính toán */}
                {formData.start_time && formData.end_time && formData.start_time < formData.end_time && (
                  <div className="work-schedule-calc-box">
                    <Clock size={15} />
                    <span>
                      Thời lượng phiên: <strong>{getShiftDuration(formData.start_time, formData.end_time)}</strong> mỗi ngày áp dụng
                    </span>
                  </div>
                )}

                {/* Các ngày áp dụng trong tuần */}
                <div className="work-schedule-field">
                  <div className="work-schedule-field-head">
                    <label className="work-schedule-label">
                      Ngày làm việc trong tuần <span className="req">*</span>
                    </label>
                    <div className="work-schedule-preset-links">
                      <button type="button" onClick={() => handleApplyDayPreset('weekdays')}>
                        T2 - T6
                      </button>
                      <span>•</span>
                      <button type="button" onClick={() => handleApplyDayPreset('all')}>
                        Cả tuần (T2-CN)
                      </button>
                      <span>•</span>
                      <button type="button" onClick={() => handleApplyDayPreset('weekend')}>
                        Cuối tuần
                      </button>
                    </div>
                  </div>

                  <div className="work-schedule-days-selector">
                    {WEEK_DAYS.map((d) => {
                      const isSelected = formData.selected_days.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          className={`work-schedule-day-btn ${isSelected ? 'work-schedule-day-btn--selected' : ''}`}
                          onClick={() => handleToggleDay(d.key)}
                        >
                          {isSelected && <Check size={12} className="work-schedule-day-check" />}
                          <span className="work-schedule-day-code">{d.short}</span>
                          <span className="work-schedule-day-txt">{d.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Biên độ linh hoạt & Trạng thái kích hoạt */}
                <div className="work-schedule-grid-2">
                  <div className="work-schedule-field">
                    <label className="work-schedule-label">
                      Biên độ linh hoạt (phút)
                    </label>
                    <div className="work-schedule-flex-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        max="120"
                        step="5"
                        className="work-schedule-input"
                        value={formData.flexible_minutes}
                        onChange={(e) => setFormData({ ...formData, flexible_minutes: e.target.value })}
                      />
                      <span className="work-schedule-flex-unit">phút (±)</span>
                    </div>
                    <span className="work-schedule-field-hint">
                      Cho phép check-in/out sớm hoặc muộn trong khoảng này mà không bị tính vi phạm.
                    </span>
                  </div>

                  <div className="work-schedule-field">
                    <label className="work-schedule-label">Trạng thái áp dụng</label>
                    <label className="work-schedule-checkbox-card">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      <div className="work-schedule-checkbox-text">
                        <strong>Kích hoạt phiên làm việc</strong>
                        <span>Áp dụng ngay cho sinh viên trong kỳ thực tập</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="work-schedule-modal-footer">
                <button
                  type="button"
                  className="work-schedule-btn-cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="work-schedule-btn-save"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : modalMode === 'edit' ? 'Cập nhật phiên' : 'Tạo phiên làm việc'}
                </button>
              </div>
            </form>
        </div>
      )}
    </div>
  );
}
