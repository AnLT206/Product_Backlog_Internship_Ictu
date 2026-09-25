/**
 * ConfirmActionDialog.jsx
 * Popup xác nhận trước khi duyệt hoặc từ chối hồ sơ thực tập sinh.
 *
 * US: "Là HR, tôi muốn duyệt hoặc từ chối hồ sơ để chọn ứng viên phù hợp."
 * Task 7: Bổ sung vào task 6 (InternActionButtons).
 *
 * Props:
 *   internId {number|string}        — ID hồ sơ cần xử lý
 *   action   {'approve'|'reject'}   — loại hành động
 *   onClose  {() => void}           — đóng popup (không làm gì thêm)
 *   onSuccess {() => void}          — callback sau khi API thành công
 *                                     (nơi dùng cập nhật lại Badge)
 *
 * Quy tắc:
 *   - Bấm Hủy → onClose(), KHÔNG gọi API.
 *   - Bấm Xác nhận → gọi API → thành công: đóng + onSuccess() + toast
 *                             → lỗi: giữ popup, hiện lỗi trong popup (HR thử lại)
 *   - action='reject': có textarea ghi chú bắt buộc (spec §5.4)
 *   - action='approve': không cần ghi chú
 */

import { useState } from 'react';
import { approveIntern, rejectIntern, buildToast } from '../../../api/interns';
import './ConfirmActionDialog.css';

/**
 * ConfirmActionDialog
 *
 * @param {{
 *   internId:  number|string,
 *   action:    'approve'|'reject',
 *   onClose:   () => void,
 *   onSuccess: () => void,
 * }} props
 */
function ConfirmActionDialog({ internId, action, onClose, onSuccess }) {
  const isApprove = action === 'approve';

  /* ── State ── */
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);  // lỗi hiện trong popup, không tự đóng

  /* ── Submit ── */
  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const result = isApprove
        ? await approveIntern(internId)
        : await rejectIntern(internId, note.trim());

      const { ok, status, data } = result;

      if (ok) {
        // Thành công: đóng popup → gọi onSuccess() → hiện toast bên ngoài
        const successMsg = isApprove ? 'Duyệt hồ sơ thành công!' : 'Đã từ chối hồ sơ.';
        const toastPayload = buildToast(ok, status, data, successMsg);
        onClose();
        // Truyền toast ra ngoài qua onSuccess để nơi dùng hiện thông báo
        onSuccess(toastPayload);
      } else {
        // Lỗi: KHÔNG đóng popup, hiện thông báo để HR thử lại
        const toastPayload = buildToast(ok, status, data);
        setError(toastPayload.message);
      }
    } catch {
      setError('Không thể kết nối tới máy chủ, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Đóng khi click backdrop ── */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  }

  /* ── Render ── */
  return (
    <div
      className="dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="dialog-panel">

        {/* Icon */}
        <div className={`dialog-icon dialog-icon--${isApprove ? 'approve' : 'reject'}`}>
          {isApprove ? '✓' : '✕'}
        </div>

        {/* Tiêu đề */}
        <h2 id="dialog-title" className="dialog-title">
          {isApprove
            ? 'Xác nhận duyệt hồ sơ'
            : 'Xác nhận từ chối hồ sơ'}
        </h2>

        {/* Mô tả */}
        <p className="dialog-desc">
          {isApprove
            ? 'Bạn có chắc muốn DUYỆT hồ sơ này? Hành động này sẽ kích hoạt tài khoản thực tập sinh.'
            : 'Bạn có chắc muốn TỪ CHỐI hồ sơ này? Vui lòng ghi rõ lý do bên dưới.'}
        </p>

        {/* Textarea ghi chú — chỉ hiện khi action=reject (spec §5.4) */}
        {!isApprove && (
          <div className="dialog-note-group">
            <label htmlFor="dialog-note" className="dialog-note-label">
              Lý do từ chối <span className="dialog-required">*</span>
            </label>
            <textarea
              id="dialog-note"
              className="dialog-note-textarea"
              placeholder="Nhập lý do từ chối hồ sơ..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>
        )}

        {/* Thông báo lỗi trong popup (không tự đóng) */}
        {error && (
          <div className="dialog-error" role="alert">
            ✕ {error}
          </div>
        )}

        {/* Actions */}
        <div className="dialog-actions">
          {/* Hủy — KHÔNG gọi API */}
          <button
            id={`dialog-cancel-${internId}`}
            type="button"
            className="dialog-btn dialog-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>

          {/* Xác nhận — gọi API */}
          <button
            id={`dialog-confirm-${internId}`}
            type="button"
            className={`dialog-btn dialog-btn--confirm dialog-btn--${isApprove ? 'approve' : 'reject'}`}
            onClick={handleConfirm}
            disabled={loading || (!isApprove && !note.trim())}
            aria-busy={loading}
          >
            {loading ? 'Đang xử lý…' : 'Xác nhận'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConfirmActionDialog;
