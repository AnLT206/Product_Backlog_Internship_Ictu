import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InternProgramPage from './InternProgramPage';

let mockCurrentUser = {
  id: 24,
  code: 'DTC26001',
  full_name: 'Đỗ Hoàng Anh',
  email: 'hoanganh@student.ictu.edu.vn',
  role: 'intern',
  status: 'active',
  university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
  major: 'Công nghệ thông tin',
};

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockCurrentUser,
      updateUser: vi.fn(),
      isAuthenticated: true,
    }),
  };
});

describe('InternProgramPage Component Test Suite (Tab Kỳ thực tập của TTS)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Render đầy đủ Header Banner: tên kỳ thực tập, mã kỳ, thời gian, phòng ban, nhóm và tiến độ', () => {
    render(<InternProgramPage />);

    // Tên kỳ thực tập
    expect(screen.getByRole('heading', { level: 1, name: /Khóa K20 - Kỳ Thu 2026/i })).toBeInTheDocument();

    // Mã kỳ & trạng thái
    expect(screen.getByText(/Mã kỳ: PRG-2026-F · K20/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang diễn ra/i)).toBeInTheDocument();

    // Thông tin phòng ban & nhóm
    expect(screen.getByText(/Phòng Kỹ thuật & Hạ tầng Cloud/i)).toBeInTheDocument();
    expect(screen.getByText(/helloworld/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ThS. Nguyễn Văn Hướng Dẫn/i).length).toBeGreaterThanOrEqual(1);

    // Thanh tiến độ
    expect(screen.getByText(/Tiến độ kỳ thực tập/i)).toBeInTheDocument();
    expect(screen.getByText(/33% \(4\/12 tuần\)/i)).toBeInTheDocument();
  });

  it('2. Render thanh 4 tab nội dung: Tổng quan, Thành viên nhóm, Lộ trình, Hợp đồng', () => {
    render(<InternProgramPage />);

    expect(screen.getByRole('button', { name: /Tổng quan & Mục tiêu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thành viên nhóm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lộ trình & Cột mốc/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hợp đồng & Văn bản/i })).toBeInTheDocument();
  });

  it('3. Mặc định ở tab Tổng quan & Mục tiêu: hiển thị thông tin Mentor, Giảng viên khoa và tiêu chuẩn nghiệm thu', () => {
    render(<InternProgramPage />);

    expect(screen.getByRole('heading', { level: 3, name: /Đội ngũ hướng dẫn chuyên môn/i })).toBeInTheDocument();
    expect(screen.getByText(/TS. Vũ Vinh Quang · Bộ môn CNPM/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiêu chuẩn nghiệm thu kỳ thực tập/i)).toBeInTheDocument();
    expect(screen.getByText(/Tối thiểu 400 giờ/i)).toBeInTheDocument();
    expect(screen.getByText(/Chuyên cần & Kỷ luật lao động/i)).toBeInTheDocument();
  });

  it('4. Chuyển sang tab "Thành viên nhóm": hiển thị bảng danh sách các sinh viên cùng đợt', () => {
    render(<InternProgramPage />);

    const membersTabBtn = screen.getByRole('button', { name: /Thành viên nhóm/i });
    fireEvent.click(membersTabBtn);

    expect(screen.getByRole('heading', { level: 3, name: /Danh sách thành viên nhóm dự án/i })).toBeInTheDocument();
    expect(screen.getByText('Phạm Tuấn Kiệt')).toBeInTheDocument();
    expect(screen.getByText('Vũ Thùy Linh')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();

    // Highlight dòng của bản thân
    expect(screen.getByText(/Đỗ Hoàng Anh/i)).toBeInTheDocument();
    expect(screen.getByText('Bạn')).toBeInTheDocument();
  });

  it('5. Chuyển sang tab "Lộ trình & Cột mốc": hiển thị 4 mốc thời gian 12 tuần', () => {
    render(<InternProgramPage />);

    const milestonesTabBtn = screen.getByRole('button', { name: /Lộ trình & Cột mốc/i });
    fireEvent.click(milestonesTabBtn);

    expect(screen.getByText(/Tiếp nhận & Onboarding kỹ thuật/i)).toBeInTheDocument();
    expect(screen.getByText(/Phát triển dự án & Triển khai Sprint/i)).toBeInTheDocument();
    expect(screen.getByText(/Đánh giá giữa kỳ & Tối ưu hóa/i)).toBeInTheDocument();
    expect(screen.getByText(/Nghiệm thu dự án & Bảo vệ thực tập tốt nghiệp/i)).toBeInTheDocument();
  });

  it('6. Chuyển sang tab "Hợp đồng & Văn bản": hiển thị Hợp đồng tiếp nhận và Quyết định phân công', () => {
    render(<InternProgramPage />);

    const docsTabBtn = screen.getByRole('button', { name: /Hợp đồng & Văn bản/i });
    fireEvent.click(docsTabBtn);

    expect(screen.getByText(/Hợp đồng Tiếp nhận Thực tập Doanh nghiệp & Cam kết Bảo mật/i)).toBeInTheDocument();
    expect(screen.getByText(/Quyết định Phân công Người hướng dẫn/i)).toBeInTheDocument();
    expect(screen.getByText(/Sổ tay Quy chế Thực tập Doanh nghiệp ICTU/i)).toBeInTheDocument();
  });

  it('7. Thao tác bấm nút tiện ích tải văn bản hiển thị thông báo toast', async () => {
    render(<InternProgramPage />);

    const downloadBtn = screen.getByRole('button', { name: /Tải Quyết định tiếp nhận kỳ K20/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Đang tải văn bản Quyết định tiếp nhận/i)).toBeInTheDocument();
    });
  });
});
