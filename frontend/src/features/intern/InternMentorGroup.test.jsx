import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InternMentorGroupSection from './components/InternMentorGroupSection';
import InternMentorCard from './components/InternMentorCard';
import InternGroupCard from './components/InternGroupCard';
import InternAllMembersModal from './components/InternAllMembersModal';
import { getMyMentorGroup } from '../../api/interns';
import {
  MOCK_MENTOR,
  MOCK_GROUP,
  MOCK_GROUP_MEMBERS,
  getInitials,
} from './mentorGroupMock';

describe('Intern Mentor & Group UI Test Suite (Story: Mentor của tôi & Nhóm thực tập)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ───────────────────────────────────────────────────────────────────────────
     1. KIỂM THỬ KHỐI "MENTOR CỦA TÔI" (MENTOR CARD)
     ─────────────────────────────────────────────────────────────────────────── */
  describe('1. Khối Mentor của tôi (InternMentorCard)', () => {
    it('Render đầy đủ tiêu đề, phụ đề, họ tên, chức vụ, phòng ban, avatar và trạng thái', () => {
      render(<InternMentorCard mentor={MOCK_MENTOR} />);

      // Tiêu đề & phụ đề
      expect(screen.getByRole('heading', { level: 2, name: /Mentor của tôi/i })).toBeInTheDocument();
      expect(screen.getByText(/Thông tin người hướng dẫn/i)).toBeInTheDocument();

      // Thông tin chi tiết Mentor
      expect(screen.getByText('Trần Hoàng Quân')).toBeInTheDocument();
      expect(screen.getByText(/Senior Fullstack Tech Lead/i)).toBeInTheDocument();
      expect(screen.getByText(/Trung tâm Phát triển Phần mềm/i)).toBeInTheDocument();

      // Trạng thái online
      expect(screen.getByText(/Đang làm việc tại văn phòng/i)).toBeInTheDocument();

      // Avatar fallback initials ("TQ" cho Trần Hoàng Quân)
      expect(screen.getByText('TQ')).toBeInTheDocument();
    });

    it('Hiển thị thông tin liên hệ và các nút liên hệ nhanh (Email, Gọi điện, Copy)', () => {
      const handleToast = vi.fn();
      render(<InternMentorCard mentor={MOCK_MENTOR} onShowToast={handleToast} />);

      // Kiểm tra email và số điện thoại hiển thị
      expect(screen.getByText('mentor.quan@ictu.edu.vn')).toBeInTheDocument();
      expect(screen.getByText('0988 123 456')).toBeInTheDocument();
      expect(screen.getByText(/Tòa nhà Công nghệ ICTU/i)).toBeInTheDocument();

      // Nút Gửi Email có href mailto: đúng địa chỉ
      const emailBtn = screen.getByRole('link', { name: /Gửi Email/i });
      expect(emailBtn).toHaveAttribute('href', 'mailto:mentor.quan@ictu.edu.vn');

      // Nút Gọi điện có href tel: đúng số điện thoại
      const callBtn = screen.getByRole('link', { name: /Gọi điện/i });
      expect(callBtn).toHaveAttribute('href', 'tel:0988 123 456');

      // Nút sao chép email nhanh
      const copyBtn = screen.getByRole('button', { name: /Sao chép email mentor/i });
      expect(copyBtn).toBeInTheDocument();
    });

    it('Hiển thị Empty State chính xác khi chưa có Mentor được phân công', () => {
      render(<InternMentorCard mentor={null} />);

      expect(screen.getByText(/Chưa phân công người hướng dẫn/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn hiện chưa được phân công Mentor hướng dẫn/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Chờ HR phân công/i)).toBeInTheDocument();
    });

    it('Xử lý an toàn khi Mentor thiếu thông tin email hoặc số điện thoại', () => {
      const partialMentor = {
        id: 99,
        full_name: 'Nguyễn Văn Hướng Dẫn',
        position: 'Mentor',
        department: 'Ban Đào tạo',
        email: null,
        phone: null,
        avatar_url: null,
      };

      render(<InternMentorCard mentor={partialMentor} />);

      expect(screen.getByText('Chưa có email')).toBeInTheDocument();
      expect(screen.getByText('Chưa có SĐT')).toBeInTheDocument();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
     2. KIỂM THỬ KHỐI "NHÓM THỰC TẬP" (GROUP CARD)
     ─────────────────────────────────────────────────────────────────────────── */
  describe('2. Khối Nhóm thực tập (InternGroupCard)', () => {
    it('Render đầy đủ tên nhóm, chương trình, phòng ban, mentor phụ trách và số lượng thành viên', () => {
      render(
        <InternGroupCard
          group={MOCK_GROUP}
          members={MOCK_GROUP_MEMBERS}
          onViewAllMembers={vi.fn()}
        />
      );

      // Tiêu đề & Tên nhóm
      expect(screen.getByRole('heading', { level: 2, name: /Nhóm thực tập/i })).toBeInTheDocument();
      expect(screen.getByText(/Nhóm Frontend React & Design System \(FE-01\)/i)).toBeInTheDocument();

      // Số lượng thành viên pill
      expect(screen.getByText('6 thành viên')).toBeInTheDocument();

      // Metadata nhóm
      expect(screen.getByText(/Kỳ thực tập Doanh nghiệp Hè 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/Trung tâm Phát triển Phần mềm/i)).toBeInTheDocument();
      expect(screen.getByText('Trần Hoàng Quân')).toBeInTheDocument();
      expect(screen.getByText(/Hệ thống Quản lý Thực tập sinh Doanh nghiệp/i)).toBeInTheDocument();
    });

    it('Hiển thị danh sách xem trước các thành viên và tag Bạn cho người dùng hiện tại', () => {
      render(
        <InternGroupCard
          group={MOCK_GROUP}
          members={MOCK_GROUP_MEMBERS}
          onViewAllMembers={vi.fn()}
        />
      );

      // Tiêu đề khu vực thành viên
      expect(screen.getByRole('heading', { level: 3, name: /Thành viên trong nhóm/i })).toBeInTheDocument();
      expect(screen.getByText(/Đang hiển thị 4\/6/i)).toBeInTheDocument();

      // Nguyễn Văn An (Bạn)
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Bạn')).toBeInTheDocument();
      expect(screen.getByText('Nhóm trưởng TTS / Frontend Lead')).toBeInTheDocument();

      // Các thành viên khác trong preview (4 thành viên đầu)
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
      expect(screen.getByText('Trần Thảo Ly')).toBeInTheDocument();
      expect(screen.getByText('Vũ Đức Minh')).toBeInTheDocument();
    });

    it('Nút "Xem tất cả thành viên (6)" kích hoạt callback mở Modal', () => {
      const handleOpenModal = vi.fn();
      render(
        <InternGroupCard
          group={MOCK_GROUP}
          members={MOCK_GROUP_MEMBERS}
          onViewAllMembers={handleOpenModal}
        />
      );

      const viewAllBtn = screen.getByRole('button', { name: /Xem tất cả 6 thành viên trong nhóm/i });
      expect(viewAllBtn).toBeInTheDocument();

      fireEvent.click(viewAllBtn);
      expect(handleOpenModal).toHaveBeenCalledTimes(1);
    });

    it('Hiển thị Empty State chính xác khi chưa được đưa vào nhóm', () => {
      render(<InternGroupCard group={null} members={[]} onViewAllMembers={vi.fn()} />);

      expect(screen.getByText(/Chưa tham gia nhóm thực tập/i)).toBeInTheDocument();
      expect(screen.getByText(/Bạn chưa được đưa vào nhóm dự án thực tập nào/i)).toBeInTheDocument();
      expect(screen.getByText(/Chờ HR xếp nhóm/i)).toBeInTheDocument();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
     3. KIỂM THỬ MODAL XEM TẤT CẢ THÀNH VIÊN (ALL MEMBERS MODAL)
     ─────────────────────────────────────────────────────────────────────────── */
  describe('3. Modal xem tất cả thành viên (InternAllMembersModal)', () => {
    it('Render danh sách toàn bộ 6 thành viên kèm thông tin chi tiết', () => {
      const handleClose = vi.fn();
      render(
        <InternAllMembersModal
          isOpen={true}
          onClose={handleClose}
          group={MOCK_GROUP}
          members={MOCK_GROUP_MEMBERS}
        />
      );

      // Tiêu đề modal
      expect(
        screen.getByRole('heading', { level: 3, name: /Nhóm Frontend React & Design System/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Tổng số:/i)).toBeInTheDocument();

      // Danh sách đầy đủ 6 thành viên
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Đăng Khôi')).toBeInTheDocument();
      expect(screen.getByText('Trần Thảo Ly')).toBeInTheDocument();
      expect(screen.getByText('Vũ Đức Minh')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Khánh Linh')).toBeInTheDocument();
      expect(screen.getByText('Phạm Minh Hoàng')).toBeInTheDocument();

      // Các mã sinh viên TTS
      expect(screen.getByText('TTS0001')).toBeInTheDocument();
      expect(screen.getByText('TTS0005')).toBeInTheDocument();
      expect(screen.getByText('TTS0008')).toBeInTheDocument();

      // Nút đóng modal ở footer
      const closeBtn = screen.getByRole('button', { name: /^Đóng$/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('Đóng modal khi bấm nút X hoặc phím Escape', () => {
      const handleClose = vi.fn();
      render(
        <InternAllMembersModal
          isOpen={true}
          onClose={handleClose}
          group={MOCK_GROUP}
          members={MOCK_GROUP_MEMBERS}
        />
      );

      // Bấm nút X
      const xBtn = screen.getByRole('button', { name: /Đóng cửa sổ/i });
      fireEvent.click(xBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Bấm phím Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
     4. KIỂM THỬ API SERVICE getMyMentorGroup VÀ CÁC SCENARIO
     ─────────────────────────────────────────────────────────────────────────── */
  describe('4. Frontend API Service (getMyMentorGroup)', () => {
    it('getMyMentorGroup trả về dữ liệu đầy đủ theo chuẩn Response { ok, status, data }', async () => {
      const res = await getMyMentorGroup();
      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(res.data.mentor).toBeDefined();
      expect(res.data.mentor.full_name).toBe('Trần Hoàng Quân');
      expect(res.data.group).toBeDefined();
      expect(res.data.members).toHaveLength(6);
    });

    it('getMyMentorGroup xử lý scenario no-mentor', async () => {
      const res = await getMyMentorGroup({ scenario: 'no-mentor' });
      expect(res.ok).toBe(true);
      expect(res.data.mentor).toBeNull();
      expect(res.data.group).toBeDefined();
    });

    it('getMyMentorGroup xử lý scenario no-group', async () => {
      const res = await getMyMentorGroup({ scenario: 'no-group' });
      expect(res.ok).toBe(true);
      expect(res.data.group).toBeNull();
      expect(res.data.members).toEqual([]);
    });

    it('getMyMentorGroup xử lý scenario error', async () => {
      const res = await getMyMentorGroup({ scenario: 'error' });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(500);
      expect(res.error).toBeDefined();
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
     5. KIỂM THỬ SECTION TỔNG HỢP VÀ CÁC STATE (LOADING / ERROR / PREVIEW)
     ─────────────────────────────────────────────────────────────────────────── */
  describe('5. Section tổng hợp & Tích hợp API State (InternMentorGroupSection)', () => {
    it('Render đồng thời cả Mentor Card và Group Card trong cùng giao diện', async () => {
      render(<InternMentorGroupSection />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Mentor của tôi' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Nhóm thực tập' })).toBeInTheDocument();
      });
    });

    it('Toolbar cho phép chuyển đổi và kiểm tra các trạng thái giao diện', async () => {
      render(<InternMentorGroupSection />);

      // Ban đầu ở trạng thái "Đầy đủ"
      await waitFor(() => {
        expect(screen.getAllByText('Trần Hoàng Quân').length).toBe(2);
        expect(screen.getByText(/Nhóm Frontend React/i)).toBeInTheDocument();
      });

      // Chuyển sang: "Chưa có Mentor"
      const noMentorBtn = screen.getByRole('button', { name: /Chưa có Mentor/i });
      fireEvent.click(noMentorBtn);

      await waitFor(() => {
        expect(screen.getByText(/Chưa phân công người hướng dẫn/i)).toBeInTheDocument();
        expect(screen.getByText(/Nhóm Frontend React/i)).toBeInTheDocument();
      });

      // Chuyển sang: "Chưa có Nhóm"
      const noGroupBtn = screen.getByRole('button', { name: /Chưa có Nhóm/i });
      fireEvent.click(noGroupBtn);

      await waitFor(() => {
        expect(screen.getByText(/Chưa tham gia nhóm thực tập/i)).toBeInTheDocument();
      });

      // Chuyển sang: "Lỗi tải"
      const errorBtn = screen.getByRole('button', { name: /Lỗi tải/i });
      fireEvent.click(errorBtn);

      await waitFor(() => {
        expect(screen.getByText(/Không thể tải thông tin/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
      });

      // Quay lại: "Đầy đủ"
      const fullBtn = screen.getByRole('button', { name: /Đầy đủ/i });
      fireEvent.click(fullBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Trần Hoàng Quân').length).toBe(2);
        expect(screen.getByText(/Nhóm Frontend React/i)).toBeInTheDocument();
      });
    });

    it('Hàm getInitials trả về chữ cái đầu in hoa chuẩn', () => {
      expect(getInitials('Trần Hoàng Quân')).toBe('TQ');
      expect(getInitials('Nguyễn Văn An')).toBe('NA');
      expect(getInitials('Admin')).toBe('AD');
      expect(getInitials('')).toBe('?');
      expect(getInitials(null)).toBe('?');
    });
  });
});
