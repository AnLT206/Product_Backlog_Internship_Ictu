import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import LeaveRequestManagement from './LeaveRequestManagement'
import * as operationsApi from '../../../api/operations'

const mockLeavesList = [
  {
    id: 'NP-001',
    requestCode: 'NP-001',
    internName: 'TTS',
    internCode: 'TTS0001',
    internEmail: 'intern@ictu.edu.vn',
    type: 'Nghỉ thi học phần',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    session: 'Buổi chiều (13:30 - 17:30)',
    duration: '0.5 ngày',
    reason: 'Thi kết thúc học phần Cơ sở dữ liệu nâng cao.',
    createdDate: '24/09/2026',
    status: 'approved',
    statusLabel: 'Đã duyệt',
    approver: 'Hr',
    feedback: 'Đã duyệt nghỉ phép. Chúc sinh viên thi tốt.',
  },
  {
    id: 'NP-002',
    requestCode: 'NP-002',
    internName: 'Lê Hoàng Nam',
    internCode: 'TTS0002',
    internEmail: 'tts02@student.ictu.edu.vn',
    type: 'Nghỉ việc cá nhân',
    startDate: '2026-10-08',
    endDate: '2026-10-08',
    session: 'Cả ngày (08:15 - 17:30)',
    duration: '1.0 ngày',
    reason: 'Về quê giải quyết thủ tục hành chính.',
    createdDate: '06/10/2026',
    status: 'pending',
    statusLabel: 'Chờ duyệt',
    approver: 'Chờ duyệt',
    feedback: 'Đang chờ HR xem xét.',
  },
  {
    id: 'NP-003',
    requestCode: 'NP-003',
    internName: 'Trần Thị Bình',
    internCode: 'TTS0003',
    internEmail: 'tts03@student.ictu.edu.vn',
    type: 'Nghỉ ốm / Khám bệnh',
    startDate: '2026-10-09',
    endDate: '2026-10-09',
    session: 'Buổi sáng (08:15 - 12:00)',
    duration: '0.5 ngày',
    reason: 'Đi khám mắt định kỳ tại bệnh viện.',
    createdDate: '07/10/2026',
    status: 'rejected',
    statusLabel: 'Từ chối',
    approver: 'Hr',
    feedback: 'Lịch demo sprint BU2 trùng thời điểm, vui lòng đổi ngày khám.',
  },
]

