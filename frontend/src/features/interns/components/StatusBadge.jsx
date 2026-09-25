/**
 * StatusBadge.jsx
 * Component hiển thị nhãn (badge) trạng thái hồ sơ thực tập sinh.
 *
 * Trạng thái theo software-specification.md §2.3 (users.status):
 *   pending  → Chờ duyệt (nền vàng/cam nhạt)
 *   active   → Đã duyệt  (nền xanh lá nhạt)
 *   inactive → Từ chối   (nền đỏ nhạt)
 *
 * @example
 * // Dùng trong bảng danh sách hồ sơ TTS (/hr/interns):
 * import StatusBadge from './components/StatusBadge';
 *
 * <StatusBadge status={intern.status} />
 */

import './InternComponents.css';

/** Map status → label tiếng Việt */
const LABEL_MAP = {
  pending:  'Chờ duyệt',
  active:   'Đã duyệt',
  inactive: 'Từ chối',
};

/**
 * StatusBadge
 *
 * @param {{ status: 'pending'|'active'|'inactive' }} props
 */
function StatusBadge({ status }) {
  const label = LABEL_MAP[status] ?? status;
  const modifier = ['pending', 'active', 'inactive'].includes(status)
    ? status
    : 'inactive'; // fallback an toàn cho status không xác định

  return (
    <span
      className={`status-badge status-badge--${modifier}`}
      aria-label={`Trạng thái: ${label}`}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export default StatusBadge;
