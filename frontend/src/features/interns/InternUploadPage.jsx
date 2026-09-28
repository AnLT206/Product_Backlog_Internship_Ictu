/**
 * InternUploadPage.jsx
 * Route dự kiến: /intern/documents/upload
 *
 * US: "Là thực tập sinh, tôi muốn upload CV và đơn xin thực tập
 *      để hoàn thiện hồ sơ."
 *
 * Tính năng:
 *   - Chọn loại tài liệu (CV / Đơn xin thực tập).
 *   - Chọn file từ máy tính (input[type="file"]).
 *   - Validate phía FE: định dạng .pdf/.docx và dung lượng ≤ 5MB.
 *   - Gọi uploadDocument() từ src/api/documents.js.
 *   - Sau upload thành công: hiển thị tên file + link "Xem trước" + link "Tải xuống".
 *   - Toast lỗi khi upload thất bại (tái sử dụng buildToast từ src/api/interns.js).
 *
 * Pattern: bám đúng CreateAccountPage.jsx / ProgramFormPage.jsx:
 *   useState(form/errors/loading/toast), handleChange, showToast.
 *
 * Không dùng useEffect để tải danh sách tự động — hiển thị kết quả
 * ngay sau khi upload xong trong cùng phiên (setState trong event handler,
 * không trong effect) → tránh lỗi ESLint react-hooks/set-state-in-effect.
 *
 * Theme: kế thừa CreateAccountPage.css (design tokens đồng bộ).
 */

import { useState, useRef } from 'react';
import { uploadDocument } from '../../api/documents';
import { buildToast } from '../../api/interns';
import './InternUploadPage.css';

/* ─────────────────────────────────────────────
   Hằng số
───────────────────────────────────────────── */

/** Loại tài liệu — khớp với doc_type ENUM backend */
const DOC_TYPE_OPTIONS = [
  { value: 'cv',          label: 'CV (Curriculum Vitae)' },
  { value: 'application', label: 'Đơn xin thực tập' },
];

/** Validate phía FE — đồng bộ rule backend (spec §2.2 + file_validator.py) */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_SIZE       = 5 * 1024 * 1024; // 5 MB

/* ─────────────────────────────────────────────
   Validate file helper
   Trả về chuỗi lỗi hoặc null nếu hợp lệ.
───────────────────────────────────────────── */
function validateFile(file) {
  if (!file) return 'Vui lòng chọn file.';

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Chỉ chấp nhận file PDF hoặc DOCX.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File vượt quá 5MB.';
  }
  return null;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

/**
 * InternUploadPage
 *
 * Form TTS upload CV / đơn xin thực tập.
 * Sau upload thành công hiển thị link xem trước + tải xuống.
 */
