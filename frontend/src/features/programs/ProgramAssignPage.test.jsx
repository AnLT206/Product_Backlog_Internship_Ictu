import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProgramAssignPage from './ProgramAssignPage';
import * as programsApi from '../../api/programs';
import * as mentorsApi from '../../api/mentors';
import * as internsApi from '../../api/interns';

// Mock các API
vi.mock('../../api/programs');
vi.mock('../../api/mentors');
vi.mock('../../api/interns');
vi.mock('../../utils/realtimeSync', () => ({
  syncMentorAssignment: vi.fn(),
  syncUnassignMentor: vi.fn(),
}));

const mockProgram = {
  id: 1,
  name: 'Kỳ thực tập Hè 2026',
  department: 'Công nghệ thông tin',
  description: 'Thực tập phát triển phần mềm',
  start_date: '2026-06-01',
  end_date: '2026-08-31',
  max_interns: 10,
  status: 'open',
  current_interns: 1,
};

const mockMentors = [
  {
    id: 3,
    full_name: 'Trần Hoàng Quân',
    email: 'quan.tran@ictu.edu.vn',
    department: 'Công nghệ thông tin',
    position: 'Tech Lead',
    intern_count: 2,
  },
  {
    id: 4,
    full_name: 'Phạm Quốc Hướng',
    email: 'huong.pham@ictu.edu.vn',
    department: 'Kiểm thử QA/QC',
    position: 'QA Lead',
    intern_count: 1,
  },
];

const mockInterns = [
  {
    id: 10,
    code: 'TTS0010',
    full_name: 'Nguyễn Văn An',
    email: 'an.nguyen@ictu.edu.vn',
    university: 'Đại học CNTT & TT (ICTU)',
    major: 'Kỹ thuật Phần mềm',
    gpa: 3.8,
  },
  {
    id: 11,
    code: 'TTS0011',
    full_name: 'Lê Hoàng Nam',
    email: 'nam.le@ictu.edu.vn',
    university: 'Đại học CNTT & TT (ICTU)',
    major: 'Hệ thống thông tin',
    gpa: 3.5,
  },
  {
    id: 12,
    code: 'TTS0012',
    full_name: 'Trần Thị Mai',
    email: 'mai.tran@ictu.edu.vn',
    university: 'Đại học CNTT & TT (ICTU)',
    major: 'Khoa học Máy tính',
    gpa: 3.9,
  },
];

const mockMembers = [
  {
    id: 101,
    program_id: 1,
    intern_user_id: 10,
    intern_name: 'Nguyễn Văn An',
    intern_email: 'an.nguyen@ictu.edu.vn',
    intern_code: 'TTS0010',
    major: 'Kỹ thuật Phần mềm',
    university: 'Đại học CNTT & TT (ICTU)',
    mentor_user_id: 3,
    mentor_name: 'Trần Hoàng Quân',
    mentor_email: 'quan.tran@ictu.edu.vn',
    status: 'in_progress',
    created_at: '2026-06-01T08:00:00Z',
  },
];

describe('ProgramAssignPage Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    programsApi.getPrograms.mockResolvedValue({ ok: true, data: [mockProgram] });
    programsApi.getProgramById.mockResolvedValue({ ok: true, data: mockProgram });
    programsApi.getProgramMembers.mockResolvedValue({ ok: true, data: mockMembers });
    mentorsApi.getMentors.mockResolvedValue({ ok: true, data: mockMentors });
    internsApi.getInterns.mockResolvedValue({ ok: true, data: { items: mockInterns } });
  });

  const renderComponent = (programId = '1') => {
    return render(
      <MemoryRouter initialEntries={[`/hr/programs/${programId}/assign`]}>
        <Routes>
          <Route path="/hr/programs/:id/assign" element={<ProgramAssignPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. Render thông tin kỳ thực tập, thanh tiến độ chỉ tiêu và các tab', async () => {
    renderComponent('1');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kỳ thực tập Hè 2026');
    });

    expect(screen.getByText('Công nghệ thông tin')).toBeInTheDocument();
    expect(screen.getByText(/Thời gian: 01\/06\/2026 → 31\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 10 TTS/)).toBeInTheDocument();
    expect(screen.getByText('Phân công mới (Gán TTS & Mentor)')).toBeInTheDocument();
    expect(screen.getByText('Danh sách thành viên kỳ này')).toBeInTheDocument();
  });

  it('2. Lọc bỏ TTS đã có trong kỳ (TTS 10 đã có, chỉ hiện TTS 11 và 12 ở tab Phân công mới)', async () => {
    renderComponent('1');

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Mai')).toBeInTheDocument();
    });

    // Bảng TTS khả dụng không được hiển thị TTS 10 (đã có trong members)
    const availableRows = screen.queryAllByText('Nguyễn Văn An');
    // Ở tab Phân công mới, Nguyễn Văn An không xuất hiện trong bảng khả dụng
    expect(availableRows.length).toBe(0);
  });

  it('3. Multi-select TTS và chọn Mentor hướng dẫn', async () => {
    renderComponent('1');

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
    });

    // Chọn TTS 11 (Lê Hoàng Nam)
    const namRow = screen.getByText('Lê Hoàng Nam').closest('tr');
    fireEvent.click(namRow);

    expect(screen.getByText(/1 đã chọn/)).toBeInTheDocument();

    // Chọn Mentor 3
    const mentorSelect = screen.getByTestId('mentor-select');
    fireEvent.change(mentorSelect, { target: { value: '3' } });

    await waitFor(() => {
      expect(screen.getByText(/Tải hướng dẫn: 2\/5 TTS/)).toBeInTheDocument();
    });
  });

  it('4. Gửi yêu cầu gán TTS và Mentor vào kỳ thành công', async () => {
    programsApi.assignInternsToProgram.mockResolvedValueOnce({
      ok: true,
      data: { message: 'Đã gán thành công 1 thực tập sinh vào kỳ.' },
    });

    renderComponent('1');

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
    });

    // Tích chọn TTS 11
    const namRow = screen.getByText('Lê Hoàng Nam').closest('tr');
    fireEvent.click(namRow);

    // Chọn Mentor 3
    const mentorSelect = screen.getByTestId('mentor-select');
    fireEvent.change(mentorSelect, { target: { value: '3' } });

    // Bấm nút Submit
    const submitBtn = screen.getByText(/Xác nhận gán 1 TTS vào kỳ/);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(programsApi.assignInternsToProgram).toHaveBeenCalledWith('1', {
        intern_ids: [11],
        mentor_id: 3,
      });
    });
  });

  it('5. Chuyển sang Tab "Danh sách thành viên kỳ này" và hiển thị thành viên đã gán', async () => {
    renderComponent('1');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kỳ thực tập Hè 2026');
    });

    // Chuyển sang tab members
    const membersTab = screen.getByText('Danh sách thành viên kỳ này');
    fireEvent.click(membersTab);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('TTS0010')).toBeInTheDocument();
      expect(screen.getByText('Đang thực tập')).toBeInTheDocument();
      expect(screen.getByText('Gỡ')).toBeInTheDocument();
    });
  });
});
