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
import { FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission } from '../../../hooks/usePermission';
import StatusBadge from './StatusBadge';
import ConfirmActionDialog from './ConfirmActionDialog';
import CvPreviewModal from './CvPreviewModal';
import './InternComponents.css';

/**
 * InternActionButtons
 *
 * @param {{
 *   internId:    number|string,
 *   status:      'pending'|'active'|'inactive',
 *   hasCv?:      boolean,
 *   cvFileName?: string|null,
 *   cvId?:       number|string|null,
 *   intern?:     object,
 *   onSuccess:   (toast: { type: string, message: string }) => void,
 * }} props
 */
function InternActionButtons({
  internId,
  status,
  hasCv = false,
  cvFileName = null,
  cvId = null,
  intern = null,
  onSuccess,
}) {
  // dialog = null | 'approve' | 'reject'
  const [dialog, setDialog] = useState(null);
  const [showCvModal, setShowCvModal] = useState(false);

  const { user } = useAuth();

  const internData = intern || {
    id: internId,
    status,
    has_cv: hasCv,
    cv_id: cvId,
    cv_file_name: cvFileName,
  };

  // Modal xem CV chung
  const cvModalElement = showCvModal ? (
    <CvPreviewModal
      isOpen={showCvModal}
      onClose={() => setShowCvModal(false)}
      intern={internData}
      onApprove={() => setDialog('approve')}
      onReject={() => setDialog('reject')}
    />
  ) : null;

  // Kiểm tra quyền trước (hasPermission — không if/else role trực tiếp)
  // Nếu không có quyền 'interns_approve' → chỉ hiện StatusBadge, không hiện nút Duyệt/Từ chối
  if (!hasPermission(user, 'interns_approve')) {
    return (
      <div className="intern-action-buttons">
        <StatusBadge status={status === 'pending' && !hasCv ? 'no_cv' : status} />
        {hasCv && (
          <button
            type="button"
            className="intern-action-btn intern-action-btn--view-cv intern-action-btn--sm"
            onClick={() => setShowCvModal(true)}
            title="Xem file CV của ứng viên"
          >
            <FileText size={12} />
            <span>CV</span>
          </button>
        )}
        {cvModalElement}
      </div>
    );
  }

  // Hồ sơ không ở trạng thái pending (active - đã duyệt, inactive - từ chối)
  if (status !== 'pending') {
    return (
      <div className="intern-action-buttons">
        <StatusBadge status={status} />
        {hasCv && (
          <>
            <button
              type="button"
              className="intern-action-btn intern-action-btn--view-cv intern-action-btn--sm"
              onClick={() => setShowCvModal(true)}
              title="Xem lại CV của thực tập sinh"
            >
              <FileText size={12} />
              <span>CV</span>
            </button>
          </>
        )}
        {cvModalElement}
        {dialog && (
          <ConfirmActionDialog
            internId={internId}
            action={dialog}
            cvFileName={cvFileName}
            onViewCv={() => setShowCvModal(true)}
            onClose={() => setDialog(null)}
            onSuccess={(toastPayload) => {
              setDialog(null);
              onSuccess?.(toastPayload);
            }}
          />
        )}
      </div>
    );
  }

  // Nếu status === 'pending' nhưng chưa nộp CV → hiển thị nhãn "Chưa nộp CV"
  if (!hasCv) {
    return (
      <span title="Ứng viên chưa tải lên hồ sơ/CV — không thể xét duyệt">
        <StatusBadge status="no_cv" />
      </span>
    );
  }

  // Nếu status === 'pending' VÀ đã nộp CV:
  // HR có thể bấm "Xem CV" để thẩm định trước khi quyết định duyệt hoặc từ chối
  return (
    <>
      <div className="intern-action-buttons">
        {/* Nút Xem CV */}
        <button
          type="button"
          className="intern-action-btn intern-action-btn--view-cv"
          id={`intern-view-cv-btn-${internId}`}
          onClick={() => setShowCvModal(true)}
          aria-label={`Xem CV của ứng viên #${internId}`}
          title={cvFileName ? `Xem nội dung CV: ${cvFileName}` : 'Xem CV ứng viên trước khi duyệt'}
        >
          <FileText size={14} />
          <span>Xem CV</span>
        </button>

        {/* Nút Duyệt → mở dialog approve */}
        <button
          type="button"
          className="intern-action-btn intern-action-btn--approve"
          id={`intern-approve-btn-${internId}`}
          onClick={() => setDialog('approve')}
          aria-label={`Duyệt hồ sơ #${internId}`}
        >
          Duyệt
        </button>

        {/* Nút Từ chối → mở dialog reject */}
        <button
          type="button"
          className="intern-action-btn intern-action-btn--reject"
          id={`intern-reject-btn-${internId}`}
          onClick={() => setDialog('reject')}
          aria-label={`Từ chối hồ sơ #${internId}`}
        >
          Từ chối
        </button>
      </div>

      {/* Modal xem trước CV */}
      {cvModalElement}

      {/* Popup xác nhận — render khi dialog !== null */}
      {dialog && (
        <ConfirmActionDialog
          internId={internId}
          action={dialog}
          cvFileName={cvFileName}
          onViewCv={() => setShowCvModal(true)}
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
