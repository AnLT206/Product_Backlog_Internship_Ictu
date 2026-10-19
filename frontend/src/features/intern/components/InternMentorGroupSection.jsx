import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import InternMentorCard from './InternMentorCard';
import InternGroupCard from './InternGroupCard';
import InternAllMembersModal from './InternAllMembersModal';
import { getMyMentorGroup } from '../../../api/interns';
import { getRealtimeSyncState, subscribeRealtimeEvents } from '../../../utils/realtimeSync';
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

  // Hàm gọi API service getMyMentorGroup thật kết hợp Realtime Sync fallback
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
      if (res && res.ok === false) {
        setError(res.error || `Lỗi kết nối máy chủ ${res.status || 500}`);
        setMentorData(null);
        setGroupData(null);
        setMembersData([]);
        return;
      }

      if (res?.ok && res.data && (res.data.mentor || res.data.group)) {
        setMentorData(res.data.mentor || null);
        setGroupData(res.data.group || null);
        const membersList = Array.isArray(res.data.members)
          ? res.data.members
          : (Array.isArray(res.data.group?.members) ? res.data.group.members : []);
        setMembersData(membersList);
        setError(null);
      } else {
        // Fallback đọc từ Realtime Sync State (khi vừa được phân công từ HR portal)
        const syncState = getRealtimeSyncState();
        let storedUser = {};
        try {
          storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        } catch {}

        const currentId = Number(storedUser.id);
        const currentEmail = (storedUser.email || '').toLowerCase().trim();

        const assign = (syncState.mentorAssignments || []).find(
          (a) =>
            (currentId && Number(a.intern_id) === currentId) ||
            (currentEmail && a.email && a.email.toLowerCase().trim() === currentEmail) ||
            (storedUser.full_name && a.student === storedUser.full_name)
        );

        if (assign) {
          const mentorId = Number(assign.mentor_id) || 3;
          const mentorName = assign.mentor || 'Trần Hoàng Quân';
          const progName = assign.program_name || 'Khóa K20 - Kỳ Thu 2026';
          const deptName = assign.company || 'Trung tâm Phát triển Phần mềm ICTU';
          const groupTitle = assign.group_name || assign.project || `Nhóm ${mentorName}`;

          setMentorData({
            id: mentorId,
            full_name: mentorName,
            email: mentorId === 3 ? 'mentor@ictu.edu.vn' : 'mentor2@ictu.edu.vn',
            department: deptName,
            position: assign.mentor_role || 'Senior Fullstack Tech Lead',
            phone: '0988.234.567',
            avatar_url: null,
            status: 'online',
            status_text: 'Đang trực tuyến',
          });

          setGroupData({
            id: assign.group_id || 1,
            code: 'GRP-01',
            name: groupTitle,
            program_name: progName,
            department_name: deptName,
            mentor_id: mentorId,
            mentor_name: mentorName,
            total_members: 4,
            max_slots: 5,
            status: 'active',
            description: 'Nhóm thực tập theo kỳ phân công từ nhà trường và doanh nghiệp.',
          });

          setMembersData([
            {
              id: currentId || 5,
              code: storedUser.code || 'TTS0001',
              full_name: storedUser.full_name || 'Thực tập sinh',
              role: 'Thành viên',
              is_current_user: true,
              is_me: true,
              email: storedUser.email,
              phone: '0912.345.678',
              university: 'Đại học CNTT & TT (ICTU)',
              major: 'Công nghệ thông tin',
            },
          ]);
          setError(null);
        } else {
          setMentorData(null);
          setGroupData(null);
          setMembersData([]);
          setError(null);
        }
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi gọi dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [initialMentor, initialGroup, initialMembers]);

  // Tải dữ liệu ban đầu và lắng nghe sự kiện đồng bộ từ HR realtime
  useEffect(() => {
    fetchData();
    const unsub = subscribeRealtimeEvents(() => {
      fetchData();
    });
    return () => unsub();
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

