import { useState } from 'react';
import {
  UserCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Copy,
  Check,
  UserX,
  ShieldCheck,
} from 'lucide-react';
import { getInitials } from '../mockMentorGroupData';

export default function InternMentorCard({ mentor, onShowToast }) {
  const [copied, setCopied] = useState(false);

  // Xử lý sao chép email nhanh
  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      if (onShowToast) {
        onShowToast(`Đã sao chép địa chỉ email của Mentor: ${email}`, 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Trạng thái: Chưa có Mentor được phân công
  if (!mentor) {
    return (
      <div className="intern-mentor-card intern-empty-card-state" role="region" aria-label="Mentor của tôi">
        <div className="empty-state-icon-box">
          <UserX size={28} />
        </div>
        <h3 className="empty-state-title">Chưa phân công người hướng dẫn</h3>
        <p className="empty-state-description">
          Bạn hiện chưa được phân công Mentor hướng dẫn. Phòng Nhân sự (HR) đang sắp xếp và sẽ cập nhật thông tin người hướng dẫn sớm nhất.
        </p>
        <span className="empty-state-badge">
          <ShieldCheck size={13} />
          Chờ HR phân công
        </span>
      </div>
    );
  }

  const isOnline = mentor.status === 'online';

  return (
    <div className="intern-mentor-card" role="region" aria-label="Mentor của tôi">
      {/* ── CARD TOP HEADER ── */}
      <div className="card-top-header">
        <div className="card-title-group">
          <div className="card-header-icon-box">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="card-main-title">Mentor của tôi</h2>
            <p className="card-main-subtitle">Thông tin người hướng dẫn</p>
          </div>
        </div>

        <div className={`mentor-status-pill ${isOnline ? 'is-online' : 'is-busy'}`}>
          <span className="status-dot-pulse" />
          <span>{mentor.status_text || (isOnline ? 'Đang làm việc' : 'Bận')}</span>
        </div>
      </div>

      {/* ── MENTOR PROFILE BODY ── */}
      <div className="mentor-profile-body">
        <div className="mentor-avatar-wrap">
          {mentor.avatar_url ? (
            <img
              src={mentor.avatar_url}
              alt={mentor.full_name}
              className="mentor-avatar-img"
            />
          ) : (
            <div className="mentor-avatar-circle" title={mentor.full_name}>
              {getInitials(mentor.full_name)}
            </div>
          )}
          {isOnline && <span className="avatar-online-indicator" title="Đang online" />}
        </div>

        <div className="mentor-info-col">
          <h3 className="mentor-name" title={mentor.full_name}>
            {mentor.full_name}
          </h3>
          <span className="mentor-role-badge" title={mentor.position}>
            {mentor.position}
          </span>
          <span className="mentor-dept-name" title={mentor.department}>
            <Building size={14} />
            <span>{mentor.department}</span>
          </span>
        </div>
      </div>

      {/* ── CONTACT CLUSTER ── */}
      <div className="mentor-contact-cluster">
        {/* Email */}
        <div className="contact-row-item">
          <div className="contact-label-group">
            <Mail size={14} />
            <span>Email:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <a
              href={`mailto:${mentor.email}`}
              className="contact-value-link"
              title={`Gửi email tới ${mentor.email}`}
            >
              {mentor.email}
            </a>
            <button
              type="button"
              className="copy-mini-btn"
              onClick={() => handleCopyEmail(mentor.email)}
              title="Sao chép email"
              aria-label="Sao chép email mentor"
            >
              {copied ? <Check size={13} style={{ color: '#16A34A' }} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Số điện thoại */}
        <div className="contact-row-item">
          <div className="contact-label-group">
            <Phone size={14} />
            <span>Điện thoại:</span>
          </div>
          <a
            href={`tel:${mentor.phone}`}
            className="contact-value-link"
            title={`Gọi điện tới ${mentor.phone}`}
          >
            {mentor.phone}
          </a>
        </div>

        {/* Văn phòng làm việc */}
        {mentor.office_location && (
          <div className="contact-row-item">
            <div className="contact-label-group">
              <MapPin size={14} />
              <span>Văn phòng:</span>
            </div>
            <span className="contact-value-text" title={mentor.office_location}>
              {mentor.office_location}
            </span>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS CLUSTER (LIÊN HỆ NHANH) ── */}
      <div className="mentor-actions-row">
        <a
          href={`mailto:${mentor.email}`}
          className="mentor-action-btn mentor-action-btn--email"
          title={`Soạn thư gửi tới ${mentor.email}`}
        >
          <Mail size={15} />
          <span>Gửi Email</span>
        </a>

        <a
          href={`tel:${mentor.phone}`}
          className="mentor-action-btn mentor-action-btn--call"
          title={`Gọi điện cho ${mentor.full_name}`}
        >
          <Phone size={15} />
          <span>Gọi điện</span>
        </a>
      </div>
    </div>
  );
}
