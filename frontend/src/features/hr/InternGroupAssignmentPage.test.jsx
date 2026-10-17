import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InternGroupAssignmentPage from './InternGroupAssignmentPage';

describe('InternGroupAssignmentPage Component Test Suite', () => {
  it('1. Render đầy đủ Header, tiêu đề và các trường của Form phân nhóm', () => {
    render(<InternGroupAssignmentPage />);

    // Kiểm tra tiêu đề chính và phụ đề
    expect(screen.getByRole('heading', { level: 1, name: /Phân công thực tập sinh/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Phân công thực tập sinh vào chương trình và nhóm theo phòng ban/i)
    ).toBeInTheDocument();

    // Thống kê nhanh
    expect(screen.getByText('Chờ phân nhóm', { selector: '.stat-label' })).toBeInTheDocument();
    expect(screen.getByText('Đã phân nhóm', { selector: '.stat-label' })).toBeInTheDocument();
    expect(screen.getByText('Số nhóm dự án', { selector: '.stat-label' })).toBeInTheDocument();

    // Các trường chọn trong Form (Khu vực A)
    expect(screen.getByLabelText('Chọn Chương trình thực tập')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn Phòng ban tiếp nhận')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn Nhóm tiếp nhận')).toBeInTheDocument();

    // Nút phân công
    const assignBtn = screen.getByRole('button', { name: /Phân công/i });
    expect(assignBtn).toBeInTheDocument();
    expect(assignBtn).toBeDisabled(); // Ban đầu disabled vì chưa chọn thông tin và chưa chọn TTS
  });

  it('2. Dropdown Nhóm cập nhật danh sách nhóm và hiển thị thông tin nhóm khi chọn', () => {
    render(<InternGroupAssignmentPage />);

    const deptSelect = screen.getByLabelText('Chọn Phòng ban tiếp nhận');
    const groupSelect = screen.getByLabelText('Chọn Nhóm tiếp nhận');

    // Chọn Phòng ban: Trung tâm Phát triển Phần mềm (Software Center)
    fireEvent.change(deptSelect, { target: { value: 'DEPT-DEV' } });
    expect(groupSelect).not.toBeDisabled();

    // Chọn Nhóm Frontend
    fireEvent.change(groupSelect, { target: { value: 'GRP-FE-01' } });

    // Kiểm tra card tóm tắt thông tin nhóm xuất hiện
    expect(screen.getByText(/Nhóm đang chọn:/i)).toBeInTheDocument();
    expect(screen.getByText(/Trần Hoàng Quân/i)).toBeInTheDocument();
  });

  it('3. Checkbox Header: chọn tất cả và bỏ chọn tất cả hoạt động chính xác kèm cập nhật bộ đếm', () => {
    render(<InternGroupAssignmentPage />);

    // Ban đầu bộ đếm là 0
    expect(screen.getByText(/Đã chọn:/i)).toBeInTheDocument();
    const counterBefore = screen.getByText('0', { selector: '.counter-number' });
    expect(counterBefore).toBeInTheDocument();

    // Bấm Checkbox header để chọn tất cả
    const headerCheckbox = screen.getByRole('button', { name: /Chọn tất cả/i });
    fireEvent.click(headerCheckbox);

    // Bộ đếm cập nhật lên 10 (số lượng mock TTS unassigned)
    const counterAfter = screen.getByText('10', { selector: '.counter-number' });
    expect(counterAfter).toBeInTheDocument();

    // Bấm lại để bỏ chọn tất cả
    const deselectHeader = screen.getByRole('button', { name: /Bỏ chọn tất cả/i });
    fireEvent.click(deselectHeader);

    // Bộ đếm quay lại 0
    expect(screen.getByText('0', { selector: '.counter-number' })).toBeInTheDocument();
  });

  it('4. Tích chọn từng dòng Checkbox cập nhật số lượng và highlight dòng', () => {
    render(<InternGroupAssignmentPage />);

    // Chọn TTS đầu tiên: Nguyễn Đăng Khôi
    const internRowCheckbox = screen.getByRole('button', { name: /Chọn Nguyễn Đăng Khôi/i });
    fireEvent.click(internRowCheckbox);

    // Bộ đếm hiển thị 1
    expect(screen.getByText('1', { selector: '.counter-number' })).toBeInTheDocument();

    // Nút "Bỏ chọn" xuất hiện
    const deselectBtn = screen.getByRole('button', { name: /Bỏ chọn/i });
    expect(deselectBtn).toBeInTheDocument();

    // Bấm "Bỏ chọn"
    fireEvent.click(deselectBtn);
    expect(screen.getByText('0', { selector: '.counter-number' })).toBeInTheDocument();
  });

  it('5. Luồng phân công hoàn chỉnh: Chọn chương trình, phòng ban, nhóm, tick chọn TTS -> Bấm Phân công -> Thành công và chuyển danh sách', () => {
    render(<InternGroupAssignmentPage />);

    const prgSelect = screen.getByLabelText('Chọn Chương trình thực tập');
    const deptSelect = screen.getByLabelText('Chọn Phòng ban tiếp nhận');
    const groupSelect = screen.getByLabelText('Chọn Nhóm tiếp nhận');

    // 1. Chọn Chương trình
    fireEvent.change(prgSelect, { target: { value: 'PRG-2026-SUMMER' } });
    // 2. Chọn Phòng ban
    fireEvent.change(deptSelect, { target: { value: 'DEPT-DEV' } });
    // 3. Chọn Nhóm
    fireEvent.change(groupSelect, { target: { value: 'GRP-FE-01' } });

    // 4. Chọn 1 TTS
    const internCheckbox = screen.getByRole('button', { name: /Chọn Nguyễn Đăng Khôi/i });
    fireEvent.click(internCheckbox);

    // Nút phân công được enable và hiển thị số lượng (1 TTS)
    const assignBtn = screen.getByRole('button', { name: /Phân công \(1 TTS\)/i });
    expect(assignBtn).not.toBeDisabled();

    // 5. Bấm phân công
    fireEvent.click(assignBtn);

    // Kiểm tra thông báo Toast thành công
    expect(
      screen.getByText(/Đã phân công thành công 1 thực tập sinh vào/i)
    ).toBeInTheDocument();

    // Sinh viên đã được chuyển sang danh sách thành viên trong nhóm (Khu vực D)
    const assignedSection = screen.getByRole('region', { name: /3\. Danh sách thành viên trong nhóm/i });
    expect(within(assignedSection).getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
  });

  it('6. Tìm kiếm và lọc thực tập sinh hoạt động chính xác trên bảng', () => {
    render(<InternGroupAssignmentPage />);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo họ tên, mã TTS/i);

    // Tìm kiếm "Vũ Đức Minh"
    fireEvent.change(searchInput, { target: { value: 'Vũ Đức Minh' } });

    expect(screen.getByText('Vũ Đức Minh')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Đăng Khôi')).not.toBeInTheDocument();

    // Xóa tìm kiếm
    const clearBtn = screen.getByTitle(/Xóa tìm kiếm/i);
    fireEvent.click(clearBtn);

    expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
  });

  it('7. Khu vực thành viên trong nhóm hỗ trợ lọc theo nhóm và gỡ thành viên', () => {
    render(<InternGroupAssignmentPage />);

    const assignedSection = screen.getByRole('region', { name: /3\. Danh sách thành viên trong nhóm/i });
    expect(within(assignedSection).getByText('Nguyễn Văn An')).toBeInTheDocument();

    // Lọc theo nhóm khác (ví dụ: Nhóm AI)
    const groupFilter = screen.getByLabelText(/Xem theo nhóm:/i);
    fireEvent.change(groupFilter, { target: { value: 'GRP-AI-01' } });

    expect(within(assignedSection).getByText('Đỗ Thị Minh Châu')).toBeInTheDocument();
    expect(within(assignedSection).queryByText('Nguyễn Văn An')).not.toBeInTheDocument();

    // Bấm nút "Gỡ" thành viên
    const removeBtn = within(assignedSection).getByRole('button', { name: /Gỡ/i });
    fireEvent.click(removeBtn);

    // Toast thông báo gỡ thành công
    expect(screen.getByText(/Đã hủy phân nhóm cho thực tập sinh Đỗ Thị Minh Châu/i)).toBeInTheDocument();
  });
});
