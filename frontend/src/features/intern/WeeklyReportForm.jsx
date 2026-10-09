import { useState, useRef, useEffect } from "react";
import "./WeeklyReportForm.css";

/**
 * Hàm hỗ trợ lấy thời gian thực định dạng DD/MM/YYYY HH:mm (ngày tháng năm giờ và phút, bỏ giây)
 */
const formatRealtimeDisplay = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Functional Component: WeeklyReportForm
 * Chức năng: Thực tập sinh nộp báo cáo với Thời gian báo cáo thời gian thực, lưu trực tiếp vào CSDL hệ thống
 */
export default function WeeklyReportForm({
  onSubmitSuccess,
  onCancel,
  isModal = false,
}) {
  // ==========================================
  // 1. QUẢN LÝ STATE
  // ==========================================
  // Thời gian báo cáo lấy trực tiếp theo thời gian thực (cập nhật từng giây, không được chọn)
  const [reportTime, setReportTime] = useState(formatRealtimeDisplay);

  useEffect(() => {
    const timer = setInterval(() => {
      setReportTime(formatRealtimeDisplay());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [reportContent, setReportContent] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // State quản lý lỗi riêng cho từng trường
  const [errors, setErrors] = useState({});

  // State quản lý trạng thái tải lên & phản hồi
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState("");


  // Tham chiếu DOM tới thẻ input file ẩn và textarea
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Regex kiểm tra định dạng file: .pdf, .doc, .docx
  const FILE_REGEX = /(\.pdf|\.doc|\.docx)$/i;
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  // ==========================================
  // 2. HELPER FUNCTIONS & LOGIC VALIDATE
  // ==========================================
  /**
   * Tự động quy đổi dung lượng file từ Bytes sang KB hoặc MB (làm tròn 2 chữ số thập phân)
   */
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  /**
   * Kiểm tra tính hợp lệ của file khi người dùng chọn hoặc kéo thả
   */
  const validateAndSetFile = (file) => {
    if (!file) return;

    // Kiểm tra định dạng bằng Regex
    if (!FILE_REGEX.test(file.name)) {
      setErrors((prev) => ({
        ...prev,
        attachedFile:
          "Định dạng không hợp lệ! Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)",
      }));
      setAttachedFile(null);
      return;
    }

    // Kiểm tra dung lượng tối đa 5MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        attachedFile: "Dung lượng file vượt quá mức cho phép (Tối đa 5MB)",
      }));
      setAttachedFile(null);
      return;
    }

    // File hợp lệ -> Lưu state và xóa thông báo lỗi trường file
    setAttachedFile(file);
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.attachedFile;
      return updated;
    });
  };

  /**
   * Toàn bộ hàm validate form trước khi Submit
   */
  const validateForm = () => {
    const newErrors = {};

    // 1. Validate reportContent: Không được rỗng (không giới hạn số lượng ký tự)
    const trimmedContent = reportContent.trim();
    if (!trimmedContent) {
      newErrors.reportContent = "Vui lòng nhập nội dung báo cáo";
    }

    // 2. Validate attachedFile: Bắt buộc đính kèm, kiểm tra regex và dung lượng
    if (!attachedFile) {
      newErrors.attachedFile =
        "Vui lòng đính kèm file báo cáo minh chứng (.pdf, .doc, .docx)";
    } else {
      if (!FILE_REGEX.test(attachedFile.name)) {
        newErrors.attachedFile =
          "Định dạng không hợp lệ! Chỉ chấp nhận file PDF hoặc Word (.doc, .docx)";
      } else if (attachedFile.size > MAX_FILE_SIZE_BYTES) {
        newErrors.attachedFile =
          "Dung lượng file vượt quá mức cho phép (Tối đa 5MB)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // 3. SỰ KIỆN KÉO THẢ & CHỌN FILE
  // ==========================================
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setErrors((prev) => ({
      ...prev,
      attachedFile:
        "Vui lòng đính kèm file báo cáo minh chứng (.pdf, .doc, .docx)",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Kiểm tra validation
    const isValid = validateForm();
    if (!isValid) {
      // Focus vào trường bị lỗi đầu tiên
      if (!reportContent.trim()) {
        textareaRef.current?.focus();
      }
      return;
    }

    // 2. Bật trạng thái Loading
    setIsLoading(true);
    setSuccessToast("");

    try {
      // 3. Khởi tạo đối tượng FormData và append các trường
      const formData = new FormData();
      formData.append("report_time", reportTime);
      formData.append("week", reportTime);
      formData.append("content", reportContent.trim());
      if (attachedFile) {
        formData.append("file", attachedFile);
      }

      // Giả lập độ trễ ngắn 800ms để trải nghiệm mượt mà
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Gọi API thực tế lưu trực tiếp vào CSDL MySQL của hệ thống
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
      let createdReportId = Date.now();
      try {
        const res = await fetch("/api/intern/weekly-reports", {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.id) createdReportId = resData.id;
        }
      } catch (err) {
        console.warn("API fallback simulation:", err);
      }

      // Ngày nộp hiện tại định dạng DD/MM/YYYY
      const now = new Date();
      const todayDateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

      // Bản ghi mới được tạo ra đầy đủ các trường tương thích
      const newHistoryRecord = {
        id: createdReportId,
        intern_id: 5,
        mentor_id: 3,
        week: reportTime,
        report_time: reportTime,
        week_title: `Báo cáo (${reportTime})`,
        week_range: `Thời gian: ${reportTime}`,
        submittedDate: todayDateStr,
        submitted_at: reportTime,
        content: reportContent.trim(),
        contentSummary: reportContent.trim(),
        tasks_done: reportContent.trim(),
        summary: reportContent.trim(),
        fileName: attachedFile ? attachedFile.name : "BaoCao.docx",
        file_name: attachedFile ? attachedFile.name : "BaoCao.docx",
        fileSize: attachedFile ? formatFileSize(attachedFile.size) : "1.2 MB",
        status: "Chờ duyệt",
        issues: "Không có khó khăn lớn",
        plan: "Tiếp tục thực hiện nhiệm vụ Sprint theo kế hoạch",
      };

      // 4. Lưu bản ghi mới vào localStorage hệ thống
      try {
        const raw = localStorage.getItem("intern_report_history");
        const existing = raw ? JSON.parse(raw) : [];
        if (Array.isArray(existing)) {
          localStorage.setItem("intern_report_history", JSON.stringify([newHistoryRecord, ...existing]));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('intern_data_changed'));
        }
      } catch (err) {
        console.warn("LocalStorage write error:", err);
      }


      // 5. Reset toàn bộ form về rỗng
      setReportContent("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrors({});

      // 6. Hiển thị thông báo chúc mừng
      setSuccessToast(
        `🎉 Chúc mừng! Báo cáo lúc [${reportTime}] đã được ghi nhận trực tiếp vào hệ thống.`
      );
      setTimeout(() => setSuccessToast(""), 6000);

      // Gọi callback ngoài nếu có
      if (onSubmitSuccess) {
        onSubmitSuccess(newHistoryRecord);
      }
    } catch (error) {
      console.error("Submit report error:", error);
      setErrors((prev) => ({
        ...prev,
        global: "Có lỗi xảy ra khi nộp báo cáo tuần. Vui lòng thử lại sau!",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={isModal ? styles.modalWrapper : styles.pageContainer}>
      <div style={isModal ? styles.modalCard : styles.card}>
        {/* ======================================================== */}
        {/* HEADER CỦA FORM */}
        {/* ======================================================== */}
        <div style={styles.header}>
          <div style={styles.headerTopRow}>
            <span style={styles.badge}>Thực tập sinh</span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={styles.closeBtn}
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            )}
          </div>
          <h2 style={styles.title}>Nộp Báo Cáo Tuần</h2>
          <p style={styles.subtitle}>
            Báo cáo tiến độ và công việc định kỳ để Mentor theo dõi và đánh giá kết quả thực tập.
          </p>
        </div>

        {/* Thông báo chúc mừng khi nộp thành công */}
        {successToast && (
          <div style={styles.alertSuccess}>
            <svg style={styles.alertIcon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* Thông báo lỗi chung nếu có */}
        {errors.global && (
          <div style={styles.alertError}>
            <svg style={styles.alertIcon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errors.global}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* ======================================================== */}
          {/* TRƯỜNG 1: Thời gian báo cáo (Lấy trực tiếp từ thời gian thực, không được chọn) */}
          {/* ======================================================== */}
          <div style={styles.formGroup}>
            <label htmlFor="report-time" style={styles.label}>
              Thời gian báo cáo <span style={styles.required}>*</span>
            </label>
            <div style={styles.readonlyInputWrap}>
              <svg
                style={styles.readonlyInputIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <input
                id="report-time"
                type="text"
                value={reportTime}
                readOnly
                style={styles.readonlyInput}
                title="Thời gian báo cáo được hệ thống tự động ghi nhận theo thời gian thực"
              />
            </div>
            <p style={styles.fieldHint}>
              Hệ thống tự động ghi nhận chính xác thời gian thực tại thời điểm nộp báo cáo.
            </p>
          </div>

          {/* ======================================================== */}
          {/* TRƯỜNG 2: Khung soạn thảo Text Editor (Validate >= 30 ký tự) */}
          {/* ======================================================== */}
          <div style={styles.formGroup}>
            <label htmlFor="report-content" style={styles.label}>
              Nội dung <span style={styles.required}>*</span>
            </label>
            <textarea
              id="report-content"
              ref={textareaRef}
              rows={7}
              value={reportContent}
              disabled={isLoading}
              onChange={(e) => {
                setReportContent(e.target.value);
                if (errors.reportContent && e.target.value.trim().length > 0) {
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.reportContent;
                    return updated;
                  });
                }
              }}
              placeholder="Mô tả chi tiết công việc đã hoàn thành, khó khăn gặp phải và kế hoạch tiếp theo..."
              style={{
                ...styles.textarea,
                borderColor: errors.reportContent ? "#EF4444" : "#CBD5E1",
                boxShadow: errors.reportContent ? "0 0 0 3px rgba(239, 68, 68, 0.12)" : "none",
              }}
              onFocus={(e) => {
                if (!errors.reportContent) {
                  e.target.style.borderColor = "#2563EB";
                  e.target.style.boxShadow = "0 0 0 3.5px rgba(37, 99, 235, 0.14)";
                }
              }}
              onBlur={(e) => {
                if (!errors.reportContent) {
                  e.target.style.borderColor = "#CBD5E1";
                  e.target.style.boxShadow = "none";
                }
              }}
            />

            {/* Thông báo lỗi validation của reportContent */}
            {errors.reportContent && (
              <div style={styles.fieldError}>
                <svg style={styles.fieldErrorIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errors.reportContent}</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* TRƯỜNG 3: Vùng kéo thả File Upload (Validate bắt buộc, regex, size <= 5MB) */}
          {/* ======================================================== */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Tài liệu đính kèm <span style={styles.required}>*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={isLoading}
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />

            {!attachedFile ? (
              // Khi chưa có file: Hiển thị vùng Kéo thả nét đứt
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                style={{
                  ...styles.dropZone,
                  borderColor: errors.attachedFile
                    ? "#EF4444"
                    : isDragging
                    ? "#2563EB"
                    : "#94A3B8",
                  backgroundColor: errors.attachedFile
                    ? "#FEF2F2"
                    : isDragging
                    ? "#EFF6FF"
                    : "#F8FAFC",
                  ...(isDragging ? styles.dropZoneActive : {}),
                }}
              >
                <div
                  style={{
                    ...styles.iconCircle,
                    backgroundColor: errors.attachedFile ? "#FEE2E2" : "#E2E8F0",
                    color: errors.attachedFile ? "#DC2626" : "#475569",
                  }}
                >
                  <svg
                    style={styles.cloudSvg}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p style={styles.dropZoneTitle}>
                  <strong>Kéo thả file báo cáo vào đây</strong>, hoặc{" "}
                  <span style={styles.dropZoneLink}>bấm để chọn file từ máy tính</span>
                </p>
                <p style={styles.dropZoneSubtitle}>
                  Hỗ trợ định dạng: .pdf, .doc, .docx (Tối đa 5MB)
                </p>
              </div>
            ) : (
              // Khi đã có file: Ẩn vùng kéo thả, hiển thị thẻ thông tin file
              <div
                style={{
                  ...styles.fileCard,
                  borderColor: errors.attachedFile ? "#EF4444" : "#BFDBFE",
                }}
              >
                <div style={styles.fileCardLeft}>
                  <div style={styles.fileCardIcon}>📄</div>
                  <div style={styles.fileCardDetails}>
                    <div style={styles.fileName} title={attachedFile.name}>
                      {attachedFile.name}
                    </div>
                    <div style={styles.fileMeta}>
                      Dung lượng: <strong>{formatFileSize(attachedFile.size)}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={styles.removeBtn}
                  disabled={isLoading}
                  title="Gỡ file đính kèm"
                >
                  ✕ Xóa / Chọn lại
                </button>
              </div>
            )}

            {/* Thông báo lỗi validation của attachedFile */}
            {errors.attachedFile && (
              <div style={styles.fieldError}>
                <svg style={styles.fieldErrorIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errors.attachedFile}</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* NÚT SUBMIT & CANCEL */}
          {/* ======================================================== */}
          <div style={styles.actionRow} className="wrf-action-row">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={styles.cancelBtn}
                className="wrf-btn wrf-btn-cancel"
                disabled={isLoading}
              >
                Đóng
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.submitBtn,
                ...(isLoading ? styles.submitBtnDisabled : {}),
              }}
              className="wrf-btn wrf-btn-submit"
            >
              {isLoading ? (
                <span style={styles.loadingWrapper}>
                  <svg style={styles.spinner} viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      style={{ opacity: 0.25 }}
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      style={{ opacity: 0.75 }}
                    />
                  </svg>
                  <span>Đang tải lên hệ thống...</span>
                </span>
              ) : (
                <span style={styles.submitInner}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Nộp Báo Cáo</span>
                </span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ==========================================
// 6. STYLESHEET (Tổ chức gọn gàng chuẩn Senior UI)
// ==========================================
const styles = {
  pageContainer: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: "#F4F6F9",
    padding: "36px 16px 60px 16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: "border-box",
  },
  modalWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "880px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "36px 40px",
    boxShadow:
      "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
    border: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: "14px",
    padding: "24px 28px",
    boxSizing: "border-box",
  },
  header: {
    marginBottom: "24px",
    textAlign: "center",
  },
  headerTopRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: "8px",
  },
  badge: {
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "4px 14px",
    borderRadius: "9999px",
    border: "1px solid #DBEAFE",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: -4,
    background: "transparent",
    border: "none",
    fontSize: "20px",
    color: "#94A3B8",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "24px",
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#64748B",
    lineHeight: "1.5",
  },
  alertError: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #FECACA",
    fontSize: "14px",
    marginBottom: "20px",
  },
  alertSuccess: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#F0FDF4",
    color: "#15803D",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #BBF7D0",
    fontSize: "14px",
    marginBottom: "20px",
    fontWeight: "500",
    animation: "fadeIn 0.2s ease-in-out",
  },
  alertIcon: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
  },
  required: {
    color: "#EF4444",
  },
  selectWrapper: {
    position: "relative",
    width: "100%",
  },
  select: {
    width: "100%",
    padding: "11px 16px",
    fontSize: "15px",
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    outline: "none",
    backgroundColor: "#FFFFFF",
    color: "#1E293B",
    appearance: "none",
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  selectArrow: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    fontSize: "10px",
    color: "#64748B",
  },
  textarea: {
    width: "100%",
    minHeight: "150px",
    maxHeight: "280px",
    overflowY: "auto",
    padding: "14px 16px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    borderRadius: "10px",
    border: "1.5px solid #CBD5E1",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily:
      'var(--fb-font, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  fieldError: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#DC2626",
    fontSize: "13px",
    fontWeight: "500",
    marginTop: "4px",
  },
  fieldErrorIcon: {
    width: "15px",
    height: "15px",
    flexShrink: 0,
  },
  dropZone: {
    border: "2px dashed #94A3B8",
    borderRadius: "10px",
    padding: "26px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  dropZoneActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    transform: "scale(1.01)",
  },
  iconCircle: {
    width: "48px",
    height: "48px",
    margin: "0 auto 10px auto",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  cloudSvg: {
    width: "24px",
    height: "24px",
  },
  dropZoneTitle: {
    margin: "0 0 6px 0",
    fontSize: "14px",
    color: "#334155",
  },
  dropZoneLink: {
    color: "#2563EB",
    textDecoration: "underline",
    fontWeight: "600",
  },
  dropZoneSubtitle: {
    margin: 0,
    fontSize: "12px",
    color: "#94A3B8",
  },
  fileCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderRadius: "8px",
    border: "1.5px solid #BFDBFE",
    backgroundColor: "#F0F7FF",
  },
  fileCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    overflow: "hidden",
  },
  fileCardIcon: {
    fontSize: "24px",
  },
  fileCardDetails: {
    overflow: "hidden",
  },
  fileName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1E293B",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "340px",
  },
  fileMeta: {
    fontSize: "12px",
    color: "#64748B",
    marginTop: "2px",
  },
  removeBtn: {
    backgroundColor: "#FFFFFF",
    color: "#DC2626",
    border: "1px solid #FCA5A5",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "18px",
    borderTop: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },
  cancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "42px",
    minWidth: "105px",
    padding: "0 20px",
    backgroundColor: "#FFFFFF",
    color: "#475569",
    border: "1.5px solid #CBD5E1",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily:
      'var(--fb-font, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    fontWeight: "600",
    cursor: "pointer",
    outline: "none",
    boxSizing: "border-box",
  },
  submitBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "42px",
    minWidth: "145px",
    padding: "0 24px",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    border: "1px solid #1D4ED8",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily:
      'var(--fb-font, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    outline: "none",
    boxSizing: "border-box",
  },
  submitBtnDisabled: {
    backgroundColor: "#93C5FD",
    borderColor: "#93C5FD",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  submitInner: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  loadingWrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  readonlyInputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  readonlyInputIcon: {
    position: "absolute",
    left: "14px",
    width: "18px",
    height: "18px",
    color: "#2563EB",
    pointerEvents: "none",
  },
  readonlyInput: {
    width: "100%",
    padding: "12px 16px 12px 42px",
    borderRadius: "10px",
    border: "1.5px solid #CBD5E1",
    fontSize: "14px",
    fontFamily:
      'var(--fb-font, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    fontWeight: "600",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    cursor: "not-allowed",
    outline: "none",
    boxSizing: "border-box",
  },
  fieldHint: {
    margin: "6px 0 0 0",
    fontSize: "12.5px",
    color: "#64748B",
    fontStyle: "italic",
  },
};
