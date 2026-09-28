/**
 * InternActionButtons.jsx
 * Component hiển thị nút "Duyệt" / "Từ chối" cho hồ sơ thực tập sinh.
 *
 * Rule (software-specification.md §5.4):
 *   "Chỉ duyệt khi đang pending."
 *   → Nút chỉ hiển thị khi status === 'pending'.
 *   → Status khác: chỉ hiện StatusBadge.
 *
 * Permission guard (task B — US 40):
 *   → Nút chỉ render khi user có quyền 'interns_approve'.
 *   → Nếu không có quyền: chỉ hiện StatusBadge (bất kể status).
 *   → Kiểm tra qua hasPermission() — không if/else role trực tiếp.
 *
 * Flow (task 7):
 *   Bấm nút → mở ConfirmActionDialog → HR xác nhận
 *           → dialog gọi API → thành công: đóng + onSuccess(toastPayload)
 *                           → lỗi: giữ dialog, hiện lỗi trong popup
 *
 * Props:
 *   internId  {number|string}
 *   status    {'pending'|'active'|'inactive'}
 *   onSuccess {(toast: { type, message }) => void}
 *     Callback khi API thành công — nơi dùng cập nhật Badge + hiện toast.
 *
 * @example
 * import InternActionButtons from './components/InternActionButtons';
 *
 * <InternActionButtons
 *   internId={intern.id}
 *   status={intern.status}
 *   onSuccess={({ type, message }) => {
 *     setToast({ type, message });         // hiện toast ở màn hình cha
 *     refetchInterns();                    // cập nhật lại danh sách
 *   }}
 * />
 */

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission } from '../../../hooks/usePermission';
import StatusBadge from './StatusBadge';
import ConfirmActionDialog from './ConfirmActionDialog';
import './InternComponents.css';

/**
 * InternActionButtons
 *
 * @param {{
 *   internId:  number|string,
 *   status:    'pending'|'active'|'inactive',
 *   onSuccess: (toast: { type: string, message: string }) => void,
 * }} props
 */
function InternActionButtons({ internId, status, onSuccess }) {
  // dialog = null | 'approve' | 'reject'
  const [dialog, setDialog] = useState(null);

  const { user } = useAuth();

  // Kiểm tra quyền trước (hasPermission — không if/else role trực tiếp)
  // Nếu không có quyền 'interns_approve' → chỉ hiện StatusBadge, không hiện nút
  if (!hasPermission(user, 'interns_approve')) {
    return <StatusBadge status={status} />;
  }

  // Chỉ hiển thị nút khi status === 'pending' (spec §5.4)
  if (status !== 'pending') {
    return <StatusBadge status={status} />;
  }

  return (
    <>
      <div className="intern-action-buttons">
        {/* Badge trạng thái */}
        <StatusBadge status={status} />

        {/* Nút Duyệt → mở dialog approve */}
        <button
          type="button"
          className="intern-action-btn intern-action-btn--approve"
          id={`intern-approve-btn-${internId}`}
          onClick={() => setDialog('approve')}
          aria-label={`Duyệt hồ sơ #${internId}`}
        >
          ✓ Duyệt
        </button>

        {/* Nút Từ chối → mở dialog reject */}
        <button
          type="button"
          className="intern-action-btn intern-action-btn--reject"
          id={`intern-reject-btn-${internId}`}
          onClick={() => setDialog('reject')}
          aria-label={`Từ chối hồ sơ #${internId}`}
        >
          ✕ Từ chối
        </button>
      </div>

      {/* Popup xác nhận — render khi dialog !== null */}
      {dialog && (
        <ConfirmActionDialog
          internId={internId}
          action={dialog}
          onClose={() => setDialog(null)}
          onSuccess={(toastPayload) => {
            setDialog(null);
            onSuccess?.(toastPayload);
          }}
        />
      )}
    </>
  );
}

export default InternActionButtons;
