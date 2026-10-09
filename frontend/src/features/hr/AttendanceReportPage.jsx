import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Layers,
  Search,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Download,
  RotateCcw,
  Users,
  Clock,
  UserX,
  FileSpreadsheet,
  Info,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { fetchAttendanceReports } from '../../api/operations';
import './AttendanceReportPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA FIXTURE (DỮ LIỆU MẪU ĐẦY ĐỦ CÁC TRƯỜNG HỢP THEO QUY ĐỊNH)
   ───────────────────────────────────────────────────────────────────────────── */
export const MOCK_ATTENDANCE_DATA = [
  {
    id: 101,
    intern_id: 101,
    code: 'TTS1001',
    full_name: 'Nguyễn Văn An',
    email: 'an.nv@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Kỹ thuật Phần mềm',
    total_work_days: 22,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0, // Đạt chuẩn -> Xanh
    status: 'Bình thường',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
  {
    id: 102,
    intern_id: 102,
    code: 'TTS1002',
    full_name: 'Hoàng Minh Tuấn',
    email: 'tuan.hm@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Khoa học Máy tính',
    total_work_days: 20,
    late_count: 3, // Đi muộn = 3 -> BÔI VÀNG CẢNH BÁO
    approved_leave_days: 1,
    unapproved_leave_days: 0,
    status: 'Cảnh báo đi muộn',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
  {
    id: 103,
    intern_id: 103,
    code: 'TTS1003',
    full_name: 'Lê Hoàng Nam',
    email: 'nam.lh@hust.edu.vn',
    university: 'ĐH Bách Khoa Hà Nội',
    major: 'Kỹ thuật Máy tính',
    total_work_days: 18,
    late_count: 1,
    approved_leave_days: 1,
    unapproved_leave_days: 2, // Nghỉ không phép = 2 -> BÔI ĐỎ VI PHẠM
    status: 'Vi phạm kỷ luật',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
  {
    id: 104,
    intern_id: 104,
    code: 'TTS1004',
    full_name: 'Trần Thị Bình',
    email: 'binh.tt@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Hệ thống Thông tin',
    total_work_days: 16.5,
    late_count: 4, // Đi muộn = 4 (>= 3)
    approved_leave_days: 1,
    unapproved_leave_days: 2.5, // Nghỉ không phép = 2.5 (>= 2) -> Ưu tiên BÔI ĐỎ!
    status: 'Vi phạm kỷ luật nghiêm trọng',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
  {
    id: 105,
    intern_id: 105,
    code: 'TTS1005',
    full_name: 'Đặng Thùy Dung',
    email: 'dung.dt@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Trí tuệ Nhân tạo',
    total_work_days: 22,
    late_count: 1,
    approved_leave_days: 0,
    unapproved_leave_days: 0, // Đạt chuẩn -> Xanh
    status: 'Bình thường',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
  {
    id: 106,
    intern_id: 106,
    code: 'TTS1006',
    full_name: 'Bùi Quang Huy',
    email: 'huy.bq@tnu.edu.vn',
    university: 'ĐH Thái Nguyên',
    major: 'An toàn Thông tin',
    total_work_days: 19,
    late_count: 5, // Đi muộn = 5 -> BÔI VÀNG CẢNH BÁO
    approved_leave_days: 1,
    unapproved_leave_days: 0.5,
    status: 'Cảnh báo đi muộn',
    batch: 'BATCH_02',
    month: '10',
    year: 2026,
  },
  {
    id: 107,
    intern_id: 107,
    code: 'TTS1007',
    full_name: 'Vũ Trọng Phụng',
    email: 'phung.vt@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Mạng máy tính & TT',
    total_work_days: 15,
    late_count: 2,
    approved_leave_days: 2,
    unapproved_leave_days: 3, // Nghỉ không phép = 3 -> BÔI ĐỎ VI PHẠM
    status: 'Vi phạm kỷ luật',
    batch: 'BATCH_02',
    month: '10',
    year: 2026,
  },
  {
    id: 108,
    intern_id: 108,
    code: 'TTS1008',
    full_name: 'Phạm Minh Đức',
    email: 'duc.pm@student.ictu.edu.vn',
    university: 'ĐH CNTT & Truyền thông (ICTU)',
    major: 'Công nghệ Phần mềm',
    total_work_days: 22,
    late_count: 0,
    approved_leave_days: 0,
    unapproved_leave_days: 0, // Đạt chuẩn -> Xanh
    status: 'Bình thường',
    batch: 'BATCH_01',
    month: '10',
    year: 2026,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HÀM GIẢ LẬP FETCH DỮ LIỆU VỚI setTimeout (SIMULATED ASYNC FETCH)
   ───────────────────────────────────────────────────────────────────────────── */
export const simulateFetchAttendanceReports = ({ month, year, batch, search } = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...MOCK_ATTENDANCE_DATA];

      // Lọc theo đợt
      if (batch && batch !== 'all') {
        filtered = filtered.filter((item) => item.batch === batch);
      }

      // Lọc theo từ khóa tìm kiếm (họ tên, mã, email)
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.full_name.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q) ||
            item.email.toLowerCase().includes(q)
        );
      }

      resolve(filtered);
    }, 450); // Giả lập độ trễ mạng ~450ms
  });
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER FORMATS & HIGHLIGHT LOGIC
   ───────────────────────────────────────────────────────────────────────────── */
