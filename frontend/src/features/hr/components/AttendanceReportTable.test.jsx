import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import AttendanceReportTable from './AttendanceReportTable'

/* ─────────────────────────────────────────────────────────────────────────────
 * 0. MOCK DATA FIXTURES
 * ──────────────────────────────────────────────────────────────────────────── */
const mockStandardAttendanceList = [
  {
    internId: 'TTS0001',
    fullName: 'TTS (TTS0001)',
    totalWorkDays: 22,
    lateCount: 0,
    approvedLeaveDays: 0,
    unapprovedLeaveDays: 0,
    isAttendanceWarning: false,
  },
  {
    internId: 'TTS0002',
    fullName: 'Trần Thị Bình',
    totalWorkDays: 18,
    lateCount: 4, // > 3 lần -> Cảnh báo
    approvedLeaveDays: 1,
    unapprovedLeaveDays: 2, // > 1 buổi -> Cảnh báo
    isAttendanceWarning: true,
  },
]

const mockDecimalAttendanceList = [
  {
    internId: 'TTS0003',
    fullName: 'Lê Hoàng Nam',
    totalWorkDays: 20.5, // 20.5 ngày làm việc
    lateCount: 1,
    approvedLeaveDays: 0.5, // 0.5 ngày nghỉ có phép (nửa buổi)
    unapprovedLeaveDays: 1.5, // 1.5 ngày nghỉ không phép
    isAttendanceWarning: true,
  },
]

const mockFilteredBatchList = [
  {
    internId: 'TTS0004',
    fullName: 'Phạm Minh Đức',
    totalWorkDays: 21,
    lateCount: 1,
    approvedLeaveDays: 1,
    unapprovedLeaveDays: 0,
    isAttendanceWarning: false,
  },
]

