import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import {
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  Plus,
  Minus,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { fetchHrAllowances, updateHrAllowance } from '../../api/operations';
import {
  getRealtimeWorkDaysForIntern,
  saveStoredAllowanceOverride,
  notifyInternDataChanged,
} from '../intern/utils/internMetrics';
import { emitRealtimeEvent, subscribeRealtimeEvents, SYNC_EVENTS } from '../../utils/realtimeSync';
import './AllowanceManagementPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER UTILITIES: NUMBER PARSING & CURRENCY FORMATTING
   ───────────────────────────────────────────────────────────────────────────── */
/**
 * Chuyển chuỗi đã format (VD: "1,500,000") về số nguyên thuần (VD: 1500000).
 * Tự động loại bỏ mọi ký tự không phải số.
 */
export function parseRawNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const digitsOnly = String(value).replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/**
 * Format chuỗi số thành định dạng có dấu phẩy phân cách hàng nghìn (VD: 1500000 -> "1,500,000")
 */
export function formatCurrencyInput(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseRawNumber(value);
  if (num === 0 && String(value).trim() === '0') return '0';
  return num.toLocaleString('en-US');
}

/**
 * Tính toán định dạng tiền tệ và toạ độ con trỏ (caret position) mượt mà
 * Giữ nguyên vị trí con trỏ sau khi format lại hàng nghìn, không giật về cuối ô.
 */
export function computeFormattedCurrencyWithCursor(rawVal, selStart) {
  if (rawVal === null || rawVal === undefined) {
    return { formatted: '', targetCursor: 0 };
  }
  const str = String(rawVal);
  const pos = typeof selStart === 'number' ? selStart : str.length;
  const digitsBeforeCursor = str.slice(0, pos).replace(/\D/g, '').length;

  let digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length > 11) {
    digitsOnly = digitsOnly.slice(0, 11);
  }

  if (digitsOnly === '') {
    return { formatted: '', targetCursor: 0 };
  }

  const num = parseInt(digitsOnly, 10);
  const formatted = num.toLocaleString('en-US');

  let targetPos = 0;
  if (digitsBeforeCursor === 0) {
    targetPos = 0;
  } else {
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        count++;
      }
      if (count === digitsBeforeCursor) {
        targetPos = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor >= digitsOnly.length) {
      targetPos = formatted.length;
    }
  }

  return { formatted, targetCursor: targetPos };
}

/**
 * Format hiển thị hoàn chỉnh tiền tệ Việt Nam (VD: 1,500,000 VNĐ)
 */
