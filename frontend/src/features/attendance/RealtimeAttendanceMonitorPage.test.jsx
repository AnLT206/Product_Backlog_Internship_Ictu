import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RealtimeAttendanceMonitorPage from './RealtimeAttendanceMonitorPage'
import {
  resetAttendanceEvents,
  clearAttendanceEvents,
  setConnectionStatus,
  stopRealtimeSimulation,
} from './attendanceMonitorService'

describe('RealtimeAttendanceMonitorPage - Màn hình Giám sát Chấm công Realtime', () => {
  beforeEach(() => {
    resetAttendanceEvents()
    vi.clearAllMocks()
  })

  afterEach(() => {
    stopRealtimeSimulation()
    vi.restoreAllMocks()
  })

  function renderPage(initialRoute = '/admin/attendance-monitor') {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <RealtimeAttendanceMonitorPage />
      </MemoryRouter>
    )
  }

  it('1. Render đầy đủ tiêu đề, breadcrumb và dải trạng thái kết nối Realtime Stream', async () => {
    renderPage()

    // Tiêu đề chính
    expect(
      screen.getByRole('heading', { name: /Giám sát Chấm công Thời gian thực/i })
    ).toBeInTheDocument()

    // Breadcrumb Admin Console
    expect(screen.getByText('Admin Console')).toBeInTheDocument()

    // Dải trạng thái kết nối
    const streamStrip = screen.getByLabelText('Trạng thái kết nối realtime')
    expect(within(streamStrip).getByText(/Đang kết nối Realtime/i)).toBeInTheDocument()
    expect(within(streamStrip).getByTestId('status-dot-connected')).toBeInTheDocument()
  })

  it('2. Render chính xác 5 thẻ KPI thống kê chấm công trong ngày', async () => {
    renderPage()

    const kpiSection = screen.getByLabelText('Chỉ số chấm công hôm nay')
    expect(within(kpiSection).getByText(/Tổng lượt quẹt hôm nay/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/Vào ca \(Check-in\)/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/Tan ca \(Check-out\)/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/Lượt quẹt lỗi \/ Cảnh báo/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/2 Cổng IoT/i)).toBeInTheDocument()
  })

  it('3. Render bảng luồng sự kiện quẹt thẻ với đầy đủ các cột và các dòng dữ liệu mẫu', async () => {
    renderPage()

    // Kiểm tra các cột tiêu đề
    expect(screen.getByText('Thời gian')).toBeInTheDocument()
    expect(screen.getByText('Thực tập sinh')).toBeInTheDocument()
    expect(screen.getByText('Mã TTS')).toBeInTheDocument()
    expect(screen.getByText('Sự kiện')).toBeInTheDocument()
    expect(screen.getByText('Phương thức')).toBeInTheDocument()
    expect(screen.getByText('Thiết bị / Cổng')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái & Phản hồi')).toBeInTheDocument()

    // Kiểm tra dữ liệu thực tập sinh mẫu
    expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('TTS0001').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Lê Hoàng Nam').length).toBeGreaterThanOrEqual(1)
  })

  it('4. Tìm kiếm sự kiện theo tên hoặc mã thực tập sinh', async () => {
    const user = userEvent.setup()
    renderPage()

    const searchInput = screen.getByPlaceholderText(/Tìm theo họ tên, mã TTS, thiết bị, IP/i)
    await user.type(searchInput, 'Lê Hoàng Nam')

    await waitFor(() => {
      expect(screen.getAllByText('Lê Hoàng Nam').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText('Trần Thị Mai Phương')).not.toBeInTheDocument()
    })
  })

  it('5. Lọc danh sách theo loại sự kiện (Vào ca vs Tan ca)', async () => {
    const user = userEvent.setup()
    renderPage()

    const eventSelect = screen.getByLabelText('Lọc theo loại sự kiện')
    await user.selectOptions(eventSelect, 'check_out')

    await waitFor(() => {
      // Chỉ còn các sự kiện Check-out (Tan ca)
      expect(screen.getAllByText('Tan ca').length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText('Vào ca')).not.toBeInTheDocument()
    })
  })

  it('6. Lọc danh sách theo phương thức xác thực (Mã QR vs Thẻ RFID)', async () => {
    const user = userEvent.setup()
    renderPage()

    const methodSelect = screen.getByLabelText('Lọc theo phương thức')
    await user.selectOptions(methodSelect, 'rfid')

    await waitFor(() => {
      expect(screen.getAllByText('Thẻ RFID').length).toBeGreaterThanOrEqual(1)
      expect(within(screen.getByRole('table')).queryByText('Mã QR')).not.toBeInTheDocument()
    })
  })

  it('7. Kích hoạt nút "Mô phỏng quẹt thẻ ngay": thêm sự kiện mới lên đầu bảng và tăng tổng số lượt quẹt', async () => {
    const user = userEvent.setup()
    renderPage()

    const initialTotal = within(screen.getByTestId('kpi-total-swipes')).getByText(/\d+/).textContent

    // Bấm nút mô phỏng quẹt thẻ
    const simulateBtn = screen.getByTestId('simulate-swipe-btn')
    await user.click(simulateBtn)

    await waitFor(() => {
      const newTotal = within(screen.getByTestId('kpi-total-swipes')).getByText(/\d+/).textContent
      expect(Number(newTotal)).toBe(Number(initialTotal) + 1)
      // Xuất hiện badge "Vừa quẹt"
      expect(screen.getAllByText('Vừa quẹt').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('8. Thao tác Tạm dừng và Tiếp tục nhận luồng sự kiện realtime', async () => {
    const user = userEvent.setup()
    renderPage()

    const toggleBtn = screen.getByTestId('toggle-pause-btn')
    expect(toggleBtn).toHaveTextContent(/Tạm dừng stream/i)

    // Bấm tạm dừng
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(toggleBtn).toHaveTextContent(/Tiếp tục nhận stream/i)
      expect(screen.getByText(/Đang tạm dừng:/i)).toBeInTheDocument()
    })

    // Bấm tiếp tục
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(toggleBtn).toHaveTextContent(/Tạm dừng stream/i)
      expect(screen.queryByText(/Đang tạm dừng:/i)).not.toBeInTheDocument()
    })
  })

  it('9. Mở Modal xem chi tiết sự kiện quẹt thẻ khi bấm nút "Chi tiết"', async () => {
    const user = userEvent.setup()
    renderPage()

    // Bấm nút Chi tiết ở dòng đầu tiên
    const detailBtns = screen.getAllByRole('button', { name: /Chi tiết/i })
    await user.click(detailBtns[0])

    // Modal hiển thị
    expect(await screen.findByText(/Chi tiết Lượt Quẹt thẻ Chấm công/i)).toBeInTheDocument()
    expect(screen.getByText(/Loại sự kiện:/i)).toBeInTheDocument()
    expect(screen.getByText(/Chống dội quét quẹt thẻ < 60s/i)).toBeInTheDocument()

    // Đóng modal
    const closeBtn = screen.getByTestId('event-modal-close-btn')
    await user.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Chi tiết Lượt Quẹt thẻ Chấm công/i)).not.toBeInTheDocument()
    })
  })

  it('10. Xử lý trạng thái Mất kết nối (Disconnected) và Kết nối lại (Reconnected)', async () => {
    const user = userEvent.setup()
    renderPage()

    // Bấm nút thử ngắt kết nối
    const disconnectBtn = screen.getByRole('button', { name: /Thử ngắt kết nối/i })
    await user.click(disconnectBtn)

    await waitFor(() => {
      expect(screen.getByText(/Cảnh báo mất kết nối:/i)).toBeInTheDocument()
      expect(screen.getByTestId('status-dot-disconnected')).toBeInTheDocument()
    })

    // Bấm nút kết nối lại
    const reconnectBtn = screen.getByTestId('reconnect-btn')
    await user.click(reconnectBtn)

    await waitFor(() => {
      expect(screen.getByText(/Đang kết nối Realtime/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('11. Hiển thị Empty state khi bộ lọc không khớp với dữ liệu', async () => {
    const user = userEvent.setup()
    renderPage()

    const searchInput = screen.getByPlaceholderText(/Tìm theo họ tên, mã TTS, thiết bị, IP/i)
    await user.type(searchInput, 'Không tồn tại abcxyz 9999')

    await waitFor(() => {
      expect(screen.getByText(/Chưa có lượt chấm công nào/i)).toBeInTheDocument()
      expect(screen.getByText(/Không tìm thấy sự kiện quẹt thẻ nào phù hợp/i)).toBeInTheDocument()
    })
  })

  it('12. Hiển thị đúng breadcrumb khi truy cập từ phân hệ HR (/hr/attendance-monitor)', async () => {
    renderPage('/hr/attendance-monitor')

    expect(screen.getByText(/Phân hệ Nhân sự \(HR\)/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Giám sát Chấm công Thời gian thực/i })
    ).toBeInTheDocument()
  })
})