function InternUploadPage() {
  /* ── State ── */
  const [docType, setDocType]   = useState('cv');
  const [file, setFile]         = useState(null);        // File object
  const [fileError, setFileError] = useState('');        // Lỗi validate file
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);        // { type, message }

  /**
   * uploadedFiles — danh sách file đã upload thành công trong phiên này.
   * Mỗi item: { id, file_name, doc_type, file_url }
   * Không cần useEffect — cập nhật ngay sau mỗi lần upload thành công.
   */
  const [uploadedFiles, setUploadedFiles] = useState([]);

  /* ── Drag & drop state ── */
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Upload progress state ──
     Dùng dạng indeterminate (0 → 100% giả lập theo thời gian MOCK).
     TODO: Khi BE thật và dùng XMLHttpRequest, thay bằng progress event thật.
  ── */
  const [progress, setProgress] = useState(0); // 0..100

  /* ── Handlers ── */
  function handleDocTypeChange(e) {
    setDocType(e.target.value);
  }

  /* ── Drag & drop handlers ── */
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) {
      setFile(dropped);
      setFileError(validateFile(dropped) ?? '');
    }
  }

  function handleUploadAreaClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      setFileError(validateFile(selected) ?? '');
    } else {
      setFileError('');
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // 1. Validate phía FE
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }

    // 2. Bắt đầu progress bar (indeterminate giả lập)
    //    TODO: Khi BE thật dùng XHR, thay bằng xhr.upload.onprogress thật.
    setLoading(true);
    setProgress(0);
    // Giả lập tiến trình tăng dần mỗi 80ms cho đến khi API trả về
    const tick = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + 5 : prev));
    }, 80);

    try {
      const { ok, status, data } = await uploadDocument(file, docType);

      // Kết thúc progress bar
      clearInterval(tick);
      setProgress(100);

      if (ok) {
        setUploadedFiles((prev) => [
          {
            id:        data.id,
            file_name: data.file_name ?? file.name,
            doc_type:  data.doc_type  ?? docType,
            file_url:  data.file_url  ?? null,
          },
          ...prev,
        ]);

        const t = buildToast(ok, status, data, 'Tải lên tài liệu thành công!');
        showToast(t.type, t.message);

        setFile(null);
        setFileError('');
        e.target.reset();
      } else if (status === 422) {
        const detail = data?.detail;
        const msg = Array.isArray(detail)
          ? detail.map((d) => d.msg).join('; ')
          : (detail ?? 'Tệp không hợp lệ.');
        setFileError(msg);
        showToast('error', msg);
      } else {
        const t = buildToast(ok, status, data);
        showToast(t.type, t.message);
      }
    } catch {
      clearInterval(tick);
      showToast('error', 'Không thể kết nối tới máy chủ, vui lòng thử lại.');
    } finally {
      // Delay ẩn progress bar 400ms để người dùng thấy 100%
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 400);
    }
  }

  /* ── Helpers render ── */
  function docTypeLabel(type) {
    return DOC_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  }

  /* ── Render ── */
  return (
    <div className="intern-upload-page">
      {/* Glow nền — giống CreateAccountPage */}
      <div className="intern-upload-page__glow" aria-hidden="true" />

      {/* ── Toast ── */}
      {toast && (
        <div
          id="intern-upload-toast"
          className={`intern-upload-toast intern-upload-toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? '✓ ' : '✕ '}
          {toast.message}
        </div>
      )}

      <div className="intern-upload-shell">

        {/* Brand / back link */}
        <a href="/intern/dashboard" className="intern-upload-brand">
          ← Quay lại trang chủ
        </a>

        {/* Card */}
        <div className="intern-upload-card">

          {/* Header */}
          <div className="intern-upload-header">
            <span className="intern-upload-badge">Thực tập sinh</span>
            <h1>Upload <span>hồ sơ</span> thực tập</h1>
            <p className="intern-upload-lead">
              Tải lên CV và đơn xin thực tập. Chỉ chấp nhận{' '}
              <strong>PDF</strong> hoặc <strong>DOCX</strong>, tối đa <strong>5 MB</strong>.
            </p>
          </div>

          {/* Form */}
          <form
            className="intern-upload-form"
            id="intern-upload-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Loại tài liệu */}
            <div className="form-group">
              <label htmlFor="intern-upload-doctype">
                Loại tài liệu <span className="intern-upload-required" aria-hidden="true">*</span>
              </label>
              <select
                id="intern-upload-doctype"
                name="doc_type"
                value={docType}
                onChange={handleDocTypeChange}
              >
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Upload area (drag & drop + nút chọn file) ── */}
            <div className={`form-group${fileError ? ' form-group--error' : ''}`}>
              <label htmlFor="intern-upload-file">
                Tải lên file <span className="intern-upload-required" aria-hidden="true">*</span>
              </label>

              {/* Vùng kéo-thả nổi bật */}
              <div
                className={`intern-upload-dropzone${isDragOver ? ' intern-upload-dropzone--active' : ''}${file ? ' intern-upload-dropzone--has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadAreaClick}
                role="button"
                tabIndex={0}
                aria-label="Khu vực kéo thả hoặc nhấn để chọn file"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUploadAreaClick(); }}
              >
                {/* Input ẩn — trigger bằng click vào dropzone */}
                <input
                  ref={fileInputRef}
                  id="intern-upload-file"
                  name="file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="intern-upload-file-input"
                  aria-describedby={fileError ? 'err-upload-file' : 'hint-upload-file'}
                  style={{ display: 'none' }}
                />

                {file ? (
                  /* File đã chọn: hiển thị icon + tên */
                  <div className="intern-upload-dropzone__file">
                    <span className="intern-upload-dropzone__file-icon" aria-hidden="true">
                      {file.name.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                    </span>
                    <div className="intern-upload-dropzone__file-info">
                      <span className="intern-upload-dropzone__file-name">{file.name}</span>
                      <span className="intern-upload-dropzone__file-size">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <span className="intern-upload-dropzone__change">Đổi file</span>
                  </div>
                ) : (
                  /* Chưa chọn file: placeholder */
                  <div className="intern-upload-dropzone__placeholder">
                    <span className="intern-upload-dropzone__icon" aria-hidden="true">⬆</span>
                    <p className="intern-upload-dropzone__text">
                      {isDragOver ? 'Thả file vào đây…' : 'Kéo & thả file vào đây hoặc'}
                    </p>
                    {!isDragOver && (
                      <span className="intern-upload-dropzone__cta">Chọn file từ máy tính</span>
                    )}
                  </div>
                )}
              </div>

              <span id="hint-upload-file" className="intern-upload-hint">
                Chỉ chấp nhận <strong>PDF</strong> hoặc <strong>DOCX</strong>, tối đa <strong>5 MB</strong>
              </span>
              {fileError && (
                <span id="err-upload-file" className="form-error" role="alert">
                  {fileError}
                </span>
              )}
            </div>

            {/* ── Progress bar — hiện khi đang upload, ẩn sau khi xong ── */}
            {loading && (
              <div className="intern-upload-progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến trình tải lên">
                <div className="intern-upload-progress-bar" style={{ width: `${progress}%` }} />
                <span className="intern-upload-progress-text">
                  {progress < 100 ? `Đang tải lên… ${progress}%` : 'Hoàn thành!'}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              id="intern-upload-submit"
              type="submit"
              className="intern-upload-button"
              disabled={loading || !file || !!fileError}
            >
              {loading ? (
                <>
                  <span className="intern-upload-spinner" aria-hidden="true" />
                  Đang tải lên…
                </>
              ) : (
                '⬆ Tải lên tài liệu'
              )}
            </button>
          </form>
        </div>

        {/* ── Danh sách file đã upload ── */}
        {uploadedFiles.length > 0 && (
          <div className="intern-upload-results">
            <h2 className="intern-upload-results__title">
              Tài liệu đã tải lên ({uploadedFiles.length})
            </h2>

            <ul className="intern-upload-list" aria-label="Danh sách tài liệu đã upload">
              {uploadedFiles.map((doc) => (
                <li key={doc.id} className="intern-upload-item">
                  {/* Icon + tên file */}
                  <div className="intern-upload-item__info">
                    <span className="intern-upload-item__icon" aria-hidden="true">
                      {doc.file_name.endsWith('.pdf') ? '📄' : '📝'}
                    </span>
                    <div>
                      <p className="intern-upload-item__name">{doc.file_name}</p>
                      <p className="intern-upload-item__type">
                        {docTypeLabel(doc.doc_type)}
                      </p>
                    </div>
                  </div>

                  {/* Links xem trước + tải xuống */}
                  {doc.file_url ? (
                    <div className="intern-upload-item__actions">
                      {/* Xem trước — mở tab mới an toàn */}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="intern-upload-link intern-upload-link--preview"
                        id={`preview-link-${doc.id}`}
                      >
                        👁 Xem trước
                      </a>

                      {/* Tải xuống — dùng thuộc tính download */}
                      <a
                        href={doc.file_url}
                        download={doc.file_name}
                        rel="noopener noreferrer"
                        className="intern-upload-link intern-upload-link--download"
                        id={`download-link-${doc.id}`}
                      >
                        ⬇ Tải xuống
                      </a>
                    </div>
                  ) : (
                    /* Trường hợp BE không trả về URL (TODO: xác nhận với BE) */
                    <p className="intern-upload-item__no-url">
                      URL chưa có — xác nhận với backend.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default InternUploadPage;
