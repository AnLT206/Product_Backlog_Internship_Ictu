import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InternGroupAssignmentPage from './InternGroupAssignmentPage';
import * as programsApi from '../../api/programs';
import * as mentorsApi from '../../api/mentors';
import * as internsApi from '../../api/interns';

vi.mock('../../api/programs', () => ({
  getPrograms: vi.fn(),
  assignInternsToProgram: vi.fn(),
  removeInternFromProgram: vi.fn().mockResolvedValue({ ok: true, data: { message: 'Đã gỡ thực tập sinh khỏi kỳ thực tập' } }),
}));

vi.mock('../../api/groups', () => ({
  getInternshipGroups: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  createInternshipGroup: vi.fn().mockResolvedValue({ ok: true, data: { id: 99, name: 'Nhóm Test' } }),
  assignInternsToGroup: vi.fn().mockResolvedValue({ ok: true, data: { message: 'Phân nhóm thành công' } }),
  removeInternFromGroup: vi.fn().mockResolvedValue({ ok: true, data: { message: 'Đã gỡ khỏi nhóm' } }),
}));

vi.mock('../../api/mentors', () => ({
  getDepartments: vi.fn(),
  getMentors: vi.fn(),
  assignMentor: vi.fn(),
  unassignInternFromMentor: vi.fn(),
  getAssignedInternsByMentor: vi.fn(),
  getMentorWorkload: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock('../../api/interns', () => ({
  getInterns: vi.fn(),
}));

describe('InternGroupAssignmentPage API Integration Test Suite', () => {
  const mockPrograms = [
    {
      id: 1,
      name: 'Chương trình Thực tập Hè 2026',
      code: 'PRG-2026-SUMMER',
      department: 'Phát triển Phần mềm',
      max_interns: 50,
      current_interns: 18,
      status: 'OPEN',
      is_deleted: false,
    },
    {
      id: 2,
      name: 'Chương trình AI & Big Data',
      code: 'PRG-2026-AI',
      department: 'Trí tuệ nhân tạo',
      max_interns: 30,
      current_interns: 10,
      status: 'OPEN',
      is_deleted: false,
    },
  ];

  const mockDepartments = [
    { id: 1, name: 'Trung tâm Phát triển Phần mềm', description: 'Phát triển các hệ thống phần mềm' },
    { id: 2, name: 'Trung tâm Trí tuệ Nhân tạo & Khoa học Dữ liệu', description: 'Nghiên cứu ứng dụng AI' },
  ];

  const mockMentors = [
    {
      id: 3,
      full_name: 'Trần Hoàng Quân',
      email: 'quan.th@company.com',
      department_id: 1,
      department: 'Trung tâm Phát triển Phần mềm',
      position: 'Tech Lead / Chuyên viên Frontend',
      intern_count: 1,
    },
    {
      id: 5,
      full_name: 'ThS. Nguyễn Hồng Phát',
      email: 'phat.nh@company.com',
      department_id: 2,
      department: 'Trung tâm Trí tuệ Nhân tạo & Khoa học Dữ liệu',
      position: 'AI Research Lead',
      intern_count: 1,
    },
  ];

  let currentInterns = [];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    currentInterns = [
      {
        id: 101,
        code: 'TTS0101',
        full_name: 'Nguyễn Đăng Khôi',
        email: 'khoi.nd@ictu.edu.vn',
        phone_number: '0988 123 456',
        university: 'ICTU',
        major: 'Kỹ thuật phần mềm',
        gpa: 3.82,
        status: 'active',
        mentor_id: null,
        mentor_name: null,
      },
      {
        id: 102,
        code: 'TTS0102',
        full_name: 'Vũ Đức Minh',
        email: 'minh.vd@ictu.edu.vn',
        phone_number: '0977 234 567',
        university: 'ICTU',
        major: 'Công nghệ phần mềm',
        gpa: 3.65,
        status: 'active',
        mentor_id: null,
        mentor_name: null,
      },
      {
        id: 103,
        code: 'TTS0103',
        full_name: 'Nguyễn Văn An',
        email: 'an.nv@ictu.edu.vn',
        phone_number: '0912 345 678',
        university: 'Đại học Bách Khoa',
        major: 'Khoa học máy tính',
        gpa: 3.9,
        status: 'active',
        mentor_id: 3,
        mentor_name: 'Trần Hoàng Quân',
      },
      {
        id: 104,
        code: 'TTS0104',
        full_name: 'Đỗ Thị Minh Châu',
        email: 'chau.dtm@ictu.edu.vn',
        phone_number: '0923 456 789',
        university: 'ICTU',
        major: 'Trí tuệ nhân tạo',
        gpa: 3.75,
        status: 'active',
        mentor_id: 5,
        mentor_name: 'ThS. Nguyễn Hồng Phát',
      },
    ];

    programsApi.getPrograms.mockResolvedValue({ ok: true, data: mockPrograms });
    mentorsApi.getDepartments.mockResolvedValue({ ok: true, data: mockDepartments });
    mentorsApi.getMentors.mockResolvedValue({ ok: true, data: mockMentors });
    internsApi.getInterns.mockImplementation(() =>
      Promise.resolve({ ok: true, data: { items: currentInterns, total: currentInterns.length } })
    );

    programsApi.assignInternsToProgram.mockResolvedValue({
      ok: true,
      data: { message: 'Đã phân công thành công vào chương trình' },
    });
    mentorsApi.assignMentor.mockResolvedValue({
      ok: true,
      data: { message: 'Đã phân công mentor thành công' },
    });
    mentorsApi.unassignInternFromMentor.mockResolvedValue({
      ok: true,
      data: { message: 'Đã hủy phân nhóm thành công' },
    });
  });

  it('1. Render Header, tiêu đề và tải dữ liệu thật từ API (Programs, Depts, Mentors, Interns)', async () => {
    render(<InternGroupAssignmentPage />);

    // Kiểm tra tiêu đề chính và phụ đề
    expect(screen.getByRole('heading', { level: 1, name: /Phân công thực tập sinh/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Phân công thực tập sinh vào chương trình và nhóm theo phòng ban/i)
    ).toBeInTheDocument();

    // Chờ API hoàn thành tải dữ liệu
    await waitFor(() => {
      expect(programsApi.getPrograms).toHaveBeenCalledTimes(1);
      expect(mentorsApi.getDepartments).toHaveBeenCalledTimes(1);
      expect(mentorsApi.getMentors).toHaveBeenCalledTimes(1);
      expect(internsApi.getInterns).toHaveBeenCalledTimes(1);
    });

    // Thống kê nhanh: 2 chưa phân công (101, 102), 2 đã phân công (103, 104), 2 nhóm dự án
    await waitFor(() => {
      expect(screen.getByText('2', { selector: '.stat-value.text-amber' })).toBeInTheDocument();
      expect(screen.getByText('2', { selector: '.stat-value.text-blue' })).toBeInTheDocument();
      expect(screen.getByText('2', { selector: '.stat-value.text-emerald' })).toBeInTheDocument();
    });

    // Trường chọn Nhóm tiếp nhận phân công
    expect(screen.getByLabelText('Chọn Nhóm tiếp nhận')).toBeInTheDocument();

    // Nút phân công ban đầu bị disabled
    const assignBtn = screen.getByRole('button', { name: /Phân công/i });
    expect(assignBtn).toBeInTheDocument();
    expect(assignBtn).toBeDisabled();
  });

  it('2. Chọn Nhóm tiếp nhận tự động liên kết Kỳ thực tập, Phòng ban và Mentor', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    const groupSelect = screen.getByLabelText('Chọn Nhóm tiếp nhận');
    expect(groupSelect).not.toBeDisabled();

    fireEvent.change(groupSelect, { target: { value: '3' } });
    expect(groupSelect.value).toBe('3');
    expect(screen.getByText(/Hệ thống tự động liên kết Kỳ thực tập/i)).toBeInTheDocument();
    const card = screen.getByText('Mentor trưởng nhóm:', { selector: '.meta-pill-label' }).closest('.group-info-card');
    expect(card).toBeInTheDocument();
    expect(within(card).getAllByText(/Trần Hoàng Quân/i).length).toBeGreaterThanOrEqual(1);
  });

  it('3. Checkbox Header: chọn tất cả và bỏ chọn tất cả với danh sách TTS từ API', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    // Ban đầu bộ đếm là 0
    expect(screen.getByText('0', { selector: '.counter-number' })).toBeInTheDocument();

    // Bấm Checkbox header để chọn tất cả (2 TTS chờ phân nhóm)
    const headerCheckbox = screen.getByRole('button', { name: /Chọn tất cả/i });
    fireEvent.click(headerCheckbox);

    // Bộ đếm cập nhật lên 2
    expect(screen.getByText('2', { selector: '.counter-number' })).toBeInTheDocument();

    // Bấm lại để bỏ chọn tất cả
    const deselectHeader = screen.getByRole('button', { name: /Bỏ chọn tất cả/i });
    fireEvent.click(deselectHeader);

    // Bộ đếm quay lại 0
    expect(screen.getByText('0', { selector: '.counter-number' })).toBeInTheDocument();
  });

  it('4. Tích chọn từng dòng Checkbox cập nhật số lượng và highlight dòng', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    // Chọn TTS Nguyễn Đăng Khôi
    const internRowCheckbox = screen.getByRole('button', { name: /Chọn Nguyễn Đăng Khôi/i });
    fireEvent.click(internRowCheckbox);

    // Bộ đếm hiển thị 1
    expect(screen.getByText('1', { selector: '.counter-number' })).toBeInTheDocument();

    // Bấm nút "Bỏ chọn"
    const deselectBtn = screen.getByRole('button', { name: /Bỏ chọn/i });
    expect(deselectBtn).toBeInTheDocument();
    fireEvent.click(deselectBtn);

    expect(screen.getByText('0', { selector: '.counter-number' })).toBeInTheDocument();
  });

  it('5. Luồng phân công API hoàn chỉnh: Gọi API phân nhóm thành công, hiển thị Toast và cập nhật danh sách', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    const groupSelect = screen.getByLabelText('Chọn Nhóm tiếp nhận');

    // Chọn Nhóm Trần Hoàng Quân (id: 3)
    fireEvent.change(groupSelect, { target: { value: '3' } });

    // Chọn TTS Nguyễn Đăng Khôi (id: 101)
    const internCheckbox = screen.getByRole('button', { name: /Chọn Nguyễn Đăng Khôi/i });
    fireEvent.click(internCheckbox);

    // Nút phân công hiển thị số lượng và được kích hoạt
    const assignBtn = screen.getByRole('button', { name: /Phân công \(1 TTS\)/i });
    expect(assignBtn).not.toBeDisabled();

    // Mock API sau khi phân công sẽ trả về dữ liệu cập nhật
    internsApi.getInterns.mockImplementation(() => {
      const updated = currentInterns.map((i) =>
        i.id === 101 ? { ...i, mentor_id: 3, mentor_name: 'Trần Hoàng Quân' } : i
      );
      return Promise.resolve({ ok: true, data: { items: updated, total: updated.length } });
    });

    // Bấm phân công
    fireEvent.click(assignBtn);

    // Kiểm tra API được gọi đúng tham số
    await waitFor(() => {
      expect(programsApi.assignInternsToProgram).toHaveBeenCalledWith(1, {
        intern_ids: [101],
        mentor_id: 3,
      });
      expect(mentorsApi.assignMentor).toHaveBeenCalledWith({
        mentor_id: 3,
        intern_ids: [101],
        program_id: 1,
      });
    });

    // Thông báo Toast thành công
    await waitFor(() => {
      expect(screen.getByText(/Đã phân công thành công/i)).toBeInTheDocument();
    });

    // TTS Nguyễn Đăng Khôi xuất hiện trong danh sách thành viên nhóm đã phân công
    const assignedSection = screen.getByRole('region', { name: /3\. Danh sách thành viên trong nhóm/i });
    await waitFor(() => {
      expect(within(assignedSection).getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });
  });

  it('6. Tìm kiếm thực tập sinh hoạt động chính xác trên bảng dữ liệu API', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Vũ Đức Minh')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm theo họ tên, mã TTS/i);

    // Tìm kiếm "Vũ Đức Minh"
    fireEvent.change(searchInput, { target: { value: 'Vũ Đức Minh' } });

    await waitFor(() => {
      expect(screen.getByText('Vũ Đức Minh')).toBeInTheDocument();
      expect(screen.queryByText('Nguyễn Đăng Khôi')).not.toBeInTheDocument();
    });

    // Xóa tìm kiếm
    const clearBtn = screen.getByTitle(/Xóa tìm kiếm/i);
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });
  });

  it('7. Khu vực thành viên trong nhóm: lọc theo nhóm và gọi API gỡ thành viên', async () => {
    render(<InternGroupAssignmentPage />);

    const assignedSection = screen.getByRole('region', { name: /3\. Danh sách thành viên trong nhóm/i });

    await waitFor(() => {
      expect(within(assignedSection).getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(within(assignedSection).getByText('Đỗ Thị Minh Châu')).toBeInTheDocument();
    });

    // Lọc theo nhóm AI (id: 5)
    const groupFilter = screen.getByLabelText(/Xem theo nhóm:/i);
    fireEvent.change(groupFilter, { target: { value: '5' } });

    expect(within(assignedSection).getByText('Đỗ Thị Minh Châu')).toBeInTheDocument();
    expect(within(assignedSection).queryByText('Nguyễn Văn An')).not.toBeInTheDocument();

    // Mock khi gỡ thành viên thành công
    internsApi.getInterns.mockImplementation(() => {
      const updated = currentInterns.map((i) =>
        i.id === 104 ? { ...i, mentor_id: null, mentor_name: null } : i
      );
      return Promise.resolve({ ok: true, data: { items: updated, total: updated.length } });
    });

    // Bấm nút "Gỡ nhóm"
    const removeBtn = within(assignedSection).getByRole('button', { name: /Gỡ nhóm/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mentorsApi.unassignInternFromMentor).toHaveBeenCalledWith(5, 104, undefined);
    });

    // Toast thông báo gỡ thành công
    await waitFor(() => {
      expect(screen.getByText(/Đã hủy phân nhóm/i)).toBeInTheDocument();
    });
  });

  it('8. Xử lý lỗi API: Hiển thị banner lỗi và nút Thử lại khi tải ban đầu thất bại', async () => {
    programsApi.getPrograms.mockRejectedValueOnce(new Error('Network Connection Error'));

    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải dữ liệu từ máy chủ/i)).toBeInTheDocument();
    });

    // Nút "Tải lại" có mặt và gọi lại API khi bấm
    const retryBtn = screen.getByRole('button', { name: /Tải lại/i });
    expect(retryBtn).toBeInTheDocument();

    programsApi.getPrograms.mockResolvedValueOnce({ ok: true, data: mockPrograms });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });
  });

  it('9. Xử lý lỗi phân công: Hiển thị thông báo Toast lỗi khi API phân công báo lỗi', async () => {
    programsApi.assignInternsToProgram.mockRejectedValueOnce({
      response: { data: { detail: 'Chương trình đã đạt giới hạn tiếp nhận thực tập sinh.' } },
    });

    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
    });

    const groupSelect = screen.getByLabelText('Chọn Nhóm tiếp nhận');
    fireEvent.change(groupSelect, { target: { value: '3' } });

    const internCheckbox = screen.getByRole('button', { name: /Chọn Nguyễn Đăng Khôi/i });
    fireEvent.click(internCheckbox);

    const assignBtn = screen.getByRole('button', { name: /Phân công \(1 TTS\)/i });
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chương trình đã đạt giới hạn tiếp nhận/i)).toBeInTheDocument();
    });
  });

  it('10. Hiển thị Empty State chính xác khi không có dữ liệu thực tập sinh', async () => {
    internsApi.getInterns.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0 },
    });

    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Không tìm thấy thực tập sinh nào phù hợp với bộ lọc')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Chưa có thành viên nào trong nhóm này')
      ).toBeInTheDocument();
    });
  });

  it('11. Chuyển sang Tab 2 "Tạo & Quản lý Nhóm Thực tập" hiển thị giao diện tạo nhóm riêng biệt', async () => {
    render(<InternGroupAssignmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Phân công thực tập sinh')).toBeInTheDocument();
    });

    const createTabBtn = screen.getByRole('tab', { name: /Tạo & Quản lý Nhóm Thực tập/i });
    expect(createTabBtn).toBeInTheDocument();
    fireEvent.click(createTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tạo & Quản lý Danh mục Nhóm Thực tập theo Phòng ban/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lưu & Tạo nhóm thực tập/i })).toBeInTheDocument();
    });
  });
});
