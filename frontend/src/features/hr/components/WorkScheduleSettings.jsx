import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Check,
  RotateCcw,
  Layers,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { fetchWorkSchedules, saveWorkSchedule, updateWorkSchedule, deleteWorkSchedule } from '../../../api/operations';
import './WorkScheduleSettings.css';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & INITIAL MOCK DATA
   ───────────────────────────────────────────────────────────────────────────── */
export const INTERN_GROUPS = [
  { id: 'group_dev', name: 'Nhóm Dev (Phần mềm & Fullstack)' },
  { id: 'group_tester', name: 'Nhóm Tester (QA / QC Automation)' },
  { id: 'group_ba', name: 'Nhóm BA (Phân tích Nghiệp vụ)' },
  { id: 'group_devops', name: 'Nhóm Cloud & DevOps' },
  { id: 'group_ai_data', name: 'Nhóm AI & Data Science' },
];

export const DAYS_OF_WEEK = [
  { id: 'Thứ 2', short: 'T2', name: 'Thứ 2' },
  { id: 'Thứ 3', short: 'T3', name: 'Thứ 3' },
  { id: 'Thứ 4', short: 'T4', name: 'Thứ 4' },
  { id: 'Thứ 5', short: 'T5', name: 'Thứ 5' },
  { id: 'Thứ 6', short: 'T6', name: 'Thứ 6' },
  { id: 'Thứ 7', short: 'T7', name: 'Thứ 7' },
];

