import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Layers, AlertCircle, RefreshCw } from 'lucide-react'
import { fetchAttendanceReport } from '../../../api/operations'
import { subscribeRealtimeEvents, SYNC_EVENTS } from '../../../utils/realtimeSync'
import './AttendanceReportTable.css'

export const DEFAULT_ATTENDANCE_THRESHOLDS = {
  maxLateCount: 3,
  maxUnapprovedLeave: 1,
}

/**
 * Format số ngày hiển thị, xử lý chính xác số thập phân (ví dụ: 0.5, 1.5 ngày)
 * tránh lỗi làm tròn hoặc lỗi float precision.
 */
export function formatAttendanceDays(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0'
  }
  const num = Number(value)
  return Number.isInteger(num) ? num.toString() : num.toFixed(1).replace(/\.0$/, '')
}

export default function AttendanceReportTable({
  fetchReportApi = fetchAttendanceReport,
  initialMonth = '2026-10',
  initialBatchId = 'BATCH_01',
  thresholds = DEFAULT_ATTENDANCE_THRESHOLDS,
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [batchId, setBatchId] = useState(initialBatchId)
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const loadData = useCallback(
    async (month, batch) => {
      const apiFn = fetchReportApi || fetchAttendanceReport
      if (typeof apiFn !== 'function') return
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const result = await apiFn({ month, batchId: batch })
        setRecords(Array.isArray(result) ? result : [])
      } catch (err) {
        const message = err?.message || 'Có lỗi xảy ra khi tải báo cáo chuyên cần (HTTP 500).'
        setErrorMessage(message)
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    },
    [fetchReportApi],
  )

  useEffect(() => {
    loadData(selectedMonth, batchId)
  }, [selectedMonth, batchId, loadData])

  // Lắng nghe sự kiện đồng bộ thời gian thực từ cổng TTS và cổng Mentor
  useEffect(() => {
    const handleSync = (event) => {
      const syncTypes = [
        SYNC_EVENTS.ATTENDANCE_CHECKED_IN,
        SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED,
        SYNC_EVENTS.ATTENDANCE_APPROVED,
        SYNC_EVENTS.MENTOR_EVALUATED,
      ]
      if (!event || syncTypes.includes(event?.type)) {
        loadData(selectedMonth, batchId)
      }
    }

    const unsubscribe = subscribeRealtimeEvents(handleSync)
    const handleLocalSync = () => loadData(selectedMonth, batchId)

    if (typeof window !== 'undefined') {
      window.addEventListener('intern_data_sync_event', handleLocalSync)
      window.addEventListener('storage', handleLocalSync)
    }

    return () => {
      unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('intern_data_sync_event', handleLocalSync)
        window.removeEventListener('storage', handleLocalSync)
      }
    }
  }, [selectedMonth, batchId, loadData])

  return (
    <div className="art-container" data-testid="attendance-report-container">
      {/* ── BỘ LỌC CHỌN THÁNG VÀ ĐỢT ── */}
      <section className="art-filter-section" aria-label="Bộ lọc báo cáo chuyên cần">
        <div className="art-filter-item">
          <label htmlFor="art-filter-month" className="art-filter-label">
            <Calendar size={15} />
            <span>Tháng:</span>
          </label>
          <select
            id="art-filter-month"
            aria-label="Chọn tháng"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="art-select"
          >
            <option value="2026-08">Tháng 08/2026</option>
            <option value="2026-09">Tháng 09/2026</option>
            <option value="2026-10">Tháng 10/2026</option>
            <option value="2026-11">Tháng 11/2026</option>
          </select>
        </div>

        <div className="art-filter-item">
          <label htmlFor="art-filter-batch" className="art-filter-label">
            <Layers size={15} />
            <span>Đợt:</span>
          </label>
          <select
            id="art-filter-batch"
            aria-label="Chọn đợt thực tập"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="art-select"
          >
            <option value="BATCH_01">Đợt 1 - Thu Đông 2026</option>
            <option value="BATCH_02">Đợt 2 - Xuân Hè 2027</option>
            <option value="BATCH_03">Đợt 3 - Tốt nghiệp 2027</option>
          </select>
        </div>

        <button
          type="button"
          className="art-btn-refresh"
          onClick={() => loadData(selectedMonth, batchId)}
          title="Tải lại dữ liệu"
        >
          <RefreshCw size={14} className={isLoading ? 'art-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </section>

      {/* ── THÔNG BÁO LỖI (ALERT MESSAGE) ── */}
      {errorMessage && (
        <div role="alert" className="art-alert art-alert--danger">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── BẢNG DỮ LIỆU BÁO CÁO CHUYÊN CẦN ── */}
      <div className="art-table-wrapper">
        <table className="art-table" aria-label="Bảng báo cáo chuyên cần">
          <thead>
            <tr>
              <th scope="col">Tên</th>
              <th scope="col" style={{ textAlign: 'center' }}>Số ngày đi làm</th>
              <th scope="col" style={{ textAlign: 'center' }}>Số lần đi muộn</th>
              <th scope="col" style={{ textAlign: 'center' }}>Nghỉ có phép</th>
              <th scope="col" style={{ textAlign: 'center' }}>Nghỉ không phép</th>
              <th scope="col" style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr role="row">
                <td colSpan={6} className="art-cell--loading">
                  <div role="status" aria-label="Đang tải dữ liệu..." className="art-loading-wrap">
                    <RefreshCw size={18} className="art-spin" />
                    <span>Đang tải dữ liệu báo cáo...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr role="row">
                <td colSpan={6} className="art-cell--empty">
                  Không có dữ liệu chuyên cần
                </td>
              </tr>
            ) : (
              records.map((item) => {
                const isWarning =
                  item.isAttendanceWarning ??
                  (item.lateCount > thresholds.maxLateCount ||
                    item.unapprovedLeaveDays > thresholds.maxUnapprovedLeave)

                return (
                  <tr
                    key={item.internId}
                    aria-label={`Dòng dữ liệu của ${item.fullName}`}
                    className={`art-row ${isWarning ? 'warning-row bg-red-100 text-destructive' : ''}`}
                  >
                    <td className="art-cell-name">
                      <span className="art-name-title">{item.fullName}</span>
                      {item.internId && <span className="art-id-tag">({item.internId})</span>}
                    </td>
                    <td className="art-cell-center">{formatAttendanceDays(item.totalWorkDays)}</td>
                    <td className="art-cell-center art-cell-late">{item.lateCount}</td>
                    <td className="art-cell-center">{formatAttendanceDays(item.approvedLeaveDays)}</td>
                    <td
                      className={`art-cell-center ${
                        Number(item.unapprovedLeaveDays) > 0 ? 'art-cell-unapproved--alert' : ''
                      }`}
                    >
                      {formatAttendanceDays(item.unapprovedLeaveDays)}
                    </td>
                    <td className="art-cell-center">
                      {isWarning ? (
                        <span
                          role="status"
                          aria-label="Cảnh báo chuyên cần"
                          className="art-badge art-badge--warning bg-red-100 text-destructive"
                        >
                          Cảnh báo
                        </span>
                      ) : (
                        <span
                          role="status"
                          aria-label="Chuyên cần bình thường"
                          className="art-badge art-badge--normal"
                        >
                          Bình thường
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
    </div>
  )
}

