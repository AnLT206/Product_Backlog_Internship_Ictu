import React, { useState, useRef } from 'react';
import './ContractTab.css';

/**
 * Hàm tiện ích chuyển đổi dung lượng file từ bytes sang KB hoặc MB
 * @param {number} bytes 
 * @returns {string} Ví dụ: "450.25 KB", "2.14 MB"
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Danh sách phần mở rộng file được phép tải lên
 */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/**
 * ContractTab Component — Quản lý và tải lên hợp đồng cho ứng viên / thực tập sinh.
 *
 * @param {Object} props
 * @param {string|number} [props.internId] - ID của thực tập sinh/ứng viên
 * @param {Function} [props.onSaveContract] - Callback khi bấm lưu/tải lên: async (file) => { ... }
 */
export default function ContractTab({ internId, onSaveContract }) {
  // 1. Quản lý trạng thái file đã chọn
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Trạng thái thông báo lỗi (nếu chọn sai định dạng)
  const [errorMessage, setErrorMessage] = useState('');
  
  // Trạng thái kéo thả file (drag & drop)
  const [isDragOver, setIsDragOver] = useState(false);

  // Ref tham chiếu đến thẻ input file ẩn
  const fileInputRef = useRef(null);

  /**
   * Kiểm tra tính hợp lệ của file (chỉ cho phép .pdf và .docx)
   */
  const validateAndSetFile = (file) => {
    if (!file) return;

    setErrorMessage('');
    const fileName = file.name.toLowerCase();
    const isValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!isValidExtension) {
      setErrorMessage('Chỉ chấp nhận file định dạng .pdf hoặc .docx');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Giới hạn dung lượng tối đa (ví dụ 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setErrorMessage('Dung lượng file vượt quá giới hạn cho phép (tối đa 10MB)');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Bắt sự kiện khi người dùng chọn file từ hộp thoại của hệ thống
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  /**
   * Bắt sự kiện xóa file khỏi state
   */
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage('');
    // Reset giá trị input để có thể chọn lại chính file đó nếu muốn
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Xử lý kéo thả file (Drag & Drop)
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Xác định badge định dạng file
  const isPdf = selectedFile?.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="contract-tab">
      <div className="contract-tab__header">
        <h3>Hợp đồng thực tập</h3>
        <p>Tải lên bản hợp đồng đã ký hoặc hồ sơ thỏa thuận thực tập của ứng viên.</p>
      </div>

      {/* Thẻ input ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
      />

      {/* Khu vực chọn / kéo thả file (khi chưa chọn file) */}
      {!selectedFile && (
        <div
          className={`contract-upload-box ${isDragOver ? 'contract-upload-box--dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          <div className="contract-upload-box__icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14.5v3.5a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-3.5" />
              <polyline points="6.5 9 12 3.5 17.5 9" />
              <line x1="12" y1="3.5" x2="12" y2="15" />
            </svg>
          </div>
          <div className="contract-upload-box__text">
            Kéo thả tài liệu vào đây hoặc <span className="contract-upload-box__link">chọn từ máy tính</span>
          </div>
          <p className="contract-upload-box__hint">
            Hỗ trợ định dạng: <strong>.pdf, .docx</strong> (Tối đa 10MB)
          </p>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="contract-error-alert" role="alert">
          
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hiển thị chi tiết file khi đã chọn xong */}
      {selectedFile && (
        <div className="contract-file-card">
          <div className="contract-file-info">
            {/* Badge icon loại file */}
            <div className={`contract-file-badge ${isPdf ? 'contract-file-badge--pdf' : 'contract-file-badge--docx'}`}>
              {isPdf ? 'PDF' : 'DOCX'}
            </div>

            {/* Tên file & Dung lượng */}
            <div className="contract-file-details">
              <span className="contract-file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="contract-file-size">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>

          {/* Nút icon thùng rác xóa file khỏi state */}
          <button
            type="button"
            className="contract-delete-btn"
            onClick={handleRemoveFile}
            title="Xóa file đã chọn"
            aria-label="Xóa file"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )}

      {/* Nút hành động Lưu/Tải lên khi đã có file */}
      {selectedFile && (
        <div className="contract-actions">
          <button
            type="button"
            className="contract-submit-btn"
            onClick={() => onSaveContract?.(selectedFile)}
          >
            Lưu hợp đồng
          </button>
        </div>
      )}
    </div>
  );
}
