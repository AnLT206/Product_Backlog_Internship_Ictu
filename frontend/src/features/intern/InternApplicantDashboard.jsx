import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDocuments } from '../../api/documents';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  X,
  User,
  FileX,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import {
  syncContractSigning,
  subscribeRealtimeEvents,
  getRealtimeSyncState,
  SYNC_EVENTS,
  extractPartyBContractInfo,
} from '../../utils/realtimeSync';
import { getSavedUserProfile } from './InternProfilePage';
import './InternApplicantDashboard.css';

// 6 Giai đoạn trong Lộ trình thực tập chuẩn mực doanh nghiệp ICTU
const getInternshipRoadmap = (hasSubmitted, isRejected = false, rejectReason = '') => [
  {
    step: '01',
    title: 'Ứng tuyển & Sàng lọc CV',
    desc: isRejected
      ? `Hồ sơ chưa đạt yêu cầu đợt này. ${rejectReason || 'Bạn có thể chuẩn bị và nộp lại CV mới bất kỳ lúc nào.'}`
      : 'Tải lên CV & hồ sơ sinh viên trực tuyến. Doanh nghiệp tiếp nhận, sàng lọc chuyên ngành và thẩm định GPA nền tảng.',
    duration: 'Tuần 0',
    badge: 'Giai đoạn 1',
    status: isRejected ? 'rejected' : (hasSubmitted ? 'completed' : 'active'),
  },
  {
    step: '02',
    title: 'Phỏng vấn & Đánh giá năng lực',
    desc: isRejected
      ? 'Tạm dừng quy trình phỏng vấn do hồ sơ vòng xét duyệt chưa đạt yêu cầu.'
      : 'Phỏng vấn chuyên môn 1-1 với Tech Lead / Mentor và HR đánh giá thái độ, định hướng kỹ thuật phù hợp dự án.',
    duration: 'Tuần 1',
    badge: 'Giai đoạn 2',
    status: isRejected ? 'upcoming' : (hasSubmitted ? 'active' : 'upcoming'),
  },
  {
    step: '03',
    title: 'Tiếp nhận & Onboarding',
    desc: 'Nhận Offer tiếp nhận, ký thỏa thuận thực tập số, cấp mã định danh TTS, tài khoản hệ thống và ghép cặp Mentor 1-1.',
    duration: 'Tuần 1 - 2',
    badge: 'Giai đoạn 3',
    status: 'upcoming',
  },
  {
    step: '04',
    title: 'Đào tạo công nghệ & Agile',
    desc: 'Nghiên cứu tài liệu kỹ thuật chuẩn (GitFlow, FastAPI, MySQL 8.0, PyTest), văn hóa Scrum và hoàn thành mini-project.',
    duration: 'Tuần 3 - 4',
    badge: 'Giai đoạn 4',
    status: 'upcoming',
  },
  {
    step: '05',
    title: 'Thực chiến dự án & Mentor 1-1',
    desc: 'Trực tiếp nhận Task trên Sprint, tham gia Daily standup, code review cùng Mentor, chấm công & nộp báo cáo tuần.',
    duration: 'Tuần 5 - 10',
    badge: 'Giai đoạn 5',
    status: 'upcoming',
  },
  {
    step: '06',
    title: 'Nghiệm thu & Chuyển tiếp Junior',
    desc: 'Đánh giá năng lực cuối kỳ, bảo vệ sản phẩm, đồng bộ điểm về Cổng Đào tạo ICTU và xét duyệt lên nhân viên chính thức.',
    duration: 'Tuần 11 - 12',
    badge: 'Giai đoạn 6',
    status: 'upcoming',
  },
];

/**
 * Trang Dashboard dành cho Thực tập sinh (Intern) đang trong quá trình ứng tuyển.
 * - Trạng thái 1: Chưa được HR duyệt -> Xem lộ trình thực tập 6 giai đoạn, liên kết nhanh tới Upload CV và Hồ sơ cá nhân.
 * - Trạng thái 2: Được HR duyệt & gửi hợp đồng -> Hiển thị Banner và Modal Hợp đồng tiếp nhận thực tập để ký xác nhận.
 * - Trạng thái 3: Sau khi ký hợp đồng -> Tự động chuyển quyền sang Thực tập sinh chính thức.
 */
