import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import InternMentorCard from './InternMentorCard';
import InternGroupCard from './InternGroupCard';
import InternAllMembersModal from './InternAllMembersModal';
import { getMyMentorGroup } from '../../../api/interns';
import './InternMentorGroup.css';

export default function InternMentorGroupSection({
  onShowToast,
  initialMentor,
  initialGroup,
  initialMembers,
  showDevToolbar = false,
}) {
  // Quản lý trạng thái mở Modal danh sách tất cả thành viên
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Trạng thái dữ liệu tải từ API service (khởi tạo null/empty, không dùng mock)
  const [mentorData, setMentorData] = useState(initialMentor ?? null);
  const [groupData, setGroupData] = useState(initialGroup ?? null);
  const [membersData, setMembersData] = useState(initialMembers ?? []);
  const [loading, setLoading] = useState(
    initialMentor === undefined && initialGroup === undefined
  );
  const [error, setError] = useState(null);

  // Hàm gọi API service getMyMentorGroup thật
  const fetchData = useCallback(async () => {
    // Nếu có dữ liệu props khởi tạo từ ngoài (ví dụ trong test), sử dụng trực tiếp
    if (initialMentor !== undefined || initialGroup !== undefined) {
      setMentorData(initialMentor ?? null);
      setGroupData(initialGroup ?? null);
      setMembersData(initialMembers ?? []);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getMyMentorGroup();
      if (res?.ok && res.data) {
        setMentorData(res.data.mentor || null);
        setGroupData(res.data.group || null);
        const membersList = Array.isArray(res.data.members)
          ? res.data.members
          : (Array.isArray(res.data.group?.members) ? res.data.group.members : []);
        setMembersData(membersList);
      } else {
        const errMsg =
          res?.data?.detail ||
          res?.data?.message ||
          res?.error ||
          'Không thể tải thông tin Mentor và Nhóm thực tập.';
        setError(errMsg);
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [initialMentor, initialGroup, initialMembers]);

  // Tải dữ liệu ban đầu khi component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <section
      className="intern-mentor-group-section"
      aria-label="Phần Mentor hướng dẫn và Nhóm dự án"
    >
      {/* ── TOOLBAR CHUYỂN ĐỔI TRẠNG THÁI UI (CHỈ RENDER TRONG MÔI TRƯỜNG DEV/TEST) ── */}
      {showDevToolbar && (
        <div className="mentor-group-toolbar">
          <div className="toolbar-info-badge">
            <span>Thông tin phân công: Mentor & Nhóm thực tập (Dev Mode)</span>
          </div>
        </div>
      )}

      {/* ── HIỂN THỊ KHI ĐANG TẢI DỮ LIỆU (LOADING STATE) ── */}
      {loading && (
        <div className="intern-mentor-group-loading-box" role="status" aria-live="polite">
          <span className="loading-spinner-circle" />
          <span>Đang tải thông tin Mentor và Nhóm thực tập...</span>
        </div>
      )}

      {/* ── HIỂN THỊ KHI CÓ LỖI (ERROR STATE) ── */}
      {!loading && error && (
        <div className="intern-mentor-group-error-box" role="alert">
          <div className="error-box-icon">
            <AlertTriangle size={22} />
          </div>
          <h3 className="error-box-title">Không thể tải thông tin</h3>
          <p className="error-box-desc">{error}</p>
          <button
            type="button"
            className="btn-retry-load"
            onClick={fetchData}
          >
            <RotateCcw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* ── GRID 2 CỘT: "MENTOR CỦA TÔI" & "NHÓM THỰC TẬP" ── */}
      {!loading && !error && (
        <div className="intern-mentor-group-grid">
          {/* Khối 1: Mentor của tôi */}
          <InternMentorCard
            mentor={mentorData}
            onShowToast={onShowToast}
          />

          {/* Khối 2: Nhóm thực tập */}
          <InternGroupCard
            group={groupData}
            members={membersData}
            onViewAllMembers={() => setIsModalOpen(true)}
          />
        </div>
      )}

      {/* ── MODAL XEM TẤT CẢ THÀNH VIÊN TRONG NHÓM ── */}
      <InternAllMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={groupData}
        members={membersData}
      />
    </section>
  );
}

