import { render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import CandidateSourceAnalyticsPage from './CandidateSourceAnalyticsPage'

function renderWithRouter(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('CandidateSourceAnalyticsPage Component Test Suite', () => {
  it('1. Render đầy đủ Header, tiêu đề và breadcrumb của trang', () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /Phân tích nguồn ứng viên/i })).toBeInTheDocument()
    expect(screen.getByText(/Thống kê số lượng thực tập sinh theo trường và ngành/i)).toBeInTheDocument()
    expect(screen.getByText(/PHÂN TÍCH TUYỂN DỤNG/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /HR Dashboard/i })).toBeInTheDocument()
  })

  it('2. Render chính xác 3 thẻ KPI tổng quan với dữ liệu mock', () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    // KPI 1: Tổng thực tập sinh = 102
    expect(screen.getByText(/Tổng thực tập sinh/i)).toBeInTheDocument()
    expect(screen.getByText('102')).toBeInTheDocument()

    // KPI 2: Số trường = 8
    expect(screen.getByText(/Số trường/i)).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()

    // KPI 3: Số ngành = 5
    expect(screen.getByText(/Số ngành/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('3. Render Bar Chart theo trường với đầy đủ danh sách trường và số lượng TTS', () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    expect(screen.getByRole('heading', { level: 2, name: /Thực tập sinh theo trường/i })).toBeInTheDocument()

    const barList = document.querySelector('.csa-bar-list')
    expect(barList).toBeInTheDocument()

    // Danh sách 5 trường đại học
    expect(within(barList).getByText('ICTU')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Thái Nguyên')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Kinh tế Quốc dân')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Bách khoa Hà Nội')).toBeInTheDocument()
    expect(within(barList).getByText('Đại học Công nghiệp Hà Nội')).toBeInTheDocument()

    // Số lượng tương ứng
    expect(within(barList).getByText('35')).toBeInTheDocument()
    expect(within(barList).getByText('24')).toBeInTheDocument()
    expect(within(barList).getByText('18')).toBeInTheDocument()
    expect(within(barList).getByText('15')).toBeInTheDocument()
    expect(within(barList).getByText('10')).toBeInTheDocument()
  })

  it('4. Render Pie Chart theo ngành với SVG và Legend', () => {
    renderWithRouter(<CandidateSourceAnalyticsPage />)

    expect(screen.getByRole('heading', { level: 2, name: /Thực tập sinh theo ngành/i })).toBeInTheDocument()

    // SVG Pie chart render
    const svgChart = screen.getByRole('img', { name: /Biểu đồ tròn phân bổ thực tập sinh theo chuyên ngành/i })
    expect(svgChart).toBeInTheDocument()

    const legend = document.querySelector('.csa-pie-legend')
    expect(legend).toBeInTheDocument()

    // 5 chuyên ngành trong Legend
    expect(within(legend).getByText('Công nghệ phần mềm')).toBeInTheDocument()
    expect(within(legend).getByText('Hệ thống thông tin')).toBeInTheDocument()
    expect(within(legend).getByText('Khoa học máy tính')).toBeInTheDocument()
    expect(within(legend).getByText('Mạng máy tính')).toBeInTheDocument()
    expect(within(legend).getByText('Khác')).toBeInTheDocument()

    // Số lượng trong legend
    expect(within(legend).getByText(/\b40\s*TTS/)).toBeInTheDocument()
    expect(within(legend).getByText(/\b25\s*TTS/)).toBeInTheDocument()
    expect(within(legend).getByText(/\b20\s*TTS/)).toBeInTheDocument()
    expect(within(legend).getByText(/\b10\s*TTS/)).toBeInTheDocument()
    expect(within(legend).getByText(/\b5\s*TTS/)).toBeInTheDocument()
  })
})
