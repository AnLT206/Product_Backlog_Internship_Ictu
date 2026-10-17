import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import InternMentorCard from './InternMentorCard';
import InternGroupCard from './InternGroupCard';
import InternAllMembersModal from './InternAllMembersModal';
import {
  MOCK_MENTOR,
  MOCK_GROUP,
  MOCK_GROUP_MEMBERS,
} from '../mockMentorGroupData';
import './InternMentorGroup.css';

export default function InternMentorGroupSection({ onShowToast, initialMentor, initialGroup, initialMembers }) {
  // Quản lý trạng thái mở Modal danh sách tất cả thành viên
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quản lý chế độ xem trước (UI State Preview: 'full' | 'no-mentor' | 'no-group')
  // Giúp lập trình viên, QA và PO dễ dàng kiểm tra các trạng thái giao diện theo yêu cầu Section 12
  const [previewState, setPreviewState] = useState('full');

  const mentorData = useMemo(() => {
    if (previewState === 'no-mentor') return null;
    return initialMentor !== undefined ? initialMentor : MOCK_MENTOR;
  }, [previewState, initialMentor]);

  const groupData = useMemo(() => {
    if (previewState === 'no-group') return null;
    return initialGroup !== undefined ? initialGroup : MOCK_GROUP;
  }, [previewState, initialGroup]);

  const membersData = useMemo(() => {
    if (previewState === 'no-group') return [];
    return initialMembers !== undefined ? initialMembers : MOCK_GROUP_MEMBERS;
  }, [previewState, initialMembers]);

  return (
    <section
      className="intern-mentor-group-section"
      aria-label="Phần Mentor hướng dẫn và Nhóm dự án"
    >
      {/* ── TOOLBAR CHUYỂN ĐỔI TRẠNG THÁI UI (SECTION 12) ── */}
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
        </div>
      </div>

      {/* ── GRID 2 CỘT: "MENTOR CỦA TÔI" & "NHÓM THỰC TẬP" (SECTION 6 & 8) ── */}
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

      {/* ── MODAL XEM TẤT CẢ THÀNH VIÊN TRONG NHÓM (SECTION 9) ── */}
      <InternAllMembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={groupData}
        members={membersData}
      />
    </section>
  );
}
