import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FolderKanban,
  Calendar,
  Clock,
  Building2,
  Users,
  Award,
  FileText,
  CheckCircle2,
  UserCheck,
  Briefcase,
  GraduationCap,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ChevronRight,
  Download,
  ExternalLink,
  Info,
  Layers,
  FileCheck2,
  Clock3,
  Star,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRealtimeSyncState, subscribeRealtimeEvents } from '../../utils/realtimeSync';
import { getMyMentorGroup } from '../../api/interns';
import './InternProgramPage.css';

export default function InternProgramPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncData, setSyncData] = useState(() => getRealtimeSyncState());
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'milestones' | 'documents'
  const [toastMessage, setToastMessage] = useState('');
  const [selectedWeekStep, setSelectedWeekStep] = useState(4);
  const [reportHistory, setReportHistory] = useState(() => {
    try {
      const raw = localStorage.getItem('intern_report_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [mentorGroupApi, setMentorGroupApi] = useState(null);

  // Tải dữ liệu thực tập sinh và kỳ thực tập
  const loadProgramData = useCallback(async () => {
    setSyncData(getRealtimeSyncState());
    try {
      const raw = localStorage.getItem('intern_report_history');
      if (raw) setReportHistory(JSON.parse(raw));
    } catch {}

    try {
      const res = await getMyMentorGroup();
      if (res && res.ok && res.data) {
        setMentorGroupApi(res.data);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Lộ trình tiến trình chi tiết 12 tuần của TTS
  const weeksTimeline = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const w = i + 1;
      const foundReport = Array.isArray(reportHistory)
        ? reportHistory.find(
            (r) =>
              r.week_number === w ||
              r.week === w ||
              (r.week_range && r.week_range.includes(`Tuần ${String(w).padStart(2, '0')}`)) ||
              (r.title && r.title.includes(`Tuần ${w}`))
          )
        : null;

      let status = 'upcoming'; // 'completed' | 'in_progress' | 'upcoming'
      let score = foundReport?.score !== undefined ? foundReport.score : null;
      let feedback = foundReport?.feedback || foundReport?.mentor_feedback || '';
      let title;

      if (w === 1) {
        status = 'completed';
        score = score !== null ? score : 9.0;
        feedback = feedback || 'Tiếp nhận dự án, ký cam kết NDA và setup môi trường dev hoàn tất.';
        title = 'Onboarding & Cài đặt môi trường';
      } else if (w === 2) {
        status = 'completed';
        score = score !== null ? score : 8.5;
        feedback = feedback || 'Nắm vững tài liệu kiến trúc, quy chuẩn mã nguồn Clean Code & Git Flow.';
        title = 'Nghiên cứu tài liệu & Git Flow';
      } else if (w === 3) {
        status = 'completed';
        score = score !== null ? score : 9.0;
        feedback = feedback || 'Báo cáo đầy đủ, hoàn thành các API phân hệ người dùng xuất sắc.';
        title = 'Xây dựng Module Xác thực & Auth';
      } else if (w === 4) {
        status = 'in_progress';
        title = 'Phát triển Sprint 1 & Viết Unit Test';
        feedback = feedback || 'Đang trong tuần làm việc. Chuẩn bị nộp báo cáo tuần vào thứ Sáu.';
      } else if (w <= 8) {
        title = `Triển khai Sprint & Tính năng cốt lõi (Tuần ${w})`;
      } else if (w === 9 || w === 10) {
        title = `Kiểm thử hệ thống & Đánh giá giữa kỳ (Tuần ${w})`;
      } else {
        title = `Hoàn thiện báo cáo & Bảo vệ tốt nghiệp (Tuần ${w})`;
      }

      return {
        week_number: w,
        title,
        status,
        score,
        feedback,
      };
    });
  }, [reportHistory]);

  const selectedWeekData = useMemo(() => {
    return weeksTimeline.find((item) => item.week_number === selectedWeekStep) || weeksTimeline[0];
  }, [weeksTimeline, selectedWeekStep]);

  const gradedWeeks = useMemo(() => {
    return weeksTimeline.filter((w) => typeof w.score === 'number' && w.score > 0);
  }, [weeksTimeline]);

  const avgScore = useMemo(() => {
    if (gradedWeeks.length === 0) return 'Chưa có';
    const sum = gradedWeeks.reduce((acc, cur) => acc + cur.score, 0);
    return (sum / gradedWeeks.length).toFixed(1);
  }, [gradedWeeks]);

  useEffect(() => {
    loadProgramData();
    const unsubscribe = subscribeRealtimeEvents(() => {
      loadProgramData();
    });
    return () => unsubscribe();
  }, [loadProgramData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Tập hợp các ID thực tập sinh đã bị hủy phân công khỏi Mentor/Nhóm
  const unassignedSet = useMemo(() => {
    return new Set((syncData.unassigned_intern_ids || []).map(Number));
  }, [syncData]);

  // Kiểm tra xem TTS hiện tại có đang ở trạng thái hủy/chưa phân công không
  const isUnassigned = useMemo(() => {
    const currentId = Number(user?.id);
    if (currentId && unassignedSet.has(currentId)) return true;
    if (mentorGroupApi) {
      if (mentorGroupApi.status === 'unassigned') return true;
      if (!mentorGroupApi.mentor && !mentorGroupApi.group) return true;
    }
    return false;
  }, [user, unassignedSet, mentorGroupApi]);

  // Trích xuất thông tin Kỳ thực tập và phân công cụ thể của TTS
  const currentInternAssignment = useMemo(() => {
    if (isUnassigned) return null;
    const currentId = Number(user?.id);
    const currentEmail = (user?.email || '').toLowerCase().trim();
    const currentName = (user?.full_name || '').trim();

    const assignments = syncData.mentorAssignments || [];
    const found = assignments.find(
      (a) =>
        !unassignedSet.has(Number(a.intern_id)) &&
        ((currentId && Number(a.intern_id) === currentId) ||
          (currentEmail && a.email && a.email.toLowerCase().trim() === currentEmail) ||
          (currentName && a.student === currentName))
    );

    return found || null;
  }, [syncData, user, isUnassigned, unassignedSet]);

  // Hợp đồng liên quan của TTS
  const currentContract = useMemo(() => {
    const currentId = Number(user?.id);
    const currentEmail = (user?.email || '').toLowerCase().trim();
    const contracts = syncData.contracts || [];
    return contracts.find(
      (c) =>
        (currentId && Number(c.intern_id) === currentId) ||
        (currentEmail && c.email && c.email.toLowerCase().trim() === currentEmail)
    );
  }, [syncData, user]);

  // Tên kỳ thực tập
  const programName =
    mentorGroupApi?.group?.program_name ||
    currentInternAssignment?.program_name ||
    user?.program_name ||
    'Khóa K20 - Kỳ Thu 2026';

  // Phòng ban & Nhóm dự án
  const departmentName =
    mentorGroupApi?.group?.department_name ||
    currentInternAssignment?.company ||
    currentInternAssignment?.department_name ||
    'Phòng Kỹ thuật & Hạ tầng Cloud';

  const hasGroup = Boolean(
    !isUnassigned &&
    (mentorGroupApi?.group?.name || currentInternAssignment?.group_name || currentInternAssignment?.project)
  );

  const groupName = hasGroup
    ? (mentorGroupApi?.group?.name || currentInternAssignment?.group_name || currentInternAssignment?.project)
    : 'Chưa phân nhóm';

  // Thông tin Mentor phụ trách
  const activeMentor = useMemo(() => {
    if (isUnassigned) return null;
    if (mentorGroupApi?.mentor) return mentorGroupApi.mentor;
    if (currentInternAssignment?.mentor) {
      return {
        full_name: currentInternAssignment.mentor,
        mentor: currentInternAssignment.mentor,
        email: currentInternAssignment.mentor_email || 'mentor@ictu.edu.vn',
        phone: currentInternAssignment.mentor_phone || '0981 234 567',
        position: currentInternAssignment.mentor_role || 'Trưởng nhóm Phát triển AI & Web',
      };
    }
    return null;
  }, [isUnassigned, mentorGroupApi, currentInternAssignment]);

  const hasMentor = Boolean(activeMentor && activeMentor.full_name);
  const mentorName = hasMentor ? activeMentor.full_name : null;
  const mentorEmail = hasMentor ? (activeMentor.email || 'mentor@ictu.edu.vn') : null;
  const mentorPhone = hasMentor ? (activeMentor.phone || activeMentor.phone_number || '0981 234 567') : null;
  const mentorRole = hasMentor ? (activeMentor.position || activeMentor.mentor_role || 'Trưởng nhóm Phát triển AI & Web') : null;

  // Danh sách các thành viên cùng nhóm / cùng đợt thực tập
  const groupMembers = useMemo(() => {
    if (isUnassigned || !hasGroup) {
      return [];
    }

    if (mentorGroupApi?.members && mentorGroupApi.members.length > 0) {
      return mentorGroupApi.members.map((m) => ({
        id: m.id,
        code: m.code || `TTS${String(m.id).padStart(4, '0')}`,
        full_name: m.full_name || 'Thực tập sinh',
        role: m.role || 'Thành viên',
        university: m.university || 'Đại học CNTT & TT (ICTU)',
        major: m.major || 'Công nghệ thông tin',
        email: m.email || '',
        status: 'active',
        isMe: Boolean(m.is_me || m.is_current_user || (user?.id && Number(m.id) === Number(user.id))),
      }));
    }

    // Nếu có thông tin phân công cục bộ từ HR
    if (currentInternAssignment) {
      return [
        {
          id: 1,
          code: 'TTS0011',
          full_name: 'Phạm Tuấn Kiệt',
          role: 'Nhóm trưởng TTS',
          university: 'Đại học CNTT & TT (ICTU)',
          major: 'Kỹ thuật phần mềm',
          email: 'kiet.pt@student.ictu.edu.vn',
          status: 'active',
        },
        {
          id: 2,
          code: 'TTS0012',
          full_name: 'Vũ Thùy Linh',
          role: 'Thành viên',
          university: 'Đại học CNTT & TT (ICTU)',
          major: 'Khoa học máy tính',
          email: 'linh.vt@student.ictu.edu.vn',
          status: 'active',
        },
        {
          id: user?.id || 3,
          code: user?.code || 'DTC26001',
          full_name: user?.full_name || 'Đỗ Hoàng Anh',
          role: 'Thành viên (Bạn)',
          university: user?.university || 'Đại học CNTT & TT (ICTU)',
          major: user?.major || 'Công nghệ thông tin',
          email: user?.email || 'hoanganh@student.ictu.edu.vn',
          status: 'active',
          isMe: true,
        },
        {
          id: 4,
          code: 'TTS0001',
          full_name: 'Nguyễn Văn An',
          role: 'Thành viên',
          university: 'Đại học CNTT & TT (ICTU)',
          major: 'Công nghệ thông tin',
          email: 'an.nv@student.ictu.edu.vn',
          status: 'active',
        },
        {
          id: 5,
          code: 'TTS0002',
          full_name: 'Lê Hoàng Nam',
          role: 'Thành viên',
          university: 'Đại học CNTT & TT (ICTU)',
          major: 'Kỹ thuật phần mềm',
          email: 'nam.lh@student.ictu.edu.vn',
          status: 'active',
        },
      ];
    }

    return [];
  }, [user, isUnassigned, hasGroup, mentorGroupApi, currentInternAssignment]);

  // Tiến độ thời gian kỳ thực tập (Giả lập kỳ 12 tuần, hiện tại tuần 4)
  const currentWeek = 4;
  const totalWeeks = 12;
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="intern-program-container">
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="program-toast-alert" role="status">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER BANNER: TÊN KỲ THỰC TẬP VÀ THÔNG TIN TỔNG QUAN ── */}
      <section className="program-hero-card" aria-label="Thông tin tổng quan Kỳ thực tập">
        <div className="program-hero-content">
          <div className="program-badge-cluster">
            <span className="badge-period-status">
              <span className="status-live-dot" />
              Đang diễn ra (Tuần {currentWeek}/{totalWeeks})
            </span>
            <span className="badge-program-id">Mã kỳ: PRG-2026-F · K20</span>
          </div>

          <h1 className="program-main-title">{programName}</h1>
          <p className="program-main-desc">
            Chương trình Thực tập Doanh nghiệp & Ứng dụng Thực tế dành cho sinh viên Khóa 20 Khoa Công nghệ Thông tin, Đại học CNTT & TT Thái Nguyên (ICTU) hợp tác cùng Trung tâm Phần mềm và Doanh nghiệp đối tác.
          </p>

          <div className="program-meta-chips">
            <div className="meta-chip">
              <Calendar size={15} />
              <span>Thời gian: <strong>01/10/2026 – 31/12/2026</strong></span>
            </div>
            <div className="meta-chip">
              <Building2 size={15} />
              <span>Phòng ban: <strong>{departmentName}</strong></span>
            </div>
            <div className="meta-chip">
              <FolderKanban size={15} />
              <span>Nhóm dự án: <strong>{hasGroup ? groupName : (isUnassigned ? 'Chưa phân nhóm' : groupName)}</strong></span>
            </div>
            <div className="meta-chip">
              <UserCheck size={15} />
              <span>
                Mentor phụ trách:{' '}
                <strong>
                  {hasMentor ? mentorName : 'Chưa phân công (Chờ HR)'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Thanh tiến độ kỳ thực tập */}
        <div className="program-progress-box">
          <div className="progress-header-row">
            <span className="progress-label">Tiến độ kỳ thực tập</span>
            <span className="progress-val-text">{progressPercent}% ({currentWeek}/{totalWeeks} tuần)</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-footer-row">
            <span className="date-bound">Khởi động: 01/10/2026</span>
            <span className="date-bound">Bảo vệ: 31/12/2026</span>
          </div>
        </div>
      </section>

      {/* ── THANH CHUYỂN ĐỔI TAB NỘI DUNG TRONG KỲ THỰC TẬP ── */}
      <nav className="program-subnav-tabs" aria-label="Các mục nội dung kỳ thực tập">
        <button
          type="button"
          className={`program-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} />
          <span>Tổng quan & Mục tiêu</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeTab === 'members' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={16} />
          <span>Thành viên nhóm ({groupMembers.length})</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeTab === 'milestones' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          <Clock3 size={16} />
          <span>Lộ trình & Cột mốc</span>
        </button>
        <button
          type="button"
          className={`program-tab-btn ${activeTab === 'documents' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileCheck2 size={16} />
          <span>Hợp đồng & Văn bản</span>
        </button>
      </nav>

      {/* ── NỘI DUNG TAB 1: TỔNG QUAN & MỤC TIÊU ── */}
      {activeTab === 'overview' && (
        <div className="tab-pane-content tab-pane-overview">
          <div className="overview-cards-grid">
            {/* Card 1: Thông tin người hướng dẫn & Cố vấn học tập */}
            <div className="program-card">
              <div className="card-header-flex">
                <div className="card-header-icon bg-blue-subtle">
                  <UserCheck size={20} className="text-blue" />
                </div>
                <div>
                  <h3 className="card-title">Đội ngũ hướng dẫn chuyên môn</h3>
                  <p className="card-sub">Cố vấn doanh nghiệp & Giảng viên trường</p>
                </div>
              </div>

              {hasMentor ? (
                <div className="mentor-profile-strip">
                  <div className="mentor-avatar-initials">
                    {mentorName.split(' ').map((n) => n[0]).slice(-2).join('')}
                  </div>
                  <div className="mentor-info-details">
                    <h4 className="mentor-fullname">{mentorName}</h4>
                    <span className="mentor-role-badge">{mentorRole}</span>
                    <div className="mentor-contact-links">
                      <a href={`mailto:${mentorEmail}`} className="contact-item-link" title="Gửi email cho Mentor">
                        <Mail size={13} /> {mentorEmail}
                      </a>
                      <a href={`tel:${mentorPhone}`} className="contact-item-link" title="Gọi điện cho Mentor">
                        <Phone size={13} /> {mentorPhone}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mentor-unassigned-notice">
                  <div className="notice-icon-box">
                    <Clock3 size={24} className="text-amber" />
                  </div>
                  <div className="notice-content-box">
                    <h4 className="notice-title">Chưa phân công Người hướng dẫn (Mentor)</h4>
                    <p className="notice-desc">
                      Hồ sơ của bạn hiện đang ở danh sách chờ phân bổ Người hướng dẫn từ Phòng Nhân sự (HR).
                      Sau khi HR hoàn tất phân công, thông tin liên hệ và trao đổi chuyên môn sẽ hiển thị đầy đủ tại đây.
                    </p>
                    <span className="notice-badge">Trạng thái: Đang chờ HR phân công</span>
                  </div>
                </div>
              )}

              <div className="faculty-advisor-box">
                <div className="advisor-label">
                  <GraduationCap size={15} />
                  <span>Giảng viên hướng dẫn khoa (ICTU):</span>
                </div>
                <div className="advisor-name">TS. Vũ Vinh Quang · Bộ môn CNPM</div>
                <div className="advisor-desc">Chịu trách nhiệm theo dõi tiến độ, kiểm tra đề cương và chấm điểm bảo vệ tốt nghiệp.</div>
              </div>
            </div>

            {/* Card 2: Mục tiêu & Tiêu chuẩn đạt chuẩn đầu ra */}
            <div className="program-card">
              <div className="card-header-flex">
                <div className="card-header-icon bg-green-subtle">
                  <Award size={20} className="text-green" />
                </div>
                <div>
                  <h3 className="card-title">Tiêu chuẩn nghiệm thu kỳ thực tập</h3>
                  <p className="card-sub">Yêu cầu hoàn thành để được cấp chứng nhận & tín chỉ</p>
                </div>
              </div>

              <ul className="criteria-list">
                <li className="criteria-item is-pass">
                  <div className="criteria-status-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="criteria-body">
                    <span className="criteria-title">Thời lượng thực tập: Tối thiểu 400 giờ</span>
                    <span className="criteria-hint">Tương đương 50 ngày làm việc trực tiếp hoặc hybrid (Hiện tại: 160 giờ).</span>
                  </div>
                </li>
                <li className="criteria-item is-pass">
                  <div className="criteria-status-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="criteria-body">
                    <span className="criteria-title">Chuyên cần & Kỷ luật lao động $\ge 90\%$</span>
                    <span className="criteria-hint">Chấm công hàng ngày trên hệ thống Portal (Hiện tại: 96% chuyên cần).</span>
                  </div>
                </li>
                <li className="criteria-item is-pass">
                  <div className="criteria-status-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="criteria-body">
                    <span className="criteria-title">Báo cáo tuần: Tối thiểu 10/12 báo cáo</span>
                    <span className="criteria-hint">Nộp báo cáo tuần vào thứ 6 hàng tuần để Mentor xét duyệt (Hiện tại: 4/4 tuần).</span>
                  </div>
                </li>
                <li className="criteria-item">
                  <div className="criteria-status-icon is-pending">
                    <Clock size={16} />
                  </div>
                  <div className="criteria-body">
                    <span className="criteria-title">Báo cáo tổng kết & Bảo vệ cuối kỳ</span>
                    <span className="criteria-hint">Trình bày sản phẩm dự án trước Hội đồng doanh nghiệp & Khoa CNTT ICTU (Tuần 12).</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-action-strip">
            <div className="strip-title-row">
              <Sparkles size={16} className="text-amber" />
              <span>Tiện ích & Tài nguyên dành cho TTS trong kỳ này</span>
            </div>
            <div className="strip-buttons-group">
              <button
                type="button"
                className="btn-strip-action"
                onClick={() => showToast('Đang tải văn bản Quyết định tiếp nhận thực tập...')}
              >
                <Download size={14} />
                <span>Tải Quyết định tiếp nhận kỳ K20</span>
              </button>
              <button
                type="button"
                className="btn-strip-action"
                onClick={() => showToast('Mẫu Đề cương thực tập đã được mở trong tab mới.')}
              >
                <FileText size={14} />
                <span>Mẫu đề cương thực tập ICTU</span>
              </button>
              <button
                type="button"
                className="btn-strip-action"
                onClick={() => showToast('Đã gửi yêu cầu kết nối hỗ trợ đến HR Coordinator!')}
              >
                <Mail size={14} />
                <span>Liên hệ HR Điều phối</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NỘI DUNG TAB 2: DANH SÁCH THÀNH VIÊN NHÓM TRONG KỲ ── */}
      {activeTab === 'members' && (
        <div className="tab-pane-content tab-pane-members">
          <div className="members-section-card">
            <div className="members-card-header">
              <div>
                <h3 className="card-title">Danh sách thành viên nhóm dự án: {hasGroup ? groupName : 'Chưa phân nhóm'}</h3>
                <p className="card-sub">
                  {hasGroup
                    ? `Các sinh viên được phân công cùng nhóm thuộc ${programName} (${groupMembers.length} thành viên)`
                    : `Hồ sơ thuộc kỳ thực tập ${programName} (Chưa xếp vào nhóm dự án cụ thể)`}
                </p>
              </div>
              <span className="badge-member-count">
                <Users size={14} /> {groupMembers.length} thành viên
              </span>
            </div>

            {!hasGroup || groupMembers.length === 0 ? (
              <div className="empty-group-box" style={{ textAlign: 'center', padding: '48px 24px', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #CBD5E1', margin: '16px' }}>
                <Users size={48} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>
                  Chưa được phân vào nhóm dự án
                </h4>
                <p style={{ margin: '0 auto', maxWidth: '540px', fontSize: '13.5px', color: '#64748B', lineHeight: 1.6 }}>
                  Bạn hiện đang tham gia kỳ thực tập <strong>{programName}</strong> nhưng chưa được phân công vào nhóm dự án cụ thể.
                  Danh sách thành viên cùng nhóm sẽ tự động hiển thị tại đây ngay khi Phòng Nhân sự (HR) hoặc Mentor hoàn tất gán nhóm.
                </p>
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table className="program-members-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Mã TTS</th>
                      <th style={{ width: '220px' }}>Họ và tên</th>
                      <th style={{ width: '170px' }}>Vai trò trong nhóm</th>
                      <th style={{ width: '240px' }}>Trường & Chuyên ngành</th>
                      <th style={{ width: '220px' }}>Email liên hệ</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupMembers.map((m, idx) => (
                      <tr key={m.id} className={m.isMe ? 'is-current-user-row' : ''}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="member-code-tag">{m.code}</span>
                        </td>
                        <td>
                          <div className="member-name-flex">
                            <div className={`member-avatar ${m.isMe ? 'avatar-me' : ''}`}>
                              {m.full_name.split(' ').map((n) => n[0]).slice(-2).join('')}
                            </div>
                            <div>
                              <span className="member-name-text">
                                {m.full_name} {m.isMe && <span className="you-pill">Bạn</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`member-role-pill ${m.role.includes('trưởng') ? 'role-lead' : ''}`}>
                            {m.role}
                          </span>
                        </td>
                        <td>
                          <div className="member-edu-details">
                            <span className="edu-major">{m.major}</span>
                            <span className="edu-school">{m.university}</span>
                          </div>
                        </td>
                        <td>
                          <a href={`mailto:${m.email}`} className="member-email-link">
                            <Mail size={12} /> {m.email}
                          </a>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="status-badge status-active">
                            <span className="dot-active" /> Đang thực tập
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NỘI DUNG TAB 3: LỘ TRÌNH VÀ CỘT MỐC ── */}
      {activeTab === 'milestones' && (
        <div className="tab-pane-content tab-pane-milestones">
          {/* Card Tiến độ chi tiết 12 tuần */}
          <div className="program-card intern-12weeks-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Lộ trình & Tiến độ 12 tuần thực tập (Đồng bộ Mentor)</h3>
                <p className="card-sub">
                  {hasMentor ? (
                    <>
                      Nhấp vào từng tuần bên dưới để xem chi tiết mục tiêu, điểm số và nhận xét từ Mentor <strong>{mentorName}</strong>
                    </>
                  ) : (
                    <>
                      Lộ trình đào tạo chuẩn 12 tuần thực tập. Nhận xét và điểm số sẽ được đồng bộ sau khi Mentor tiếp nhận.
                    </>
                  )}
                </p>
              </div>
              <div className="stepper-stats-cluster">
                <div className="stepper-stat-chip stat-score">
                  <Star size={15} className="text-amber" fill="#f59e0b" />
                  <span>Điểm TB: <strong>{avgScore}/10</strong></span>
                </div>
                <div className="stepper-stat-chip stat-progress">
                  <CheckCircle2 size={15} className="text-green" />
                  <span>Đã duyệt: <strong>{weeksTimeline.filter((w) => w.status === 'completed').length}/12 tuần</strong></span>
                </div>
              </div>
            </div>

            {/* Stepper 12 bước trực quan */}
            <div className="stepper-horizontal-container">
              <div className="stepper-track-line" />
              <div className="stepper-items-row">
                {weeksTimeline.map((item) => {
                  const isSelected = item.week_number === selectedWeekStep;
                  const isCompleted = item.status === 'completed';
                  const isCurrent = item.status === 'in_progress';

                  return (
                    <button
                      key={item.week_number}
                      type="button"
                      className={`stepper-node-btn ${isSelected ? 'is-selected' : ''} ${
                        isCompleted ? 'is-completed' : isCurrent ? 'is-current' : 'is-upcoming'
                      }`}
                      onClick={() => setSelectedWeekStep(item.week_number)}
                      title={`Xem chi tiết Tuần ${item.week_number}`}
                    >
                      <div className="node-circle">
                        {isCompleted ? (
                          <Check size={14} strokeWidth={3} />
                        ) : isCurrent ? (
                          <span className="current-dot" />
                        ) : (
                          <span>{item.week_number}</span>
                        )}
                      </div>
                      <span className="node-week-label">T{item.week_number}</span>
                      {typeof item.score === 'number' && item.score > 0 ? (
                        <span className="node-score-pill">{item.score.toFixed(1)}đ</span>
                      ) : isCurrent ? (
                        <span className="node-active-pill">Đang làm</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bảng chi tiết tuần được chọn */}
            <div className="week-detail-panel">
              <div className="detail-panel-header">
                <div className="detail-title-group">
                  <span className="week-order-badge">Tuần {selectedWeekData.week_number}</span>
                  <h4 className="detail-week-title">{selectedWeekData.title}</h4>
                </div>
                <div>
                  {selectedWeekData.status === 'completed' && (
                    <span className="detail-status-pill status-done">
                      <CheckCircle2 size={14} /> Đã đánh giá & hoàn thành
                    </span>
                  )}
                  {selectedWeekData.status === 'in_progress' && (
                    <span className="detail-status-pill status-ongoing">
                      <Clock size={14} /> Đang diễn ra trong tuần này
                    </span>
                  )}
                  {selectedWeekData.status === 'upcoming' && (
                    <span className="detail-status-pill status-future">
                      <Clock3 size={14} /> Kế hoạch sắp tới
                    </span>
                  )}
                </div>
              </div>

              <div className="detail-panel-body-grid">
                {/* Khối Điểm số đánh giá */}
                <div className="detail-grade-box">
                  <div className="grade-box-header">
                    <Star size={16} className="text-amber" />
                    <span>Đánh giá của Mentor</span>
                  </div>
                  {typeof selectedWeekData.score === 'number' && selectedWeekData.score > 0 ? (
                    <div className="grade-score-display">
                      <div className="score-number-big">
                        {selectedWeekData.score.toFixed(1)}
                        <span className="score-max">/10</span>
                      </div>
                      <div className="score-verdict">
                        {selectedWeekData.score >= 8.5
                          ? '🌟 Đạt yêu cầu xuất sắc'
                          : selectedWeekData.score >= 7.0
                          ? '👍 Đạt yêu cầu'
                          : '⚠️ Cần cải thiện thêm'}
                      </div>
                    </div>
                  ) : (
                    <div className="grade-empty-state">
                      <Clock3 size={24} className="empty-clock" />
                      <p className="empty-grade-text">
                        {selectedWeekData.status === 'in_progress'
                          ? 'Đang chờ nộp báo cáo và Mentor đánh giá'
                          : 'Chưa có điểm đánh giá cho tuần này'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Khối Nhận xét & Góp ý chuyên môn */}
                <div className="detail-feedback-box">
                  <div className="feedback-box-header">
                    <UserCheck size={16} className="text-blue" />
                    <span>Nhận xét & Hướng dẫn chuyên môn</span>
                  </div>
                  <div className="feedback-content-text">
                    {selectedWeekData.feedback ? (
                      <p className="feedback-quote">“{selectedWeekData.feedback}”</p>
                    ) : (
                      <p className="feedback-placeholder">
                        Mentor chưa để lại nhận xét cho tuần này. Báo cáo tuần sẽ được Mentor nhận xét vào cuối tuần.
                      </p>
                    )}
                  </div>
                  <div className="feedback-author-meta">
                    <span className="author-name">Mentor: <strong>{mentorName}</strong></span>
                    <span className="author-sync-hint">⚡ Đồng bộ realtime với Ma trận tiến độ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lộ trình các cột mốc giai đoạn lớn */}
          <div className="program-card">
            <h3 className="card-title">Các mốc giai đoạn quan trọng của {programName}</h3>
            <p className="card-sub">Theo dõi các mốc thời gian chuyển tiếp để chuẩn bị hồ sơ và báo cáo nghiệm thu</p>

            <div className="milestones-timeline-grid">
              {/* Mốc 1 */}
              <div className="timeline-node is-done">
                <div className="node-indicator">
                  <CheckCircle2 size={18} />
                </div>
                <div className="node-content">
                  <div className="node-time">Tuần 1 – Tuần 2 (01/10 – 14/10/2026)</div>
                  <h4 className="node-title">Tiếp nhận & Onboarding kỹ thuật</h4>
                  <p className="node-desc">
                    Hoàn thiện thủ tục tiếp nhận, ký cam kết bảo mật NDA, cài đặt môi trường lập trình Git/Docker/CI-CD và làm quen với Mentor phụ trách.
                  </p>
                  <span className="node-status-tag tag-done">Đã hoàn thành</span>
                </div>
              </div>

              {/* Mốc 2 */}
              <div className="timeline-node is-active">
                <div className="node-indicator">
                  <Clock size={18} />
                </div>
                <div className="node-content">
                  <div className="node-time">Tuần 3 – Tuần 8 (15/10 – 25/11/2026)</div>
                  <h4 className="node-title">Phát triển dự án & Triển khai Sprint</h4>
                  <p className="node-desc">
                    Trực tiếp tham gia phát triển tính năng, viết Unit Test, nộp PR và tham gia họp Sprint Review định kỳ với nhóm dự án {groupName}.
                  </p>
                  <span className="node-status-tag tag-active">Đang diễn ra (Hiện tại)</span>
                </div>
              </div>

              {/* Mốc 3 */}
              <div className="timeline-node">
                <div className="node-indicator">
                  <Clock3 size={18} />
                </div>
                <div className="node-content">
                  <div className="node-time">Tuần 9 – Tuần 10 (26/11 – 10/12/2026)</div>
                  <h4 className="node-title">Đánh giá giữa kỳ & Tối ưu hóa</h4>
                  <p className="node-desc">
                    Mentor thực hiện đánh giá năng lực giai đoạn 1, góp ý hoàn thiện chức năng và hoàn tất hồ sơ chuyên cần giữa kỳ.
                  </p>
                  <span className="node-status-tag tag-upcoming">Sắp diễn ra</span>
                </div>
              </div>

              {/* Mốc 4 */}
              <div className="timeline-node">
                <div className="node-indicator">
                  <Award size={18} />
                </div>
                <div className="node-content">
                  <div className="node-time">Tuần 11 – Tuần 12 (11/12 – 31/12/2026)</div>
                  <h4 className="node-title">Nghiệm thu dự án & Bảo vệ thực tập tốt nghiệp</h4>
                  <p className="node-desc">
                    Hoàn tất báo cáo tổng kết thực tập, xin chữ ký xác nhận của Doanh nghiệp và tham gia Hội đồng chấm điểm thực tập tốt nghiệp ICTU.
                  </p>
                  <span className="node-status-tag tag-upcoming">Kế hoạch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NỘI DUNG TAB 4: HỢP ĐỒNG & VĂN BẢN PHÁP LÝ ── */}
      {activeTab === 'documents' && (
        <div className="tab-pane-content tab-pane-documents">
          <div className="program-card">
            <h3 className="card-title">Văn bản pháp lý & Hợp đồng tiếp nhận kỳ thực tập</h3>
            <p className="card-sub">Các tài liệu chính thức xác nhận quyền lợi và nghĩa vụ của bạn trong {programName}</p>

            <div className="documents-cards-grid">
              {/* Văn bản 1: Hợp đồng tiếp nhận */}
              <div className="doc-box-item">
                <div className="doc-icon-wrap">
                  <FileText size={24} className="text-blue" />
                </div>
                <div className="doc-details">
                  <h4 className="doc-name">Hợp đồng Tiếp nhận Thực tập Doanh nghiệp & Cam kết Bảo mật (NDA)</h4>
                  <div className="doc-meta">
                    <span>Mã hợp đồng: <strong>{currentContract?.contract_code || 'HĐTT-2026-001'}</strong></span>
                    <span>Hiệu lực: <strong>01/10/2026 – 31/12/2026</strong></span>
                  </div>
                  <div className="doc-meta-status">
                    <span className="badge-signed">
                      <ShieldCheck size={14} /> Đã hoàn tất ký số (ICTU & Doanh nghiệp)
                    </span>
                  </div>
                </div>
                <div className="doc-action-col">
                  <button
                    type="button"
                    className="btn-doc-download"
                    onClick={() => showToast('Đang tải bản PDF có chứng thực số...')}
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </button>
                </div>
              </div>

              {/* Văn bản 2: Quyết định phân công Mentor */}
              <div className="doc-box-item">
                <div className="doc-icon-wrap">
                  <FileCheck2 size={24} className="text-green" />
                </div>
                <div className="doc-details">
                  <h4 className="doc-name">Quyết định Phân công Người hướng dẫn (Mentor) & Nhóm dự án</h4>
                  <div className="doc-meta">
                    <span>Số: <strong>QĐ-ICTU-2026/PC-08</strong></span>
                    <span>Kỳ thực tập: <strong>{programName}</strong></span>
                  </div>
                  <div className="doc-meta-status">
                    <span className="badge-signed">
                      <ShieldCheck size={14} /> Ban hành chính thức bởi Phòng Nhân sự & Nhà trường
                    </span>
                  </div>
                </div>
                <div className="doc-action-col">
                  <button
                    type="button"
                    className="btn-doc-download"
                    onClick={() => showToast('Đang tải bản sao Quyết định phân công...')}
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </button>
                </div>
              </div>

              {/* Văn bản 3: Sổ tay quy chế thực tập */}
              <div className="doc-box-item">
                <div className="doc-icon-wrap">
                  <Briefcase size={24} className="text-amber" />
                </div>
                <div className="doc-details">
                  <h4 className="doc-name">Sổ tay Quy chế Thực tập Doanh nghiệp ICTU 2026</h4>
                  <div className="doc-meta">
                    <span>Quy định số giờ, chế độ phụ cấp và tiêu chuẩn đánh giá kết quả thực tập.</span>
                  </div>
                  <div className="doc-meta-status">
                    <span className="badge-signed" style={{ background: '#fef3c7', color: '#92400e' }}>
                      <Info size={14} /> Tài liệu hướng dẫn bắt buộc đọc
                    </span>
                  </div>
                </div>
                <div className="doc-action-col">
                  <button
                    type="button"
                    className="btn-doc-download"
                    onClick={() => showToast('Đang tải Sổ tay thực tập...')}
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