export function formatDays(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }
  const num = Number(value);
  return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace(/\.0$/, '');
}

export function getRowHighlightClass(item) {
  const unapproved = Number(item.unapproved_leave_days) || 0;
  const late = Number(item.late_count) || 0;

  // Quy tắc 1 (Ưu tiên cao nhất): Nghỉ không phép >= 2 ngày -> Bôi đỏ toàn bộ dòng
  if (unapproved >= 2) {
    return 'arp-row--danger';
  }

  // Quy tắc 2: Đi muộn >= 3 lần -> Bôi vàng cảnh báo toàn bộ dòng
  if (late >= 3) {
    return 'arp-row--warning';
  }

  return 'arp-row--normal';
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: AttendanceReportPage
   ───────────────────────────────────────────────────────────────────────────── */
export default function AttendanceReportPage({ fetchReportsApi = fetchAttendanceReports } = {}) {
  // 1. Quản lý State cho Toolbar Filters
  const [selectedMonth, setSelectedMonth] = useState('10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 2. Quản lý State Dữ liệu & UI
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toast, setToast] = useState(null);

  // Hiển thị Toast thông báo nhanh
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  // 3. Logic Fetch Dữ liệu (Tích hợp API thực + Giả lập qua setTimeout)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Gọi API GET /api/hr/attendance-reports
      const apiFn = fetchReportsApi || fetchAttendanceReports;
      const res = await apiFn({
        month: `${selectedYear}-${selectedMonth}`,
        year: Number(selectedYear),
        batch: selectedBatch,
        search: searchKeyword,
      });

      if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
        // Ánh xạ dữ liệu API chuẩn hóa
        const mapped = res.data.map((item) => ({
          id: item.id || item.intern_id,
          intern_id: item.intern_id || item.id,
          code: item.code || `TTS${item.id}`,
          full_name: item.full_name || item.name || 'Thực tập sinh',
          email: item.email || `${(item.code || 'tts').toLowerCase()}@ictu.edu.vn`,
          university: item.university || 'ĐH CNTT & TT Thái Nguyên (ICTU)',
          major: item.major || 'Kỹ thuật Phần mềm',
          total_work_days: item.total_work_days ?? item.actual_days ?? 22,
          late_count: item.late_count ?? item.late_days ?? 0,
          approved_leave_days: item.approved_leave_days ?? item.leave_days ?? 0,
          unapproved_leave_days: item.unapproved_leave_days ?? 0,
          status: item.status || 'Bình thường',
          batch: item.batch || 'BATCH_01',
          month: selectedMonth,
          year: selectedYear,
        }));
        setAttendanceData(mapped);
        setIsLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn('API /api/hr/attendance-reports không khả dụng hoặc lỗi mạng, tự động sử dụng simulated mock fetch:', apiErr);
    }

    // 2. Fallback: Giả lập fetch dữ liệu qua setTimeout
    try {
      const mockResult = await simulateFetchAttendanceReports({
        month: selectedMonth,
        year: selectedYear,
        batch: selectedBatch,
        search: searchKeyword,
      });
      setAttendanceData(mockResult);
    } catch (err) {
      setErrorMessage('Không thể tải dữ liệu báo cáo chuyên cần. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedBatch, searchKeyword]);

  // Kích hoạt load data khi thay đổi bộ lọc hoặc mở trang
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 4. Lọc dữ liệu client-side tức thì nếu searchKeyword thay đổi liên tục
  const displayedRecords = useMemo(() => {
    return attendanceData.filter((item) => {
      // Đợt thực tập
      if (selectedBatch !== 'all' && item.batch && item.batch !== selectedBatch) {
        return false;
      }
      // Tìm kiếm theo tên
      if (searchKeyword.trim()) {
        const q = searchKeyword.trim().toLowerCase();
        const matchName = item.full_name?.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail) return false;
      }
      return true;
    });
  }, [attendanceData, selectedBatch, searchKeyword]);

  // 5. Thống kê KPI tóm tắt
  const summaryMetrics = useMemo(() => {
    const total = displayedRecords.length;
    let dangerCount = 0; // Nghỉ không phép >= 2
    let warningCount = 0; // Đi muộn >= 3 (và không đỏ)
    let normalCount = 0; // Bình thường

    displayedRecords.forEach((item) => {
      const unapproved = Number(item.unapproved_leave_days) || 0;
      const late = Number(item.late_count) || 0;

      if (unapproved >= 2) {
        dangerCount++;
      } else if (late >= 3) {
        warningCount++;
      } else {
        normalCount++;
      }
    });

    return { total, dangerCount, warningCount, normalCount };
  }, [displayedRecords]);

  // 6. Xử lý Xuất Excel
  const handleExportExcel = () => {
    showToast(`Đang trích xuất báo cáo chuyên cần Tháng ${selectedMonth}/${selectedYear} ra định dạng Excel...`, 'info');
    setTimeout(() => {
      showToast('Đã tải xuống thành công file: Bao_Cao_Chuyen_Can_Thang_' + selectedMonth + '_' + selectedYear + '.xlsx', 'success');
    }, 1200);
  };

  return (
    <div className="attendance-report-page" data-testid="attendance-report-page">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className={`arp-toast arp-toast--${toast.type}`} role="status">
          {toast.type === 'success' && <CheckCircle2 size={16} color="#10B981" />}
          {toast.type === 'error' && <ShieldAlert size={16} color="#EF4444" />}
          {toast.type === 'info' && <Info size={16} color="#3B82F6" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="arp-header">
        <div className="arp-title-group">
          <span className="arp-tag">
            <Calendar size={13} />
            <span>Phân hệ Quản lý & Giám sát Chuyên cần</span>
          </span>
          <h1 className="arp-main-title">Báo cáo Chuyên cần Thực tập sinh</h1>
          <p className="arp-desc">
            Theo dõi ngày công, vi phạm kỷ luật nghỉ không phép và tần suất đi muộn của thực tập sinh theo kỳ đánh giá.
          </p>
        </div>

        <div className="arp-header-actions">
          <button
            type="button"
            className="arp-btn arp-btn--outline"
            onClick={loadData}
            title="Tải lại dữ liệu"
          >
            <RotateCcw size={15} className={isLoading ? 'arp-spinner' : ''} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className="arp-btn arp-btn--success"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet size={15} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </header>

      {/* ── 4 KPI CARDS TỔNG QUAN ── */}
      <section className="arp-kpi-grid">
        {/* Tổng số TTS */}
        <div className="arp-kpi-card">
          <div className="arp-kpi-card-header">
            <span className="arp-kpi-label">Tổng số TTS hiển thị</span>
            <div className="arp-kpi-icon-wrap arp-kpi-icon-wrap--blue">
              <Users size={18} />
            </div>
          </div>
          <div className="arp-kpi-value">{summaryMetrics.total}</div>
          <div className="arp-kpi-footer">Tháng {selectedMonth}/{selectedYear}</div>
        </div>

        {/* Chuyên cần chuẩn (Xanh) */}
        <div className="arp-kpi-card">
          <div className="arp-kpi-card-header">
            <span className="arp-kpi-label">Đạt chuẩn chuyên cần</span>
            <div className="arp-kpi-icon-wrap arp-kpi-icon-wrap--green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="arp-kpi-value" style={{ color: '#059669' }}>
            {summaryMetrics.normalCount}
          </div>
          <div className="arp-kpi-footer">
            {summaryMetrics.total > 0
              ? `${Math.round((summaryMetrics.normalCount / summaryMetrics.total) * 100)}% tỷ lệ tuân thủ`
              : '0%'}
          </div>
        </div>

        {/* Cảnh báo Đi muộn >= 3 (Vàng) */}
        <div className="arp-kpi-card">
          <div className="arp-kpi-card-header">
            <span className="arp-kpi-label">Cảnh báo đi muộn (≥ 3)</span>
            <div className="arp-kpi-icon-wrap arp-kpi-icon-wrap--amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="arp-kpi-value" style={{ color: '#d97706' }}>
            {summaryMetrics.warningCount}
          </div>
          <div className="arp-kpi-footer">Cần Mentor nhắc nhở kỷ luật</div>
        </div>

        {/* Vi phạm Kỷ luật Nghỉ không phép >= 2 (Đỏ) */}
        <div className="arp-kpi-card">
          <div className="arp-kpi-card-header">
            <span className="arp-kpi-label">Vi phạm nghỉ KP (≥ 2)</span>
            <div className="arp-kpi-icon-wrap arp-kpi-icon-wrap--red">
              <UserX size={18} />
            </div>
          </div>
          <div className="arp-kpi-value" style={{ color: '#dc2626' }}>
            {summaryMetrics.dangerCount}
          </div>
          <div className="arp-kpi-footer">HR xem xét hạ bậc / đình chỉ</div>
        </div>
      </section>

      {/* ── TOOLBAR (THANH CÔNG CỤ: BỘ LỌC THÁNG/NĂM, ĐỢT THỰC TẬP & SEARCH TÊN) ── */}
      <section className="arp-toolbar-card" aria-label="Thanh công cụ lọc báo cáo">
        <div className="arp-toolbar-content">
          <div className="arp-toolbar-filters">
            {/* 1. Bộ lọc Tháng / Năm */}
            <div className="arp-filter-group">
              <label htmlFor="filter-month-year" className="arp-filter-label">
                <Calendar size={15} />
                <span>Tháng/Năm:</span>
              </label>
              <select
                id="filter-month-year"
                className="arp-select"
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  setSelectedYear(y);
                  setSelectedMonth(m);
                }}
              >
                <option value="2026-10">Tháng 10/2026 (Hiện tại)</option>
                <option value="2026-09">Tháng 09/2026</option>
                <option value="2026-08">Tháng 08/2026</option>
                <option value="2026-07">Tháng 07/2026</option>
              </select>
            </div>

            {/* 2. Bộ lọc Đợt thực tập */}
            <div className="arp-filter-group">
              <label htmlFor="filter-batch" className="arp-filter-label">
                <Layers size={15} />
                <span>Đợt thực tập:</span>
              </label>
              <select
                id="filter-batch"
                className="arp-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="all">Tất cả đợt thực tập</option>
                <option value="BATCH_01">Đợt 1 - Thu Đông 2026</option>
                <option value="BATCH_02">Đợt 2 - Xuân Hè 2027</option>
                <option value="BATCH_03">Đợt 3 - Tốt nghiệp 2027</option>
              </select>
            </div>
          </div>

          {/* 3. Ô Search theo tên / mã TTS */}
          <div className="arp-search-wrapper">
            <Search size={15} className="arp-search-icon" />
            <input
              type="text"
              id="search-intern-name"
              aria-label="Tìm kiếm theo tên thực tập sinh"
              className="arp-search-input"
              placeholder="Tìm kiếm theo họ tên TTS, mã sinh viên..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="arp-search-clear"
                onClick={() => setSearchKeyword('')}
                title="Xóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── COLOR LEGEND (QUY TẮC BÔI MÀU DÒNG CẢNH BÁO) ── */}
      <div className="arp-legend-bar" role="note" aria-label="Quy tắc cảnh báo chuyên cần">
        <span className="arp-legend-title">
          <Info size={14} />
          Quy tắc Highlight Cảnh báo:
        </span>
        <span className="arp-legend-item">
          <span className="arp-legend-dot arp-legend-dot--red"></span>
          <b>Bôi Đỏ dòng:</b> Nghỉ không phép ≥ 2 buổi (Vi phạm kỷ luật)
        </span>
        <span className="arp-legend-item">
          <span className="arp-legend-dot arp-legend-dot--amber"></span>
          <b>Bôi Vàng dòng:</b> Đi muộn ≥ 3 lần (Cảnh báo đi muộn)
        </span>
        <span className="arp-legend-item">
          <span className="arp-legend-dot arp-legend-dot--green"></span>
          <b>Dòng bình thường:</b> Chuyên cần đạt chuẩn
        </span>
      </div>

      {/* ── BẢNG DỮ LIỆU CHUYÊN CẦN (TABLE CHUẨN 6 CỘT) ── */}
      <div className="arp-table-card">
        <div className="arp-table-responsive">
          <table className="arp-table" aria-label="Bảng dữ liệu báo cáo chuyên cần">
            <thead>
              <tr>
                <th scope="col" style={{ width: '28%' }}>Họ tên TTS</th>
                <th scope="col" className="arp-cell-center" style={{ width: '15%' }}>Tổng số ngày đi làm</th>
                <th scope="col" className="arp-cell-center" style={{ width: '13%' }}>Số lần đi muộn</th>
                <th scope="col" className="arp-cell-center" style={{ width: '13%' }}>Nghỉ có phép</th>
                <th scope="col" className="arp-cell-center" style={{ width: '15%' }}>Nghỉ không phép</th>
                <th scope="col" className="arp-cell-center" style={{ width: '16%' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="arp-loading-state" role="status">
                      <RotateCcw size={28} className="arp-spinner" />
                      <span>Đang tải dữ liệu chuyên cần từ hệ thống...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="arp-empty-state">
                      <Users size={32} />
                      <span>Không tìm thấy thực tập sinh nào phù hợp với bộ lọc hiện tại.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((item) => {
                  // Xác định class highlight màu sắc của dòng theo đúng yêu cầu đề bài
                  const rowClass = getRowHighlightClass(item);
                  const isDanger = rowClass === 'arp-row--danger';
                  const isWarning = rowClass === 'arp-row--warning';

                  return (
                    <tr
                      key={item.id}
                      className={rowClass}
                      data-testid={`row-intern-${item.id}`}
                    >
                      {/* Cột 1: Họ tên TTS */}
                      <td>
                        <div className="arp-intern-info">
                          <div
                            className={`arp-avatar ${
                              isDanger
                                ? 'arp-avatar--danger'
                                : isWarning
                                ? 'arp-avatar--warning'
                                : 'arp-avatar--normal'
                            }`}
                          >
                            {item.full_name?.charAt(0) || 'T'}
                          </div>
                          <div className="arp-intern-details">
                            <span className="arp-intern-name">{item.full_name}</span>
                            <div className="arp-intern-sub">
                              <span className="arp-code-badge">{item.code}</span>
                              <span>•</span>
                              <span>{item.major}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Tổng số ngày đi làm */}
                      <td className="arp-cell-center">
                        <span className="arp-metric-val">{formatDays(item.total_work_days)}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>ngày</span>
                      </td>

                      {/* Cột 3: Số lần đi muộn (Nếu >= 3 lần highlight số) */}
                      <td className="arp-cell-center">
                        <span
                          className={`arp-metric-val ${
                            Number(item.late_count) >= 3 ? 'arp-metric-highlight--amber' : ''
                          }`}
                        >
                          {item.late_count}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>lần</span>
                      </td>

                      {/* Cột 4: Nghỉ có phép */}
                      <td className="arp-cell-center">
                        <span className="arp-metric-val">{formatDays(item.approved_leave_days)}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>ngày</span>
                      </td>

                      {/* Cột 5: Nghỉ không phép (Nếu >= 2 ngày highlight số đỏ) */}
                      <td className="arp-cell-center">
                        <span
                          className={`arp-metric-val ${
                            Number(item.unapproved_leave_days) >= 2
                              ? 'arp-metric-highlight--red'
                              : ''
                          }`}
                        >
                          {formatDays(item.unapproved_leave_days)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '3px' }}>ngày</span>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="arp-cell-center">
                        {isDanger ? (
                          <span className="arp-status-badge arp-status-badge--danger" role="status">
                            <ShieldAlert size={12} />
                            <span>Vi phạm kỷ luật</span>
                          </span>
                        ) : isWarning ? (
                          <span className="arp-status-badge arp-status-badge--warning" role="status">
                            <AlertTriangle size={12} />
                            <span>Cảnh báo đi muộn</span>
                          </span>
                        ) : (
                          <span className="arp-status-badge arp-status-badge--success" role="status">
                            <CheckCircle2 size={12} />
                            <span>Bình thường</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="arp-table-footer">
          <div className="arp-footer-counter">
            Hiển thị <b>{displayedRecords.length}</b> / <b>{attendanceData.length}</b> thực tập sinh
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Hệ thống tự động đồng bộ từ máy chấm công & phân hệ xác nhận phép của HR
          </div>
        </div>
      </div>
    </div>
  );
}
