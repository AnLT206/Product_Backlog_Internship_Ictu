import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InternApplicantDashboard from './InternApplicantDashboard';
import InternUploadPage from './InternUploadPage';
import { isApplicantUser } from '../../context/AuthContext';

// Mock AuthContext
const mockUpdateUser = vi.fn();
let mockCurrentUser = {
  id: 7,
  email: 'ungvien@ictu.edu.vn',
  full_name: 'Nguyễn Văn Ứng Viên',
  code: 'TTS0003',
  role: 'intern',
  status: 'pending',
  phone: '0987654321',
  university: 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)',
};

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockCurrentUser,
      updateUser: mockUpdateUser,
      isAuthenticated: true,
    }),
  };
});

// Mock api/documents
vi.mock('../../api/documents', () => ({
  uploadDocument: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: 101, file_name: 'CV_Test.pdf', created_at: '2026-10-09T08:00:00Z' },
  }),
  getMyDocuments: vi.fn().mockResolvedValue({
    ok: true,
    data: [],
  }),
  deleteDocument: vi.fn().mockResolvedValue({ ok: true }),
  getDocumentDownloadUrl: vi.fn().mockReturnValue('http://mock/download'),
  getDocumentViewUrl: vi.fn().mockReturnValue('http://mock/view'),
  previewDocumentFile: vi.fn().mockResolvedValue({ ok: true, data: { paragraphs: ['Sample paragraph'] } }),
  viewDocument: vi.fn().mockResolvedValue({ ok: true, data: { paragraphs: ['Sample paragraph'] } }),
}));

