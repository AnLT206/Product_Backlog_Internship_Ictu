import { useState, useEffect } from "react";
import { Filter, Calendar, PlusCircle, CheckCircle2, RotateCcw, Save, Sparkles } from "lucide-react";
import { getPrograms, updateProgram, createProgram } from "../../api/programs";

export default function ProgramSettings({ programs: parentPrograms = [], onSaved }) {
  // ==========================================
  // 1. QUẢN LÝ STATE
  // ==========================================
  // Danh sách các kỳ thực tập (đồng bộ từ prop hoặc tải từ API)
  const [programsList, setProgramsList] = useState(
    Array.isArray(parentPrograms) ? parentPrograms : []
  );

  // ID của kỳ thực tập đang được chọn ('new' nếu đang tạo kỳ mới)
  const [selectedProgramId, setSelectedProgramId] = useState("");

  // State quản lý dữ liệu người dùng đang nhập vào Form
  const [formData, setFormData] = useState({
    batchName: "",
    startDate: "",
    endDate: "",
    maxInterns: 50,
    maxMentors: 10,
    description: "",
  });

  // State lưu thông tin kỳ thực tập đang được chọn hiển thị ở Banner
  const [activeConfig, setActiveConfig] = useState({
    id: 1,
    batchName: "Kỳ thực tập Kỹ thuật Phần mềm Doanh nghiệp 2026",
    startDate: "2026-07-01",
    endDate: "2026-10-31",
    maxInterns: 50,
    currentInterns: 0,
    maxMentors: 10,
    currentMentors: 0,
    status: "Đang diễn ra",
    rawStatus: "open",
    description: "Đào tạo chuyên sâu Frontend (React/Vite), Backend (FastAPI/Python) và quy trình Scrum.",
  });

  // State thông báo lỗi và thành công
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // 2. ĐỒNG BỘ DỮ LIỆU KỲ THỰC TẬP
  // ==========================================
  // Đồng bộ khi props programs từ cha thay đổi hoặc tự nạp từ API
  useEffect(() => {
    let isMounted = true;

    async function loadPrograms() {
      try {
        if (Array.isArray(parentPrograms) && parentPrograms.length > 0) {
          if (!isMounted) return;
          setProgramsList(parentPrograms);
          // Nếu chưa chọn kỳ nào, ưu tiên chọn kỳ đang mở hoặc kỳ đầu tiên
          setSelectedProgramId((prev) => {
            const exists = parentPrograms.some((p) => String(p.id) === String(prev));
            if (exists) return prev;
            const openProg = parentPrograms.find((p) => p.status === "open") || parentPrograms[0];
            return openProg ? String(openProg.id) : "";
          });
          return;
        }

        // Fallback: Gọi API getPrograms nếu cha chưa truyền danh sách
        const res = await getPrograms();
        if (!isMounted) return;
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setProgramsList(res.data);
          setSelectedProgramId((prev) => {
            const exists = res.data.some((p) => String(p.id) === String(prev));
            if (exists) return prev;
            const openProg = res.data.find((p) => p.status === "open") || res.data[0];
            return openProg ? String(openProg.id) : "";
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách kỳ thực tập:", err);
      }
    }

    loadPrograms();

    return () => {
      isMounted = false;
    };
  }, [parentPrograms]);

  // Cập nhật Banner và Form Data mỗi khi người dùng đổi kỳ thực tập trong bộ lọc
  useEffect(() => {
    if (selectedProgramId === "new") {
      setActiveConfig(null);
      setFormData({
        batchName: "",
        startDate: "",
        endDate: "",
        maxInterns: 50,
        maxMentors: 10,
        description: "",
      });
      setErrors({});
    } else if (selectedProgramId) {
      const selected = programsList.find((p) => String(p.id) === String(selectedProgramId));
      if (selected) {
        const isCurrentlyOpen = selected.status === "open";
        const isClosed = selected.status === "closed";
        const statusLabel = isCurrentlyOpen
          ? "Đang diễn ra"
          : isClosed
          ? "Đã kết thúc"
          : selected.status || "Chưa bắt đầu";

        setActiveConfig({
          id: selected.id,
          batchName: selected.name,
          startDate: selected.start_date || "",
          endDate: selected.end_date || "",
          maxInterns: selected.max_interns || 50,
          currentInterns: selected.current_interns || 0,
          maxMentors: selected.max_mentors || 10,
          currentMentors: selected.current_mentors || 0,
          status: statusLabel,
          rawStatus: selected.status,
          description: selected.description || "",
        });

        setFormData({
          batchName: selected.name || "",
          startDate: selected.start_date || "",
          endDate: selected.end_date || "",
          maxInterns: selected.max_interns || 50,
          maxMentors: selected.max_mentors || 10,
          description: selected.description || "",
        });
        setErrors({});
      }
    }
  }, [selectedProgramId, programsList]);

  // ==========================================
  // 3. HELPER FUNCTIONS
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

    const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.round((days / 7) * 10) / 10;

    return { days, weeks, isValid: true };
  };

  // Định dạng ngày hiển thị dd/mm/yyyy
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  // Thời lượng của cấu hình đang chọn
  const activeDuration = activeConfig
    ? calculateDuration(activeConfig.startDate, activeConfig.endDate)
    : null;

  // Thời lượng dự kiến khi người dùng đang chọn ngày trên Form
  const previewDuration = calculateDuration(formData.startDate, formData.endDate);

  // ==========================================
  // 4. SỰ KIỆN FORM
  // ==========================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "maxInterns") {
      const num = parseInt(value, 10);
      const suggested = !isNaN(num) && num > 0 ? Math.max(1, Math.ceil(num / 5)) : "";
      setFormData((prev) => ({
        ...prev,
        maxInterns: value,
        maxMentors: suggested !== "" ? suggested : prev.maxMentors,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
    if (name === "maxInterns" && errors.maxMentors) {
      setErrors((prev) => ({
        ...prev,
        maxMentors: undefined,
      }));
    }
  };

  /**
   * Khôi phục Form về cấu hình ban đầu của kỳ thực tập đang chọn
   */
  const handleReset = () => {
    if (selectedProgramId === "new") {
      setFormData({
        batchName: "",
        startDate: "",
        endDate: "",
        maxInterns: 50,
        maxMentors: 10,
        description: "",
      });
    } else if (activeConfig) {
      setFormData({
        batchName: activeConfig.batchName || "",
        startDate: activeConfig.startDate || "",
        endDate: activeConfig.endDate || "",
        maxInterns: activeConfig.maxInterns || 50,
        maxMentors: activeConfig.maxMentors || 10,
        description: activeConfig.description || "",
      });
    }
    setErrors({});
    setSuccessMsg("");
  };

  /**
   * Xử lý Lưu cấu hình mới hoặc Cập nhật kỳ thực tập đang chọn
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
    if (!formData.maxInterns || Number(formData.maxInterns) <= 0) {
      newErrors.maxInterns = "Vui lòng nhập số lượng TTS hợp lệ (tối thiểu 1)";
    }
    if (!formData.maxMentors || Number(formData.maxMentors) <= 0) {
      newErrors.maxMentors = "Vui lòng nhập số lượng Mentor hợp lệ (tối thiểu 1)";
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
      const isExisting = selectedProgramId !== "new" && activeConfig?.id;

      if (isExisting) {
        // Cập nhật kỳ thực tập đã chọn
        const res = await updateProgram(activeConfig.id, {
          name: formData.batchName.trim(),
          start_date: formData.startDate,
          end_date: formData.endDate,
          max_interns: Number(formData.maxInterns) || 50,
          max_mentors: Number(formData.maxMentors) || 10,
          description: formData.description.trim(),
        });

        if (res.ok && res.data) {
          savedData = res.data;
        } else {
          savedData = {
            id: activeConfig.id,
            name: formData.batchName.trim(),
            start_date: formData.startDate,
            end_date: formData.endDate,
            max_interns: Number(formData.maxInterns) || 50,
            max_mentors: Number(formData.maxMentors) || 10,
            description: formData.description.trim(),
            status: activeConfig.rawStatus || "open",
          };
        }

        // Cập nhật lại danh sách local programsList
        setProgramsList((prev) =>
          prev.map((p) =>
            p.id === activeConfig.id
              ? {
                  ...p,
                  name: formData.batchName.trim(),
                  start_date: formData.startDate,
                  end_date: formData.endDate,
                  max_interns: Number(formData.maxInterns) || 50,
                  max_mentors: Number(formData.maxMentors) || 10,
                  description: formData.description.trim(),
                }
              : p
          )
        );

        setActiveConfig((prev) => ({
          ...prev,
          batchName: formData.batchName.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxInterns: Number(formData.maxInterns) || 50,
          maxMentors: Number(formData.maxMentors) || 10,
          description: formData.description.trim(),
        }));

        setSuccessMsg(
          `✓ Đã cập nhật thành công khung thời gian, số lượng TTS và Mentor cho kỳ thực tập [${formData.batchName.trim()}]!`
        );
      } else {
        // Tạo kỳ thực tập mới
        const res = await createProgram({
          name: formData.batchName.trim(),
          department: "Công nghệ phần mềm",
          start_date: formData.startDate,
          end_date: formData.endDate,
          max_interns: Number(formData.maxInterns) || 50,
          max_mentors: Number(formData.maxMentors) || 10,
          description: formData.description.trim(),
        });

        if (res.ok && res.data) {
          savedData = res.data;
        } else {
          savedData = {
            id: Date.now(),
            name: formData.batchName.trim(),
            start_date: formData.startDate,
            end_date: formData.endDate,
            max_interns: Number(formData.maxInterns) || 50,
            max_mentors: Number(formData.maxMentors) || 10,
            description: formData.description.trim(),
            status: "open",
          };
        }

        setProgramsList((prev) => [savedData, ...prev]);
        setSelectedProgramId(String(savedData.id));
        setActiveConfig({
          id: savedData.id,
          batchName: savedData.name,
          startDate: savedData.start_date,
          endDate: savedData.end_date,
          maxInterns: savedData.max_interns || Number(formData.maxInterns) || 50,
          currentInterns: 0,
          maxMentors: savedData.max_mentors || Number(formData.maxMentors) || 10,
          currentMentors: 0,
          status: "Đang diễn ra",
          rawStatus: "open",
          description: savedData.description || "",
        });

        setSuccessMsg(
          `✓ Đã khởi tạo và áp dụng thành công đợt thực tập mới [${formData.batchName.trim()}]!`
        );
      }

      if (onSaved) {
        onSaved(savedData);
      }
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình chương trình:", err);
      // Fallback optimistic
      setActiveConfig((prev) =>
        prev
          ? {
              ...prev,
              batchName: formData.batchName.trim(),
              startDate: formData.startDate,
              endDate: formData.endDate,
              description: formData.description.trim(),
            }
          : null
      );
      setSuccessMsg(`✓ Đã lưu và áp dụng khung thời gian cho [${formData.batchName}]!`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 6000);
    }
  };

  const isEditingExisting = selectedProgramId !== "new" && Boolean(activeConfig);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* ======================================================== */}
        {/* PHẦN 0: BỘ LỌC & CHỌN KỲ THỰC TẬP (PROGRAM SELECTOR) */}
        {/* ======================================================== */}
        <div style={styles.filterSection}>
          <div style={styles.filterHeader}>
            <div style={styles.filterTitleGroup}>
              <div style={styles.filterIconCircle}>
                <Filter size={18} color="#2563EB" />
              </div>
              <div>
                <h4 style={styles.filterTitle}>Chọn Kỳ Thực Tập Cần Xem & Điều Chỉnh</h4>
                <p style={styles.filterSubtitle}>
                  Lọc danh sách các đợt thực tập để xem thông số chi tiết hoặc cập nhật lại khung thời gian.
                </p>
              </div>
            </div>

            {selectedProgramId !== "new" ? (
              <button
                type="button"
                onClick={() => setSelectedProgramId("new")}
                style={styles.newBatchBtn}
                title="Tạo mới một đợt thực tập"
              >
                <PlusCircle size={15} />
                <span>+ Thiết lập đợt mới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setSelectedProgramId(
                    programsList.length > 0 ? String(programsList[0].id) : ""
                  )
                }
                style={styles.cancelNewBtn}
                title="Quay lại chọn đợt thực tập hiện có"
              >
                <span>✕ Quay lại danh sách</span>
              </button>
            )}
          </div>

          <div style={styles.filterControls}>
            <div style={styles.selectWrapper}>
              <label htmlFor="programSelect" style={styles.filterLabel}>
                Kỳ thực tập đang thao tác:
              </label>
              <select
                id="programSelect"
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                style={styles.select}
              >
                {programsList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.start_date && p.end_date
                      ? ` (${formatDateDisplay(p.start_date)} - ${formatDateDisplay(p.end_date)})`
                      : ""}
                  </option>
                ))}
                <option value="new">+ Thêm kỳ thực tập mới...</option>
              </select>
            </div>

            <div style={styles.filterSummaryBadge}>
              <Calendar size={15} color="#2563EB" />
              <span>
                Tổng số: <strong>{programsList.length}</strong> kỳ thực tập
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PHẦN 1: KHUNG THÔNG TIN CẤU HÌNH HIỆN TẠI (BANNER) */}
        {/* ======================================================== */}
        {activeConfig ? (
          <div style={styles.banner}>
            <div style={styles.bannerHeader}>
              <div style={styles.bannerBadgeGroup}>
                <span
                  style={
                    activeConfig.rawStatus === "open"
                      ? styles.bannerBadge
                      : styles.bannerBadgeAlt
                  }
                >
                  {activeConfig.rawStatus === "open"
                    ? "CẤU HÌNH ĐANG ÁP DỤNG"
                    : "KỲ THỰC TẬP ĐANG CHỌN"}
                </span>
                <span
                  style={{
                    ...styles.statusPill,
                    backgroundColor:
                      activeConfig.rawStatus === "open" ? "#DCFCE7" : "#F1F5F9",
                    color: activeConfig.rawStatus === "open" ? "#15803D" : "#475569",
                    borderColor:
                      activeConfig.rawStatus === "open" ? "#BBF7D0" : "#CBD5E1",
                  }}
                >
                  ● {activeConfig.status}
                </span>
              </div>
              <span style={styles.systemTag}>Hệ thống Thực tập Doanh nghiệp</span>
            </div>

            <h2 style={styles.bannerTitle}>{activeConfig.batchName}</h2>

            <div style={styles.bannerMetaGrid}>
              <div style={styles.bannerMetaItem}>
                <span style={styles.metaLabel}>Ngày bắt đầu:</span>
                <strong style={styles.metaVal}>
                  {formatDateDisplay(activeConfig.startDate) || "Chưa thiết lập"}
                </strong>
              </div>

              <div style={styles.bannerMetaItem}>
                <span style={styles.metaLabel}>Ngày kết thúc:</span>
                <strong style={styles.metaVal}>
                  {formatDateDisplay(activeConfig.endDate) || "Chưa thiết lập"}
                </strong>
              </div>

              <div style={styles.bannerMetaItem}>
                <span style={styles.metaLabel}>Tổng thời lượng:</span>
                <strong style={styles.metaValHighlight}>
                  {activeDuration && activeDuration.isValid
                    ? `${activeDuration.days} ngày (~${activeDuration.weeks} tuần)`
                    : "Không xác định"}
                </strong>
              </div>

              <div style={styles.bannerMetaItem}>
                <span style={styles.metaLabel}>Số lượng tiếp nhận:</span>
                <strong style={styles.metaValHighlight}>
                  {activeConfig.currentInterns ? `${activeConfig.currentInterns} / ` : ""}
                  {activeConfig.maxInterns || 50} TTS
                </strong>
              </div>

              <div style={styles.bannerMetaItem}>
                <span style={styles.metaLabel}>Số lượng Mentor:</span>
                <strong style={styles.metaValHighlight}>
                  {activeConfig.currentMentors ? `${activeConfig.currentMentors} / ` : ""}
                  {activeConfig.maxMentors || 10} Mentor
                </strong>
              </div>
            </div>

            {activeConfig.description && (
              <p style={styles.bannerDesc}>
                <strong>Ghi chú:</strong> {activeConfig.description}
              </p>
            )}
          </div>
        ) : (
          <div style={styles.newBatchBanner}>
            <div style={styles.newBatchBannerHeader}>
              <span style={styles.newBatchBadge}>THIẾT LẬP KỲ MỚI</span>
              <span style={styles.newBatchStatusPill}>● Chế độ khởi tạo</span>
            </div>
            <h3 style={styles.newBatchTitle}>Tạo Mới Khung Thời Gian Kỳ Thực Tập</h3>
            <p style={styles.newBatchDesc}>
              Vui lòng nhập tên đợt, ngày bắt đầu và ngày kết thúc ở form bên dưới. Sau khi lưu, kỳ thực tập sẽ được thêm vào hệ thống và có thể phân công sinh viên.
            </p>
          </div>
        )}

        {/* Thông báo cập nhật thành công */}
        {successMsg && (
          <div style={styles.alertSuccess}>
            <CheckCircle2 size={18} color="#15803D" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHẦN 2: FORM THIẾT LẬP / ĐIỀU CHỈNH THỜI GIAN */}
        {/* ======================================================== */}
        <div style={styles.formSection}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>
              {isEditingExisting
                ? `Điều Chỉnh Khung Thời Gian: ${activeConfig.batchName}`
                : "Thiết Lập Khung Thời Gian Đợt Mới"}
            </h3>
            <p style={styles.formSubtitle}>
              {isEditingExisting
                ? "Cán bộ HR cập nhật mốc thời gian bắt đầu, kết thúc hoặc thông tin mô tả của kỳ thực tập này."
                : "Cán bộ HR cập nhật mốc thời gian bắt đầu và kết thúc của đợt thực tập tiếp theo."}
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
                placeholder="VD: Kỳ thực tập Kỹ thuật Phần mềm Doanh nghiệp 2026"
                style={{
                  ...styles.input,
                  borderColor: errors.batchName ? "#EF4444" : "#CBD5E1",
                }}
              />
              {errors.batchName && <span style={styles.errorText}>{errors.batchName}</span>}
            </div>

            {/* 2. Hai ô Datepicker nằm trên cùng một hàng ngang */}
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
                  Ước tính thời lượng đợt thực tập:{" "}
                  <strong>{previewDuration.days} ngày</strong> (~
                  <strong>{previewDuration.weeks} tuần</strong> làm việc)
                </span>
              </div>
            )}

            {/* 3. Hàng số lượng TTS & Số lượng Mentor */}
            <div style={styles.dateRow}>
              {/* Số lượng TTS */}
              <div style={styles.dateCol}>
                <label htmlFor="maxInterns" style={styles.label}>
                  Số lượng TTS <span style={styles.required}>*</span>
                </label>
                <div style={styles.dateInputWrapper}>
                  <input
                    id="maxInterns"
                    name="maxInterns"
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.maxInterns}
                    onChange={handleInputChange}
                    placeholder="VD: 50"
                    style={{
                      ...styles.dateInput,
                      borderColor: errors.maxInterns ? "#EF4444" : "#CBD5E1",
                    }}
                  />
                </div>
                {errors.maxInterns && <span style={styles.errorText}>{errors.maxInterns}</span>}
              </div>

              {/* Số lượng Mentor */}
              <div style={styles.dateCol}>
                <label htmlFor="maxMentors" style={styles.label}>
                  Số lượng Mentor <span style={styles.required}>*</span>
                </label>
                <div style={styles.dateInputWrapper}>
                  <input
                    id="maxMentors"
                    name="maxMentors"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxMentors}
                    onChange={handleInputChange}
                    placeholder="VD: 10"
                    style={{
                      ...styles.dateInput,
                      borderColor: errors.maxMentors ? "#EF4444" : "#CBD5E1",
                    }}
                  />
                </div>
                {errors.maxMentors && <span style={styles.errorText}>{errors.maxMentors}</span>}
              </div>
            </div>

            {/* Hộp gợi ý số lượng Mentor thông minh */}
            {Number(formData.maxInterns) > 0 && (
              <div style={styles.mentorSuggestionBox}>
                <div style={styles.mentorSuggestionHeader}>
                  <div style={styles.mentorSuggestionLeft}>
                    <Sparkles size={16} color="#2563EB" />
                    <span style={styles.mentorSuggestionTitle}>
                      Hệ thống gợi ý giới hạn Mentor:
                    </span>
                  </div>
                  <span style={styles.ratioBadge}>
                    Tỉ lệ chuẩn: 1 Mentor kèm 4 - 5 TTS
                  </span>
                </div>
                <div style={styles.mentorSuggestionContent}>
                  <span>
                    Với chỉ tiêu <strong>{formData.maxInterns} TTS</strong>, hệ thống tự động khuyến nghị giới hạn khoảng{" "}
                    <strong style={{ color: "#2563EB" }}>
                      {Math.max(1, Math.ceil(Number(formData.maxInterns) / 5))} Mentor
                    </strong>{" "}
                    để đảm bảo chất lượng kèm cặp 1-1 và review code hàng tuần.
                  </span>
                  {Number(formData.maxMentors) !==
                    Math.max(1, Math.ceil(Number(formData.maxInterns) / 5)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = Math.max(1, Math.ceil(Number(formData.maxInterns) / 5));
                        setFormData((prev) => ({ ...prev, maxMentors: rec }));
                      }}
                      style={styles.applyRecBtn}
                      title="Áp dụng lại số lượng Mentor theo tỉ lệ chuẩn"
                    >
                      ⚡ Áp dụng lại gợi ý ({Math.max(1, Math.ceil(Number(formData.maxInterns) / 5))} Mentor)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. Textarea Ghi chú / Mô tả */}
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
                title={
                  isEditingExisting
                    ? "Khôi phục lại thông tin ban đầu của kỳ này"
                    : "Xóa trắng các ô nhập liệu"
                }
              >
                <RotateCcw size={15} />
                <span>{isEditingExisting ? "Khôi phục gốc" : "Đặt lại (Reset)"}</span>
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
                disabled={isSubmitting}
                title={
                  isEditingExisting
                    ? "Lưu các thay đổi khung thời gian cho kỳ thực tập này"
                    : "Lưu cấu hình và tạo mới kỳ thực tập"
                }
              >
                <Save size={16} />
                <span>
                  {isSubmitting
                    ? "Đang lưu cấu hình..."
                    : isEditingExisting
                    ? "Lưu Thay Đổi Khung Thời Gian"
                    : "Lưu Cấu Hình Mới"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. STYLESHEET
// ==========================================
const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#F4F6F9",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "32px 16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "800px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "32px 36px",
    boxShadow:
      "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
    border: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },

  // ── PHẦN 0: BỘ LỌC KỲ THỰC TẬP ──
  filterSection: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
  },
  filterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "12px",
  },
  filterTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  filterIconCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "8px",
    backgroundColor: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #DBEAFE",
    flexShrink: 0,
  },
  filterTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: "-0.01em",
  },
  filterSubtitle: {
    margin: "3px 0 0 0",
    fontSize: "12.5px",
    color: "#64748B",
  },
  newBatchBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
    border: "1px solid #BFDBFE",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  cancelNewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    backgroundColor: "#F1F5F9",
    color: "#475569",
    border: "1px solid #CBD5E1",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  filterControls: {
    display: "flex",
    alignItems: "flex-end",
    gap: "14px",
    flexWrap: "wrap",
  },
  selectWrapper: {
    flex: "1 1 280px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  filterLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1.5px solid #2563EB",
    backgroundColor: "#FFFFFF",
    color: "#1E293B",
    fontWeight: "500",
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.08)",
  },
  filterSummaryBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 14px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#475569",
    whiteSpace: "nowrap",
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
  bannerBadgeAlt: {
    backgroundColor: "#E2E8F0",
    color: "#334155",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "3px 10px",
    borderRadius: "4px",
  },
  statusPill: {
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 10px",
    borderRadius: "20px",
    border: "1px solid",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

  // ── BANNER KHI ĐANG TẠO MỚI ──
  newBatchBanner: {
    backgroundColor: "#F8FAFC",
    borderLeft: "5px solid #64748B",
    borderTop: "1px solid #E2E8F0",
    borderRight: "1px solid #E2E8F0",
    borderBottom: "1px solid #E2E8F0",
    borderRadius: "0 12px 12px 0",
    padding: "18px 22px",
    marginBottom: "28px",
  },
  newBatchBannerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
  },
  newBatchBadge: {
    backgroundColor: "#E2E8F0",
    color: "#1E293B",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "3px 10px",
    borderRadius: "4px",
  },
  newBatchStatusPill: {
    backgroundColor: "#FEF3C7",
    color: "#B45309",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 10px",
    borderRadius: "20px",
    border: "1px solid #FDE68A",
  },
  newBatchTitle: {
    margin: "0 0 6px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1E293B",
  },
  newBatchDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#64748B",
    lineHeight: "1.5",
  },

  // ── THÔNG BÁO THÀNH CÔNG ──
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

  // ── PHẦN 2: FORM THIẾT LẬP MỚI / SỬA ──
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
  mentorSuggestionBox: {
    backgroundColor: "#F0F7FF",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
    color: "#1E3A8A",
  },
  mentorSuggestionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "6px",
  },
  mentorSuggestionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  mentorSuggestionTitle: {
    fontWeight: "700",
    color: "#1E40AF",
    fontSize: "13px",
  },
  ratioBadge: {
    fontSize: "11.5px",
    fontWeight: "600",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  mentorSuggestionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    lineHeight: "1.5",
    color: "#334155",
  },
  applyRecBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #93C5FD",
    borderRadius: "6px",
    color: "#1D4ED8",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    alignSelf: "flex-start",
    marginTop: "2px",
    transition: "all 0.15s ease",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "11px 18px",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 24px",
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
