import { useState, useEffect, useMemo, useCallback } from 'react';
import { Info, RotateCcw, AlertTriangle } from 'lucide-react';
import InternMentorCard from './InternMentorCard';
import InternGroupCard from './InternGroupCard';
import InternAllMembersModal from './InternAllMembersModal';
import { getMyMentorGroup } from '../../../api/interns';
import {
  MOCK_MENTOR,
  MOCK_GROUP,
  MOCK_GROUP_MEMBERS,
} from '../mentorGroupMock';
import './InternMentorGroup.css';

export default function InternMentorGroupSection({
  onShowToast,
  initialMentor,
  initialGroup,
  initialMembers,
}) {
  // Quản lý trạng thái mở Modal danh sách tất cả thành viên
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quản lý chế độ xem trước / scenario: 'full' | 'no-mentor' | 'no-group' | 'empty-members' | 'error'
  const [previewState, setPreviewState] = useState('full');

  // Trạng thái dữ liệu tải từ API service
  const [mentorData, setMentorData] = useState(initialMentor !== undefined ? initialMentor : MOCK_MENTOR);
  const [groupData, setGroupData] = useState(initialGroup !== undefined ? initialGroup : MOCK_GROUP);
  const [membersData, setMembersData] = useState(initialMembers !== undefined ? initialMembers : MOCK_GROUP_MEMBERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hàm gọi API service getMyMentorGroup
  const fetchData = useCallback(async (scenario = 'full') => {
    // Nếu có dữ liệu props khởi tạo từ ngoài và đang ở chế độ default, giữ nguyên
    if (initialMentor !== undefined && scenario === 'full') {
      setMentorData(initialMentor);
      setGroupData(initialGroup !== undefined ? initialGroup : MOCK_GROUP);
      setMembersData(initialMembers !== undefined ? initialMembers : MOCK_GROUP_MEMBERS);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getMyMentorGroup({ scenario, delay: 100 });
      if (res.ok && res.data) {
        setMentorData(res.data.mentor);
        setGroupData(res.data.group);
        setMembersData(res.data.members || []);
      } else {
        setError(res.error || 'Không thể tải thông tin Mentor và Nhóm.');
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi gọi dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [initialMentor, initialGroup, initialMembers]);

  // Tải dữ liệu ban đầu và khi previewState thay đổi
  useEffect(() => {
    fetchData(previewState);
  }, [fetchData, previewState]);

  // Dữ liệu hiển thị cuối cùng
  const activeMentor = useMemo(() => {
    if (previewState === 'no-mentor') return null;
    return mentorData;
  }, [previewState, mentorData]);

  const activeGroup = useMemo(() => {
    if (previewState === 'no-group') return null;
    return groupData;
  }, [previewState, groupData]);

  const activeMembers = useMemo(() => {
    if (previewState === 'no-group' || previewState === 'empty-members') return [];
    return membersData;
  }, [previewState, membersData]);

  return (
    <section
      className="intern-mentor-group-section"
      aria-label="Phần Mentor hướng dẫn và Nhóm dự án"
    >
      {/* ── TOOLBAR CHUYỂN ĐỔI TRẠNG THÁI UI (SECTION 12 & TASK 2 TESTING) ── */}
      <div className="mentor-group-toolbar">
        <div className="toolbar-info-badge">
          <Info size={14} />
          <span>Thông tin phân công: Mentor & Nhóm thực tập</span>
        </div>

        <div className="toolbar-state-switcher">
          <span style={{ fontSize: '0.72rem', color: '#64748B', marginRight: '4px' }}>
            Xem thử trạng thái:
          </span>
          <button
            type="button"
            className={`state-switch-btn ${previewState === 'full' ? 'is-active' : ''}`}
            onClick={() => setPreviewState('full')}
            title="Hiển thị đầy đủ Mentor và Nhóm có thành viên"
          >
            Đầy đủ
          </button>
          <button
            type="button"
            className={`state-switch-btn ${previewState === 'no-mentor' ? 'is-active' : ''}`}
            onClick={() => setPreviewState('no-mentor')}
            title="Kiểm tra trạng thái khi TTS chưa có Mentor"
          >
            Chưa có Mentor
          </button>
          <button
            type="button"
            className={`state-switch-btn ${previewState === 'no-group' ? 'is-active' : ''}`}
            onClick={() => setPreviewState('no-group')}
            title="Kiểm tra trạng thái khi TTS chưa được phân nhóm"
          >
            Chưa có Nhóm
          </button>
          <button
            type="button"
            className={`state-switch-btn ${previewState === 'empty-members' ? 'is-active' : ''}`}
            onClick={() => setPreviewState('empty-members')}
            title="Kiểm tra trạng thái nhóm chưa có thành viên khác"
          >
            Nhóm trống
          </button>
          <button
            type="button"
            className={`state-switch-btn ${previewState === 'error' ? 'is-active' : ''}`}
            onClick={() => setPreviewState('error')}
            title="Kiểm tra trạng thái lỗi kết nối dữ liệu"
          >
            Lỗi tải
          </button>
        </div>
      </div>

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
            onClick={() => fetchData(previewState)}
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
            mentor={activeMentor}
            onShowToast={onShowToast}
          />

          {/* Khối 2: Nhóm thực tập */}
          <InternGroupCard
            group={activeGroup}
            members={activeMembers}
            onViewAllMembers={() => setIsModalOpen(true)}
          />
        </div>
      )}

      {/* ── MODAL XEM TẤT CẢ THÀNH VIÊN TRONG NHÓM ── */}
      <InternAllMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={activeGroup}
        members={activeMembers}
      />
    </section>
  );
}