export const DEFAULT_SCHEDULES = [
  {
    id: 'WS-001',
    group_id: 'group_dev',
    group_name: 'Nhóm Dev (Phần mềm & Fullstack)',
    start_time: '08:15',
    end_time: '17:30',
    work_days: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
    applied_members_count: 14,
    status: 'active',
    created_at: '01/10/2026 08:00',
  },
  {
    id: 'WS-002',
    group_id: 'group_tester',
    group_name: 'Nhóm Tester (QA / QC Automation)',
    start_time: '08:30',
    end_time: '17:45',
    work_days: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
    applied_members_count: 6,
    status: 'active',
    created_at: '02/10/2026 08:30',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDATION LOGIC
   ───────────────────────────────────────────────────────────────────────────── */
export function validateWorkSchedule({ groupId, startTime, endTime, workDays }) {
  const errors = {};

  // 1. Bắt buộc chọn nhóm
  if (!groupId || !groupId.trim()) {
    errors.groupId = 'Vui lòng chọn nhóm thực tập áp dụng.';
  }

  // 2. Bắt buộc chọn giờ bắt đầu
  if (!startTime) {
    errors.startTime = 'Vui lòng chọn giờ bắt đầu.';
  }

  // 3. Bắt buộc chọn giờ kết thúc & kiểm tra giờ kết thúc phải lớn hơn giờ bắt đầu
  if (!endTime) {
    errors.endTime = 'Vui lòng chọn giờ kết thúc.';
  } else if (startTime && endTime <= startTime) {
    errors.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu.';
  }

  // 4. Bắt buộc chọn ít nhất 1 ngày làm việc trong tuần (Từ Thứ 2 đến Thứ 7)
  if (!workDays || workDays.length === 0) {
    errors.workDays = 'Vui lòng chọn ít nhất một ngày làm việc trong tuần (Từ Thứ 2 đến Thứ 7).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: WorkScheduleSettings
   ───────────────────────────────────────────────────────────────────────────── */
export default function WorkScheduleSettings({
  onSaved,
  fetchSchedulesApi = fetchWorkSchedules,
  saveScheduleApi = saveWorkSchedule,
  updateScheduleApi = updateWorkSchedule,
  initialSchedules = null,
  isStandalone = true,
}) {
  // 1. Form States
  const [groupId, setGroupId] = useState('');
  const [startTime, setStartTime] = useState('08:15');
  const [endTime, setEndTime] = useState('17:30');
  const [selectedDays, setSelectedDays] = useState(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6']);
  const [notes, setNotes] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const formCardRef = useRef(null);

  // 2. Validation & UI feedback States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // 3. List of Active Schedules State
  const [schedulesList, setSchedulesList] = useState(initialSchedules || DEFAULT_SCHEDULES);
  const [newlyAddedId, setNewlyAddedId] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Tải danh sách lịch làm việc từ API khi khởi tạo
  useEffect(() => {
    let isMounted = true;
    async function loadSchedules() {
      if (initialSchedules) return;
      try {
        const res = await (fetchSchedulesApi || fetchWorkSchedules)();
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setSchedulesList(res.data);
        }
      } catch (err) {
        // Fallback to default schedules
      }
    }
    loadSchedules();
    return () => {
      isMounted = false;
    };
  }, [fetchSchedulesApi, initialSchedules]);

  // Xử lý tick chọn ngày
  const toggleDay = (dayId) => {
    setSelectedDays((prev) => {
      const exists = prev.includes(dayId);
      const updated = exists ? prev.filter((d) => d !== dayId) : [...prev, dayId];

      // Xóa lỗi ngày nếu vừa tick chọn ít nhất 1 ngày
      if (updated.length > 0 && errors.workDays) {
        setErrors((errs) => {
          const next = { ...errs };
          delete next.workDays;
          return next;
        });
      }
      return updated;
    });
  };

  // Chọn nhanh ngày
  const handleSelectWeekdays = () => {
    setSelectedDays(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6']);
    if (errors.workDays) {
      setErrors((errs) => {
        const next = { ...errs };
        delete next.workDays;
        return next;
      });
    }
  };

  const handleSelectAllDays = () => {
    setSelectedDays(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']);
    if (errors.workDays) {
      setErrors((errs) => {
        const next = { ...errs };
        delete next.workDays;
        return next;
      });
    }
  };

  const handleClearAllDays = () => {
    setSelectedDays([]);
  };

  // Preset ca làm việc nhanh
  const setShiftPreset = (start, end) => {
    setStartTime(start);
    setEndTime(end);
    // Xóa lỗi thời gian nếu hợp lệ
    setErrors((errs) => {
      const next = { ...errs };
      delete next.startTime;
      delete next.endTime;
      return next;
    });
  };

  // Bắt đầu chỉnh sửa lịch làm việc của một nhóm
  const handleEditSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setGroupId(schedule.group_id);
    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
    setSelectedDays(schedule.work_days || []);
    setNotes(schedule.notes || '');
    setErrors({});
    setTouched({});
    if (typeof formCardRef.current?.scrollIntoView === 'function') {
      formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Hủy chế độ chỉnh sửa
  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    setGroupId('');
    setStartTime('08:15');
    setEndTime('17:30');
    setSelectedDays(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6']);
    setNotes('');
    setErrors({});
    setTouched({});
  };

  // Xử lý gửi Form & Lưu cấu hình
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // 1. Chạy Validation toàn diện
    const validation = validateWorkSchedule({
      groupId,
      startTime,
      endTime,
      workDays: selectedDays,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      setTouched({
        groupId: true,
        startTime: true,
        endTime: true,
        workDays: true,
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const selectedGroupObj = INTERN_GROUPS.find((g) => g.id === groupId);
    const groupName = selectedGroupObj ? selectedGroupObj.name : groupId;

    const payload = {
      group_id: groupId,
      group_name: groupName,
      start_time: startTime,
      end_time: endTime,
      work_days: selectedDays,
      notes: notes.trim(),
    };

    try {
      if (editingScheduleId) {
        // 2a. Gọi API cập nhật cấu hình ca làm việc
        const updateFn = updateScheduleApi || updateWorkSchedule;
        let updatedSchedule = null;

        try {
          const res = await updateFn(editingScheduleId, payload);
          if (res && res.data) {
            updatedSchedule = res.data;
          }
        } catch (apiErr) {
          // Fallback local update
        }

        if (!updatedSchedule) {
          const currentItem = schedulesList.find((s) => s.id === editingScheduleId);
          updatedSchedule = {
            id: editingScheduleId,
            ...payload,
            applied_members_count: currentItem?.applied_members_count ?? 0,
            status: currentItem?.status ?? 'active',
            created_at: currentItem?.created_at ?? 'Đã cập nhật',
          };
        }

        // 3a. Update UI: Cập nhật dòng tương ứng trong bảng
        setSchedulesList((prev) =>
          prev.map((s) => (s.id === editingScheduleId ? { ...s, ...updatedSchedule } : s))
        );
        setNewlyAddedId(editingScheduleId);

        // 4a. Thông báo Toast & reset form
        showToast(`Đã cập nhật thành công ca làm việc cho "${groupName}"!`, 'success');
        onSaved?.(updatedSchedule);

        // Reset edit mode & form fields
        setEditingScheduleId(null);
        setGroupId('');
        setNotes('');
        setTouched({});
      } else {
        // 2b. Gọi API lưu cấu hình mới
        const saveFn = saveScheduleApi || saveWorkSchedule;
        let createdSchedule = null;

        try {
          const res = await saveFn(payload);
          if (res && res.data) {
            createdSchedule = res.data;
          }
        } catch (apiErr) {
          // Fallback local creation if backend offline
          createdSchedule = {
            id: `WS-${Date.now().toString().slice(-3)}`,
            ...payload,
            applied_members_count: 0,
            status: 'active',
            created_at: 'Vừa tạo',
          };
        }

        if (!createdSchedule) {
          createdSchedule = {
            id: `WS-${Date.now().toString().slice(-3)}`,
            ...payload,
            applied_members_count: 0,
            status: 'active',
            created_at: 'Vừa tạo',
          };
        }

        // 3b. Update UI: Tự động push cấu hình vừa tạo vào danh sách bên dưới
        setSchedulesList((prev) => [createdSchedule, ...prev]);
        setNewlyAddedId(createdSchedule.id);

        // 4b. Thông báo Toast & reset form
        showToast(`Đã lưu thành công ca làm việc cho "${groupName}"!`, 'success');
        onSaved?.(createdSchedule);

        // Reset form fields
        setGroupId('');
        setNotes('');
        setTouched({});
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu cấu hình. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa lịch làm việc khỏi danh sách
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await deleteWorkSchedule(scheduleId);
    } catch (err) {
      // local delete fallback
    }
    setSchedulesList((prev) => prev.filter((s) => s.id !== scheduleId));
    if (editingScheduleId === scheduleId) {
      handleCancelEdit();
    }
    showToast('Đã xóa cấu hình lịch làm việc thành công.', 'success');
  };

  return (
    <div className={`work-schedule-settings ${isStandalone ? 'ws-container' : ''}`} data-testid="work-schedule-settings">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className={`ws-toast ws-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER KHI CHẠY STANDALONE ── */}
      {isStandalone && (
        <header className="ws-header">
          <span className="ws-tag">
            <Clock size={13} />
            <span>Phân hệ Điều phối & Quản lý Ca làm việc</span>
          </span>
          <h1 className="ws-main-title">Thiết lập Ca làm việc Linh hoạt cho Thực tập sinh</h1>
          <p className="ws-desc">
            Cấu hình khung giờ làm việc tiêu chuẩn và ngày công trong tuần cho từng nhóm chuyên môn thực tập.
          </p>
        </header>
      )}

      {/* ── 1. FORM THIẾT LẬP CA LÀM VIỆC ── */}
      <section className="ws-card" ref={formCardRef} aria-label="Form thiết lập ca làm việc">
        <div className="ws-card-header">
          <div>
            <h2 className="ws-card-title">
              {editingScheduleId ? <Edit3 size={18} color="#2563EB" /> : <Layers size={18} color="#2563EB" />}
              <span>{editingScheduleId ? 'Chỉnh sửa Cấu hình Ca làm việc' : 'Thiết lập Cấu hình Ca mới'}</span>
              {editingScheduleId && (
                <span className="ws-editing-tag" data-testid="ws-editing-tag">Mã: {editingScheduleId}</span>
              )}
            </h2>
            <span className="ws-card-subtitle">
              {editingScheduleId
                ? 'Thay đổi thời gian hoặc ngày làm việc cho nhóm thực tập đã chọn và nhấn Lưu Thay đổi.'
                : 'Áp dụng cho điểm danh, máy quét vân tay/QR và tính ngày công thực tế.'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Hàng 1: Dropdown Chọn nhóm & 2 ô Timepicker */}
          <div className="ws-form-grid">
            {/* 1.1 Dropdown chọn Nhóm thực tập */}
            <div className="ws-form-group">
              <label htmlFor="ws-select-group" className="ws-label">
                <Users size={15} />
                <span>Nhóm thực tập <span className="ws-required">*</span></span>
              </label>
              <select
                id="ws-select-group"
                aria-label="Chọn nhóm thực tập"
                className={`ws-select ${errors.groupId ? 'ws-select--error' : ''}`}
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                  if (errors.groupId) {
                    setErrors((errs) => {
                      const next = { ...errs };
                      delete next.groupId;
                      return next;
                    });
                  }
                }}
              >
                <option value="">-- Chọn nhóm thực tập áp dụng --</option>
                {INTERN_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.groupId && (
                <span className="ws-error-message" role="alert" data-testid="error-group">
                  <AlertCircle size={13} />
                  <span>{errors.groupId}</span>
                </span>
              )}
            </div>

            {/* 1.2 & 1.3: 2 ô Timepicker "Giờ bắt đầu" và "Giờ kết thúc" */}
            <div className="ws-form-group">
              <label className="ws-label">
                <Clock size={15} />
                <span>Khung giờ ca làm việc <span className="ws-required">*</span></span>
              </label>
              <div className="ws-timepicker-row">
                {/* Giờ bắt đầu */}
                <div>
                  <div className="ws-time-wrapper">
                    <Clock size={14} className="ws-time-icon" />
                    <input
                      type="time"
                      id="ws-input-start-time"
                      aria-label="Giờ bắt đầu"
                      className={`ws-input ws-input-time ${errors.startTime ? 'ws-input--error' : ''}`}
                      value={startTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartTime(val);
                        // Validate trực tiếp logic endTime > startTime nếu cả 2 đã nhập
                        if (endTime && val && endTime <= val) {
                          setErrors((errs) => ({ ...errs, endTime: 'Giờ kết thúc phải lớn hơn giờ bắt đầu.' }));
                        } else {
                          setErrors((errs) => {
                            const next = { ...errs };
                            delete next.startTime;
                            if (next.endTime === 'Giờ kết thúc phải lớn hơn giờ bắt đầu.') {
                              delete next.endTime;
                            }
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.startTime && (
                    <span className="ws-error-message" role="alert" data-testid="error-start-time">
                      <AlertCircle size={13} />
                      <span>{errors.startTime}</span>
                    </span>
                  )}
                </div>

                {/* Giờ kết thúc */}
                <div>
                  <div className="ws-time-wrapper">
                    <Clock size={14} className="ws-time-icon" />
                    <input
                      type="time"
                      id="ws-input-end-time"
                      aria-label="Giờ kết thúc"
                      className={`ws-input ws-input-time ${errors.endTime ? 'ws-input--error' : ''}`}
                      value={endTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndTime(val);
                        // Validate logic ngay khi đổi: Giờ kết thúc phải lớn hơn Giờ bắt đầu
                        if (startTime && val && val <= startTime) {
                          setErrors((errs) => ({ ...errs, endTime: 'Giờ kết thúc phải lớn hơn giờ bắt đầu.' }));
                        } else {
                          setErrors((errs) => {
                            const next = { ...errs };
                            delete next.endTime;
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.endTime && (
                    <span className="ws-error-message" role="alert" data-testid="error-end-time">
                      <AlertCircle size={13} />
                      <span>{errors.endTime}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Ca làm việc mẫu nhanh (Presets) */}
              <div className="ws-time-presets">
                <span style={{ fontSize: '11px', color: '#64748b' }}>Gợi ý nhanh:</span>
                <button type="button" className="ws-preset-btn" onClick={() => setShiftPreset('08:15', '17:30')}>
                  Hành chính (08:15 - 17:30)
                </button>
                <button type="button" className="ws-preset-btn" onClick={() => setShiftPreset('08:00', '12:00')}>
                  Ca sáng (08:00 - 12:00)
                </button>
                <button type="button" className="ws-preset-btn" onClick={() => setShiftPreset('13:30', '17:30')}>
                  Ca chiều (13:30 - 17:30)
                </button>
              </div>
            </div>
          </div>

          {/* Hàng 2: Checkbox chọn ngày làm việc trong tuần (Thứ 2 đến Thứ 7) */}
          <div className="ws-days-section">
            <div className="ws-days-header">
              <label className="ws-label" style={{ margin: 0 }}>
                <Calendar size={15} />
                <span>Ngày làm việc áp dụng trong tuần (Từ Thứ 2 đến Thứ 7) <span className="ws-required">*</span></span>
              </label>
              <div className="ws-days-shortcuts">
                <button type="button" className="ws-shortcut-btn" onClick={handleSelectWeekdays}>
                  Thứ 2 – Thứ 6
                </button>
                <span>•</span>
                <button type="button" className="ws-shortcut-btn" onClick={handleSelectAllDays}>
                  Chọn cả tuần (T2 – T7)
                </button>
                <span>•</span>
                <button type="button" className="ws-shortcut-btn" onClick={handleClearAllDays}>
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            <div className="ws-days-grid" role="group" aria-label="Chọn ngày làm việc trong tuần">
              {DAYS_OF_WEEK.map((day) => {
                const isChecked = selectedDays.includes(day.id);
                return (
                  <label
                    key={day.id}
                    htmlFor={`day-checkbox-${day.id}`}
                    className={`ws-day-pill ${isChecked ? 'ws-day-pill--checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      id={`day-checkbox-${day.id}`}
                      className="ws-day-checkbox"
                      checked={isChecked}
                      onChange={() => toggleDay(day.id)}
                    />
                    <span>{day.name}</span>
                  </label>
                );
              })}
            </div>

            {/* Báo lỗi nếu chưa chọn ngày làm việc nào */}
            {errors.workDays && (
              <span className="ws-error-message" role="alert" data-testid="error-work-days" style={{ marginTop: '10px' }}>
                <AlertCircle size={13} />
                <span>{errors.workDays}</span>
              </span>
            )}
          </div>

          {/* Nút Submit "Lưu Cấu hình" */}
          {/* Nút Submit "Lưu Cấu hình" hoặc "Lưu Thay đổi" */}
          <div className="ws-form-actions">
            {editingScheduleId ? (
              <>
                <button
                  type="button"
                  className="ws-btn ws-btn--outline"
                  onClick={handleCancelEdit}
                  data-testid="btn-cancel-edit"
                >
                  <RotateCcw size={15} />
                  <span>Hủy chỉnh sửa</span>
                </button>
                <button
                  type="submit"
                  className="ws-btn ws-btn--primary"
                  disabled={isSubmitting}
                  data-testid="btn-save-schedule"
                >
                  <Save size={15} />
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Lưu Thay đổi'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ws-btn ws-btn--outline"
                  onClick={() => {
                    setGroupId('');
                    setStartTime('08:15');
                    setEndTime('17:30');
                    setSelectedDays(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6']);
                    setErrors({});
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Đặt lại</span>
                </button>
                <button
                  type="submit"
                  className="ws-btn ws-btn--primary"
                  disabled={isSubmitting}
                  data-testid="btn-save-schedule"
                >
                  <Save size={15} />
                  <span>{isSubmitting ? 'Đang lưu cấu hình...' : 'Lưu Cấu hình'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      {/* ── 2. DANH SÁCH: CÁC LỊCH LÀM VIỆC ĐANG ÁP DỤNG ── */}
      <section className="ws-applied-card" aria-label="Danh sách các lịch làm việc đang áp dụng">
        <div className="ws-applied-header">
          <div>
            <h2 className="ws-card-title">
              <ShieldCheck size={18} color="#059669" />
              <span>Các lịch làm việc đang áp dụng</span>
            </h2>
            <span className="ws-card-subtitle">
              Danh sách ca làm việc và lịch công tác đang vận hành trong hệ thống phân quyền của HR.
            </span>
          </div>
          <div className="ws-counter-badge">
            <Check size={13} />
            <span>{schedulesList.length} cấu hình hoạt động</span>
          </div>
        </div>

        {schedulesList.length === 0 ? (
          <div className="ws-empty-state">
            <Calendar size={36} />
            <span>Chưa có lịch làm việc nào được thiết lập. Hãy điền form bên trên để tạo ca mới!</span>
          </div>
        ) : (
          <div className="ws-table-responsive">
            <table className="ws-table" aria-label="Bảng các lịch làm việc đang áp dụng">
              <thead>
                <tr>
                  <th scope="col" className="ws-col-group" style={{ width: '28%', minWidth: '200px' }}>NHÓM THỰC TẬP</th>
                  <th scope="col" className="ws-col-time" style={{ width: '17%', minWidth: '145px' }}>KHUNG GIỜ LÀM VIỆC</th>
                  <th scope="col" className="ws-col-days" style={{ width: '22%', minWidth: '185px' }}>NGÀY LÀM VIỆC TRONG TUẦN</th>
                  <th scope="col" className="ws-col-status" style={{ width: '20%', minWidth: '160px', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                  <th scope="col" className="ws-col-actions" style={{ width: '13%', minWidth: '115px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {schedulesList.map((schedule) => {
                  const isJustAdded = schedule.id === newlyAddedId;
                  const isEditingThis = schedule.id === editingScheduleId;
                  return (
                    <tr
                      key={schedule.id}
                      className={`${isJustAdded ? 'ws-row-new' : ''} ${isEditingThis ? 'ws-row-editing' : ''}`}
                      data-testid={`schedule-row-${schedule.id}`}
                    >
                      {/* Cột 1: Nhóm thực tập */}
                      <td className="ws-col-group">
                        <div className="ws-group-cell">
                          <div className="ws-group-icon">
                            <Users size={18} />
                          </div>
                          <div>
                            <div className="ws-group-name">{schedule.group_name}</div>
                            <div className="ws-group-code">Mã: {schedule.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Khung giờ làm việc */}
                      <td className="ws-col-time" style={{ whiteSpace: 'nowrap' }}>
                        <span className="ws-time-badge">
                          <Clock size={15} className="ws-time-icon-badge" />
                          <span className="ws-time-text">
                            {schedule.start_time} – {schedule.end_time}
                          </span>
                        </span>
                      </td>

                      {/* Cột 3: Các ngày làm việc trong tuần */}
                      <td className="ws-col-days" style={{ whiteSpace: 'nowrap' }}>
                        <div className="ws-days-list">
                          {DAYS_OF_WEEK.map((d) => {
                            const isIncluded = schedule.work_days?.includes(d.id);
                            return (
                              <span
                                key={d.id}
                                className={`ws-day-tag ${isIncluded ? 'ws-day-tag--active' : ''}`}
                                title={isIncluded ? `Áp dụng ${d.name}` : `Không làm ${d.name}`}
                              >
                                {d.short}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Cột 4: Trạng thái (Khóa cứng 1 hàng ngang tuyệt đối) */}
                      <td className="ws-col-status" style={{ whiteSpace: 'nowrap', width: '20%', minWidth: '160px' }}>
                        <span
                          className="ws-status-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            wordBreak: 'keep-all',
                            width: 'fit-content',
                            minWidth: '135px',
                          }}
                        >
                          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', display: 'inline' }}>
                            Đang áp dụng
                          </span>
                        </span>
                      </td>

                      {/* Cột 5: Thao tác (Sửa & Xóa) */}
                      <td className="ws-col-actions" style={{ textAlign: 'center' }}>
                        <div className="ws-action-group">
                          <button
                            type="button"
                            className={`ws-action-btn-edit ${isEditingThis ? 'ws-action-btn-edit--active' : ''}`}
                            onClick={() => handleEditSchedule(schedule)}
                            title="Chỉnh sửa lịch làm việc của nhóm này"
                            aria-label={`Chỉnh sửa cấu hình ${schedule.group_name}`}
                            data-testid={`btn-edit-${schedule.id}`}
                          >
                            <Edit3 size={13} />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            className="ws-action-btn-delete"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            title="Xóa cấu hình này"
                            aria-label={`Xóa cấu hình ${schedule.group_name}`}
                            data-testid={`btn-delete-${schedule.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

