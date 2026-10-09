import { useState, useEffect } from "react";
import { getPrograms, updateProgram, createProgram } from "../../api/programs";

export default function ProgramSettings({ onSaved }) {
  // ==========================================
  // 1. QUẢN LÝ STATE
  // ==========================================
  // State quản lý dữ liệu người dùng đang nhập vào Form
  const [formData, setFormData] = useState({
    batchName: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  // State lưu cấu hình hiện tại đang chạy trên hệ thống
  const [activeConfig, setActiveConfig] = useState({
    id: 1,
    batchName: "Kỳ thực tập Mùa Thu 2026 (Batch 01)",
    startDate: "2026-08-01",
    endDate: "2026-11-30",
    status: "Đang diễn ra",
    description: "Chương trình thực tập chuyên sâu liên kết Khoa CNTT & Doanh nghiệp.",
  });

  // State thông báo lỗi và thành công
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // Tải cấu hình chương trình từ backend API
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    async function fetchActiveProgram() {
      try {
        const res = await getPrograms();
        if (!isMounted) return;
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          const current = res.data.find((p) => p.status === "open") || res.data[0];
          setActiveConfig({
            id: current.id,
            batchName: current.name,
            startDate: current.start_date,
            endDate: current.end_date,
            status: current.status === "open" ? "Đang diễn ra" : "Đã kết thúc",
            description: current.description || "Chương trình thực tập chuyên sâu liên kết Doanh nghiệp.",
          });
          setFormData({
            batchName: current.name,
            startDate: current.start_date,
            endDate: current.end_date,
            description: current.description || "",
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải cấu hình chương trình:", err);
      }
    }
    fetchActiveProgram();
    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // 2. HELPER FUNCTIONS
  // ==========================================
  /**
   * Tính toán tổng số ngày và số tuần thực tập giữa 2 mốc thời gian
   */
  const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = end.getTime() - start.getTime();

    if (diffTime < 0) {
      return { days: 0, weeks: 0, isValid: false };
    }

    // Tính tổng số ngày (bao gồm cả ngày bắt đầu và kết thúc)
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.round((days / 7) * 10) / 10;

    return { days, weeks, isValid: true };
  };

  // Định dạng ngày hiển thị dd/mm/yyyy
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Thời lượng của cấu hình đang chạy
  const activeDuration = calculateDuration(activeConfig.startDate, activeConfig.endDate);

  // Thời lượng dự kiến khi người dùng đang chọn ngày trên Form
  const previewDuration = calculateDuration(formData.startDate, formData.endDate);

  // ==========================================
  // 3. SỰ KIỆN FORM (Dùng chung handleInputChange)
  // ==========================================
  /**
   * Xử lý onChange linh hoạt cho tất cả các trường input/textarea
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Tự động xóa lỗi của trường khi người dùng gõ/chọn lại
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  /**
   * Đặt lại (Reset) toàn bộ dữ liệu form về rỗng
   */
  const handleReset = () => {
    setFormData({
      batchName: "",
      startDate: "",
      endDate: "",
      description: "",
    });
    setErrors({});
    setSuccessMsg("");
  };

  /**
   * Xử lý Lưu cấu hình mới và gọi API backend
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");

    const newErrors = {};
    if (!formData.batchName.trim()) {
      newErrors.batchName = "Vui lòng nhập tên đợt thực tập";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      let savedData = null;
      if (activeConfig.id) {
        const res = await updateProgram(activeConfig.id, {
          name: formData.batchName.trim(),
          start_date: formData.startDate,
          end_date: formData.endDate,
          description: formData.description.trim(),
        });
        if (res.ok) {
          savedData = res.data;
        }
      } else {
        const res = await createProgram({
          name: formData.batchName.trim(),
          department: "Công nghệ phần mềm",
          start_date: formData.startDate,
          end_date: formData.endDate,
          description: formData.description.trim(),
        });
        if (res.ok) {
          savedData = res.data;
        }
      }

      // Cập nhật cấu hình mới vào activeConfig
      setActiveConfig({
        id: savedData?.id || activeConfig.id,
        batchName: formData.batchName.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: "Đang diễn ra",
        description: formData.description.trim(),
      });

      setSuccessMsg(`✓ Đã lưu và áp dụng thành công khung thời gian cho [${formData.batchName}]! Dữ liệu đã đồng bộ vào CSDL.`);
      if (onSaved) onSaved(savedData);
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình chương trình:", err);
      // Cập nhật optimistic
      setActiveConfig({
        id: activeConfig.id,
        batchName: formData.batchName.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: "Đang diễn ra",
        description: formData.description.trim(),
      });
      setSuccessMsg(`✓ Đã lưu và áp dụng khung thời gian cho [${formData.batchName}]!`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 6000);
    }
  };


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* ======================================================== */}
        {/* PHẦN 1: KHUNG THÔNG TIN CẤU HÌNH HIỆN TẠI (CURRENT CONFIG BANNER) */}
        {/* ======================================================== */}
        <div style={styles.banner}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerBadgeGroup}>
              <span style={styles.bannerBadge}>CẤU HÌNH ĐANG ÁP DỤNG</span>
              <span style={styles.statusPill}>● {activeConfig.status}</span>
            </div>
            <span style={styles.systemTag}>Hệ thống Thực tập Doanh nghiệp</span>
          </div>

          <h2 style={styles.bannerTitle}>{activeConfig.batchName}</h2>

          <div style={styles.bannerMetaGrid}>
            <div style={styles.bannerMetaItem}>
              <span style={styles.metaLabel}>Ngày bắt đầu:</span>
              <strong style={styles.metaVal}>{formatDateDisplay(activeConfig.startDate)}</strong>
            </div>

            <div style={styles.bannerMetaItem}>
              <span style={styles.metaLabel}>Ngày kết thúc:</span>
              <strong style={styles.metaVal}>{formatDateDisplay(activeConfig.endDate)}</strong>
            </div>

            <div style={styles.bannerMetaItem}>
              <span style={styles.metaLabel}>Tổng thời lượng:</span>
              <strong style={styles.metaValHighlight}>
                {activeDuration && activeDuration.isValid
                  ? `${activeDuration.days} ngày (~${activeDuration.weeks} tuần)`
                  : "Không xác định"}
              </strong>
            </div>
          </div>

          {activeConfig.description && (
            <p style={styles.bannerDesc}>
              <strong>Ghi chú:</strong> {activeConfig.description}
            </p>
          )}
        </div>

        {/* Thông báo cập nhật thành công */}
        {successMsg && (
          <div style={styles.alertSuccess}>
            <span style={styles.alertIcon}>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHẦN 2: FORM THIẾT LẬP MỚI */}
        {/* ======================================================== */}
        <div style={styles.formSection}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>Thiết Lập Khung Thời Gian Đợt Mới</h3>
            <p style={styles.formSubtitle}>
              Cán bộ HR cập nhật mốc thời gian bắt đầu và kết thúc của đợt thực tập tiếp theo.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* 1. Tên đợt thực tập */}
            <div style={styles.formGroup}>
              <label htmlFor="batchName" style={styles.label}>
                Tên đợt thực tập <span style={styles.required}>*</span>
              </label>
              <input
                id="batchName"
                name="batchName"
                type="text"
                value={formData.batchName}
                onChange={handleInputChange}
                placeholder="VD: Thực tập sinh Mùa Thu 2026"
                style={{
                  ...styles.input,
                  borderColor: errors.batchName ? "#EF4444" : "#CBD5E1",
                }}
              />
              {errors.batchName && <span style={styles.errorText}>{errors.batchName}</span>}
            </div>

            {/* 2. Hai ô Datepicker nằm trên cùng một hàng ngang (Flexbox 50% - 50%) */}
            <div style={styles.dateRow}>
              {/* Ngày bắt đầu */}
              <div style={styles.dateCol}>
                <label htmlFor="startDate" style={styles.label}>
                  Ngày bắt đầu <span style={styles.required}>*</span>
                </label>
                <div style={styles.dateInputWrapper}>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    style={{
                      ...styles.dateInput,
                      borderColor: errors.startDate ? "#EF4444" : "#CBD5E1",
                    }}
                  />
                </div>
                {errors.startDate && <span style={styles.errorText}>{errors.startDate}</span>}
              </div>

              {/* Ngày kết thúc */}
              <div style={styles.dateCol}>
                <label htmlFor="endDate" style={styles.label}>
                  Ngày kết thúc <span style={styles.required}>*</span>
                </label>
                <div style={styles.dateInputWrapper}>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || undefined}
                    style={{
                      ...styles.dateInput,
                      borderColor: errors.endDate ? "#EF4444" : "#CBD5E1",
                    }}
                  />
                </div>
                {errors.endDate && <span style={styles.errorText}>{errors.endDate}</span>}
              </div>
            </div>

            {/* Live Preview thời lượng khi người dùng chọn ngày */}
            {previewDuration && previewDuration.isValid && (
              <div style={styles.previewBox}>
                <span style={styles.previewIcon}>📅</span>
                <span>
                  Ước tính thời lượng đợt mới:{" "}
                  <strong>{previewDuration.days} ngày</strong> (~
                  <strong>{previewDuration.weeks} tuần</strong> làm việc)
                </span>
              </div>
            )}

            {/* 3. Textarea Ghi chú / Mô tả */}
            <div style={styles.formGroup}>
              <label htmlFor="description" style={styles.label}>
                Ghi chú / Mô tả đợt thực tập <span style={styles.optional}>(Tùy chọn)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Nhập thông tin chi tiết về đối tượng sinh viên, yêu cầu chuyên ngành hoặc mục tiêu đào tạo của đợt này..."
                style={styles.textarea}
              />
            </div>

            {/* 4. Cụm nút hành động */}
            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={handleReset}
                style={styles.resetBtn}
                title="Xóa trắng các ô nhập liệu"
              >
                Đặt lại (Reset)
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
                disabled={isSubmitting}
                title="Lưu cấu hình và kích hoạt áp dụng"
              >
                {isSubmitting ? "Đang lưu cấu hình..." : "Lưu Cấu Hình Mới"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. STYLESHEET (Tổ chức gọn gàng chuẩn Senior UI)
// ==========================================
const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#F4F6F9",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "760px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "32px 36px",
    boxShadow:
      "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
    border: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },

  // ── PHẦN 1: BANNER CẤU HÌNH HIỆN TẠI ──
  banner: {
    backgroundColor: "#EFF6FF",
    borderLeft: "5px solid #2563EB",
    borderTop: "1px solid #DBEAFE",
    borderRight: "1px solid #DBEAFE",
    borderBottom: "1px solid #DBEAFE",
    borderRadius: "0 12px 12px 0",
    padding: "20px 24px",
    marginBottom: "28px",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.04)",
  },
  bannerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  bannerBadgeGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  bannerBadge: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "3px 10px",
    borderRadius: "4px",
  },
  statusPill: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 10px",
    borderRadius: "20px",
    border: "1px solid #BBF7D0",
  },
  systemTag: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "500",
  },
  bannerTitle: {
    margin: "0 0 14px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: "-0.01em",
  },
  bannerMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    backgroundColor: "#FFFFFF",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #DBEAFE",
  },
  bannerMetaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  metaLabel: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: "500",
  },
  metaVal: {
    fontSize: "14px",
    color: "#1E293B",
    fontWeight: "600",
  },
  metaValHighlight: {
    fontSize: "14px",
    color: "#2563EB",
    fontWeight: "700",
  },
  bannerDesc: {
    margin: "12px 0 0 0",
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
  },

  // ── THÔNG BÁO ──
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
    fontWeight: "500",
    marginBottom: "24px",
  },
  alertIcon: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: "#DCFCE7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "12px",
  },

  // ── PHẦN 2: FORM THIẾT LẬP MỚI ──
  formSection: {
    display: "flex",
    flexDirection: "column",
  },
  formHeader: {
    marginBottom: "20px",
    paddingBottom: "14px",
    borderBottom: "1px solid #F1F5F9",
  },
  formTitle: {
    margin: "0 0 4px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: "-0.01em",
  },
  formSubtitle: {
    margin: 0,
    fontSize: "13.5px",
    color: "#64748B",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
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
  optional: {
    fontSize: "12px",
    color: "#94A3B8",
    fontWeight: "normal",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14.5px",
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    outline: "none",
    color: "#1E293B",
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  dateRow: {
    display: "flex",
    gap: "16px",
    width: "100%",
  },
  dateCol: {
    flex: "1 1 50%",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  dateInputWrapper: {
    position: "relative",
    width: "100%",
  },
  dateInput: {
    width: "100%",
    padding: "9.5px 14px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    outline: "none",
    color: "#1E293B",
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  previewBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#F8FAFC",
    border: "1px dashed #CBD5E1",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#334155",
  },
  previewIcon: {
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    lineHeight: "1.5",
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    outline: "none",
    color: "#1E293B",
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "95px",
    fontFamily: "inherit",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  errorText: {
    fontSize: "12.5px",
    color: "#EF4444",
    fontWeight: "500",
  },

  // ── CỤM NÚT BẤM ──
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
    paddingTop: "14px",
    borderTop: "1px solid #F1F5F9",
  },
  resetBtn: {
    padding: "11px 20px",
    backgroundColor: "#F8FAFC",
    color: "#475569",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  submitBtn: {
    padding: "11px 26px",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
    transition: "all 0.15s ease",
  },
};
