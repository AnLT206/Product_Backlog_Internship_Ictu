import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminInternQrPage from './AdminInternQrPage'
import { resetInternQrMockData } from './adminInternQrMock'

describe('AdminInternQrPage - Giao diện Quản lý Mã QR Chấm công Thực tập sinh', () => {
  beforeEach(() => {
    resetInternQrMockData()
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <AdminInternQrPage />
      </MemoryRouter>
    )
  }

  it('1. Render đầy đủ tiêu đề, mô tả và 4 thẻ KPI tổng quan', async () => {
    renderPage()

    // Kiểm tra tiêu đề chính
    expect(
      await screen.findByRole('heading', { name: /Mã QR Chấm công Thực tập sinh/i })
    ).toBeInTheDocument()

    // Kiểm tra mô tả
    expect(
      screen.getByText(/Tạo, quản lý và in mã QR định danh cá nhân cho từng thực tập sinh/i)
    ).toBeInTheDocument()

    // Kiểm tra các thẻ KPI
    const kpiSection = screen.getByLabelText('Thống kê mã QR')
    expect(within(kpiSection).getByText(/Tổng số thực tập sinh/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/Đã có mã QR \(Hoạt động\)/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/^Chưa có mã QR$/i)).toBeInTheDocument()
    expect(within(kpiSection).getByText(/2 Cổng IoT/i)).toBeInTheDocument()
  })

  it('2. Render bảng danh sách thực tập sinh với đầy đủ các cột và dữ liệu mẫu', async () => {
    renderPage()

    // Chờ danh sách tải xong
    expect(await screen.findByText('TTS0001')).toBeInTheDocument()

    // Kiểm tra các cột tiêu đề
    expect(screen.getByText('Mã TTS')).toBeInTheDocument()
    expect(screen.getByText('Thực tập sinh')).toBeInTheDocument()
    expect(screen.getByText('Bộ phận / Phòng ban')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái mã QR')).toBeInTheDocument()
    expect(screen.getByText('Chuỗi định danh QR')).toBeInTheDocument()
    expect(screen.getByText('Hành động')).toBeInTheDocument()

    // Kiểm tra các thực tập sinh mẫu
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('TTS0002')).toBeInTheDocument()
    expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument()
    expect(screen.getByText('TTS0003')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị Mai Phương')).toBeInTheDocument()
  })

  it('3. Hiển thị đúng trạng thái mã QR ("Đã có mã QR" vs "Chưa có mã QR") và các nút thao tác tương ứng', async () => {
    renderPage()

    await screen.findByText('TTS0001')

    // TTS0001 đã có QR
    const badgeHasQr1 = screen.getByTestId('badge-has-qr-TTS0001')
    expect(badgeHasQr1).toBeInTheDocument()
    expect(badgeHasQr1).toHaveTextContent('Đã có mã QR')
    expect(screen.getByTestId('view-qr-btn-TTS0001')).toBeInTheDocument()
    expect(screen.getByTestId('print-qr-btn-TTS0001')).toBeInTheDocument()

    // TTS0003 chưa có QR
    const badgeNoQr3 = screen.getByTestId('badge-no-qr-TTS0003')
    expect(badgeNoQr3).toBeInTheDocument()
    expect(badgeNoQr3).toHaveTextContent('Chưa có mã QR')
    expect(screen.getByTestId('create-qr-btn-TTS0003')).toBeInTheDocument()
  })

  it('4. Tìm kiếm thực tập sinh theo họ tên hoặc mã TTS', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    const searchInput = screen.getByPlaceholderText(/Tìm theo họ tên, mã TTS, email/i)
    await user.type(searchInput, 'Lê Hoàng Nam')

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument()
      expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument()
      expect(screen.queryByText('Trần Thị Mai Phương')).not.toBeInTheDocument()
    })
  })

  it('5. Lọc danh sách theo trạng thái mã QR (Tất cả, Đã có QR, Chưa có QR)', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    // Click nút pill "Chưa có QR"
    const noQrPill = screen.getByRole('tab', { name: /Chưa có QR/i })
    await user.click(noQrPill)

    await waitFor(() => {
      expect(screen.getByText('TTS0003')).toBeInTheDocument()
      expect(screen.getByText('TTS0004')).toBeInTheDocument()
      expect(screen.queryByText('TTS0001')).not.toBeInTheDocument()
      expect(screen.queryByText('TTS0002')).not.toBeInTheDocument()
    })

    // Click nút pill "Đã có QR"
    const hasQrPill = screen.getByRole('tab', { name: /Đã có QR/i })
    await user.click(hasQrPill)

    await waitFor(() => {
      expect(screen.getByText('TTS0001')).toBeInTheDocument()
      expect(screen.getByText('TTS0002')).toBeInTheDocument()
      expect(screen.queryByText('TTS0003')).not.toBeInTheDocument()
    })
  })

  it('6. Thực hiện Tạo mã QR cho thực tập sinh chưa có QR: cập nhật trạng thái thành "Đã có mã QR"', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0003')

    // Trước khi tạo: TTS0003 có nút "Tạo mã QR"
    const createBtn = screen.getByTestId('create-qr-btn-TTS0003')
    expect(createBtn).toBeInTheDocument()

    // Bấm tạo mã QR
    await user.click(createBtn)

    // Sau khi tạo thành công: chuyển sang "Đã có mã QR" và xuất hiện nút "Xem QR"
    await waitFor(() => {
      expect(screen.getByTestId('badge-has-qr-TTS0003')).toBeInTheDocument()
      expect(screen.getByTestId('view-qr-btn-TTS0003')).toBeInTheDocument()
      expect(screen.queryByTestId('create-qr-btn-TTS0003')).not.toBeInTheDocument()
    })
  })

  it('7. Mở Modal xem mã QR chi tiết, hiển thị avatar, thẻ PVC, mã QR SVG và đóng modal', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    // Bấm nút Xem QR
    const viewBtn = screen.getByTestId('view-qr-btn-TTS0001')
    await user.click(viewBtn)

    // Modal xuất hiện
    expect(await screen.findByText(/Mã QR Chấm công Cá nhân/i)).toBeInTheDocument()
    expect(screen.getByText(/THẺ CHẤM CÔNG IoT/i)).toBeInTheDocument()
    expect(screen.getAllByText('intern:TTS0001:1').length).toBeGreaterThanOrEqual(1)

    // Kiểm tra có mã QR SVG
    const qrSvg = screen.getByRole('img', { name: /Mã QR chấm công của Nguyễn Văn An/i })
    expect(qrSvg).toBeInTheDocument()

    // Đóng modal qua nút X
    const closeBtn = screen.getByTestId('modal-close-icon-btn')
    await user.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Mã QR Chấm công Cá nhân/i)).not.toBeInTheDocument()
    })
  })

  it('8. Nút "In mã QR này" trong modal gọi cơ chế in của trình duyệt (window.print)', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    // Mở modal
    await user.click(screen.getByTestId('view-qr-btn-TTS0001'))

    // Tìm nút In trong modal
    const printBtn = await screen.findByTestId('modal-print-btn')
    expect(printBtn).toBeInTheDocument()

    await user.click(printBtn)

    expect(window.print).toHaveBeenCalled()
  })

  it('9. Chọn nhiều thực tập sinh và mở Modal In thẻ QR hàng loạt', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    // Bấm nút "In thẻ QR hàng loạt" trên header
    const batchPrintBtn = screen.getByTestId('batch-print-btn')
    await user.click(batchPrintBtn)

    // Modal in hàng loạt xuất hiện
    expect(await screen.findByText(/In Thẻ QR Điểm danh Hàng loạt/i)).toBeInTheDocument()
    const startBatchPrintBtn = screen.getByTestId('start-batch-print-btn')
    expect(startBatchPrintBtn).toBeInTheDocument()

    await user.click(startBatchPrintBtn)
    expect(window.print).toHaveBeenCalled()
  })

  it('10. Hiển thị Empty state khi tìm kiếm không có kết quả', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('TTS0001')

    const searchInput = screen.getByPlaceholderText(/Tìm theo họ tên, mã TTS, email/i)
    await user.type(searchInput, 'Không tồn tại abcxyz 9999')

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy thực tập sinh/i)).toBeInTheDocument()
    })
  })
})