describe('InternApplicantPages Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. isApplicantUser Helper Function', () => {
    it('nhận diện chính xác ứng viên qua email, mã, role hoặc status', () => {
      expect(isApplicantUser({ email: 'ungvien@ictu.edu.vn', status: 'pending' })).toBe(true);
      expect(isApplicantUser({ code: 'TTS0003', status: 'pending' })).toBe(true);
      expect(isApplicantUser({ code: 'TTS9999' })).toBe(true);
      expect(isApplicantUser({ role: 'applicant' })).toBe(true);
      expect(isApplicantUser({ full_name: 'Ứng viên' })).toBe(true);
    });

    it('không nhầm lẫn tài khoản TTS chính thức', () => {
      expect(isApplicantUser({ code: 'TTS0001', email: 'intern@ictu.edu.vn', role: 'intern', status: 'active' })).toBe(false);
      expect(isApplicantUser({ code: 'TTS0002', email: 'tts02@student.ictu.edu.vn', role: 'intern', status: 'active' })).toBe(false);
    });

    it('trả về false khi ứng viên đã hoàn tất ký hợp đồng onboarded', () => {
      localStorage.setItem('applicant_onboarded', 'true');
      expect(isApplicantUser({ code: 'TTS0003', email: 'ungvien@ictu.edu.vn' })).toBe(false);
    });
  });

  describe('2. InternApplicantDashboard Component', () => {
    it('render đầy đủ 6 giai đoạn lộ trình thực tập doanh nghiệp ICTU', () => {
      render(
        <BrowserRouter>
          <InternApplicantDashboard user={mockCurrentUser} />
        </BrowserRouter>
      );

      expect(screen.getByText('Lộ Trình Thực Tập Doanh Nghiệp ICTU')).toBeInTheDocument();
      expect(screen.getByText('Ứng tuyển & Sàng lọc CV')).toBeInTheDocument();
      expect(screen.getByText('Phỏng vấn & Đánh giá năng lực')).toBeInTheDocument();
      expect(screen.getByText('Tiếp nhận & Onboarding')).toBeInTheDocument();
      expect(screen.getByText('Đào tạo công nghệ & Agile')).toBeInTheDocument();
      expect(screen.getByText('Thực chiến dự án & Mentor 1-1')).toBeInTheDocument();
      expect(screen.getByText('Nghiệm thu & Chuyển tiếp Junior')).toBeInTheDocument();
    });

    it('hiển thị Banner Thông báo hợp đồng khi có hợp đồng chờ ký từ HR', async () => {
      const mockContract = {
        id: 99,
        doc_type: 'Hợp Đồng Tiếp Nhận Thực Tập',
        department: 'Trung tâm Phần mềm ICTU',
        start_date: '01/10/2026',
        end_date: '31/12/2026',
        allowance: '3.500.000 VNĐ / tháng',
        notes: 'Điều khoản cam kết thực tập bảo mật thông tin.',
      };
      localStorage.setItem('applicant_pending_contract', JSON.stringify({ contract: mockContract }));

      render(
        <BrowserRouter>
          <InternApplicantDashboard user={mockCurrentUser} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/THÔNG BÁO: BẠN NHẬN ĐƯỢC HỢP ĐỒNG TIẾP NHẬN THỰC TẬP TỪ PHÒNG NHÂN SỰ/i)).toBeInTheDocument();
      });

      const openContractBtn = screen.getByRole('button', { name: /Xem & Ký hợp đồng ngay/i });
      fireEvent.click(openContractBtn);

      // Modal hợp đồng mở ra
      expect(screen.getByText(/BÊN B: SINH VIÊN THỰC TẬP/i)).toBeInTheDocument();
      expect(screen.getAllByText(/3.500.000 VNĐ \/ tháng/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Điều khoản cam kết thực tập bảo mật thông tin/i)).toBeInTheDocument();
    });

    it('khi ứng viên bị HR từ chối: TUYỆT ĐỐI KHÔNG hiển thị banner hợp đồng và hiển thị modal từ chối kèm lý do', async () => {
      // Giả lập HR đã ra quyết định từ chối
      const rejectReason = 'CV chưa đáp ứng đủ tiêu chuẩn kỹ thuật đợt này.';
      localStorage.setItem('applicant_decision_status', JSON.stringify({
        status: 'rejected',
        applicantId: 7,
        reason: rejectReason,
      }));
      // Giả lập cache cũ còn sót hợp đồng
      localStorage.setItem('applicant_pending_contract', JSON.stringify({
        contract: {
          id: 99,
          doc_type: 'Hợp Đồng Cũ Bị Hủy',
        },
      }));

      render(
        <BrowserRouter>
          <InternApplicantDashboard user={mockCurrentUser} />
        </BrowserRouter>
      );

      // Banner hợp đồng tuyệt đối không được xuất hiện
      await waitFor(() => {
        expect(screen.queryByText(/THÔNG BÁO: BẠN NHẬN ĐƯỢC HỢP ĐỒNG TIẾP NHẬN THỰC TẬP TỪ PHÒNG NHÂN SỰ/i)).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/Xem Hợp Đồng Thực Tập/i)).not.toBeInTheDocument();

      // Modal từ chối phải hiển thị kèm lý do từ chối
      expect(screen.getByText(/Thông Báo Kết Quả Tuyển Dụng/i)).toBeInTheDocument();
      expect(screen.getByText(/CV của bạn chưa đạt yêu cầu tiếp nhận thực tập đợt này/i)).toBeInTheDocument();
      expect(screen.getByText(rejectReason)).toBeInTheDocument();
      expect(screen.getByText(/Nộp lại CV mới/i)).toBeInTheDocument();
    });
  });

  describe('3. InternUploadPage Component', () => {
    it('render thanh tiến trình xét tuyển 4 bước và khu vực tải lên CV', () => {
      render(
        <BrowserRouter>
          <InternUploadPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Tiến Trình Xét Tuyển Hồ Sơ Của Bạn')).toBeInTheDocument();
      expect(screen.getByText('Tài Liệu & CV Ứng Tuyển')).toBeInTheDocument();
      expect(screen.getByText('Đã nộp hồ sơ')).toBeInTheDocument();
      expect(screen.getByText('Đang xem xét')).toBeInTheDocument();
      expect(screen.getByText('Phỏng vấn')).toBeInTheDocument();
      expect(screen.getByText('Kết quả duyệt')).toBeInTheDocument();
    });

    it('hiển thị Banner Hợp đồng tiếp nhận trên trang Upload CV khi có hợp đồng chờ ký', async () => {
      const mockContract = {
        id: 100,
        doc_type: 'Hợp Đồng Thực Tập 2026',
        department: 'AI & Data Lab',
        start_date: '15/10/2026',
        end_date: '15/01/2027',
        allowance: '4.000.000 VNĐ / tháng',
      };
      localStorage.setItem('applicant_pending_contract', JSON.stringify({ contract: mockContract }));

      render(
        <BrowserRouter>
          <InternUploadPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/THÔNG BÁO: BẠN NHẬN ĐƯỢC HỢP ĐỒNG TIẾP NHẬN THỰC TẬP TỪ PHÒNG NHÂN SỰ/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/AI & Data Lab/i)).toBeInTheDocument();
    });

    it('khi ứng viên có profile_status "rejected": trang InternUploadPage TUYỆT ĐỐI KHÔNG mở modal hợp đồng và hiển thị thông báo từ chối', async () => {
      localStorage.setItem('applicant_decision_status', JSON.stringify({
        status: 'rejected',
        applicantId: 7,
        reason: 'CV chưa đạt yêu cầu đợt tuyển.',
      }));
      // Giả lập hợp đồng của người khác còn trong storage
      localStorage.setItem('applicant_pending_contract', JSON.stringify({
        applicantId: 5,
        targetEmail: 'intern@ictu.edu.vn',
        contract: {
          id: 1,
          student_name: 'Nguyễn Văn An',
          doc_type: 'HĐTT-2026-001',
        },
      }));

      render(
        <BrowserRouter>
          <InternUploadPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Kết Quả Xét Duyệt Hồ Sơ: Chưa tiếp nhận hồ sơ đợt này/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/HĐTT-2026-001/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/Chưa tiếp nhận/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/Đã phê duyệt/i)).not.toBeInTheDocument();
    });

    it('hợp đồng của thực tập sinh khác (applicantId khác) TUYỆT ĐỐI KHÔNG hiển thị cho ứng viên', async () => {
      localStorage.setItem('applicant_pending_contract', JSON.stringify({
        applicantId: 5,
        targetEmail: 'intern@ictu.edu.vn',
        contract: {
          id: 1,
          student_name: 'Nguyễn Văn An',
          doc_type: 'Hợp Đồng Của TTS Khác',
        },
      }));

      render(
        <BrowserRouter>
          <InternUploadPage />
        </BrowserRouter>
      );

      // Tuyệt đối không hiển thị hợp đồng của người khác
      expect(screen.queryByText(/Hợp Đồng Của TTS Khác/i)).not.toBeInTheDocument();
    });
  });
});

