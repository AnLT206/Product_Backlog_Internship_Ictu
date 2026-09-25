/**
 * InternActionButtons.jsx
 * Component hiển thị nút "Duyệt" / "Từ chối" cho hồ sơ thực tập sinh.
 *
 * Rule (software-specification.md §5.4):
 *   "Chỉ duyệt khi đang pending."
 *   → Nút chỉ hiển thị khi status === 'pending'.
 *   → Status khác: chỉ hiện StatusBadge.
 *
 * ⚠️  Component này KHÔNG gọi API (không có fetch/axios ở đây).
 *     Việc gọi API approve/reject là task 7 — thực hiện qua callback:
 *       onApprove(internId) → gọi POST /api/hr/interns/{id}/approve
 *       onReject(internId)  → gọi POST /api/hr/interns/{id}/reject
 *
 * @example
 * // Dùng trong bảng danh sách hồ sơ TTS (/hr/interns):
 * import InternActionButtons from './components/InternActionButtons';
 *
 * <InternActionButtons
 *   internId={intern.id}
 *   status={intern.status}
 *   onApprove={(id) => handleApprove(id)}
 *   onReject={(id) => handleReject(id)}
 * />
 */

import StatusBadge from './StatusBadge';
import './InternComponents.css';

/**
 * InternActionButtons
 *
 * @param {{
 *   internId: number|string,
 *   status: 'pending'|'active'|'inactive',
 *   onApprove: (internId: number|string) => void,
 *   onReject:  (internId: number|string) => void,
 * }} props
 */
function InternActionButtons({ internId, status, onApprove, onReject }) {
  // Chỉ hiển thị nút khi status === 'pending' (spec §5.4)
  if (status !== 'pending') {
    return <StatusBadge status={status} />;
  }

  return (
    <div className="intern-action-buttons">
      {/* Badge trạng thái */}
      <StatusBadge status={status} />

      {/* Nút Duyệt — bắn callback onApprove, KHÔNG gọi API trực tiếp */}
      <button
        type="button"
        className="intern-action-btn intern-action-btn--approve"
        id={`intern-approve-btn-${internId}`}
        onClick={() => onApprove(internId)}
        aria-label={`Duyệt hồ sơ #${internId}`}
      >
        ✓ Duyệt
      </button>

      {/* Nút Từ chối — bắn callback onReject, KHÔNG gọi API trực tiếp */}
      <button
        type="button"
        className="intern-action-btn intern-action-btn--reject"
        id={`intern-reject-btn-${internId}`}
        onClick={() => onReject(internId)}
        aria-label={`Từ chối hồ sơ #${internId}`}
      >
        ✕ Từ chối
      </button>
    </div>
  );
}

export default InternActionButtons;