describe('LeaveRequestManagement Test Suite (HR Leave Approval)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(operationsApi, 'fetchLeaveRequests').mockResolvedValue({
      ok: true,
      data: [...mockLeavesList],
    })
    vi.spyOn(operationsApi, 'approveLeaveRequest').mockResolvedValue({
      ok: true,
      data: { id: 'NP-002', status: 'approved' },
    })
    vi.spyOn(operationsApi, 'rejectLeaveRequest').mockResolvedValue({
      ok: true,
      data: { id: 'NP-002', status: 'rejected' },
    })
  })

  describe('1. Render & UI Structure', () => {
    it('render đầy đủ 4 thẻ KPI thống kê đơn xin nghỉ phép', async () => {
      render(<LeaveRequestManagement />)
      expect(await screen.findByText('Tổng số đơn xin nghỉ')).toBeInTheDocument()
      expect(screen.getByText('Đơn đang chờ duyệt')).toBeInTheDocument()
      expect(screen.getByText('Đơn đã phê duyệt')).toBeInTheDocument()
      expect(screen.getByText('Đơn đã từ chối')).toBeInTheDocument()
    })

    it('render đúng danh sách các cột tiêu đề của bảng lịch sử đơn xin nghỉ', async () => {
      render(<LeaveRequestManagement />)
      expect(await screen.findByRole('columnheader', { name: /Mã đơn/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Thực tập sinh/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Loại nghỉ/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Thời gian nghỉ/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Lý do xin nghỉ/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Ngày nộp/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Trạng thái/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Phản hồi của HR/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /Thao tác/i })).toBeInTheDocument()
    })

    it('hiển thị đúng mã đơn và dữ liệu thực tập sinh từ API', async () => {
      render(<LeaveRequestManagement />)
      expect(await screen.findByText('NP-001')).toBeInTheDocument()
      expect(screen.getByText('NP-002')).toBeInTheDocument()
      expect(screen.getByText('NP-003')).toBeInTheDocument()
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument()
    })
  })

  describe('2. Button Locking & Access Rule', () => {
    it('đơn đã duyệt hoặc đã từ chối không thể thao tác lại Duyệt/Từ chối mà chỉ hiển thị nút xem chi tiết', async () => {
      render(<LeaveRequestManagement />)
      const rowNp1 = await screen.findByRole('row', { name: /NP-001/i })
      // NP-001 đã approved: chỉ có nút xem chi tiết "Đã duyệt"
      expect(within(rowNp1).queryByRole('button', { name: /^Duyệt$/i })).not.toBeInTheDocument()
      expect(within(rowNp1).queryByRole('button', { name: /^Từ chối$/i })).not.toBeInTheDocument()
      expect(within(rowNp1).getByRole('button', { name: /Đã duyệt/i })).toBeInTheDocument()

      const rowNp3 = screen.getByRole('row', { name: /NP-003/i })
      // NP-003 đã rejected: chỉ có nút xem chi tiết "Đã từ chối"
      expect(within(rowNp3).queryByRole('button', { name: /^Duyệt$/i })).not.toBeInTheDocument()
      expect(within(rowNp3).queryByRole('button', { name: /^Từ chối$/i })).not.toBeInTheDocument()
      expect(within(rowNp3).getByRole('button', { name: /Đã từ chối/i })).toBeInTheDocument()
    })

    it('chỉ đơn pending mới có 2 nút thao tác "Duyệt" và "Từ chối"', async () => {
      render(<LeaveRequestManagement />)
      const rowNp2 = await screen.findByRole('row', { name: /NP-002/i })
      expect(within(rowNp2).getByRole('button', { name: /^Duyệt$/i })).toBeInTheDocument()
      expect(within(rowNp2).getByRole('button', { name: /^Từ chối$/i })).toBeInTheDocument()
    })
  })

  describe('3. Modal & Review Flow (Duyệt & Từ chối)', () => {
    it('kịch bản Duyệt đơn: mở Modal -> nhập ghi chú -> xác nhận -> gọi API approve -> cập nhật trạng thái', async () => {
      const user = userEvent.setup()
      render(<LeaveRequestManagement />)

      const rowNp2 = await screen.findByRole('row', { name: /NP-002/i })
      const approveBtn = within(rowNp2).getByRole('button', { name: /^Duyệt$/i })
      await user.click(approveBtn)

      // Modal hiển thị
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText(/Phê duyệt đơn xin nghỉ phép/i)).toBeInTheDocument()

      // Bấm Xác nhận duyệt đơn
      const confirmBtn = within(modal).getByRole('button', { name: /Xác nhận duyệt đơn/i })
      await user.click(confirmBtn)

      // Kiểm tra gọi API
      expect(operationsApi.approveLeaveRequest).toHaveBeenCalledWith(
        'NP-002',
        expect.stringContaining('Đã duyệt đơn nghỉ phép'),
      )

      // Sau khi duyệt, NP-002 chuyển thành "Đã duyệt" và các nút Duyệt/Từ chối bị khóa
      const updatedRow = await screen.findByRole('row', { name: /NP-002/i })
      expect(within(updatedRow).getAllByText('Đã duyệt').length).toBeGreaterThanOrEqual(1)
      expect(within(updatedRow).getByRole('button', { name: /Đã duyệt/i })).toBeInTheDocument()
      expect(within(updatedRow).queryByRole('button', { name: /^Duyệt$/i })).not.toBeInTheDocument()
      expect(within(updatedRow).queryByRole('button', { name: /^Từ chối$/i })).not.toBeInTheDocument()
    })

    it('kịch bản Từ chối đơn: mở Modal -> xóa trắng lý do -> kiểm tra validation -> nhập lý do -> gọi API reject', async () => {
      const user = userEvent.setup()
      render(<LeaveRequestManagement />)

      const rowNp2 = await screen.findByRole('row', { name: /NP-002/i })
      const rejectBtn = within(rowNp2).getByRole('button', { name: /^Từ chối$/i })
      await user.click(rejectBtn)

      // Modal từ chối hiển thị
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText(/Từ chối đơn xin nghỉ phép/i)).toBeInTheDocument()

      // Xóa trắng lý do
      const textarea = within(modal).getByRole('textbox')
      await user.clear(textarea)

      // Click xác nhận từ chối khi để trống -> báo lỗi
      const confirmRejectBtn = within(modal).getByRole('button', { name: /Xác nhận từ chối đơn/i })
      await user.click(confirmRejectBtn)
      expect(screen.getByText(/Vui lòng nhập lý do từ chối/i)).toBeInTheDocument()

      // Nhập lý do hợp lệ
      await user.type(textarea, 'Trùng lịch sprint review BU2')
      await user.click(confirmRejectBtn)

      // Kiểm tra gọi API
      expect(operationsApi.rejectLeaveRequest).toHaveBeenCalledWith('NP-002', 'Trùng lịch sprint review BU2')

      // Cập nhật trạng thái thành Từ chối
      const updatedRow = await screen.findByRole('row', { name: /NP-002/i })
      expect(within(updatedRow).getByText('Từ chối')).toBeInTheDocument()
      expect(updatedRow).toHaveClass('leave-row--rejected')
    })
  })

  describe('4. Search & Filter', () => {
    it('lọc danh sách theo trạng thái qua Select dropdown', async () => {
      const user = userEvent.setup()
      render(<LeaveRequestManagement />)

      await screen.findByText('NP-001')
      const filterSelect = screen.getByRole('combobox')

      // Chọn "Chờ phê duyệt"
      await user.selectOptions(filterSelect, 'pending')
      expect(screen.queryByText('NP-001')).not.toBeInTheDocument()
      expect(screen.getByText('NP-002')).toBeInTheDocument()
      expect(screen.queryByText('NP-003')).not.toBeInTheDocument()

      // Chọn "Đã từ chối"
      await user.selectOptions(filterSelect, 'rejected')
      expect(screen.queryByText('NP-001')).not.toBeInTheDocument()
      expect(screen.queryByText('NP-002')).not.toBeInTheDocument()
      expect(screen.getByText('NP-003')).toBeInTheDocument()
    })

    it('tìm kiếm theo tên hoặc mã sinh viên qua Search Input', async () => {
      const user = userEvent.setup()
      render(<LeaveRequestManagement />)

      await screen.findByText('NP-001')
      const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo mã đơn/i)

      await user.type(searchInput, 'Lê Hoàng Nam')
      expect(screen.queryByText('NP-001')).not.toBeInTheDocument()
      expect(screen.getByText('NP-002')).toBeInTheDocument()
      expect(screen.queryByText('NP-003')).not.toBeInTheDocument()
    })
  })
})
