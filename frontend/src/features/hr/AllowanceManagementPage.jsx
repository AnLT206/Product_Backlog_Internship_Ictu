import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { fetchHrAllowances, updateHrAllowance } from '../../api/operations';
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
    intern_id: 3,
    code: 'TTS0003',
    full_name: 'Trần Thị Bình',
    email: 'binh.tt@ictu.edu.vn',
    actual_days: 18,
    base_allowance: 2000000,
    bonus_penalty: 0,
    total_net: 2000000,
    status: 'pending',
    status_label: 'Chờ chi trả',
  },
  {
    id: 4,
    intern_id: 4,
    code: 'TTS0004',
    full_name: 'Hoàng Minh Tuấn',
    email: 'tuan.hm@ictu.edu.vn',
    actual_days: 20,
    base_allowance: 2200000,
    bonus_penalty: 200000,
    total_net: 2400000,
    status: 'pending',
    status_label: 'Chờ chi trả',
  },
  {
    id: 5,
    intern_id: 5,
    code: 'TTS0005',
    full_name: 'Đặng Thùy Dung',
    email: 'dung.dt@ictu.edu.vn',
    actual_days: 22,
    base_allowance: 2500000,
    bonus_penalty: 500000,
    total_net: 3000000,
    status: 'approved',
    status_label: 'Đã chi trả',
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

  // 2. Quản lý State Bảng dữ liệu & Bộ lọc
  const [allowanceList, setAllowanceList] = useState(initialRecords || INITIAL_ALLOWANCE_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Tải dữ liệu ban đầu từ API
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (initialRecords) return;
      try {
        const res = await (fetchApi || fetchHrAllowances)();
        if (isMounted && res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setAllowanceList(res.data);
        }
      } catch (err) {
        // Fallback mock records
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchApi, initialRecords]);

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

  // 4. RÀNG BUỘC & FORMAT TIỀN KHI GÕ: KHÔNG SỐ ÂM, KHÔNG CHỮ CÁI, TỰ FORMAT DẤU PHẨY
  const handleBaseAllowanceChange = (e) => {
    const inputVal = e.target.value;
    // Lọc chỉ giữ lại ký tự số, loại bỏ hoàn toàn chữ cái và ký tự đặc biệt (kể cả dấu trừ)
    const digitsOnly = inputVal.replace(/\D/g, '');

    if (digitsOnly === '') {
      setBaseAllowance('');
    } else {
      const formatted = formatCurrencyInput(digitsOnly);
      setBaseAllowance(formatted);
    }

    if (formErrors.baseAllowance) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.baseAllowance;
        return next;
      });
    }
  };

  const handleBonusPenaltyChange = (e) => {
    const inputVal = e.target.value;
    // Lọc chỉ giữ lại ký tự số, loại bỏ hoàn toàn chữ cái và ký tự âm
    const digitsOnly = inputVal.replace(/\D/g, '');

    if (digitsOnly === '') {
      setBonusPenalty('');
    } else {
      const formatted = formatCurrencyInput(digitsOnly);
      setBonusPenalty(formatted);
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

    // Payload chuẩn bị gửi lên API
    const payload = {
      intern_id: Number(selectedInternId),
      base_allowance: rawBase,
      bonus_penalty: signedBonus,
      adjustment_type: adjustmentType,
      total_net: finalTotalNet, // Đã tính toán tự động: Phụ cấp cơ bản + Thưởng/Phạt
    };

    try {
      const apiFn = updateApi || updateHrAllowance;
      await apiFn(payload);

      // Cập nhật state bảng dữ liệu tức thì (Optimistic Update)
      setAllowanceList((prev) =>
        prev.map((item) => {
          if (String(item.intern_id) === String(selectedInternId) || String(item.id) === String(selectedInternId)) {
            return {
              ...item,
              base_allowance: rawBase,
              bonus_penalty: signedBonus,
              total_net: finalTotalNet,
            };
          }
          return item;
        })
      );

      const targetIntern = allowanceList.find(
        (i) => String(i.intern_id) === String(selectedInternId) || String(i.id) === String(selectedInternId)
      );
      const internName = targetIntern ? targetIntern.full_name : 'TTS';

      setHighlightedId(Number(selectedInternId));
      showToast(`Đã cập nhật phụ cấp cho ${internName} thành công! Tổng thực nhận: ${formatVndDisplay(finalTotalNet)}`, 'success');

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
    setAllowanceList((prev) =>
      prev.map((item) => {
        if (item.id === recordId || item.intern_id === recordId) {
          const nextStatus = item.status === 'approved' ? 'pending' : 'approved';
          const nextLabel = nextStatus === 'approved' ? 'Đã chi trả' : 'Chờ chi trả';
          showToast(`Đã chuyển trạng thái của ${item.full_name} sang "${nextLabel}"`, 'success');
          return { ...item, status: nextStatus, status_label: nextLabel };
        }
        return item;
      })
    );
  };

  // Nạp nhanh dữ liệu dòng lên form khi bấm nút "Sửa"
  const handleQuickEdit = (item) => {
    setSelectedInternId(String(item.intern_id || item.id));
    setBaseAllowance(formatCurrencyInput(item.base_allowance));
    if (item.bonus_penalty > 0) {
      setAdjustmentType('bonus');
      setBonusPenalty(formatCurrencyInput(item.bonus_penalty));
    } else if (item.bonus_penalty < 0) {
      setAdjustmentType('deduction');
      setBonusPenalty(formatCurrencyInput(Math.abs(item.bonus_penalty)));
    } else {
      setBonusPenalty('');
    }
    // Cuộn nhẹ lên form
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Tự động format dấu phẩy phân cách hàng nghìn (VD: 1,500,000 VNĐ).
          </span>
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
                  type="text"
                  id="amp-input-base-allowance"
                  aria-label="Mức phụ cấp cơ bản"
                  className={`amp-input amp-input-money ${formErrors.baseAllowance ? 'amp-input--error' : ''}`}
                  placeholder="VD: 2,500,000"
                  value={baseAllowance}
                  onChange={handleBaseAllowanceChange}
                />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  type="text"
                  id="amp-input-bonus"
                  aria-label="Thưởng hoặc khấu trừ"
                  className="amp-input amp-input-money"
                  placeholder="VD: 300,000"
                  value={bonusPenalty}
                  onChange={handleBonusPenaltyChange}
                />
                <span className="amp-currency-badge">VNĐ</span>
              </div>
            </div>

            {/* 1.4 Hiển thị Live Preview Tổng thực nhận + Nút "Cập nhật" */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            role="status"
                            className={`amp-status-badge ${
                              item.status === 'approved' ? 'amp-status-badge--paid' : 'amp-status-badge--pending'
                            }`}
                            onClick={() => toggleStatus(item.id || item.intern_id)}
                            title="Click để đổi trạng thái chi trả"
                          >
                            {item.status === 'approved' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            <span>{item.status === 'approved' ? 'Đã chi trả' : 'Chờ chi trả'}</span>
                          </span>

                          <button
                            type="button"
                            className="amp-btn-quick-edit"
                            onClick={() => handleQuickEdit(item)}
                            title="Chỉnh sửa phụ cấp cho TTS này"
                          >
                            Sửa
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

        <div className="amp-table-footer">
          <div>
            Hiển thị <b>{filteredRecords.length}</b> / <b>{allowanceList.length}</b> thực tập sinh
          </div>
          <div>Cập nhật tự động dựa trên số ngày công và chính sách thưởng/phạt</div>
        </div>
      </section>
    </div>
  );
}

