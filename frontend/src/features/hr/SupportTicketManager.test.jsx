import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import SupportTicketManager from './SupportTicketManager'

const MOCK_TICKETS = [
  {
    id: 'TK-101',
    title: 'Xin cấp Giấy chứng nhận hoàn thành thực tập để nộp trường ICTU',
    sender: 'Nguyễn Văn An (TTS0001)',
    senderEmail: 'an.nv@ictu.edu.vn',
    createdAt: '2026-10-07 09:30',
    status: 'Pending',
    content: 'Em đã hoàn thành đủ số giờ thực tập và xin HR cấp Giấy chứng nhận.',
    response: '',
  },
  {
    id: 'TK-102',
    title: 'Cấp lại thẻ từ ra vào văn phòng và mở khóa VPN',
    sender: 'Trần Thị Bình (TTS0002)',
    senderEmail: 'binh.tt@ictu.edu.vn',
    createdAt: '2026-10-07 14:15',
    status: 'Pending',
    content: 'Em bị mất thẻ từ và tài khoản VPN bị tạm khóa, nhờ HR hỗ trợ cấp lại.',
    response: '',
  },
  {
    id: 'TK-103',
    title: 'Thắc mắc đối soát mức trợ cấp thực tập tháng 09/2026',
    sender: 'Lê Hoàng Nam (TTS0003)',
    senderEmail: 'nam.lh@ictu.edu.vn',
    createdAt: '2026-10-06 10:00',
    status: 'Approved',
    content: 'Em xin kiểm tra lại bảng chấm công tháng 9.',
    response: 'HR đã đối soát bảng công và chuyển khoản bổ sung.',
  },
  {
    id: 'TK-104',
    title: 'Đề xuất đổi ca thực tập cố định từ sáng sang chiều',
    sender: 'Phạm Minh Đức (TTS0004)',
    senderEmail: 'duc.pm@ictu.edu.vn',
    createdAt: '2026-10-05 16:45',
    status: 'Rejected',
    content: 'Do lịch học thay đổi, em xin chuyển sang ca chiều.',
    response: 'Ca chiều đã kín chỗ, đề nghị em trao đổi với Mentor.',
  },
]

