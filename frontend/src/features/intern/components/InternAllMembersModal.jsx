import { useEffect, useState } from 'react';
import { Users, Mail, Phone, GraduationCap, X } from 'lucide-react';
import { getInitials } from '../mockMentorGroupData';

function MemberAvatarModal({ member }) {
  const [imgError, setImgError] = useState(false);
  const showImg = member.avatar_url && !imgError;

  return (
    <div className="modal-member-avatar" title={member.full_name || 'Thành viên'}>
      {showImg ? (
        <img
          src={member.avatar_url}
          alt={member.full_name || 'Thành viên'}
          className="modal-member-avatar-img"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(member.full_name)
      )}
    </div>
  );
}

export default function InternAllMembersModal({ isOpen, onClose, group, members = [] }) {
  // Lắng nghe phím Escape để đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="members-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-members-modal-title"
    >
      <div className="members-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* ── MODAL HEADER ── */}
        <div className="members-modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Users size={22} />
            </div>
            <div>
              <h3 id="all-members-modal-title" className="modal-main-title">
                {group?.name || 'Danh sách thành viên nhóm'}
              </h3>
              <p className="modal-sub-title">
                {group?.program_name ? `${group.program_name} · ` : ''}
                Tổng số: <strong>{members.length} thành viên</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── MODAL BODY: DANH SÁCH THÀNH VIÊN ĐẦY ĐỦ ── */}
        <div className="members-modal-body">
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B' }}>
              Chưa có thành viên nào trong nhóm này.
            </div>
          ) : (
            members.map((member, index) => {
              const isMe = member.is_current_user;
              return (
                <div
                  key={member.id || index}
                  className={`modal-member-row ${isMe ? 'is-current-user' : ''}`}
                >
                  <div className="modal-member-left">
                    <MemberAvatarModal member={member} />
                    <div className="modal-member-meta">
                      <div className="modal-member-name-row">
                        <h4 className="modal-member-name">{member.full_name}</h4>
                        {isMe && <span className="current-user-tag">Bạn</span>}
                        {member.code && (
                          <span className="modal-member-code">{member.code}</span>
                        )}
                      </div>
                      <span className="modal-member-role">
                        {member.role || 'Thực tập sinh'}
                      </span>
                      <span className="modal-member-school">
                        <GraduationCap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {member.major} · {member.university}
                      </span>
                    </div>
                  </div>

                  <div className="modal-member-right">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="modal-contact-link"
                        title={`Gửi email cho ${member.full_name}`}
                      >
                        <Mail size={13} />
                        <span>{member.email}</span>
                      </a>
                    )}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className="modal-contact-link"
                        title={`Gọi điện cho ${member.full_name}`}
                      >
                        <Phone size={13} />
                        <span>{member.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="members-modal-footer">
          <span className="modal-footer-note">
            Mentor phụ trách: <strong>{group?.mentor_name || 'Chưa gán'}</strong>
          </span>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
