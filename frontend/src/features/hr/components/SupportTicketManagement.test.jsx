import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import SupportTicketManagement from './SupportTicketManagement'

/* ─────────────────────────────────────────────────────────────────────────────
 * 0. MOCK DATA FIXTURES
 * ──────────────────────────────────────────────────────────────────────────── */
const mockTicketsList = [
  {
    id: 'TK-001',
    title: 'Xin cấp lại thẻ ra vào tòa nhà công ty',
    senderName: 'TTS (TTS0001)',
    category: 'Cơ sở vật chất',
    status: 'Pending',
    createdAt: '2026-10-06 09:30',
    description: 'Em bị rơi mất thẻ từ ra vào văn phòng, xin HR cấp lại thẻ mới.',
    responseContent: '',
  },
  {
    id: 'TK-002',
    title: 'Xin giấy xác nhận thực tập nộp nhà trường',
    senderName: 'Trần Thị Bình',
    category: 'Giấy tờ hành chính',
    status: 'Pending',
    createdAt: '2026-10-06 14:15',
    description: 'Em cần giấy xác nhận số giờ thực tập để hoàn tất học phần tốt nghiệp.',
    responseContent: '',
  },
  {
    id: 'TK-003',
    title: 'Thắc mắc về mức trợ cấp tháng 9',
    senderName: 'Lê Hoàng Nam',
    category: 'Chế độ phụ cấp',
    status: 'Approved',
    createdAt: '2026-10-05 11:00',
    description: 'Em xin kiểm tra lại phụ cấp chuyên cần tháng 9.',
    responseContent: 'HR đã đối soát bảng công và chuyển khoản bổ sung.',
  },
]

