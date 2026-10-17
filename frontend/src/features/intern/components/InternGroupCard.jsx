import { useState } from 'react';
import {
  Users,
  Building,
  Layers,
  UserCheck,
  ChevronRight,
  FolderKanban,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { getInitials } from '../mockMentorGroupData';

function MemberAvatarMini({ member }) {
  const [imgError, setImgError] = useState(false);
  const showImg = member.avatar_url && !imgError;

  return (
    <div className="member-avatar-mini" title={member.full_name}>
      {showImg ? (
        <img
          src={member.avatar_url}
          alt={member.full_name || 'TTS'}
          className="member-avatar-img-mini"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(member.full_name)
      )}
    </div>
  );
}

export default function InternGroupCard({ group, members = [], onViewAllMembers }) {
  // Trạng thái: Chưa được đưa vào nhóm thực tập
  if (!group) {
    return (
      <div className="intern-group-card intern-empty-card-state" role="region" aria-label="Nhóm thực tập">
        <div className="empty-state-icon-box">
          <FolderKanban size={28} />
        </div>
        <h3 className="empty-state-title">Chưa tham gia nhóm thực tập</h3>
        <p className="empty-state-description">
          Bạn chưa được đưa vào nhóm dự án thực tập nào. Vui lòng liên hệ HR hoặc chờ thông báo xếp nhóm theo phòng ban.
        </p>
        <span className="empty-state-badge">
          <AlertCircle size={13} />
          Chờ HR xếp nhóm
        </span>
      </div>
    );
  }

  // Lấy tối đa 4 thành viên nổi bật để hiển thị trực tiếp trên Card Dashboard
  const previewMembers = members.slice(0, 4);

  return (
    <div className="intern-group-card" role="region" aria-label="Nhóm thực tập">
      {/* ── CARD TOP HEADER ── */}
      <div>
        <div className="card-top-header">
          <div className="card-title-group">
            <div className="card-header-icon-box" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="card-main-title">Nhóm thực tập</h2>
              <p className="card-main-subtitle" title={group.name}>
                {group.name}
              </p>
            </div>
          </div>

          <span className="group-member-count-pill">
            <Users size={13} />
            <span>{members.length} thành viên</span>
          </span>
        </div>

        {/* ── GROUP META CLUSTER (THÔNG TIN CHƯƠNG TRÌNH, PHÒNG BAN, MENTOR) ── */}
        <div className="group-meta-cluster">
          {/* Chương trình thực tập */}
          <div className="meta-field-item">
            <span className="meta-field-label">
              <Layers size={13} />
              <span>Chương trình:</span>
            </span>
            <span className="meta-field-value" title={group.program_name}>
              {group.program_name}
            </span>
          </div>

          {/* Phòng ban tiếp nhận */}
          <div className="meta-field-item">
            <span className="meta-field-label">
              <Building size={13} />
              <span>Phòng ban:</span>
            </span>
            <span className="meta-field-value" title={group.department_name}>
              {group.department_name}
            </span>
          </div>

          {/* Mentor phụ trách */}
          <div className="meta-field-item">
            <span className="meta-field-label">
              <UserCheck size={13} />
              <span>Mentor phụ trách:</span>
            </span>
            <span className="meta-field-value" title={group.mentor_name}>
              {group.mentor_name}
            </span>
          </div>

          {/* Dự án / Mục tiêu */}
          <div className="meta-field-item">
            <span className="meta-field-label">
              <Briefcase size={13} />
              <span>Dự án chính:</span>
            </span>
            <span className="meta-field-value" title={group.project_title}>
              {group.project_title || 'Dự án thực tập doanh nghiệp'}
            </span>
          </div>
        </div>

        {/* ── DANH SÁCH THÀNH VIÊN PREVIEW (4 THÀNH VIÊN) ── */}
        <div className="group-members-preview-section">
          <div className="members-section-header">
            <h3 className="members-section-title">
              <Users size={15} style={{ color: '#2563EB' }} />
              <span>Thành viên trong nhóm</span>
            </h3>
            <span className="members-count-badge">
              {members.length > 0 ? `Đang hiển thị ${Math.min(4, members.length)}/${members.length}` : '0 thành viên'}
            </span>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
              Nhóm hiện tại chưa có thành viên nào khác.
            </div>
          ) : (
            <div className="members-list-grid">
              {previewMembers.map((member) => {
                const isMe = member.is_current_user;
                return (
                  <div
                    key={member.id}
                    className={`member-card-pill ${isMe ? 'is-me' : ''}`}
                    title={`${member.full_name} (${member.role || 'Thực tập sinh'}) - ${member.email || ''}`}
                  >
                    <MemberAvatarMini member={member} />
                    <div className="member-detail-info">
                      <div className="member-name-row">
                        <span className="member-name-text">{member.full_name}</span>
                        {isMe && <span className="current-user-tag">Bạn</span>}
                      </div>
                      <span className="member-role-text">{member.role || 'Thực tập sinh'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BUTTON XEM TẤT CẢ THÀNH VIÊN ── */}
      {members.length > 0 && (
        <button
          type="button"
          className="btn-view-all-members"
          onClick={onViewAllMembers}
          aria-label={`Xem tất cả ${members.length} thành viên trong nhóm`}
        >
          <Users size={15} />
          <span>Xem tất cả thành viên ({members.length})</span>
          <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
        </button>
      )}
    </div>
  );
}
