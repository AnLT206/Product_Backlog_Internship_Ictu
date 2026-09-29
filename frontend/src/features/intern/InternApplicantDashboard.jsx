import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  X,
  Eye,
  Trash2,
  Briefcase,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import './InternApplicantDashboard.css';

/**
 * Trang Dashboard dành cho Thực tập sinh (Intern) đang trong quá trình ứng tuyển.
 * - Trạng thái 1: Chưa được HR duyệt -> Chỉ xem giới thiệu tính năng (Read-only + Lock), thanh tiến trình, nộp CV.
 * - Trạng thái 2: Được HR duyệt -> Bật Modal Hợp đồng lao động yêu cầu xác nhận.
 * - Trạng thái 3: Sau khi ký hợp đồng -> Mở khóa toàn quyền, chuyển vào Dashboard TTS chính thức.
 */
export default function InternApplicantDashboard({ user, onContractConfirmed }) {
  // Trạng thái hồ sơ: 'applied' | 'reviewing' | 'interview' | 'approved' | 'onboarded'
  const [currentStep, setCurrentStep] = useState('reviewing');

  // Trạng thái file CV
  const [cvFile, setCvFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Trạng thái Modal Hợp đồng lao động khi HR duyệt
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isContractConfirmed, setIsContractConfirmed] = useState(false);

  // Thông báo Toast nhanh
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Xử lý chọn file CV
  const handleFileSelect = (file) => {
    if (!file) return;
    setUploadError('');

    const validExtensions = ['pdf', 'doc', 'docx'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setUploadError('Định dạng file không hợp lệ! Vui lòng chỉ tải file .PDF, .DOC hoặc .DOCX.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Dung lượng file vượt quá giới hạn 5 MB!');
      return;
    }

    // Giả lập tiến trình upload
    setUploadProgress(20);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCvFile(file);
          showToast(`Đã tải lên thành công: ${file.name}`, 'success');
          return 100;
        }
        return prev + 30;
      });
    }, 150);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveCv = () => {
    setCvFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Đã hủy file CV hiện tại', 'info');
  };

  // Giả lập sự kiện HR duyệt hồ sơ trên hệ thống
  const triggerHrApproval = () => {
    setCurrentStep('approved');
    setShowContractModal(true);
    showToast('Hồ sơ đã được HR phê duyệt! Vui lòng đọc & ký hợp đồng.', 'success');
  };

  // Xác nhận ký hợp đồng
  const handleConfirmContract = () => {
    if (!contractAgreed) return;
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      setShowContractModal(false);
      setIsContractConfirmed(true);
      setCurrentStep('onboarded');
      showToast('Ký hợp đồng thành công! Đang chuyển hướng vào hệ thống…', 'success');
      setTimeout(() => {
        onContractConfirmed?.();
      }, 1000);
    }, 1200);
  };

  // Các bước trong Stepper tiến trình ứng tuyển
  const STEPS = [
    { id: 'applied', label: 'Đã nộp hồ sơ', desc: 'Nhận thông tin ứng viên', date: '25/09/2026' },
    { id: 'reviewing', label: 'Đang xem xét', desc: 'HR đánh giá CV & chuyên ngành', date: '28/09/2026' },
    { id: 'interview', label: 'Phỏng vấn', desc: 'Trao đổi chuyên môn với Mentor', date: '02/10/2026' },
    { id: 'approved', label: 'Kết quả duyệt', desc: 'Ký hợp đồng & tiếp nhận', date: 'Dự kiến 05/10/2026' },
  ];

  const getStepStatus = (stepId) => {
    const order = ['applied', 'reviewing', 'interview', 'approved', 'onboarded'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  // Danh sách các phân hệ nội bộ (Read-only khi chưa ký HĐ)
  const SYSTEM_MODULES = [
    {
      title: 'Chấm công & Điểm danh',
      desc: 'Check-in/out hằng ngày, theo dõi giờ thực tập và thống kê ngày công minh bạch.',
      badge: 'Chuyên cần',
      action: 'Vào chấm công',
    },
    {
      title: 'Quản lý Công việc & Sprint',
      desc: 'Tiếp nhận đầu việc từ Mentor, cập nhật tiến độ Kanban và nhận bàn giao dự án.',
      badge: 'Công việc',
      action: 'Xem bảng Task',
    },
    {
      title: 'Báo cáo Tuần & Nhận xét',
      desc: 'Nộp báo cáo định kỳ mỗi thứ Sáu, nhận phản hồi và đánh giá năng lực từ người hướng dẫn.',
      badge: 'Báo cáo',
      action: 'Nộp báo cáo',
    },
    {
      title: 'Đơn xin Nghỉ phép',
      desc: 'Đăng ký nghỉ ốm, bận việc học tại trường và gửi quy trình phê duyệt tới HR & Mentor.',
      badge: 'Hành chính',
      action: 'Gửi đơn nghỉ',
    },
    {
      title: 'Đánh giá & Cấp Chứng chỉ',
      desc: 'Bảng điểm đánh giá kỹ năng cuối kỳ và cấp chứng chỉ hoàn thành khóa thực tập doanh nghiệp.',
      badge: 'Đánh giá',
      action: 'Xem kết quả',
    },
    {
      title: 'Phụ cấp & Hợp đồng lao động',
      desc: 'Tra cứu thông tin chính sách hỗ trợ kinh phí, hợp đồng thực tập và các phúc lợi thực tập sinh.',
      badge: 'Chính sách',
      action: 'Chi tiết hợp đồng',
    },
  ];

  return (
    <div className="iad-container">
      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div className={`iad-toast ${toastMessage.type === 'success' ? 'iad-toast--success' : 'iad-toast--info'}`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
          )}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Topbar điều khiển & trạng thái */}
      <div className="iad-topbar">
        <div className="iad-topbar__brand">
          <div className="iad-topbar__icon">
            <Briefcase size={20} />
          </div>
          <div className="iad-topbar__title-group">
            <span>ICTU Internship Portal</span>
            <h1>Cổng Tuyển Dụng & Thực Tập Doanh Nghiệp</h1>
          </div>
        </div>

        <div className="iad-topbar__actions">
          {!isContractConfirmed && (
            <button
              type="button"
              onClick={triggerHrApproval}
              className="iad-btn-simulate"
              title="Bấm để kích hoạt thông báo hợp đồng khi HR phê duyệt"
            >
              <Sparkles size={16} />
              Mô phỏng: HR Duyệt Hồ Sơ
            </button>
          )}

          <div className="iad-status-pill">
            <span className="iad-status-dot" />
            <span>{isContractConfirmed ? 'TTS Chính Thức' : 'Ứng Viên Chờ Duyệt'}</span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="iad-hero">
        <div className="iad-hero__content">
          <div className="iad-hero__text">
            <div className="iad-hero__badge">
              <Clock size={14} />
              <span>{isContractConfirmed ? 'Đã hoàn tất thủ tục tiếp nhận' : 'Đang trong quá trình xét duyệt'}</span>
            </div>
            <h2>Xin chào, {user?.full_name || 'Nguyễn Văn An'}</h2>
            <p>
              Hồ sơ ứng tuyển vị trí <strong>Frontend Developer Intern</strong> của bạn đang được Bộ phận Tuyển dụng & Đào tạo xem xét. Vui lòng theo dõi tiến trình và cập nhật thông tin bên dưới.
            </p>
          </div>

          <div className="iad-hero__cards">
            <div className="iad-hero__info-card">
              <div className="iad-hero__info-card-label">Mã ứng viên</div>
              <div className="iad-hero__info-card-value">{user?.code || 'TTS9999'}</div>
              <div className="iad-hero__info-card-sub">Khoa Công nghệ Thông tin - ICTU</div>
            </div>

            {!isContractConfirmed && currentStep === 'approved' && (
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="iad-btn-contract-banner"
              >
                <FileCheck size={18} />
                Xem Hợp Đồng Thực Tập
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 1. THANH TIẾN TRÌNH ỨNG TUYỂN (APPLICATION TRACKER) */}
      <section className="iad-card">
        <div className="iad-card__head">
          <div>
            <h3 className="iad-card__title">Tiến Trình Ứng Tuyển</h3>
            <p className="iad-card__desc">Cập nhật thời gian thực theo từng bước đánh giá của doanh nghiệp</p>
          </div>
          <div className="iad-badge-step">
            {currentStep === 'approved' || currentStep === 'onboarded'
              ? 'Đã có kết quả phê duyệt chính thức'
              : 'Bước 2: Phòng Nhân sự đang xem xét CV'}
          </div>
        </div>

        <div className="iad-stepper">
          <div className="iad-stepper__connector" />

          {STEPS.map((step, idx) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} className={`iad-step ${status === 'completed' ? 'iad-step--completed' : status === 'active' ? 'iad-step--active' : ''}`}>
                <div className="iad-step__circle">
                  {status === 'completed' ? <CheckCircle2 size={20} /> : <span>{idx + 1}</span>}
                </div>
                <div className="iad-step__title">{step.label}</div>
                <div className="iad-step__desc">{step.desc}</div>
                <div className="iad-step__date">{step.date}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. KHU VỰC TẢI LÊN CV / HỒ SƠ ỨNG TUYỂN */}
      <section className="iad-card">
        <div className="iad-card__head">
          <div>
            <h3 className="iad-card__title">Tài Liệu & CV Ứng Tuyển</h3>
            <p className="iad-card__desc">
              Tải lên bản cập nhật mới nhất của CV / Portfolio cá nhân để Hội đồng tuyển dụng đánh giá.
            </p>
          </div>
          <span style={{ fontSize: 12.5, color: '#64748b' }}>Tối đa 1 file (5 MB)</span>
        </div>

        {!cvFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`iad-dropzone ${isDragging ? 'iad-dropzone--active' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="iad-dropzone__icon-box">
              <UploadCloud size={28} />
            </div>

            <p className="iad-dropzone__prompt">
              <strong>Nhấn để chọn file</strong> hoặc kéo thả tài liệu vào đây
            </p>
            <p className="iad-dropzone__hint">Hỗ trợ định dạng tài liệu PDF, DOC, DOCX</p>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="iad-upload-progress">
                <div className="iad-upload-progress__header">
                  <span>Đang tải lên…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="iad-upload-progress__bar">
                  <div className="iad-upload-progress__fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="iad-file-card">
            <div className="iad-file-card__left">
              <div className="iad-file-badge">
                {cvFile.name.split('.').pop()}
              </div>
              <div className="iad-file-meta">
                <p>{cvFile.name}</p>
                <span>
                  {(cvFile.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng xét duyệt
                </span>
              </div>
            </div>

            <div className="iad-file-card__right">
              <button
                type="button"
                onClick={() => showToast(`Đang xem trước ${cvFile.name}`, 'info')}
                className="iad-btn-sm"
              >
                <Eye size={14} />
                Xem trước
              </button>
              <button
                type="button"
                onClick={handleRemoveCv}
                className="iad-btn-sm iad-btn-sm--danger"
              >
                <Trash2 size={14} />
                Xóa file
              </button>
            </div>
          </div>
        )}

        {uploadError && (
          <p style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} />
            {uploadError}
          </p>
        )}
      </section>

      {/* 3. GIỚI THIỆU CHỨC NĂNG HỆ THỐNG NỘI BỘ (READ-ONLY CHẾ ĐỘ CHỈ XEM) */}
      <section className="iad-card">
        <div className="iad-card__head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="iad-card__title">Phân Hệ Làm Việc Thực Tập Sinh</h3>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                <Lock size={13} />
                Chế độ Chỉ xem (Read-only)
              </span>
            </div>
            <p className="iad-card__desc">
              Toàn bộ tính năng nghiệp vụ sẽ tự động mở khóa sau khi bạn được HR phê duyệt và ký kết hợp đồng.
            </p>
          </div>
        </div>

        <div className="iad-modules-grid">
          {SYSTEM_MODULES.map((mod, i) => (
            <div key={i} className="iad-module-card">
              <div className="iad-module-card__top">
                <span className="iad-module-badge">{mod.badge}</span>
                <span className="iad-module-lock">
                  <Lock size={14} />
                  Khóa
                </span>
              </div>

              <div>
                <h4>{mod.title}</h4>
                <p>{mod.desc}</p>
              </div>

              <div className="iad-module-card__bottom">
                <span className="iad-module-note">Cần duyệt HĐ để sử dụng</span>
                <button type="button" disabled className="iad-btn-disabled">
                  <span>{mod.action}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MODAL THÔNG BÁO & KÝ HỢP ĐỒNG LAO ĐỘNG */}
      {showContractModal && (
        <div className="iad-modal-overlay">
          <div className="iad-modal-content">
            <div className="iad-modal-header">
              <div className="iad-modal-header__left">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: 'rgba(255, 255, 255, 0.2)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3>Thông Báo Hợp Đồng Thực Tập</h3>
                  <p>Mã hợp đồng: HĐTT-2026/09/TTS-089</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="iad-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="iad-modal-body">
              <div className="iad-modal-callout">
                <strong>Chúc mừng! Hồ sơ của bạn đã được Giám đốc Đào tạo & Nhân sự phê duyệt chính thức.</strong>
                <p>
                  Để đảm bảo quyền lợi, trách nhiệm và bảo mật thông tin nội bộ của công ty trong suốt quá trình thực tập, bạn vui lòng đọc kỹ các điều khoản dưới đây trước khi bấm xác nhận.
                </p>
              </div>

              <div className="iad-modal-terms">
                <h4>Điều khoản chính trong hợp đồng thực tập:</h4>
                <ul>
                  <li><strong>Thời gian thực tập:</strong> 03 tháng (Từ 01/10/2026 đến 31/12/2026).</li>
                  <li><strong>Vị trí thực tập:</strong> Thực tập sinh Lập trình Frontend (ReactJS).</li>
                  <li><strong>Cán bộ hướng dẫn (Mentor):</strong> Được chỉ định 01 Senior Engineer hỗ trợ trực tiếp 1-1.</li>
                  <li><strong>Mức hỗ trợ phụ cấp:</strong> 3.500.000 VNĐ / tháng + Phụ cấp chuyên cần & ăn trưa.</li>
                  <li><strong>Bảo mật thông tin (NDA):</strong> Nghiêm cấm sao chép hoặc phát tán mã nguồn dự án ra bên ngoài.</li>
                  <li><strong>Kỷ luật lao động:</strong> Tuân thủ chấm công đúng giờ và nộp báo cáo tuần đúng hạn vào thứ Sáu.</li>
                </ul>
              </div>

              <label className="iad-modal-checkbox">
                <input
                  type="checkbox"
                  checked={contractAgreed}
                  onChange={(e) => setContractAgreed(e.target.checked)}
                />
                <span>
                  Tôi xác nhận đã đọc, hiểu rõ và tự nguyện cam kết tuân thủ 100% các điều khoản trong hợp đồng đào tạo thực tập của công ty.
                </span>
              </label>
            </div>

            <div className="iad-modal-footer">
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="iad-btn-cancel"
              >
                Để xem lại sau
              </button>

              <button
                type="button"
                disabled={!contractAgreed || isSigning}
                onClick={handleConfirmContract}
                className="iad-btn-submit"
              >
                {isSigning ? (
                  <>
                    <span className="iad-spinner" />
                    Đang kích hoạt tài khoản…
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} />
                    Xác Nhận Đã Đọc & Ký Hợp Đồng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