describe('AttendanceReportTable Component Test Suite (HR Attendance Report)', () => {
  let mockFetchApi

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchApi = vi.fn().mockResolvedValue(mockStandardAttendanceList)
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. RENDER & DATA DISPLAY (Hiển thị dữ liệu & Headers)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Render & Data Display', () => {
    it('render đúng danh sách các cột tiêu đề của bảng báo cáo chuyên cần', async () => {
      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      // Chờ dữ liệu load xong bằng Accessible Query
      await screen.findByRole('row', { name: /TTS/i })

      const requiredColumns = [
        'Tên',
        'Số ngày đi làm',
        'Số lần đi muộn',
        'Nghỉ có phép',
        'Nghỉ không phép',
        'Trạng thái',
      ]

      requiredColumns.forEach((colTitle) => {
        const columnHeader = screen.getByRole('columnheader', { name: new RegExp(colTitle, 'i') })
        expect(columnHeader).toBeInTheDocument()
      })
    })

    it('hiển thị đúng số liệu chuyên cần tương ứng từ mock data cho từng TTS', async () => {
      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      // Tìm dòng dữ liệu của TTS
      const rowAn = await screen.findByRole('row', { name: /TTS/i })
      expect(rowAn).toBeInTheDocument()

      const cells = within(rowAn).getAllByRole('cell')
      expect(cells[0]).toHaveTextContent('TTS (TTS0001)')
      expect(cells[1]).toHaveTextContent('22') // Số ngày đi làm
      expect(cells[2]).toHaveTextContent('0') // Số lần đi muộn
      expect(cells[3]).toHaveTextContent('0') // Nghỉ có phép
      expect(cells[4]).toHaveTextContent('0') // Nghỉ không phép
      expect(cells[5]).toHaveTextContent('Bình thường') // Trạng thái
    })

    it('xử lý Loading state khi đang fetch dữ liệu từ API', () => {
      // Giả lập Promise chưa resolve để bắt trạng thái đang tải
      mockFetchApi.mockReturnValue(new Promise(() => {}))

      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      const loadingStatus = screen.getByRole('status', { name: /đang tải dữ liệu/i })
      expect(loadingStatus).toBeInTheDocument()
      expect(screen.getByText(/đang tải dữ liệu báo cáo/i)).toBeInTheDocument()
    })

    it('xử lý Empty state khi API trả về danh sách trống', async () => {
      mockFetchApi.mockResolvedValueOnce([])

      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      const emptyNotice = await screen.findByText(/không có dữ liệu chuyên cần/i)
      expect(emptyNotice).toBeInTheDocument()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. HIGHLIGHT & CONDITIONAL STYLING (Kiểm tra logic highlight cảnh báo)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Highlight & Conditional Styling (Cảnh báo chuyên cần)', () => {
    it('thực tập sinh có số buổi nghỉ/đi muộn vượt ngưỡng quy định có gắn cảnh báo và styling nổi bật', async () => {
      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      // Trần Thị Bình: đi muộn 4 lần (> 3), nghỉ không phép 2 ngày (> 1)
      const warningRow = await screen.findByRole('row', { name: /Trần Thị Bình/i })
      expect(warningRow).toBeInTheDocument()

      // 1. Kiểm tra class CSS cảnh báo
      expect(warningRow).toHaveClass('warning-row')
      expect(warningRow).toHaveClass('bg-red-100')
      expect(warningRow).toHaveClass('text-destructive')

      // 2. Kiểm tra badge "Cảnh báo"
      const warningBadge = within(warningRow).getByRole('status', { name: /cảnh báo chuyên cần/i })
      expect(warningBadge).toBeInTheDocument()
      expect(warningBadge).toHaveTextContent('Cảnh báo')
    })

    it('thực tập sinh có chuyên cần tốt không bị gắn style cảnh báo', async () => {
      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      const normalRow = await screen.findByRole('row', { name: /TTS/i })
      expect(normalRow).not.toHaveClass('warning-row')
      expect(normalRow).not.toHaveClass('bg-red-100')

      // Không chứa badge cảnh báo, hiển thị badge Bình thường
      expect(within(normalRow).queryByRole('status', { name: /cảnh báo chuyên cần/i })).not.toBeInTheDocument()
      const normalBadge = within(normalRow).getByRole('status', { name: /chuyên cần bình thường/i })
      expect(normalBadge).toHaveTextContent('Bình thường')
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. USER INTERACTION & FILTER CHANGE (Tương tác bộ lọc)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. User Interaction & Filter Change', () => {
    it('khi người dùng thay đổi Dropdown tháng -> trigger gọi lại API với param mới chính xác', async () => {
      const user = userEvent.setup()
      render(
        <AttendanceReportTable
          fetchReportApi={mockFetchApi}
          initialMonth="2026-10"
          initialBatchId="BATCH_01"
        />,
      )

      await screen.findByRole('row', { name: /TTS/i })
      expect(mockFetchApi).toHaveBeenCalledWith({ month: '2026-10', batchId: 'BATCH_01' })

      // Người dùng chọn tháng 11/2026
      const monthSelect = screen.getByRole('combobox', { name: /chọn tháng/i })
      await user.selectOptions(monthSelect, '2026-11')

      // Kiểm tra API được kích hoạt lại với param mới
      expect(mockFetchApi).toHaveBeenCalledTimes(2)
      expect(mockFetchApi).toHaveBeenLastCalledWith({ month: '2026-11', batchId: 'BATCH_01' })
    })

    it('khi người dùng thay đổi đợt -> bảng cập nhật dữ liệu mới sau khi trigger filter', async () => {
      const user = userEvent.setup()

      mockFetchApi
        .mockResolvedValueOnce(mockStandardAttendanceList)
        .mockResolvedValueOnce(mockFilteredBatchList)

      render(<AttendanceReportTable fetchReportApi={mockFetchApi} initialBatchId="BATCH_01" />)
      await screen.findByRole('row', { name: /TTS/i })

      // Người dùng đổi sang Đợt 2
      const batchSelect = screen.getByRole('combobox', { name: /chọn đợt thực tập/i })
      await user.selectOptions(batchSelect, 'BATCH_02')

      // Bảng cập nhật người mới và bỏ người cũ
      expect(await screen.findByRole('row', { name: /Phạm Minh Đức/i })).toBeInTheDocument()
      expect(screen.queryByRole('row', { name: /TTS/i })).not.toBeInTheDocument()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 4. EDGE CASES (Xử lý các tình huống biên)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Edge Cases & Error Handling', () => {
    it('trường hợp API trả về lỗi 500/400 -> hiển thị Alert thông báo lỗi thân thiện', async () => {
      const apiErrorMsg = 'Máy chủ nội bộ gặp sự cố (HTTP 500). Vui lòng thử lại sau.'
      mockFetchApi.mockRejectedValueOnce(new Error(apiErrorMsg))

      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      // Alert xuất hiện với đúng role="alert"
      const alertBox = await screen.findByRole('alert')
      expect(alertBox).toBeInTheDocument()
      expect(alertBox).toHaveTextContent(apiErrorMsg)

      // Bảng chuyển về Empty State an toàn, không bị crash
      expect(screen.getByText(/không có dữ liệu chuyên cần/i)).toBeInTheDocument()
    })

    it('số liệu dạng số thập phân (0.5, 1.5, 20.5 ngày) hiển thị chính xác không bị lỗi làm tròn', async () => {
      mockFetchApi.mockResolvedValueOnce(mockDecimalAttendanceList)

      render(<AttendanceReportTable fetchReportApi={mockFetchApi} />)

      const rowNam = await screen.findByRole('row', { name: /Lê Hoàng Nam/i })
      const cells = within(rowNam).getAllByRole('cell')

      expect(cells[1]).toHaveTextContent('20.5') // 20.5 ngày công
      expect(cells[3]).toHaveTextContent('0.5') // 0.5 ngày nghỉ có phép
      expect(cells[4]).toHaveTextContent('1.5') // 1.5 ngày nghỉ không phép
    })
  })
})

