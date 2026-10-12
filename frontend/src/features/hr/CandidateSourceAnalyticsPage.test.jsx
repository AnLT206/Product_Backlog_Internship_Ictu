import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CandidateSourceAnalyticsPage from './CandidateSourceAnalyticsPage'
import * as programsApi from '../../api/programs'
import * as reportsApi from '../../api/reports'

function renderWithRouter(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

const MOCK_PROGRAMS = [
  { id: 1, name: 'Kỳ thực tập Hè 2026', status: 'open' },
  { id: 2, name: 'Kỳ thực tập Thu 2025', status: 'closed' },
]

const MOCK_ALL_STATS = {
  total_interns: 102,
  by_university: [
    { name: 'ICTU', count: 35, percentage: 34.3 },
    { name: 'Đại học Thái Nguyên', count: 24, percentage: 23.5 },
    { name: 'Đại học Kinh tế Quốc dân', count: 18, percentage: 17.6 },
    { name: 'Đại học Bách khoa Hà Nội', count: 15, percentage: 14.7 },
    { name: 'Đại học Công nghiệp Hà Nội', count: 10, percentage: 9.8 },
  ],
  by_major: [
    { name: 'Công nghệ phần mềm', count: 40, percentage: 39.2 },
    { name: 'Hệ thống thông tin', count: 25, percentage: 24.5 },
    { name: 'Khoa học máy tính', count: 20, percentage: 19.6 },
    { name: 'Mạng máy tính', count: 10, percentage: 9.8 },
    { name: 'Khác', count: 7, percentage: 6.9 },
  ],
}

const MOCK_FILTERED_STATS = {
  total_interns: 40,
  by_university: [
    { name: 'ICTU', count: 28, percentage: 70.0 },
    { name: 'Đại học Thái Nguyên', count: 12, percentage: 30.0 },
  ],
  by_major: [
    { name: 'Công nghệ phần mềm', count: 25, percentage: 62.5 },
    { name: 'Hệ thống thông tin', count: 15, percentage: 37.5 },
  ],
}

describe('CandidateSourceAnalyticsPage Component Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(programsApi, 'getPrograms').mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_PROGRAMS,
    })
    vi.spyOn(reportsApi, 'getCandidateSourceStats').mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_ALL_STATS,
    })
  })

  it('1. Render đầy đủ Header, tiêu đề, breadcrumb và dropdown bộ lọc kỳ thực tập', async () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /Phân tích nguồn ứng viên/i })).toBeInTheDocument()
    expect(screen.getByText(/Thống kê số lượng thực tập sinh theo trường và ngành/i)).toBeInTheDocument()
    expect(screen.getByText(/PHÂN TÍCH TUYỂN DỤNG/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /HR Dashboard/i })).toBeInTheDocument()

    // Kiểm tra dropdown kỳ thực tập được nạp từ API
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Chọn kỳ thực tập để lọc/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Tất cả các đợt thực tập/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Kỳ thực tập Hè 2026' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Kỳ thực tập Thu 2025' })).toBeInTheDocument()
    })
  })

  it('2. Render chính xác 3 thẻ KPI tổng quan với dữ liệu từ API', async () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    await waitFor(() => {
      const totalCard = document.querySelector('.csa-kpi-card--blue')
      expect(within(totalCard).getByText('102')).toBeInTheDocument()

      const uniCard = document.querySelector('.csa-kpi-card--green')
      expect(within(uniCard).getByText('5')).toBeInTheDocument()

      const majorCard = document.querySelector('.csa-kpi-card--purple')
      expect(within(majorCard).getByText('5')).toBeInTheDocument()
    })

    expect(screen.getByText(/Tổng thực tập sinh/i)).toBeInTheDocument()
    expect(screen.getByText(/Số trường/i)).toBeInTheDocument()
    expect(screen.getByText(/Số ngành/i)).toBeInTheDocument()
  })

  it('3. Render Bar Chart theo trường và Pie Chart theo ngành với dữ liệu API', async () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Thực tập sinh theo trường/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: /Thực tập sinh theo ngành/i })).toBeInTheDocument()
    })

    const barList = document.querySelector('.csa-bar-list')
    expect(barList).toBeInTheDocument()

    // 5 trường từ API
    expect(within(barList).getByText('ICTU')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Thái Nguyên')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Kinh tế Quốc dân')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Bách khoa Hà Nội')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Công nghiệp Hà Nội')).toBeInTheDocument()

    // SVG Pie chart
    const svgChart = screen.getByRole('img', { name: /Biểu đồ tròn phân bổ thực tập sinh theo chuyên ngành/i })
    expect(svgChart).toBeInTheDocument()

    const legend = document.querySelector('.csa-pie-legend')
    expect(legend).toBeInTheDocument()
    expect(within(legend).getByText('Công nghệ phần mềm')).toBeInTheDocument()
    expect(within(legend).getByText('Hệ thống thông tin')).toBeInTheDocument()
  })

  it('4. Khi HR chọn một đợt thực tập, API được gọi lại với ID tương ứng và vẽ lại biểu đồ', async () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    // Đợi nạp xong ban đầu và options kỳ thực tập xuất hiện
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Kỳ thực tập Hè 2026' })).toBeInTheDocument()
      const totalCard = document.querySelector('.csa-kpi-card--blue')
      expect(within(totalCard).getByText('102')).toBeInTheDocument()
    })

    // Cập nhật mock cho lần gọi tiếp theo khi chọn đợt 1
    vi.spyOn(reportsApi, 'getCandidateSourceStats').mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_FILTERED_STATS,
    })

    const select = screen.getByRole('combobox', { name: /Chọn kỳ thực tập để lọc/i })
    fireEvent.change(select, { target: { value: '1' } })

    // Kiểm tra API getCandidateSourceStats được gọi với tham số programId = 1
    await waitFor(() => {
      expect(reportsApi.getCandidateSourceStats).toHaveBeenCalledWith(1)
    })

    // Dữ liệu mới đã được cập nhật
    await waitFor(() => {
      const totalCard = document.querySelector('.csa-kpi-card--blue')
      expect(within(totalCard).getByText('40')).toBeInTheDocument()
    })

    const barList = document.querySelector('.csa-bar-list')
    expect(within(barList).getByText('ICTU')).toBeInTheDocument()
    expect(within(barList).getByText('28')).toBeInTheDocument()
    expect(within(barList).queryByText('Đại học Kinh tế Quốc dân')).not.toBeInTheDocument()
  })

  it('5. Hiển thị thông báo lỗi và cho phép thử lại khi gọi API thất bại', async () => {
    vi.spyOn(reportsApi, 'getCandidateSourceStats').mockRejectedValue(new Error('Network error'))

    renderWithRouter(<CandidateSourceAnalyticsPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Lỗi kết nối máy chủ/i)).toBeInTheDocument()
    })

    // Khi bấm nút thử lại: mock API trả về thành công
    vi.spyOn(reportsApi, 'getCandidateSourceStats').mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_ALL_STATS,
    })

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      const totalCard = document.querySelector('.csa-kpi-card--blue')
      expect(within(totalCard).getByText('102')).toBeInTheDocument()
    })
  })

  it('6. Hiển thị trạng thái trống (empty state) an toàn khi kỳ thực tập chưa có dữ liệu', async () => {
    vi.spyOn(reportsApi, 'getCandidateSourceStats').mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        total_interns: 0,
        by_university: [],
        by_major: [],
      },
    })

    renderWithRouter(<CandidateSourceAnalyticsPage />)

    await waitFor(() => {
      const totalCard = document.querySelector('.csa-kpi-card--blue')
      expect(within(totalCard).getByText('0')).toBeInTheDocument()
    })

    expect(screen.getByText(/Không có dữ liệu thực tập sinh theo trường trong đợt này/i)).toBeInTheDocument()
    expect(screen.getByText(/Không có dữ liệu thực tập sinh theo ngành trong đợt này/i)).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })
})