describe('SupportTicketManagement Integration Test Suite', () => {
  let mockFetchTicketsApi
  let mockRespondTicketApi

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchTicketsApi = vi.fn().mockResolvedValue([...mockTicketsList])
    mockRespondTicketApi = vi.fn().mockResolvedValue({ success: true })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. VALIDATION & MODAL CONTROLS
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Validation & Modal Controls', () => {
    it('mở Modal chi tiết khi click "Xem chi tiết" và đóng Modal khi bấm nút "Đóng"', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Chờ bảng render xong và tìm ticket TK-001
      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      const detailBtn = within(rowTk1).getByRole('button', { name: /xem chi tiết/i })
      await user.click(detailBtn)

      // Modal xuất hiện
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText('Xin cấp lại thẻ ra vào tòa nhà công ty')).toBeInTheDocument()

      // Bấm nút "Đóng" ở footer modal
      const closeBtn = within(modal).getByRole('button', { name: /^đóng$/i })
      await user.click(closeBtn)

      // Modal biến mất khỏi DOM
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('không cho submit và hiển thị validation lỗi nếu bấm "Từ chối" mà chưa nhập lý do', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))

      const modal = screen.getByRole('dialog')
      const rejectBtn = within(modal).getByRole('button', { name: /từ chối/i })

      // Click "Từ chối" khi textarea đang trống
      await user.click(rejectBtn)

      // Thông báo lỗi xuất hiện
      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveTextContent(/vui lòng nhập lý do từ chối/i)

      // Đảm bảo API KHÔNG hề được gọi
      expect(mockRespondTicketApi).not.toHaveBeenCalled()
    })

    it('không cho submit khi chỉ nhập khoảng trắng (space / enter / whitespace)', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))

      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi/i })
      // Nhập chuỗi chỉ gồm dấu cách và xuống dòng
      await user.type(textarea, '   \n   \t  ')

      const rejectBtn = screen.getByRole('button', { name: /từ chối/i })
      await user.click(rejectBtn)

      // Validation bắt lỗi thành công
      expect(screen.getByRole('alert')).toHaveTextContent(/vui lòng nhập lý do từ chối/i)
      expect(mockRespondTicketApi).not.toHaveBeenCalled()
    })

    it('khi ticket đã ở trạng thái Approved hoặc Rejected, Modal chi tiết không hiển thị nút Duyệt và Từ chối, textarea ở chế độ chỉ đọc', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Chuyển sang tab "Đã duyệt" để xem ticket TK-003 (status: Approved)
      const approvedTab = await screen.findByRole('tab', { name: /đã duyệt/i })
      await user.click(approvedTab)

      const rowTk3 = await screen.findByRole('row', { name: /TK-003/i })
      await user.click(within(rowTk3).getByRole('button', { name: /xem chi tiết/i }))

      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()

      // 1. Không hiển thị các nút Duyệt và Từ chối
      expect(within(modal).queryByRole('button', { name: /duyệt/i })).not.toBeInTheDocument()
      expect(within(modal).queryByRole('button', { name: /từ chối/i })).not.toBeInTheDocument()

      // 2. Nút Đóng vẫn có để đóng modal
      expect(within(modal).getByRole('button', { name: /^đóng$/i })).toBeInTheDocument()

      // 3. Textarea bị vô hiệu hóa hoặc chỉ đọc
      const textarea = within(modal).getByRole('textbox', { name: /nội dung phản hồi/i })
      expect(textarea).toBeDisabled()

      // 4. Có thông báo trạng thái yêu cầu đã được xử lý
      expect(within(modal).getByText(/yêu cầu này đã được/i)).toBeInTheDocument()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. HAPPY PATH (Duyệt & Từ chối thành công)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Happy Path (Duyệt & Từ chối thành công)', () => {
    it('kịch bản Duyệt: mở modal -> nhập phản hồi -> bấm "Duyệt" -> gọi API đúng payload -> đóng modal & hiển thị toast', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))

      // Nhập nội dung duyệt
      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi/i })
      await user.type(textarea, 'HR đã cấp lại thẻ mới. Mời em qua phòng 302 nhận thẻ.')

      // Bấm nút "Duyệt"
      const approveBtn = screen.getByRole('button', { name: /duyệt/i })
      await user.click(approveBtn)

      // 1. Kiểm tra API được gọi với đúng payload
      expect(mockRespondTicketApi).toHaveBeenCalledTimes(1)
      expect(mockRespondTicketApi).toHaveBeenCalledWith('TK-001', {
        status: 'Approved',
        response: 'HR đã cấp lại thẻ mới. Mời em qua phòng 302 nhận thẻ.',
      })

      // 2. Modal đóng
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // 3. Hiển thị Toast thông báo thành công
      const toast = await screen.findByRole('status', { name: /thông báo thành công/i })
      expect(toast).toHaveTextContent(/cập nhật phản hồi ticket tk-001 thành công/i)
    })

    it('kịch bản Từ chối: mở modal -> nhập lý do -> bấm "Từ chối" -> gọi API status Rejected', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk2 = await screen.findByRole('row', { name: /TK-002/i })
      await user.click(within(rowTk2).getByRole('button', { name: /xem chi tiết/i }))

      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi/i })
      await user.type(textarea, 'Em cần bổ sung chữ ký xác nhận của Mentor trước khi HR đóng dấu.')

      const rejectBtn = screen.getByRole('button', { name: /từ chối/i })
      await user.click(rejectBtn)

      expect(mockRespondTicketApi).toHaveBeenCalledWith('TK-002', {
        status: 'Rejected',
        response: 'Em cần bổ sung chữ ký xác nhận của Mentor trước khi HR đóng dấu.',
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await screen.findByRole('status', { name: /thông báo thành công/i })).toHaveTextContent(/thành công/i)
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. INSTANT UI STATE UPDATE & FILTER TAB
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Instant UI State Update & Filter Tab', () => {
    it('khi đang đứng ở tab "Pending", duyệt 1 ticket xong -> ticket lập tức biến mất khỏi DOM; chuyển sang tab "Approved" -> xuất hiện ticket đó', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Đang ở tab "Pending" (mặc định)
      expect(await screen.findByRole('row', { name: /TK-001/i })).toBeInTheDocument()
      expect(screen.getByRole('row', { name: /TK-002/i })).toBeInTheDocument()

      // Thực hiện Duyệt ticket TK-001
      const rowTk1 = screen.getByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))
      await user.type(screen.getByRole('textbox', { name: /nội dung phản hồi/i }), 'Đã xử lý xong')
      await user.click(screen.getByRole('button', { name: /duyệt/i }))

      // 1. Ticket TK-001 LẬP TỨC biến mất khỏi danh sách của tab "Pending"
      expect(screen.queryByRole('row', { name: /TK-001/i })).not.toBeInTheDocument()
      // TK-002 vẫn còn
      expect(screen.getByRole('row', { name: /TK-002/i })).toBeInTheDocument()

      // 2. Chuyển sang tab "Đã duyệt" (Approved)
      const approvedTab = screen.getByRole('tab', { name: /đã duyệt/i })
      await user.click(approvedTab)

      // 3. Ticket TK-001 xuất hiện ở tab "Approved" với badge trạng thái Đã duyệt
      const approvedRowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      expect(approvedRowTk1).toBeInTheDocument()
      expect(within(approvedRowTk1).getByText(/đã duyệt/i)).toBeInTheDocument()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 4. ERROR HANDLING (Xử lý sự cố mạng & Double-click)
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Error Handling (Xử lý sự cố mạng/API)', () => {
    it('khi API trả về lỗi 500/403 -> Modal vẫn mở, hiển thị Toast lỗi, dữ liệu bảng cũ không bị sai lệch', async () => {
      const user = userEvent.setup()
      // Giả lập API ném lỗi 500
      mockRespondTicketApi.mockRejectedValueOnce(
        new Error('Lỗi máy chủ (500): Không thể cập nhật trạng thái ticket.'),
      )

      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))

      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi/i })
      await user.type(textarea, 'Nội dung phản hồi thử nghiệm')
      await user.click(screen.getByRole('button', { name: /duyệt/i }))

      // 1. Modal VẪN MỞ để không mất nội dung người dùng vừa gõ
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Nội dung phản hồi thử nghiệm')).toBeInTheDocument()

      // 2. Hiển thị Toast thông báo lỗi với role="alert"
      const errorToast = await screen.findByRole('alert', { name: /thông báo lỗi/i })
      expect(errorToast).toHaveTextContent(/lỗi máy chủ \(500\)/i)

      // 3. Đóng modal và kiểm tra ticket ở bảng vẫn giữ nguyên trạng thái Pending
      await user.click(screen.getByRole('button', { name: /^đóng$/i }))
      const sameRowTk1 = screen.getByRole('row', { name: /TK-001/i })
      expect(within(sameRowTk1).getByText(/chờ duyệt/i)).toBeInTheDocument()
    })

    it('disable nút Duyệt và Từ chối trong lúc đang gửi request để chống spam click', async () => {
      const user = userEvent.setup()

      // Tạo một promise bị treo để kiểm tra trạng thái isSubmitting
      let resolvePromise
      mockRespondTicketApi.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
      )

      render(
        <SupportTicketManagement
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk1 = await screen.findByRole('row', { name: /TK-001/i })
      await user.click(within(rowTk1).getByRole('button', { name: /xem chi tiết/i }))

      const approveBtn = screen.getByRole('button', { name: /duyệt/i })
      const rejectBtn = screen.getByRole('button', { name: /từ chối/i })
      const closeBtn = screen.getByRole('button', { name: /^đóng$/i })

      // Click Duyệt -> Bắt đầu gửi request
      await user.click(approveBtn)

      // Trong lúc pending: Cả nút Duyệt, Từ chối và Đóng đều bị disable
      expect(approveBtn).toBeDisabled()
      expect(rejectBtn).toBeDisabled()
      expect(closeBtn).toBeDisabled()

      // Resolve promise để kết thúc request và chờ state update hoàn tất
      resolvePromise({ success: true })
      await screen.findByRole('status', { name: /thông báo thành công/i })
    })
  })
})
