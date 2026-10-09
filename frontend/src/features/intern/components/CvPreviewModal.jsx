/**
 * CvPreviewModal.jsx
 * Modal xem trước tài liệu CV của ứng viên dành cho HR trước khi duyệt hồ sơ.
 *
 * Tính năng chính:
 *   - Hiển thị thông tin hồ sơ ứng viên (Họ tên, Email, Trường, Ngành học, GPA).
 *   - Nhúng trình xem file PDF trực tiếp qua iframe (có token xác thực).
 *   - Trích xuất và hiển thị các đoạn văn bản sạch cho file DOCX/DOC.
 *   - Nút Tải xuống file gốc và nút Mở trong tab mới.
 *   - Tích hợp 2 nút hành động [Duyệt hồ sơ] và [Từ chối] ngay trong Modal,
 *     giúp HR thẩm định năng lực rồi đưa ra quyết định ngay lập tức.
 */

import { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  getDocumentViewUrl,
  getDocumentDownloadUrl,
  viewDocument,
} from '../../../api/documents';
import StatusBadge from './StatusBadge';
import './CvPreviewModal.css';

/**
 * CvPreviewModal
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   intern: {
 *     id: number|string,
 *     full_name?: string,
 *     email?: string,
 *     university?: string,
 *     major?: string,
 *     gpa?: number|string,
 *     status?: string,
 *     has_cv?: boolean,
 *     cv_id?: number|string,
 *     cv_file_name?: string,
 *   },
 *   onApprove?: (internId: number|string) => void,
 *   onReject?: (internId: number|string) => void,
 * }} props
 */
function CvPreviewModal({
  isOpen,
  onClose,
  intern,
  onApprove,
  onReject,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [viewUrl, setViewUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const cvId = intern?.cv_id;
  const fileName = intern?.cv_file_name || 'CV_UngVien.pdf';
  const ext = fileName.split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isDoc = ext === 'docx' || ext === 'doc';

  useEffect(() => {
    if (!isOpen || !cvId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setParagraphs([]);

    const vUrl = getDocumentViewUrl(cvId);
    const dUrl = getDocumentDownloadUrl(cvId);
    setViewUrl(vUrl);
    setDownloadUrl(dUrl);

    if (isDoc) {
      // Gọi API xem văn bản raw cho DOCX
      void viewDocument(cvId, { raw: true }).then((res) => {
        if (!isMounted) return;
        if (res.ok && Array.isArray(res.data?.paragraphs)) {
          setParagraphs(res.data.paragraphs);
        } else {
          setError('Không thể trích xuất văn bản tự động. Vui lòng tải file để xem.');
        }
        setLoading(false);
      }).catch(() => {
        if (!isMounted) return;
        setError('Lỗi kết nối khi tải nội dung tài liệu.');
        setLoading(false);
      });
    } else {
      // PDF hiển thị trực tiếp trong iframe
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, cvId, isDoc]);

  if (!isOpen) return null;

  return (
    <div
      className="cv-preview-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cv-modal-title"
    >
      <div className="cv-preview-modal">
        {/* ── 1. Modal Header ── */}
        <div className="cv-preview-header">
          <div className="cv-preview-header__left">
            <div className="cv-preview-header__icon">
              <FileText size={22} />
            </div>
            <div>
              <h3 id="cv-modal-title" className="cv-preview-header__title">
                Hồ sơ ứng viên: {intern?.full_name || 'Ứng viên'}
              </h3>
              <div className="cv-preview-header__sub">
                <span>{intern?.email}</span>
                {intern?.university && (
                  <>
                    <span>•</span>
                    <span>{intern.university}</span>
                  </>
                )}
                {intern?.major && (
                  <span className="cv-preview-header__badge">{intern.major}</span>
                )}
                {intern?.gpa != null && (
                  <span className="cv-preview-header__badge">GPA: {intern.gpa}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="cv-preview-header__close"
            onClick={onClose}
            aria-label="Đóng cửa sổ xem CV"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── 2. Toolbar ── */}
        <div className="cv-preview-toolbar">
          <div className="cv-preview-toolbar__file">
            <span className={`cv-preview-toolbar__ext ${isDoc ? 'cv-preview-toolbar__ext--docx' : ''}`}>
              {ext.toUpperCase()}
            </span>
            <span>{fileName}</span>
          </div>

          <div className="cv-preview-toolbar__actions">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="cv-preview-toolbar__btn"
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} />
                <span>Tải file gốc</span>
              </a>
            )}

            {viewUrl && isPdf && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noreferrer"
                className="cv-preview-toolbar__btn"
              >
                <ExternalLink size={14} />
                <span>Mở tab mới</span>
              </a>
            )}
          </div>
        </div>

        {/* ── 3. Document Body ── */}
        <div className="cv-preview-body">
          {loading ? (
            <div className="cv-preview-loading">
              <div className="cv-preview-spinner" />
              <span>Đang tải nội dung tài liệu…</span>
            </div>
          ) : isPdf && viewUrl ? (
            <iframe
              src={viewUrl}
              className="cv-preview-iframe"
              title={`Nội dung CV - ${fileName}`}
            />
          ) : isDoc && paragraphs.length > 0 ? (
            <div className="cv-preview-docx-paper">
              <h4 className="cv-preview-docx-title">Nội dung văn bản CV</h4>
              {paragraphs.map((p, idx) => (
                <p key={idx} className="cv-preview-docx-p">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <div className="cv-preview-fallback">
              <AlertCircle size={44} color="#f59e0b" style={{ margin: '0 auto' }} />
              <h4>{error || 'Không thể hiển thị xem trước trực tiếp file này'}</h4>
              <p>
                Định dạng file ({ext.toUpperCase()}) có thể không hỗ trợ xem trực tiếp trong trình duyệt.
                Bạn có thể tải file về máy tính để mở bằng phần mềm chuyên dụng.
              </p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="cv-btn-modal cv-btn-modal--approve"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={16} />
                  <span>Tải file CV về máy</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Modal Footer: Thẩm định & Đưa ra quyết định ── */}
        <div className="cv-preview-footer">
          <div className="cv-preview-footer__hint">
            <Eye size={16} color="#0284c7" />
            <span>
              {intern?.status === 'pending'
                ? 'Sau khi kiểm tra CV và đánh giá năng lực, HR vui lòng đưa ra quyết định duyệt hoặc từ chối:'
                : 'Trạng thái hiện tại của hồ sơ:'}
            </span>
            {intern?.status !== 'pending' && (
              <StatusBadge status={intern?.status || 'active'} />
            )}
          </div>

          <div className="cv-preview-footer__actions">
            <button
              type="button"
              className="cv-btn-modal cv-btn-modal--close"
              onClick={onClose}
            >
              Đóng
            </button>

            {(intern?.status === 'pending' || intern?.status === 'inactive' || intern?.status === 'rejected') && intern?.status !== 'active' && (
              <>
                <button
                  type="button"
                  className="cv-btn-modal cv-btn-modal--reject"
                  onClick={() => {
                    onClose();
                    onReject?.(intern?.id);
                  }}
                >
                  <XCircle size={15} />
                  <span>Từ chối</span>
                </button>

                <button
                  type="button"
                  className="cv-btn-modal cv-btn-modal--approve"
                  onClick={() => {
                    onClose();
                    onApprove?.(intern?.id);
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{intern?.status === 'pending' ? 'Duyệt hồ sơ' : 'Xem xét lại & Duyệt'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CvPreviewModal;
