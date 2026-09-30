import { useState } from 'react';
import { approveIntern, rejectIntern } from '../../api/interns';
import './ApprovalActionButtons.css';

/**
 * ApprovalActionButtons — Bộ nút thao tác Duyệt / Từ chối hồ sơ.
 *
 * @param {Object} props
 * @param {string|number} [props.recordId] - ID của hồ sơ thực tập sinh cần xử lý.
 * @param {Function} [props.onApprove] - Hàm callback khi click Duyệt: async (recordId) => { ... }
 * @param {Function} [props.onReject] - Hàm callback khi click Từ chối: async (recordId, reason) => { ... }
 * @param {boolean} [props.disabled=false] - Vô hiệu hóa cả 2 nút (ví dụ khi hồ sơ đã duyệt rồi).
 * @param {boolean} [props.askReasonOnReject=true] - Bật popup nhập lý do khi từ chối hồ sơ.
 * @param {string} [props.className=''] - Class CSS tùy biến thêm ngoài.
 */
export default function ApprovalActionButtons({
  recordId,
  onApprove,
  onReject,
  disabled = false,
  askReasonOnReject = true,
  className = '',
}) {
  // Trạng thái loading khi đang gửi request API
  const [actionLoading, setActionLoading] = useState(null); // 'approve' | 'reject' | null
  
  // Trạng thái modal nhập lý do từ chối
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  /**
   * 1. XỬ LÝ SỰ KIỆN DUYỆT HỒ SƠ
   * Gọi API cập nhật trạng thái hồ sơ sang "APPROVED"
   */
  const handleApprove = async () => {
    if (disabled || actionLoading) return;

    const confirmed = window.confirm('Bạn có chắc chắn muốn DUYỆT hồ sơ này không?');
    if (!confirmed) return;

    try {
      setActionLoading('approve');

      if (onApprove) {
        await onApprove(recordId);
      } else if (recordId) {
        const res = await approveIntern(recordId);
        if (res.ok) {
          alert('Duyệt hồ sơ thành công!');
        } else {
          alert(res.data?.detail || 'Duyệt hồ sơ thất bại.');
        }
      }
    } catch (error) {
      console.error('Lỗi khi duyệt hồ sơ:', error);
      alert('Có lỗi xảy ra khi duyệt hồ sơ. Vui lòng thử lại!');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * 2. XỬ LÝ SỰ KIỆN TỪ CHỐI HỒ SƠ
   * Mở modal nhập lý do hoặc gọi trực tiếp API cập nhật trạng thái "REJECTED"
   */
  const handleRejectClick = () => {
    if (disabled || actionLoading) return;

    if (askReasonOnReject) {
      setRejectReason('');
      setShowRejectModal(true);
    } else {
      executeReject('');
    }
  };

  /**
   * Thực thi gọi API từ chối hồ sơ kèm lý do
   */
  const executeReject = async (reason) => {
    try {
      setActionLoading('reject');
      setShowRejectModal(false);

      if (onReject) {
        await onReject(recordId, reason);
      } else if (recordId) {
        const res = await rejectIntern(recordId, reason);
        if (res.ok) {
          alert('Đã từ chối hồ sơ thành công!');
        } else {
          alert(res.data?.detail || 'Từ chối hồ sơ thất bại.');
        }
      }
    } catch (error) {
      console.error('Lỗi khi từ chối hồ sơ:', error);
      alert('Có lỗi xảy ra khi từ chối hồ sơ. Vui lòng thử lại!');
    } finally {
      setActionLoading(null);
    }
  };

  const isBusy = Boolean(actionLoading);

  return (
    <>
      <div className={`approval-actions ${className}`}>
        {/* Nút DUYỆT (Success - Xanh lá) */}
        <button
          type="button"
          className="approval-btn approval-btn--approve"
          onClick={handleApprove}
          disabled={disabled || isBusy}
          title="Duyệt hồ sơ thực tập sinh"
        >
          {actionLoading === 'approve' ? (
            <>
              <span className="approval-btn__spinner" aria-hidden="true" />
              <span>Đang duyệt…</span>
            </>
          ) : (
            <>
              <span className="approval-btn__icon" aria-hidden="true">✓</span>
              <span>Duyệt</span>
            </>
          )}
        </button>

        {/* Nút TỪ CHỐI (Danger - Đỏ) */}
        <button
          type="button"
          className="approval-btn approval-btn--reject"
          onClick={handleRejectClick}
          disabled={disabled || isBusy}
          title="Từ chối hồ sơ thực tập sinh"
        >
          {actionLoading === 'reject' ? (
            <>
              <span className="approval-btn__spinner" aria-hidden="true" />
              <span>Đang xử lý…</span>
            </>
          ) : (
            <>
              <span className="approval-btn__icon" aria-hidden="true">✕</span>
              <span>Từ chối</span>
            </>
          )}
        </button>
      </div>

      {/* Modal nhập lý do từ chối hồ sơ */}
      {showRejectModal && (
        <div className="approval-modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="approval-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Xác nhận từ chối hồ sơ</h4>
            <p>Vui lòng nhập lý do từ chối để gửi thông báo phản hồi cho ứng viên:</p>

            <textarea
              placeholder="Ví dụ: Thiếu bảng điểm hoặc CV chưa đúng mẫu..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />

            <div className="approval-modal__footer">
              <button
                type="button"
                className="approval-modal-btn approval-modal-btn--cancel"
                onClick={() => setShowRejectModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="approval-modal-btn approval-modal-btn--confirm-reject"
                onClick={() => executeReject(rejectReason)}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