describe('SupportTicketManager Test Suite', () => {
  let mockFetchTicketsApi
  let mockRespondTicketApi

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchTicketsApi = vi.fn().mockResolvedValue([...MOCK_TICKETS])
    mockRespondTicketApi = vi.fn().mockResolvedValue({ success: true })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 1. Giao diện chính & Bảng dữ liệu & Tabs lọc
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Giao diện chính & Tabs lọc trạng thái', () => {
    it('render đầy đủ các cột: Tiêu đề, Người gửi, Ngày gửi, Trạng thái, và Hành động', async () => {
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      expect(await screen.findByRole('columnheader', { name: /tiêu đề/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /người gửi/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /ngày gửi/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /trạng thái/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /hành động/i })).toBeInTheDocument()
    })

    it('render 4 Tabs lọc trạng thái: Tất cả, Chờ xử lý, Đã duyệt, Từ chối', async () => {
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      expect(await screen.findByRole('tab', { name: /tất cả/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /chờ xử lý/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /đã duyệt/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /từ chối/i })).toBeInTheDocument()
    })

    it('lọc dữ liệu chính xác khi chuyển đổi giữa các Tabs lọc', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Tab "Tất cả" mặc định hiển thị cả 4 ticket
      expect(await screen.findByTestId('stm-row-TK-101')).toBeInTheDocument()
      expect(screen.getByTestId('stm-row-TK-102')).toBeInTheDocument()
      expect(screen.getByTestId('stm-row-TK-103')).toBeInTheDocument()
      expect(screen.getByTestId('stm-row-TK-104')).toBeInTheDocument()

      // Chuyển sang Tab "Chờ xử lý"
      const pendingTab = screen.getByRole('tab', { name: /chờ xử lý/i })
      await user.click(pendingTab)
      expect(screen.getByTestId('stm-row-TK-101')).toBeInTheDocument()
      expect(screen.getByTestId('stm-row-TK-102')).toBeInTheDocument()
      expect(screen.queryByTestId('stm-row-TK-103')).not.toBeInTheDocument()
      expect(screen.queryByTestId('stm-row-TK-104')).not.toBeInTheDocument()

      // Chuyển sang Tab "Đã duyệt"
      const approvedTab = screen.getByRole('tab', { name: /đã duyệt/i })
      await user.click(approvedTab)
      expect(screen.getByTestId('stm-row-TK-103')).toBeInTheDocument()
      expect(screen.queryByTestId('stm-row-TK-101')).not.toBeInTheDocument()

      // Chuyển sang Tab "Từ chối"
      const rejectedTab = screen.getByRole('tab', { name: /từ chối/i })
      await user.click(rejectedTab)
      expect(screen.getByTestId('stm-row-TK-104')).toBeInTheDocument()
      expect(screen.queryByTestId('stm-row-TK-101')).not.toBeInTheDocument()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 2. Giao diện Modal xử lý & Validation
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Modal xử lý & Validation bắt buộc phản hồi khi Từ chối', () => {
    it('mở modal khi bấm "Xem chi tiết", hiển thị đúng nội dung yêu cầu TTS và ô textarea', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk101 = await screen.findByTestId('stm-row-TK-101')
      const viewBtn = within(rowTk101).getByRole('button', { name: /xem chi tiết/i })
      await user.click(viewBtn)

      // Modal hiển thị
      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()

      // Hiển thị nội dung yêu cầu của TTS
      expect(within(modal).getByTestId('ticket-description-content')).toHaveTextContent(
        'Em đã hoàn thành đủ số giờ thực tập và xin HR cấp Giấy chứng nhận.',
      )

      // Có textarea để HR nhập phản hồi
      const textarea = within(modal).getByRole('textbox', { name: /nội dung phản hồi của hr/i })
      expect(textarea).toBeInTheDocument()

      // Có 2 nút bấm: Duyệt yêu cầu (Xanh) và Từ chối (Đỏ)
      expect(within(modal).getByRole('button', { name: /duyệt yêu cầu/i })).toBeInTheDocument()
      expect(within(modal).getByRole('button', { name: /từ chối/i })).toBeInTheDocument()
    })

    it('bắt buộc nhập phản hồi vào textarea trước khi bấm "Từ chối" (Validation error)', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk101 = await screen.findByTestId('stm-row-TK-101')
      await user.click(within(rowTk101).getByRole('button', { name: /xem chi tiết/i }))

      const modal = screen.getByRole('dialog')
      const rejectBtn = within(modal).getByRole('button', { name: /từ chối/i })

      // Click "Từ chối" khi textarea rỗng
      await user.click(rejectBtn)

      // Hiển thị thông báo lỗi
      const alertMsg = screen.getByRole('alert')
      expect(alertMsg).toBeInTheDocument()
      expect(alertMsg).toHaveTextContent(/vui lòng nhập nội dung phản hồi \/ lý do trước khi từ chối yêu cầu/i)

      // Đảm bảo API KHÔNG được gọi
      expect(mockRespondTicketApi).not.toHaveBeenCalled()
    })

    it('không cho phép từ chối khi chỉ nhập toàn khoảng trắng', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      const rowTk101 = await screen.findByTestId('stm-row-TK-101')
      await user.click(within(rowTk101).getByRole('button', { name: /xem chi tiết/i }))

      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi của hr/i })
      await user.type(textarea, '     \n    \t  ')

      const rejectBtn = screen.getByRole('button', { name: /từ chối/i })
      await user.click(rejectBtn)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(mockRespondTicketApi).not.toHaveBeenCalled()
    })
  })

  /* ───────────────────────────────────────────────────────────────────────────
   * 3. Logic Đổi trạng thái, Đóng modal, Toast báo thành công & Cập nhật Badge
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Đổi trạng thái, Toast và Cập nhật Badge trên bảng', () => {
    it('khi duyệt yêu cầu thành công: gọi API, đóng modal, hiện toast và cập nhật badge Đã duyệt trên bảng', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Kiểm tra ban đầu TK-101 có badge Chờ xử lý
      const initialBadge = await screen.findByTestId('badge-pending-TK-101')
      expect(initialBadge).toHaveTextContent(/chờ xử lý/i)

      // Mở modal
      const rowTk101 = screen.getByTestId('stm-row-TK-101')
      await user.click(within(rowTk101).getByRole('button', { name: /xem chi tiết/i }))

      // Nhập phản hồi và bấm "Duyệt yêu cầu"
      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi của hr/i })
      await user.type(textarea, 'HR đã ký và đóng dấu giấy chứng nhận, mời em nhận tại phòng P201.')

      const approveBtn = screen.getByRole('button', { name: /duyệt yêu cầu/i })
      await user.click(approveBtn)

      // 1. Kiểm tra gọi API đúng tham số
      expect(mockRespondTicketApi).toHaveBeenCalledTimes(1)
      expect(mockRespondTicketApi).toHaveBeenCalledWith('TK-101', {
        status: 'Approved',
        response: 'HR đã ký và đóng dấu giấy chứng nhận, mời em nhận tại phòng P201.',
      })

      // 2. Modal đóng
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // 3. Hiển thị Toast thông báo thành công
      const toast = await screen.findByRole('status', { name: /thông báo thành công/i })
      expect(toast).toHaveTextContent(/duyệt yêu cầu "tk-101" thành công/i)

      // 4. Badge trạng thái của dòng TK-101 trong bảng được cập nhật sang "Đã duyệt"
      const updatedBadge = await screen.findByTestId('badge-approved-TK-101')
      expect(updatedBadge).toBeInTheDocument()
      expect(updatedBadge).toHaveTextContent(/đã duyệt/i)
    })

    it('khi từ chối yêu cầu thành công: gọi API, đóng modal, hiện toast và cập nhật badge Từ chối trên bảng', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Ban đầu TK-102 có badge Chờ xử lý
      expect(await screen.findByTestId('badge-pending-TK-102')).toBeInTheDocument()

      // Mở modal
      const rowTk102 = screen.getByTestId('stm-row-TK-102')
      await user.click(within(rowTk102).getByRole('button', { name: /xem chi tiết/i }))

      // Nhập lý do từ chối
      const textarea = screen.getByRole('textbox', { name: /nội dung phản hồi của hr/i })
      await user.type(textarea, 'Em cần làm đơn giải trình mất thẻ có chữ ký của Trưởng bộ phận.')

      // Bấm nút Từ chối
      const rejectBtn = screen.getByRole('button', { name: /từ chối/i })
      await user.click(rejectBtn)

      // 1. Kiểm tra gọi API
      expect(mockRespondTicketApi).toHaveBeenCalledTimes(1)
      expect(mockRespondTicketApi).toHaveBeenCalledWith('TK-102', {
        status: 'Rejected',
        response: 'Em cần làm đơn giải trình mất thẻ có chữ ký của Trưởng bộ phận.',
      })

      // 2. Modal đóng
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // 3. Hiển thị Toast thành công
      const toast = await screen.findByRole('status', { name: /thông báo thành công/i })
      expect(toast).toHaveTextContent(/từ chối yêu cầu "tk-102" thành công/i)

      // 4. Badge trạng thái của dòng TK-102 trong bảng đổi sang "Từ chối"
      const updatedBadge = await screen.findByTestId('badge-rejected-TK-102')
      expect(updatedBadge).toBeInTheDocument()
      expect(updatedBadge).toHaveTextContent(/từ chối/i)
    })

    it('khi ticket đã ở trạng thái Đã duyệt/Từ chối, modal khóa textarea và không hiển thị nút Duyệt/Từ chối', async () => {
      const user = userEvent.setup()
      render(
        <SupportTicketManager
          fetchTicketsApi={mockFetchTicketsApi}
          respondTicketApi={mockRespondTicketApi}
        />,
      )

      // Xem ticket TK-103 (đã duyệt)
      const rowTk103 = await screen.findByTestId('stm-row-TK-103')
      await user.click(within(rowTk103).getByRole('button', { name: /xem chi tiết/i }))

      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()

      // Không hiển thị 2 nút Duyệt/Từ chối
      expect(within(modal).queryByRole('button', { name: /duyệt yêu cầu/i })).not.toBeInTheDocument()
      expect(within(modal).queryByRole('button', { name: /từ chối/i })).not.toBeInTheDocument()

      // Textarea bị readonly / disabled
      const textarea = within(modal).getByRole('textbox', { name: /nội dung phản hồi của hr/i })
      expect(textarea).toHaveAttribute('readonly')

      // Hiển thị nhãn thông báo đã xử lý
      expect(within(modal).getByText(/yêu cầu đã hoàn tất xử lý/i)).toBeInTheDocument()
    })
  })
})