export default function InternApplicantDashboard({ user, onContractConfirmed }) {
  const { updateUser } = useAuth();

  // Trạng thái hồ sơ: 'unsubmitted' | 'applied' | 'reviewing' | 'interview' | 'approved' | 'rejected' | 'onboarded'
  const [currentStep, setCurrentStep] = useState('unsubmitted');

  // File CV đã được gửi lên hệ thống thành công
  const [, setCvFile] = useState(null);
  const [cvSubmissionDate, setCvSubmissionDate] = useState(null);

  // Trạng thái Modal Hợp đồng lao động khi HR duyệt & gửi hợp đồng
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isContractConfirmed, setIsContractConfirmed] = useState(false);
  const [pendingContract, setPendingContract] = useState(null);

  // Trạng thái Modal Thông báo khi HR từ chối
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Thông báo Toast nhanh
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tự động đồng bộ thông tin CV và thời gian thực ứng viên nộp CV
  useEffect(() => {
    let isMounted = true;

    async function loadCvData() {
      let hasCvOnServer = false;
      const syncState = getRealtimeSyncState();
      const syncMatch = (syncState.applicants || []).find(
        (a) => a.id === user?.id || (user?.email && a.email?.toLowerCase() === user.email.toLowerCase())
      );

      // 1. Kiểm tra tài liệu thực tế từ backend API
      let serverDocStatus = null;
      let serverDocReason = null;
      try {
        const res = await getMyDocuments({ doc_type: 'cv' });
        if (res?.ok && Array.isArray(res.data) && res.data.length > 0) {
          hasCvOnServer = true;
          const latestDoc = res.data[0];
          serverDocStatus = latestDoc.status;
          serverDocReason = latestDoc.review_note || null;
          if (isMounted) {
            const dateObj = latestDoc.created_at ? new Date(latestDoc.created_at) : new Date();
            setCvSubmissionDate(dateObj);
            setCurrentStep('applied');
            setCvFile({
              id: latestDoc.id,
              name: latestDoc.file_name,
              size: 1024 * 1024 * 1.5,
              uploadedAt: latestDoc.created_at,
            });
            localStorage.setItem(
              'applicant_cv_submission',
              JSON.stringify({
                id: latestDoc.id,
                file_name: latestDoc.file_name,
                file_size: 1024 * 1024 * 1.5,
                submitted_at: latestDoc.created_at,
              })
            );
          }
        } else if (res?.ok && Array.isArray(res.data) && res.data.length === 0) {
          if (syncMatch?.cv_file && syncMatch.cv_file !== 'CV_UngVien.pdf') {
            hasCvOnServer = true;
            if (isMounted) {
              setCvSubmissionDate(new Date());
              setCurrentStep('applied');
              setCvFile({
                id: syncMatch.id || Date.now(),
                name: syncMatch.cv_file,
                size: 1024 * 1024 * 1.5,
                uploadedAt: syncMatch.applied_at || new Date().toISOString(),
              });
            }
          } else {
            localStorage.removeItem('applicant_cv_submission');
            if (isMounted) {
              setCvFile(null);
              setCvSubmissionDate(null);
              setCurrentStep('unsubmitted');
            }
          }
        }
      } catch (e) {
        console.error('Error fetching documents from server:', e);
      }

      // Fallback từ LocalStorage hoặc syncStore nếu chưa lấy được từ backend
      if (!hasCvOnServer) {
        const cached = localStorage.getItem('applicant_cv_submission');
        if (cached && isMounted) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.file_name && parsed.file_name !== 'CV_UngVien.pdf') {
              setCvSubmissionDate(new Date(parsed.submitted_at || Date.now()));
              setCurrentStep('applied');
              setCvFile({
                id: parsed.id,
                name: parsed.file_name,
                size: parsed.file_size || 1024 * 1024 * 1.5,
                uploadedAt: parsed.submitted_at,
              });
            }
          } catch {}
        } else if (syncMatch?.cv_file && syncMatch.cv_file !== 'CV_UngVien.pdf' && isMounted) {
          setCvSubmissionDate(new Date());
          setCurrentStep('applied');
          setCvFile({
            id: syncMatch.id || Date.now(),
            name: syncMatch.cv_file,
            size: 1024 * 1024 * 1.5,
            uploadedAt: syncMatch.applied_at || new Date().toISOString(),
          });
        }
      }

      // 2. Kiểm tra quyết định duyệt của HR
      let resolvedDecision = null;
      if (serverDocStatus === 'rejected' || user?.profile_status === 'rejected' || user?.status === 'rejected') {
        resolvedDecision = {
          status: 'rejected',
          reason: serverDocReason || user?.reject_reason || 'CV của bạn không đạt đủ yêu cầu, bạn hãy dành thêm thời gian để chuẩn bị lại CV cho lần tiếp theo nhé!',
        };
      } else if (serverDocStatus === 'pending') {
        resolvedDecision = null;
        try {
          localStorage.removeItem('applicant_decision_status');
          localStorage.removeItem('applicant_onboarded');
        } catch {}
      } else if (serverDocStatus === 'approved') {
        resolvedDecision = { status: 'approved', reason: '' };
      }

      if (!resolvedDecision && serverDocStatus !== 'pending') {
        try {
          const decRaw = localStorage.getItem('applicant_decision_status');
          if (decRaw && isMounted) {
            const dec = JSON.parse(decRaw);
            const isTargetApplicant =
              (dec?.applicantId && (dec.applicantId === user?.id || String(dec.applicantId) === String(user?.id))) ||
              (dec?.targetEmail && user?.email && dec.targetEmail.toLowerCase() === user.email.toLowerCase()) ||
              (!dec?.applicantId && user?.email && user.email.toLowerCase().includes('ungvien'));
            if (dec && dec.status && isTargetApplicant) {
              resolvedDecision = dec;
            }
          }
        } catch {}
      }

      if (!resolvedDecision && syncMatch) {
        if (syncMatch.status === 'rejected') {
          resolvedDecision = { status: 'rejected', reason: syncMatch.reject_reason || '' };
        } else if (syncMatch.status === 'approved') {
          resolvedDecision = { status: 'approved', reason: '' };
        }
      }

      if (!resolvedDecision) {
        if (user?.profile_status === 'approved' || user?.status === 'approved') {
          resolvedDecision = { status: 'approved', reason: '' };
        }
      }

      const isRejected = resolvedDecision?.status === 'rejected';
      const isApproved = resolvedDecision?.status === 'approved';

      if (isMounted) {
        if (isApproved) {
          setCurrentStep('approved');
          setShowRejectModal(false);
          setRejectReason('');
        } else if (isRejected) {
          setCurrentStep('rejected');
          setRejectReason(resolvedDecision?.reason || 'Hồ sơ chưa đáp ứng đủ yêu cầu tiếp nhận thực tập đợt này.');
          const isDismissed = sessionStorage.getItem('applicant_reject_modal_dismissed') === 'true';
          setShowRejectModal(!isDismissed);
          setPendingContract(null);
          setShowContractModal(false);
          setIsContractConfirmed(false);
          try {
            localStorage.removeItem('applicant_pending_contract');
          } catch {}
        }
      }

      // 3. Kiểm tra hợp đồng tiếp nhận (CHỈ HIỂN THỊ KHI KHÔNG BỊ TỪ CHỐI)
      if (!isRejected) {
        try {
          const isAlreadyOnboarded = localStorage.getItem('applicant_onboarded') === 'true';
          if (isAlreadyOnboarded) {
            setIsContractConfirmed(true);
            setCurrentStep('onboarded');
          } else {
            const pendingRaw = localStorage.getItem('applicant_pending_contract');
            if (pendingRaw && isMounted) {
              const parsed = JSON.parse(pendingRaw);
              const hasTargetRestriction = Boolean(
                parsed?.applicantId ||
                parsed?.targetEmail ||
                parsed?.contract?.email ||
                parsed?.contract?.student_name
              );
              const matchesContract = hasTargetRestriction
                ? Boolean(
                    (parsed?.applicantId && (parsed.applicantId === user?.id || String(parsed.applicantId) === String(user?.id))) ||
                    (parsed?.targetEmail && user?.email && parsed.targetEmail.toLowerCase() === user.email.toLowerCase()) ||
                    (parsed?.contract?.email && user?.email && parsed.contract.email.toLowerCase() === user.email.toLowerCase()) ||
                    (parsed?.contract?.student_name && user?.full_name && parsed.contract.student_name === user.full_name)
                  )
                : true;
              if (matchesContract && parsed?.contract) {
                setPendingContract(parsed.contract);
              }
            } else if (isMounted && isApproved) {
              const targetId = user?.id || 7;
              const myContract = syncState.contracts?.find(
                (c) =>
                  (c.intern_id === targetId ||
                    String(c.intern_id) === String(targetId) ||
                    (user?.email && c.email && c.email.toLowerCase() === user.email.toLowerCase()) ||
                    c.student_name === user?.full_name) &&
                  !c.signed_intern
              );
              if (myContract) {
                setPendingContract(myContract);
              }
            }
          }
        } catch {}
      } else {
        if (isMounted) {
          setPendingContract(null);
          setShowContractModal(false);
        }
      }
    }

    loadCvData();

    // Lắng nghe sự kiện nộp CV từ trang khác (như InternUploadPage)
    const handleCvUpdated = (e) => {
      sessionStorage.removeItem('applicant_reject_modal_dismissed');
      if (e.detail?.submitted_at) {
        setCvSubmissionDate(new Date(e.detail.submitted_at));
        setCurrentStep('applied');
        setCvFile({
          id: e.detail.id,
          name: e.detail.file_name,
          size: e.detail.file_size || 1024 * 1024 * 1.5,
          uploadedAt: e.detail.submitted_at,
          previewUrl: e.detail.previewUrl,
        });
      } else {
        setCvSubmissionDate(null);
        setCvFile(null);
        setCurrentStep('unsubmitted');
        setShowContractModal(false);
        setShowRejectModal(false);
        setPendingContract(null);
      }
    };

    // Lắng nghe quyết định duyệt / từ chối của HR
    const handleDecisionUpdated = (e) => {
      if (e.detail?.status === 'approved') {
        setCurrentStep('approved');
        setShowRejectModal(false);
      } else if (e.detail?.status === 'rejected') {
        sessionStorage.removeItem('applicant_reject_modal_dismissed');
        setShowRejectModal(true);
        setShowContractModal(false);
        setCurrentStep('rejected');
      }
    };

    window.addEventListener('applicant_cv_updated', handleCvUpdated);
    window.addEventListener('applicant_decision_updated', handleDecisionUpdated);

    // Đồng bộ thời gian thực từ HR Dashboard (Duyệt hồ sơ, từ chối, gửi hợp đồng đã chọn)
    const unsubscribeSync = subscribeRealtimeEvents((event) => {
      if (event.type === SYNC_EVENTS.APPLICANT_DECISION) {
        const { applicantId, targetEmail, status, reason } = event.payload || {};
        const matchesUser =
          (applicantId && (applicantId === user?.id || String(applicantId) === String(user?.id))) ||
          (targetEmail && user?.email && targetEmail.toLowerCase() === user.email.toLowerCase()) ||
          (!applicantId && !targetEmail && user?.email && user.email.toLowerCase().includes('ungvien'));
        if (matchesUser) {
          if (status === 'approved') {
            setCurrentStep('approved');
            setShowRejectModal(false);
            showToast(
              'Chúc mừng! Hồ sơ của bạn đã được HR phê duyệt tiếp nhận. Đang chuyển hướng vào Không gian làm việc Thực tập sinh...',
              'success'
            );
            setTimeout(() => {
              if (updateUser) {
                updateUser({
                  status: 'active',
                  role: 'intern',
                  profile_status: 'approved',
                });
              }
            }, 1200);
          } else if (status === 'rejected') {
            sessionStorage.removeItem('applicant_reject_modal_dismissed');
            setShowRejectModal(true);
            setShowContractModal(false);
            setPendingContract(null);
            setCurrentStep('rejected');
            showToast(`Hồ sơ chưa phù hợp đợt này${reason ? ': ' + reason : '.'}`, 'info');
          }
        }
      } else if (event.type === SYNC_EVENTS.CONTRACT_SENT) {
        const { applicantId, targetEmail, contract } = event.payload || {};
        const matchesUser =
          (applicantId && (applicantId === user?.id || String(applicantId) === String(user?.id))) ||
          (targetEmail && user?.email && targetEmail.toLowerCase() === user.email.toLowerCase()) ||
          (contract?.email && user?.email && contract.email.toLowerCase() === user.email.toLowerCase()) ||
          (contract?.student_name && user?.full_name && contract.student_name === user.full_name);
        if (matchesUser && contract && currentStep !== 'rejected' && user?.profile_status !== 'rejected') {
          setPendingContract(contract);
          setShowContractModal(true);
          showToast(`🔔 Bạn vừa nhận được văn bản "${contract.doc_type}" từ HR! Vui lòng xem và ký xác nhận.`, 'success');
        }
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('applicant_cv_updated', handleCvUpdated);
      window.removeEventListener('applicant_decision_updated', handleDecisionUpdated);
      unsubscribeSync();
    };
  }, [user]);

  // Xác nhận ký hợp đồng khi HR duyệt
  const handleConfirmContract = () => {
    if (!contractAgreed) return;
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      setShowContractModal(false);
      setIsContractConfirmed(true);
      setCurrentStep('onboarded');
      localStorage.setItem('applicant_onboarded', 'true');
      localStorage.removeItem('applicant_decision_status');
      localStorage.removeItem('applicant_pending_contract');
      setPendingContract(null);

      // Đồng bộ thời gian thực ký kết hợp đồng số sang HR Portal
      syncContractSigning(user?.id || 7, user?.full_name || user?.name || 'Ứng viên');

      // Cấp quyền chính thức Thực tập sinh
      if (updateUser) {
        updateUser({
          role: 'intern',
          status: 'active',
          status_label: 'Đang thực tập',
        });
      }

      showToast('Xác nhận thành công! Bạn đã chính thức được cấp quyền Thực tập sinh.', 'success');
      setTimeout(() => {
        onContractConfirmed?.();
      }, 800);
    }, 1000);
  };

  // Đóng thông báo khi HR từ chối
  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    sessionStorage.setItem('applicant_reject_modal_dismissed', 'true');
    showToast('Đã đóng thông báo. Bạn có thể chuẩn bị lại CV và nộp lại bất kỳ lúc nào.', 'info');
  };

  // Đặt lại tài khoản ứng viên về trạng thái ban đầu (Chờ duyệt)
  const handleResetApplicantState = () => {
    try {
      localStorage.removeItem('applicant_decision_status');
      localStorage.removeItem('applicant_onboarded');
      localStorage.removeItem('applicant_pending_contract');
      sessionStorage.removeItem('applicant_reject_modal_dismissed');
      localStorage.removeItem('ictu_user_profile_ungvien@ictu.edu.vn');
    } catch {}
    setCurrentStep('applied');
    setShowRejectModal(false);
    setShowContractModal(false);
    setIsContractConfirmed(false);
    setPendingContract(null);
    if (updateUser) {
      updateUser({ status: 'pending', profile_status: 'pending' });
    }
    showToast('Đã đặt lại tài khoản ứng viên về trạng thái ban đầu (Chờ duyệt).', 'success');
  };

  // Lộ trình 6 giai đoạn: cập nhật đồng bộ trạng thái thực tế từ HR
  const isRejected = currentStep === 'rejected';
  const roadmapStages = getInternshipRoadmap(Boolean(cvSubmissionDate), isRejected, rejectReason);

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

      {/* BANNER THÔNG BÁO HỢP ĐỒNG TIẾP NHẬN ĐƯỢC GỬI TỪ HR (CHỈ HIỂN THỊ KHI KHÔNG BỊ TỪ CHỐI) */}
      {pendingContract && !isContractConfirmed && currentStep !== 'rejected' && (
        <div className="iad-alert-contract-banner">
          <div className="iad-alert-contract-left">
            <div className="iad-alert-contract-icon">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 className="iad-alert-contract-title">
                🔔 THÔNG BÁO: BẠN NHẬN ĐƯỢC HỢP ĐỒNG TIẾP NHẬN THỰC TẬP TỪ PHÒNG NHÂN SỰ
              </h4>
              <p className="iad-alert-contract-desc">
                Loại văn bản: <strong>{pendingContract.doc_type}</strong>
              </p>
              <div className="iad-alert-contract-meta">
                <span>Thời hạn: <strong>{pendingContract.start_date} – {pendingContract.end_date}</strong></span>
                <span>• Phụ cấp: <strong>{pendingContract.allowance}</strong></span>
                <span>• Lab tiếp nhận: <strong>{pendingContract.department}</strong></span>
              </div>
            </div>
          </div>
          <div className="iad-alert-contract-right">
            <button
              type="button"
              className="iad-btn-sign-contract-highlight"
              onClick={() => setShowContractModal(true)}
            >
              <FileCheck size={18} />
              <span>Xem &amp; Ký hợp đồng ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <section className="iad-hero">
        <div className="iad-hero__content">
          <div className="iad-hero__text">
            <h2>Xin chào, {user?.full_name || 'Ứng viên'}</h2>
            <p>
              {cvSubmissionDate
                ? (currentStep === 'rejected'
                    ? 'Hồ sơ ứng tuyển hiện tại của bạn chưa đạt yêu cầu đợt này. Bạn có thể chuẩn bị lại CV và nộp lại để ứng tuyển đợt tiếp theo.'
                    : 'Hồ sơ ứng tuyển vị trí Frontend Developer Intern của bạn đang được Bộ phận Tuyển dụng & Đào tạo xem xét. Vui lòng theo dõi lộ trình và cập nhật thông tin bên dưới.')
                : 'Chào mừng bạn đến với Cổng tuyển dụng ICTU. Vui lòng tải lên CV cá nhân để bắt đầu quy trình xét tuyển thực tập.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <Link
                to="/intern/upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                <UploadCloud size={16} />
                <span>{cvSubmissionDate ? 'Xem hồ sơ & Tiến trình' : 'Upload CV mới'}</span>
              </Link>
              <Link
                to="/intern/profile"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  border: '1px solid #CBD5E1',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <User size={16} />
                <span>Xem hồ sơ cá nhân</span>
              </Link>
              <button
                type="button"
                onClick={handleResetApplicantState}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Khôi phục trạng thái ứng viên về ban đầu (Chờ duyệt)"
              >
                <RotateCcw size={15} />
                <span>Đặt lại tài khoản ứng viên</span>
              </button>
            </div>
          </div>

          <div className="iad-hero__cards">
            <div className="iad-hero__info-card">
              <div className="iad-hero__info-card-label">Mã ứng viên</div>
              <div className="iad-hero__info-card-value">{user?.code || 'TTS9999'}</div>
              <div className="iad-hero__info-card-sub">Khoa Công nghệ Thông tin - ICTU</div>
            </div>

            {!isContractConfirmed && currentStep !== 'rejected' && pendingContract && (
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

      {/* 1. LỘ TRÌNH THỰC TẬP CHUẨN MỰC (INTERNSHIP ROADMAP) */}
      <section className="iad-card">
        <div className="iad-card__head">
          <div>
            <h3 className="iad-card__title">Lộ Trình Thực Tập Doanh Nghiệp ICTU</h3>
            <p className="iad-card__desc">
              Toàn bộ lộ trình từ tuyển chọn, đào tạo công nghệ, thực chiến dự án có Mentor đến nghiệm thu và chuyển tiếp Junior.
            </p>
          </div>
        </div>

        <div className="iad-roadmap-grid">
          {roadmapStages.map((item, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: '14px',
                border: item.status === 'completed'
                  ? '1.5px solid #BBF7D0'
                  : item.status === 'active'
                  ? '1.5px solid #BFDBFE'
                  : item.status === 'rejected'
                  ? '1.5px solid #FECACA'
                  : '1px solid #E2E8F0',
                backgroundColor: item.status === 'completed'
                  ? '#F0FDF4'
                  : item.status === 'active'
                  ? '#EFF6FF'
                  : item.status === 'rejected'
                  ? '#FEF2F2'
                  : '#FFFFFF',
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: item.status === 'active' ? '0 4px 14px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: item.status === 'completed'
                    ? '#166534'
                    : item.status === 'active'
                    ? '#1D4ED8'
                    : item.status === 'rejected'
                    ? '#DC2626'
                    : '#64748B',
                  backgroundColor: item.status === 'completed'
                    ? '#DCFCE7'
                    : item.status === 'active'
                    ? '#DBEAFE'
                    : item.status === 'rejected'
                    ? '#FEE2E2'
                    : '#F1F5F9',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}>
                  {item.badge}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>
                  {item.duration}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: item.status === 'completed'
                    ? '#16A34A'
                    : item.status === 'active'
                    ? '#2563EB'
                    : item.status === 'rejected'
                    ? '#EF4444'
                    : '#94A3B8',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                  {item.title}
                </h4>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5, flex: 1 }}>
                {item.desc}
              </p>

              <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600 }}>
                {item.status === 'completed' ? (
                  <span style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Đã hoàn thành
                  </span>
                ) : item.status === 'active' ? (
                  <span style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> Đang diễn ra
                  </span>
                ) : item.status === 'rejected' ? (
                  <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={13} /> Chưa tiếp nhận
                  </span>
                ) : (
                  <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={13} /> {isRejected ? 'Tạm dừng' : 'Dự kiến'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. MODAL THÔNG BÁO & KÝ HỢP ĐỒNG LAO ĐỘNG (KHI HR GỬI HỢP ĐỒNG) */}
      {showContractModal && (
        <div className="iad-modal-overlay">
          <div className="iad-modal-content" style={{ maxWidth: '780px' }}>
            <div className="iad-modal-header">
              <div className="iad-modal-header__left">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: 'rgba(255, 255, 255, 0.2)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3>{pendingContract?.doc_type || 'Hợp Đồng Tiếp Nhận Thực Tập'}</h3>
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
                <strong>Chúc mừng! Hồ sơ ứng tuyển của bạn đã được Bộ phận Tuyển dụng &amp; Đào tạo phê duyệt và gửi Hợp đồng tiếp nhận chính thức.</strong>
                <p>
                  Văn bản hợp đồng được ban hành riêng cho bạn theo biểu mẫu chuẩn của Doanh nghiệp. Vui lòng kiểm tra thông tin tiếp nhận, thời hạn, phụ cấp và các cam kết trước khi bấm xác nhận ký số trực tuyến.
                </p>
              </div>

              {/* Thông tin cụ thể hợp đồng HR đã gửi */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>Bộ phận tiếp nhận</span>
                    <strong style={{ color: '#0f172a' }}>{pendingContract?.department || 'Trung tâm Phát triển Phần mềm ICTU'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>Thời gian thực tập</span>
                    <strong style={{ color: '#0f172a' }}>{pendingContract?.start_date || '01/08/2026'} – {pendingContract?.end_date || '30/11/2026'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>Mức phụ cấp hàng tháng</span>
                    <strong style={{ color: '#16a34a', fontSize: '14px' }}>{pendingContract?.allowance || '3.000.000 đ/tháng'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>Xác thực chữ ký</span>
                    <strong style={{ color: '#2563eb' }}>✓ VNPT-CA Doanh nghiệp</strong>
                  </div>
                </div>
              </div>

              {/* Thông tin Bên B: Trích xuất tự động từ hồ sơ cá nhân */}
              {(() => {
                const partyB = extractPartyBContractInfo({
                  ...pendingContract,
                  ...getSavedUserProfile(user),
                  student_code: pendingContract?.student_code || getSavedUserProfile(user)?.student_code,
                  university: pendingContract?.university || getSavedUserProfile(user)?.university,
                  phone: pendingContract?.phone || getSavedUserProfile(user)?.phone,
                  email: pendingContract?.email || getSavedUserProfile(user)?.email,
                });
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 18px', marginBottom: '16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                      BÊN B: {partyB.isStudent ? 'SINH VIÊN THỰC TẬP (TIẾP NHẬN)' : 'THỰC TẬP SINH TIẾP NHẬN'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Họ và tên: </span>
                        <strong style={{ color: '#0f172a' }}>{partyB.fullName}</strong>
                      </div>
                      {partyB.isStudent ? (
                        <>
                          <div>
                            <span style={{ color: '#64748b' }}>Mã sinh viên: </span>
                            <strong style={{ color: '#0f172a' }}>{partyB.studentCode || '---'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Cơ sở đào tạo: </span>
                            <strong style={{ color: '#0f172a' }}>{partyB.university || '---'}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span style={{ color: '#64748b' }}>Số điện thoại: </span>
                            <strong style={{ color: '#0f172a' }}>{partyB.phone || '---'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Email: </span>
                            <strong style={{ color: '#0f172a' }}>{partyB.email || '---'}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="iad-modal-terms">
                <h4>Điều khoản &amp; Cam kết trong hợp đồng:</h4>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line', maxHeight: '180px', overflowY: 'auto', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  {pendingContract?.notes || (
                    `1. Thời gian làm việc: Tối thiểu 20 giờ/tuần theo lịch phân công dự án của Mentor.
2. Cam kết bảo mật thông tin (NDA): Tuyệt đối không sao chép, chia sẻ mã nguồn hoặc tài liệu nội bộ của Doanh nghiệp.
3. Kỷ luật lao động: Thực hiện điểm danh chấm công đầy đủ, tham gia các buổi Daily Standup và báo cáo tiến độ tuần đúng hạn vào thứ Sáu.
4. Đánh giá kết quả: Mentor chấm điểm định kỳ, doanh nghiệp cấp Giấy chứng nhận và bảng điểm thực tập chính thức đồng bộ về Nhà trường.`
                  )}
                </div>
              </div>

              <label className="iad-modal-checkbox" style={{ marginTop: '16px' }}>
                <input
                  type="checkbox"
                  checked={contractAgreed}
                  onChange={(e) => setContractAgreed(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  Tôi đã đọc kỹ, hiểu rõ và đồng ý với toàn bộ điều khoản trong hợp đồng thực tập này
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
                    Ký &amp; Xác nhận hợp đồng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL THÔNG BÁO TỪ CHỐI CV (KHI HR KHÔNG DUYỆT) */}
      {showRejectModal && (
        <div className="iad-modal-overlay">
          <div className="iad-modal-content iad-modal-content--reject">
            <div className="iad-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
              <div className="iad-modal-header__left">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: 'rgba(255, 255, 255, 0.2)' }}>
                  <AlertCircle size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ color: '#ffffff', margin: 0, fontSize: 16 }}>Thông Báo Kết Quả Tuyển Dụng</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', margin: 0, fontSize: 12 }}>Phòng Nhân sự & Tuyển dụng ICTU</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRejectModal}
                className="iad-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="iad-modal-body" style={{ padding: '26px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileX size={32} />
              </div>
              <p style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.6, margin: '0 0 12px', fontWeight: 600 }}>
                CV của bạn chưa đạt yêu cầu tiếp nhận thực tập đợt này.
              </p>
              {rejectReason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', textAlign: 'left', margin: '0 auto 16px', maxWidth: '440px' }}>
                  <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Lý do từ chối từ Phòng Nhân sự:
                  </span>
                  <span style={{ fontSize: '13.5px', color: '#b91c1c', lineHeight: 1.5 }}>
                    {rejectReason}
                  </span>
                </div>
              )}
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Bạn hãy chuẩn bị và hoàn thiện lại CV để nộp lại cho các đợt tuyển dụng tiếp theo nhé!
              </p>
            </div>

            <div className="iad-modal-footer" style={{ justifyContent: 'center', gap: '12px', padding: '16px 20px' }}>
              <button
                type="button"
                onClick={handleCloseRejectModal}
                className="iad-btn iad-btn--secondary"
                style={{ minWidth: 100, justifyContent: 'center', padding: '10px 20px', fontSize: 14, fontWeight: 600 }}
              >
                Đóng
              </button>
              <Link
                to="/intern/upload"
                onClick={handleCloseRejectModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <UploadCloud size={16} />
                <span>Nộp lại CV mới</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