export function formatVndDisplay(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 VNĐ';
  const num = Number(amount);
  return `${num.toLocaleString('en-US')} VNĐ`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   INITIAL MOCK DATA (DANH SÁCH CHI TRẢ PHỤ CẤP THEO KỲ)
   ───────────────────────────────────────────────────────────────────────────── */
export const INITIAL_ALLOWANCE_RECORDS = [
  {
    id: 1,
    intern_id: 1,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    email: 'an.nv@ictu.edu.vn',
    actual_days: 22,
    base_allowance: 2500000,
    bonus_penalty: 300000, // Thưởng 300,000
    total_net: 2800000,
    status: 'approved',
    status_label: 'Đã chi trả',
  },
  {
    id: 2,
    intern_id: 2,
    code: 'TTS0002',
    full_name: 'Lê Hoàng Nam',
    email: 'nam.lh@ictu.edu.vn',
    actual_days: 21,
    base_allowance: 2500000,
    bonus_penalty: -100000, // Phạt/Khấu trừ 100,000
    total_net: 2400000,
    status: 'approved',
    status_label: 'Đã chi trả',
  },
  {
    id: 3,
    intern_id: 8,
    code: 'TTS0003',
    full_name: 'Trần Thị Mai Phương',
    email: 'tts03@student.ictu.edu.vn',
    actual_days: 18,
    base_allowance: 2000000,
    bonus_penalty: 0,
    total_net: 2000000,
    status: 'pending',
    status_label: 'Chờ chi trả',
  },
  {
    id: 4,
    intern_id: 9,
    code: 'TTS0004',
    full_name: 'Hoàng Minh Đức',
    email: 'tts04@student.ictu.edu.vn',
    actual_days: 20,
    base_allowance: 2200000,
    bonus_penalty: 200000,
    total_net: 2400000,
    status: 'pending',
    status_label: 'Chờ chi trả',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: AllowanceManagementPage
   ───────────────────────────────────────────────────────────────────────────── */
export default function AllowanceManagementPage({
  fetchApi = fetchHrAllowances,
  updateApi = updateHrAllowance,
  initialRecords = null,
} = {}) {
  // 1. Quản lý State Form nhập liệu
  const [selectedInternId, setSelectedInternId] = useState('');
  const [baseAllowance, setBaseAllowance] = useState('2,500,000'); // Mặc định 2.500.000 VNĐ
  const [bonusPenalty, setBonusPenalty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('bonus'); // 'bonus' (+) | 'deduction' (-)
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tham chiếu DOM & vị trí con trỏ để giữ nguyên vị trí khi gõ tiền tệ có dấu phẩy
  const baseInputRef = useRef(null);
  const bonusInputRef = useRef(null);
  const baseCursorRef = useRef(null);
  const bonusCursorRef = useRef(null);

  useLayoutEffect(() => {
    if (baseInputRef.current && baseCursorRef.current !== null) {
      const pos = Math.min(baseCursorRef.current, baseInputRef.current.value.length);
      baseInputRef.current.setSelectionRange(pos, pos);
      baseCursorRef.current = null;
    }
  }, [baseAllowance]);

  useLayoutEffect(() => {
    if (bonusInputRef.current && bonusCursorRef.current !== null) {
      const pos = Math.min(bonusCursorRef.current, bonusInputRef.current.value.length);
      bonusInputRef.current.setSelectionRange(pos, pos);
      bonusCursorRef.current = null;
    }
  }, [bonusPenalty]);

  // 2. Quản lý State Bảng dữ liệu & Bộ lọc (Đồng bộ số ngày công theo thời gian thực)
  const [allowanceList, setAllowanceList] = useState(() => {
    if (initialRecords) {
      return initialRecords.map((item) => ({
        ...item,
        actual_days: getRealtimeWorkDaysForIntern(item),
      }));
    }
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('ictu_hr_allowance_list') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            ...item,
            actual_days: getRealtimeWorkDaysForIntern(item),
          }));
        }
      }
    } catch {}
    return INITIAL_ALLOWANCE_RECORDS.map((item) => ({
      ...item,
      actual_days: getRealtimeWorkDaysForIntern(item),
    }));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Tải dữ liệu ban đầu từ API & tính toán số ngày công theo thời gian thực
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (initialRecords) return;
      try {
        const res = await (fetchApi || fetchHrAllowances)();
        if (isMounted && res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
          const freshList = res.data.map((item) => {
            const realtimeDays = getRealtimeWorkDaysForIntern(item);
            return {
              ...item,
              actual_days: realtimeDays,
            };
          });
          setAllowanceList(freshList);
          try {
            localStorage.setItem('ictu_hr_allowance_list', JSON.stringify(freshList));
          } catch {}
        }
      } catch (err) {
        // Fallback mock records with real-time work days
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchApi, initialRecords]);

  // Lắng nghe sự kiện đồng bộ thời gian thực: Điểm danh (Check-in), Nghỉ phép, Duyệt công
  useEffect(() => {
    const syncRealtimeDays = () => {
      setAllowanceList((prev) =>
        prev.map((item) => {
          const freshDays = getRealtimeWorkDaysForIntern(item);
          let updated = { ...item, actual_days: freshDays };
          try {
            const rawMap = typeof window !== 'undefined' ? localStorage.getItem('ictu_intern_allowances_override') : null;
            if (rawMap) {
              const map = JSON.parse(rawMap);
              const o = map[item.code] || map[item.email] || map[item.intern_id] || map[item.id];
              if (o) {
                updated = {
                  ...updated,
                  base_allowance: o.base_allowance ?? updated.base_allowance,
                  bonus_penalty: o.bonus_penalty ?? updated.bonus_penalty,
                  total_net: o.total_net ?? updated.total_net,
                };
              }
            }
          } catch {}
          return updated;
        })
      );
    };

    const unsubscribe = subscribeRealtimeEvents((event) => {
      const relevantTypes = [
        SYNC_EVENTS.ATTENDANCE_CHECKED_IN,
        SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED,
        SYNC_EVENTS.ATTENDANCE_APPROVED,
        SYNC_EVENTS.ALLOWANCE_UPDATED,
      ];
      if (!event || relevantTypes.includes(event?.type)) {
        syncRealtimeDays();
      }
    });

    const handleLocalSync = () => syncRealtimeDays();
    if (typeof window !== 'undefined') {
      window.addEventListener('intern_data_sync_event', handleLocalSync);
      window.addEventListener('ictu_allowance_updated', handleLocalSync);
      window.addEventListener('storage', handleLocalSync);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('intern_data_sync_event', handleLocalSync);
        window.removeEventListener('ictu_allowance_updated', handleLocalSync);
        window.removeEventListener('storage', handleLocalSync);
      }
    };
  }, []);

  // 3. TÍNH TOÁN TỔNG THỰC NHẬN TỰ ĐỘNG: (Phụ cấp cơ bản + Thưởng/Phạt)
  const calculatedTotalNet = useMemo(() => {
    const rawBase = parseRawNumber(baseAllowance);
    const rawBonus = parseRawNumber(bonusPenalty);
    const signedBonus = adjustmentType === 'deduction' ? -rawBonus : rawBonus;
    return Math.max(0, rawBase + signedBonus);
  }, [baseAllowance, bonusPenalty, adjustmentType]);

  // Khi HR chọn TTS trong Dropdown -> Điền sẵn dữ liệu của TTS đó vào Form
  const handleInternSelect = (e) => {
    const id = e.target.value;
    setSelectedInternId(id);

    if (formErrors.intern) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.intern;
        return next;
      });
    }

    if (!id) return;

    const target = allowanceList.find((item) => String(item.intern_id) === String(id) || String(item.id) === String(id));
    if (target) {
      setBaseAllowance(formatCurrencyInput(target.base_allowance));
      if (target.bonus_penalty > 0) {
        setAdjustmentType('bonus');
        setBonusPenalty(formatCurrencyInput(target.bonus_penalty));
      } else if (target.bonus_penalty < 0) {
        setAdjustmentType('deduction');
        setBonusPenalty(formatCurrencyInput(Math.abs(target.bonus_penalty)));
      } else {
        setBonusPenalty('');
      }
    }
  };

  // 4. RÀNG BUỘC & FORMAT TIỀN KHI GÕ: GIỮ NGUYÊN VỊ TRÍ CON TRỎ, KHÔNG SỐ ÂM, TỰ FORMAT DẤU PHẨY
  const handleBaseAllowanceChange = (e) => {
    const input = e.target;
    const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
      input.value,
      input.selectionStart
    );
    baseCursorRef.current = targetCursor;
    setBaseAllowance(formatted);

    if (formErrors.baseAllowance) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.baseAllowance;
        return next;
      });
    }
  };

  const handleBaseAllowanceKeyDown = (e) => {
    const input = e.currentTarget;
    const { selectionStart, selectionEnd, value } = input;

    // Phím Backspace khi đứng ngay sau dấu phân cách (VD: "2,|500,000")
    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const charBefore = value[selectionStart - 1];
      if (charBefore === ',' || charBefore === '.' || charBefore === ' ') {
        e.preventDefault();
        const before = value.slice(0, selectionStart - 2);
        const after = value.slice(selectionStart);
        const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
          before + after,
          before.length
        );
        baseCursorRef.current = targetCursor;
        setBaseAllowance(formatted);
        return;
      }
    }

    // Phím Delete khi đứng ngay trước dấu phân cách (VD: "2|,500,000")
    if (e.key === 'Delete' && selectionStart === selectionEnd && selectionStart < value.length) {
      const charAt = value[selectionStart];
      if (charAt === ',' || charAt === '.' || charAt === ' ') {
        e.preventDefault();
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionStart + 2);
        const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
          before + after,
          before.length
        );
        baseCursorRef.current = targetCursor;
        setBaseAllowance(formatted);
        return;
      }
    }
  };

  const handleClearBaseAllowance = () => {
    setBaseAllowance('');
    baseCursorRef.current = 0;
    if (baseInputRef.current) {
      baseInputRef.current.focus();
    }
  };

  const handleBonusPenaltyChange = (e) => {
    const input = e.target;
    const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
      input.value,
      input.selectionStart
    );
    bonusCursorRef.current = targetCursor;
    setBonusPenalty(formatted);
  };

  const handleBonusPenaltyKeyDown = (e) => {
    const input = e.currentTarget;
    const { selectionStart, selectionEnd, value } = input;

    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const charBefore = value[selectionStart - 1];
      if (charBefore === ',' || charBefore === '.' || charBefore === ' ') {
        e.preventDefault();
        const before = value.slice(0, selectionStart - 2);
        const after = value.slice(selectionStart);
        const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
          before + after,
          before.length
        );
        bonusCursorRef.current = targetCursor;
        setBonusPenalty(formatted);
        return;
      }
    }

    if (e.key === 'Delete' && selectionStart === selectionEnd && selectionStart < value.length) {
      const charAt = value[selectionStart];
      if (charAt === ',' || charAt === '.' || charAt === ' ') {
        e.preventDefault();
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionStart + 2);
        const { formatted, targetCursor } = computeFormattedCurrencyWithCursor(
          before + after,
          before.length
        );
        bonusCursorRef.current = targetCursor;
        setBonusPenalty(formatted);
        return;
      }
    }
  };

  const handleClearBonusPenalty = () => {
    setBonusPenalty('');
    bonusCursorRef.current = 0;
    if (bonusInputRef.current) {
      bonusInputRef.current.focus();
    }
  };

  // 5. XỬ LÝ SUBMIT NÚT "CẬP NHẬT"
  const handleUpdateSubmit = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!selectedInternId) {
      errors.intern = 'Vui lòng chọn thực tập sinh cần cập nhật phụ cấp.';
    }
    const rawBase = parseRawNumber(baseAllowance);
    if (!baseAllowance || rawBase <= 0) {
      errors.baseAllowance = 'Vui lòng nhập mức phụ cấp cơ bản hợp lệ (> 0 VNĐ).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    const rawBonus = parseRawNumber(bonusPenalty);
    const signedBonus = adjustmentType === 'deduction' ? -rawBonus : rawBonus;
    const finalTotalNet = Math.max(0, rawBase + signedBonus);

    const targetIntern = allowanceList.find(
      (i) =>
        String(i.intern_id) === String(selectedInternId) ||
        String(i.id) === String(selectedInternId) ||
        i.code === String(selectedInternId)
    );
    const internName = targetIntern ? targetIntern.full_name : 'TTS';
    const internCode = targetIntern?.code || `TTS000${selectedInternId}`;
    const internEmail = targetIntern?.email || '';

    // Payload chuẩn bị gửi lên API
    const payload = {
      intern_id: Number(selectedInternId),
      code: internCode,
      email: internEmail,
      base_allowance: rawBase,
      bonus_penalty: signedBonus,
      adjustment_type: adjustmentType,
      total_net: finalTotalNet, // Đã tính toán tự động: Phụ cấp cơ bản + Thưởng/Phạt
    };

    try {
      const apiFn = updateApi || updateHrAllowance;
      await apiFn(payload);

      // Cập nhật state bảng dữ liệu tức thì (Optimistic Update)
      const updatedList = allowanceList.map((item) => {
        if (
          String(item.intern_id) === String(selectedInternId) ||
          String(item.id) === String(selectedInternId) ||
          item.code === String(selectedInternId)
        ) {
          return {
            ...item,
            base_allowance: rawBase,
            bonus_penalty: signedBonus,
            total_net: finalTotalNet,
          };
        }
        return item;
      });
      setAllowanceList(updatedList);

      // Lưu trữ đồng bộ vào localStorage cho toàn hệ thống
      try {
        localStorage.setItem('ictu_hr_allowance_list', JSON.stringify(updatedList));

        const overrideData = {
          base_allowance: rawBase,
          bonus_penalty: signedBonus,
          total_net: finalTotalNet,
          updated_at: Date.now(),
        };
        if (internCode) saveStoredAllowanceOverride(internCode, overrideData);
        if (internEmail) saveStoredAllowanceOverride(internEmail, overrideData);
        if (selectedInternId) saveStoredAllowanceOverride(selectedInternId, overrideData);
        if (targetIntern?.intern_id) saveStoredAllowanceOverride(targetIntern.intern_id, overrideData);

        if (internCode) localStorage.setItem(`ictu_user_allowance_${internCode}`, JSON.stringify(overrideData));
        if (internEmail) localStorage.setItem(`ictu_user_allowance_${internEmail}`, JSON.stringify(overrideData));
      } catch (storageErr) {
        console.warn('Lỗi lưu trữ cục bộ:', storageErr);
      }

      // Phát thông điệp đồng bộ thời gian thực cho phân hệ TTS và các tab khác
      emitRealtimeEvent(SYNC_EVENTS.ALLOWANCE_UPDATED, {
        type: 'allowance_updated',
        intern_id: Number(selectedInternId),
        code: internCode,
        email: internEmail,
        base_allowance: rawBase,
        bonus_penalty: signedBonus,
        total_net: finalTotalNet,
      });
      notifyInternDataChanged();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ictu_allowance_updated', {
            detail: {
              intern_id: Number(selectedInternId),
              code: internCode,
              email: internEmail,
              base_allowance: rawBase,
              bonus_penalty: signedBonus,
              total_net: finalTotalNet,
            },
          })
        );
      }

      setHighlightedId(Number(selectedInternId));
      showToast(
        `Đã cập nhật phụ cấp cho ${internName} thành công! Tổng thực nhận: ${formatVndDisplay(finalTotalNet)}`,
        'success'
      );

      // Reset ô Thưởng/Khấu trừ sau khi cập nhật thành công
      setBonusPenalty('');
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu phụ cấp lên hệ thống. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đổi trạng thái Đã chi trả <-> Chờ chi trả trực tiếp
  const toggleStatus = (recordId) => {
    setAllowanceList((prev) => {
      const nextList = prev.map((item) => {
        if (item.id === recordId || item.intern_id === recordId) {
          const nextStatus = item.status === 'approved' ? 'pending' : 'approved';
          const nextLabel = nextStatus === 'approved' ? 'Đã chi trả' : 'Chờ chi trả';
          showToast(`Đã chuyển trạng thái của ${item.full_name} sang "${nextLabel}"`, 'success');
          return { ...item, status: nextStatus, status_label: nextLabel };
        }
        return item;
      });
      try {
        localStorage.setItem('ictu_hr_allowance_list', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });
  };

  // Lọc bảng dữ liệu theo ô tìm kiếm và trạng thái
  const filteredRecords = useMemo(() => {
    return allowanceList.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.full_name?.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [allowanceList, searchQuery, statusFilter]);

  // Thống kê quỹ phụ cấp
  const stats = useMemo(() => {
    const totalFund = allowanceList.reduce((acc, cur) => acc + (cur.total_net || 0), 0);
    const paidCount = allowanceList.filter((i) => i.status === 'approved').length;
    const pendingCount = allowanceList.filter((i) => i.status !== 'approved').length;
    const paidAmount = allowanceList
      .filter((i) => i.status === 'approved')
      .reduce((acc, cur) => acc + (cur.total_net || 0), 0);
    return { totalFund, paidCount, pendingCount, paidAmount };
  }, [allowanceList]);

  return (
    <div className="allowance-mgmt-page" data-testid="allowance-mgmt-page">
      {/* Toast thông báo */}
      {toast && (
        <div className={`amp-toast amp-toast--${toast.type}`} role="status">
          {toast.type === 'success' ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="amp-header">
        <div className="amp-title-group">
          <span className="amp-tag">
            <DollarSign size={13} />
            <span>Phân hệ Tài chính & Quản lý Phụ cấp</span>
          </span>
          <h1 className="amp-main-title">Quản lý Chi trả Phụ cấp Thực tập sinh</h1>
          <p className="amp-desc">
            Thiết lập mức phụ cấp cơ bản, cộng thưởng / trừ phạt và tự động tổng hợp số tiền thực nhận của thực tập sinh.
          </p>
        </div>
      </header>

      {/* 3 KPI Thống kê quỹ */}
      <section className="amp-kpi-grid">
        <div className="amp-kpi-card">
          <div className="amp-kpi-header">
            <span className="amp-kpi-label">Tổng quỹ thực nhận kỳ</span>
            <div className="amp-kpi-icon-wrap amp-kpi-icon-wrap--blue"><DollarSign size={18} /></div>
          </div>
          <div className="amp-kpi-value">{formatVndDisplay(stats.totalFund)}</div>
          <div className="amp-kpi-footer">Áp dụng cho {allowanceList.length} thực tập sinh</div>
        </div>

        <div className="amp-kpi-card">
          <div className="amp-kpi-header">
            <span className="amp-kpi-label">Đã chi trả thành công</span>
            <div className="amp-kpi-icon-wrap amp-kpi-icon-wrap--green"><CheckCircle2 size={18} /></div>
          </div>
          <div className="amp-kpi-value" style={{ color: '#059669' }}>
            {formatVndDisplay(stats.paidAmount)}
          </div>
          <div className="amp-kpi-footer">{stats.paidCount} / {allowanceList.length} hồ sơ hoàn tất</div>
        </div>

        <div className="amp-kpi-card">
          <div className="amp-kpi-header">
            <span className="amp-kpi-label">Hồ sơ chờ chi trả</span>
            <div className="amp-kpi-icon-wrap amp-kpi-icon-wrap--amber"><Clock size={18} /></div>
          </div>
          <div className="amp-kpi-value" style={{ color: '#d97706' }}>
            {stats.pendingCount} hồ sơ
          </div>
          <div className="amp-kpi-footer">Cần HR phê duyệt chuyển khoản</div>
        </div>
      </section>

      {/* ── 1. FORM NHẬP LIỆU NHỎ Ở TRÊN ── */}
      <section className="amp-form-card" aria-label="Form điều chỉnh phụ cấp">
        <div className="amp-form-header">
          <h2 className="amp-form-title">
            <TrendingUp size={18} color="#2563EB" />
            <span>Thiết lập & Điều chỉnh Phụ cấp Thực tập sinh</span>
          </h2>
        </div>

        <form onSubmit={handleUpdateSubmit} noValidate>
          <div className="amp-form-grid">
            {/* 1.1 Dropdown Chọn TTS */}
            <div className="amp-form-group">
              <label htmlFor="amp-select-intern" className="amp-label">
                <Users size={14} />
                <span>Chọn TTS <span className="amp-required">*</span></span>
              </label>
              <select
                id="amp-select-intern"
                aria-label="Chọn thực tập sinh"
                className={`amp-select ${formErrors.intern ? 'amp-input--error' : ''}`}
                value={selectedInternId}
                onChange={handleInternSelect}
              >
                <option value="">-- Chọn thực tập sinh --</option>
                {allowanceList.map((intern) => (
                  <option key={intern.id || intern.intern_id} value={intern.intern_id || intern.id}>
                    {intern.code} - {intern.full_name} ({intern.actual_days} công)
                  </option>
                ))}
              </select>
              {formErrors.intern && (
                <span className="amp-error-text" role="alert" data-testid="error-intern">
                  <AlertCircle size={13} />
                  <span>{formErrors.intern}</span>
                </span>
              )}
            </div>

            {/* 1.2 Input "Mức phụ cấp cơ bản" */}
            <div className="amp-form-group">
              <label htmlFor="amp-input-base-allowance" className="amp-label">
                <DollarSign size={14} />
                <span>Mức phụ cấp cơ bản <span className="amp-required">*</span></span>
              </label>
              <div className="amp-input-wrapper">
                <input
                  ref={baseInputRef}
                  type="text"
                  inputMode="numeric"
                  id="amp-input-base-allowance"
                  aria-label="Mức phụ cấp cơ bản"
                  className={`amp-input amp-input-money ${formErrors.baseAllowance ? 'amp-input--error' : ''}`}
                  placeholder="VD: 2,500,000"
                  value={baseAllowance}
                  onChange={handleBaseAllowanceChange}
                  onKeyDown={handleBaseAllowanceKeyDown}
                />
                {baseAllowance && (
                  <button
                    type="button"
                    className="amp-clear-btn"
                    onClick={handleClearBaseAllowance}
                    title="Xoá nhanh mức phụ cấp"
                    aria-label="Xoá nhanh mức phụ cấp"
                  >
                    <X size={13} />
                  </button>
                )}
                <span className="amp-currency-badge">VNĐ</span>
              </div>
              {formErrors.baseAllowance && (
                <span className="amp-error-text" role="alert" data-testid="error-base-allowance">
                  <AlertCircle size={13} />
                  <span>{formErrors.baseAllowance}</span>
                </span>
              )}
            </div>

            {/* 1.3 Input "Thưởng/Khấu trừ" (có toggle Cộng thưởng / Trừ phạt) */}
            <div className="amp-form-group">
              <div className="amp-label-row">
                <label htmlFor="amp-input-bonus" className="amp-label">
                  <span>Thưởng / Khấu trừ:</span>
                </label>
                <div className="amp-bonus-toggle" role="group" aria-label="Loại điều chỉnh">
                  <button
                    type="button"
                    className={`amp-bonus-toggle-btn ${
                      adjustmentType === 'bonus' ? 'amp-bonus-toggle-btn--active-plus' : ''
                    }`}
                    onClick={() => setAdjustmentType('bonus')}
                  >
                    + Thưởng
                  </button>
                  <button
                    type="button"
                    className={`amp-bonus-toggle-btn ${
                      adjustmentType === 'deduction' ? 'amp-bonus-toggle-btn--active-minus' : ''
                    }`}
                    onClick={() => setAdjustmentType('deduction')}
                  >
                    - Phạt
                  </button>
                </div>
              </div>
              <div className="amp-input-wrapper">
                <input
                  ref={bonusInputRef}
                  type="text"
                  inputMode="numeric"
                  id="amp-input-bonus"
                  aria-label="Thưởng hoặc khấu trừ"
                  className="amp-input amp-input-money"
                  placeholder="VD: 300,000"
                  value={bonusPenalty}
                  onChange={handleBonusPenaltyChange}
                  onKeyDown={handleBonusPenaltyKeyDown}
                />
                {bonusPenalty && (
                  <button
                    type="button"
                    className="amp-clear-btn"
                    onClick={handleClearBonusPenalty}
                    title="Xoá nhanh thưởng/phạt"
                    aria-label="Xoá nhanh thưởng/phạt"
                  >
                    <X size={13} />
                  </button>
                )}
                <span className="amp-currency-badge">VNĐ</span>
              </div>
            </div>

            {/* 1.4 Hiển thị Live Preview Tổng thực nhận + Nút "Cập nhật" */}
            <div className="amp-form-group amp-form-group--actions">
              <div className="amp-label amp-label--spacer" aria-hidden="true">&nbsp;</div>
              <div className="amp-form-actions">
                <div className="amp-preview-box">
                  <span className="amp-preview-label">Tổng thực nhận (dự kiến):</span>
                  <span className="amp-preview-value" data-testid="preview-total-net">
                    {formatVndDisplay(calculatedTotalNet)}
                  </span>
                </div>
                <button
                  type="submit"
                  className="amp-btn-update"
                  disabled={isSubmitting}
                  data-testid="btn-update-allowance"
                >
                  <Check size={16} />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Cập nhật'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* ── 2. BẢNG DANH SÁCH CHI TRẢ PHỤ CẤP THEO KỲ ── */}
      <section className="amp-table-card" aria-label="Bảng chi trả phụ cấp theo kỳ">
        <div className="amp-table-header">
          <div className="amp-table-title">
            <DollarSign size={18} color="#059669" />
            <span>Bảng danh sách chi trả phụ cấp theo kỳ</span>
          </div>

          <div className="amp-table-controls">
            {/* Bộ lọc trạng thái */}
            <select
              aria-label="Lọc theo trạng thái chi trả"
              className="amp-select"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="approved">Đã chi trả</option>
              <option value="pending">Chờ chi trả</option>
            </select>

            {/* Ô tìm kiếm theo tên */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm theo họ tên, mã TTS..."
                className="amp-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="amp-table-responsive">
          <table className="amp-table" aria-label="Bảng chi trả phụ cấp">
            <thead>
              <tr>
                <th scope="col" style={{ width: '24%' }}>Họ tên</th>
                <th scope="col" className="amp-cell-center" style={{ width: '12%' }}>Số ngày công</th>
                <th scope="col" className="amp-cell-right" style={{ width: '16%' }}>Phụ cấp cơ bản</th>
                <th scope="col" className="amp-cell-right" style={{ width: '14%' }}>Thưởng/Phạt</th>
                <th scope="col" className="amp-cell-right" style={{ width: '18%' }}>Tổng thực nhận</th>
                <th scope="col" className="amp-cell-center" style={{ width: '16%' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Không tìm thấy thực tập sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const isHighlighted = item.id === highlightedId || item.intern_id === highlightedId;
                  const bonus = item.bonus_penalty || 0;

                  return (
                    <tr
                      key={item.id || item.intern_id}
                      className={isHighlighted ? 'amp-row--highlight' : ''}
                      data-testid={`row-intern-${item.intern_id || item.id}`}
                    >
                      {/* Cột 1: Họ tên */}
                      <td>
                        <div className="amp-intern-cell">
                          <div className="amp-avatar">{item.full_name?.charAt(0) || 'T'}</div>
                          <div>
                            <div className="amp-intern-name">{item.full_name}</div>
                            <div className="amp-intern-code">{item.code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Số ngày công */}
                      <td className="amp-cell-center">
                        <span style={{ fontWeight: 600 }}>{item.actual_days}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>ngày</span>
                      </td>

                      {/* Cột 3: Phụ cấp cơ bản */}
                      <td className="amp-cell-right">
                        <span>{formatVndDisplay(item.base_allowance)}</span>
                      </td>

                      {/* Cột 4: Thưởng/Phạt */}
                      <td className="amp-cell-right">
                        {bonus > 0 ? (
                          <span className="amp-bonus-positive">+{formatVndDisplay(bonus)}</span>
                        ) : bonus < 0 ? (
                          <span className="amp-bonus-negative">-{formatVndDisplay(Math.abs(bonus))}</span>
                        ) : (
                          <span className="amp-bonus-zero">0 VNĐ</span>
                        )}
                      </td>

                      {/* Cột 5: Tổng thực nhận (Tự động tính: Phụ cấp cơ bản + Thưởng/Phạt) */}
                      <td className="amp-cell-right">
                        <span className="amp-total-net" data-testid={`total-net-${item.intern_id || item.id}`}>
                          {formatVndDisplay(item.total_net)}
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái (Đã chi trả / Chờ chi trả) */}
                      <td className="amp-cell-center">
                        <span
                          role="status"
                          className={`amp-status-badge ${
                            item.status === 'approved' ? 'amp-status-badge--paid' : 'amp-status-badge--pending'
                          }`}
                          onClick={() => toggleStatus(item.id || item.intern_id)}
                          title="Click để đổi trạng thái chi trả"
                        >
                          {item.status === 'approved' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          <span>{item.status === 'approved' ? 'Đã chi trả' : 'Chờ chi trả'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="amp-table-footer">
          <div>
            Hiển thị <b>{filteredRecords.length}</b> / <b>{allowanceList.length}</b> thực tập sinh
          </div>
        </div>
      </section>
    </div>
  );
}

