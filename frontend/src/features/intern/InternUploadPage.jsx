import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  uploadDocument,
  getMyDocuments,
  deleteDocument,
  getDocumentDownloadUrl,
  previewDocumentFile,
  viewDocument,
  getDocumentViewUrl,
} from '../../api/documents';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  X,
  Eye,
  Trash2,
  CheckSquare,
  RotateCcw,
  Send,
  FileX,
  ZoomIn,
  ZoomOut,
  Download,
  XCircle,
} from 'lucide-react';
import {
  syncApplicantSubmission,
  syncApplicantResetSubmission,
  syncContractSigning,
  subscribeRealtimeEvents,
  SYNC_EVENTS,
  getRealtimeSyncState,
  extractPartyBContractInfo,
} from '../../utils/realtimeSync';
import { getSavedUserProfile } from './InternProfilePage';
import './InternApplicantDashboard.css';

/**
 * InternUploadPage.jsx
 * Trang Nộp & Quản lý Hồ sơ CV Ứng Tuyển + Thanh tiến trình xét tuyển theo thời gian thực.
 * Thay thế hoàn toàn form upload đơn giản cũ để loại bỏ trùng lặp tính năng.
 */
export default function InternUploadPage() {
  const { user, updateUser } = useAuth();

  // Trạng thái hồ sơ: 'unsubmitted' | 'applied' | 'reviewing' | 'interview' | 'approved' | 'rejected' | 'onboarded'
  const [currentStep, setCurrentStep] = useState('unsubmitted');

  // File CV đã được gửi lên hệ thống thành công
  const [cvFile, setCvFile] = useState(null);
  const [cvSubmissionDate, setCvSubmissionDate] = useState(null);

  // File CV đang được chọn (chưa bấm Gửi - Staged file)
  const [stagedFile, setStagedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Trạng thái Modal Hợp đồng lao động khi HR duyệt & gửi hợp đồng
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isContractConfirmed, setIsContractConfirmed] = useState(false);
  const [pendingContract, setPendingContract] = useState(null);

  // Trạng thái Modal Thông báo khi HR từ chối
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Trạng thái Modal Xem lại tài liệu (in-app preview trực tiếp, không tải file về máy)
  const [docPreviewModal, setDocPreviewModal] = useState({
    open: false,
    fileName: '',
    fileType: '',
    fileSize: 0,
    url: '',
    paragraphs: [],
    isLoading: false,
    isStaged: false,
  });
  const [docZoom, setDocZoom] = useState(100);

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
            setCvFile({
              id: latestDoc.id,
              name: latestDoc.file_name,
              size: 1024 * 1024 * 1.5,
              uploadedAt: latestDoc.created_at,
            });
            localStorage.setItem('applicant_cv_submission', JSON.stringify({
              id: latestDoc.id,
              file_name: latestDoc.file_name,
              file_size: 1024 * 1024 * 1.5,
              submitted_at: latestDoc.created_at,
            }));
          }
        } else if (res?.ok && Array.isArray(res.data) && res.data.length === 0) {
          // Backend trả về 200 OK và rỗng: Kiểm tra xem có CV trong syncStore không trước khi xóa
          if (syncMatch?.cv_file && syncMatch.cv_file !== 'CV_UngVien.pdf') {
            hasCvOnServer = true;
            if (isMounted) {
              setCvSubmissionDate(new Date());
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
              hasCvOnServer = true;
              setCvSubmissionDate(new Date(parsed.submitted_at || Date.now()));
              setCvFile({
                id: parsed.id,
                name: parsed.file_name,
                size: parsed.file_size || 1024 * 1024 * 1.5,
                uploadedAt: parsed.submitted_at,
              });
            }
          } catch {}
        } else if (syncMatch?.cv_file && syncMatch.cv_file !== 'CV_UngVien.pdf' && isMounted) {
          hasCvOnServer = true;
          setCvSubmissionDate(new Date());
          setCvFile({
            id: syncMatch.id || Date.now(),
            name: syncMatch.cv_file,
            size: 1024 * 1024 * 1.5,
            uploadedAt: syncMatch.applied_at || new Date().toISOString(),
          });
        }
      }

      // 2. Xác định quyết định duyệt / từ chối của HR
      let resolvedDecision = null;
      if (serverDocStatus === 'rejected') {
        resolvedDecision = {
          status: 'rejected',
          reason: serverDocReason || 'CV của bạn không đạt đủ yêu cầu, bạn hãy dành thêm thời gian để chuẩn bị lại CV cho lần tiếp theo nhé!',
        };
      } else if (serverDocStatus === 'approved') {
        resolvedDecision = { status: 'approved', reason: '' };
      }

      if (!resolvedDecision) {
        try {
          const decRaw = localStorage.getItem('applicant_decision_status');
          if (decRaw) {
            const dec = JSON.parse(decRaw);
            const isTargetApplicant =
              !dec.applicantId ||
              dec.applicantId === user?.id ||
              String(dec.applicantId) === String(user?.id) ||
              (user?.email && user.email.toLowerCase().includes('ungvien')) ||
              user?.role === 'applicant';
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
        if (user?.profile_status === 'rejected' || user?.status === 'rejected') {
          resolvedDecision = { status: 'rejected', reason: user?.reject_reason || '' };
        } else if (user?.profile_status === 'approved' || user?.status === 'approved') {
          resolvedDecision = { status: 'approved', reason: '' };
        }
      }

      const isAlreadyOnboarded = localStorage.getItem('applicant_onboarded') === 'true';

      if (isMounted) {
        if (resolvedDecision?.status === 'approved') {
          if (!isAlreadyOnboarded) {
            setShowContractModal(true);
          }
          setShowRejectModal(false);
          setCurrentStep(isAlreadyOnboarded ? 'onboarded' : 'approved');
        } else if (resolvedDecision?.status === 'rejected') {
          setShowContractModal(false);
          setCurrentStep('rejected');
          const reason =
            resolvedDecision.reason ||
            'CV của bạn không đạt đủ yêu cầu, bạn hãy dành thêm thời gian để chuẩn bị lại CV cho lần tiếp theo nhé!';
          setRejectReason(reason);
          const isDismissed = sessionStorage.getItem('applicant_reject_modal_dismissed') === 'true';
          setShowRejectModal(!isDismissed);
        } else if (hasCvOnServer) {
          setShowContractModal(false);
          setShowRejectModal(false);
          setCurrentStep('applied');
        } else {
          setShowContractModal(false);
          setShowRejectModal(false);
          setCurrentStep('unsubmitted');
        }
      }

      // 3. Kiểm tra xem HR đã phát hành & gửi hợp đồng tiếp nhận chưa (CHỈ KHI KHÔNG BỊ TỪ CHỐI)
      const isCandidateRejected = resolvedDecision?.status === 'rejected';

      if (!isCandidateRejected) {
        try {
          if (isAlreadyOnboarded) {
            setIsContractConfirmed(true);
            setCurrentStep('onboarded');
          } else {
            setIsContractConfirmed(false);
            const pendingRaw = localStorage.getItem('applicant_pending_contract');
            if (pendingRaw && isMounted) {
              const parsed = JSON.parse(pendingRaw);
              if (parsed && parsed.contract) {
                setPendingContract(parsed.contract);
              }
            } else if (isMounted) {
              const targetId = user?.id || 7;
              const myContract = syncState.contracts?.find(
                (c) =>
                  (c.intern_id === targetId ||
                    String(c.intern_id) === String(targetId) ||
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
          setIsContractConfirmed(false);
        }
        if (isCandidateRejected) {
          try {
            localStorage.removeItem('applicant_pending_contract');
          } catch {}
        }
      }
    }

    loadCvData();

    // Lắng nghe sự kiện nộp CV từ trang khác
    const handleCvUpdated = (e) => {
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
        setStagedFile(null);
        setCurrentStep('unsubmitted');
        setShowContractModal(false);
        setShowRejectModal(false);
        setPendingContract(null);
      }
    };

    // Lắng nghe quyết định duyệt / từ chối của HR
    const handleDecisionUpdated = (e) => {
      if (e.detail?.status === 'approved') {
        setShowContractModal(true);
        setShowRejectModal(false);
        setCurrentStep('approved');
      } else if (e.detail?.status === 'rejected') {
        setShowRejectModal(true);
        setShowContractModal(false);
        setCurrentStep('rejected');
      }
    };

    window.addEventListener('applicant_cv_updated', handleCvUpdated);
    window.addEventListener('applicant_decision_updated', handleDecisionUpdated);

    // Đồng bộ thời gian thực từ HR Dashboard
    const unsubscribeSync = subscribeRealtimeEvents((event) => {
      if (event.type === SYNC_EVENTS.APPLICANT_DECISION) {
        const { applicantId, status, reason } = event.payload || {};
        const matchesUser = !applicantId || applicantId === user?.id || String(applicantId) === String(user?.id) || user?.role === 'applicant' || user?.role === 'intern';
        if (matchesUser) {
          if (status === 'approved') {
            setShowContractModal(true);
            setShowRejectModal(false);
            setCurrentStep('approved');
            showToast('Chúc mừng! Hồ sơ ứng tuyển của bạn đã được HR phê duyệt tiếp nhận.', 'success');
          } else if (status === 'rejected') {
            setShowRejectModal(true);
            setShowContractModal(false);
            setCurrentStep('rejected');
            if (reason) setRejectReason(reason);
            showToast(`Hồ sơ chưa phù hợp đợt này${reason ? ': ' + reason : '.'}`, 'info');
          }
        }
      } else if (event.type === SYNC_EVENTS.CONTRACT_SENT) {
        const { applicantId, contract } = event.payload || {};
        const matchesUser =
          !applicantId ||
          applicantId === user?.id ||
          String(applicantId) === String(user?.id) ||
          user?.role === 'applicant' ||
          user?.role === 'intern';
        if (matchesUser && contract) {
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

  // Xử lý chọn file CV (LƯU VÀO STAGED, CHƯA GỬI TỚI HR)
  const handleFileSelect = (file) => {
    if (!file) return;
    setUploadError('');

    const validExtensions = ['pdf', 'doc', 'docx'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setUploadError('Định dạng file không hợp lệ! Vui lòng chỉ chọn file .PDF, .DOC hoặc .DOCX.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Dung lượng file vượt quá giới hạn 5 MB!');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedFile({
      file,
      name: file.name,
      size: file.size,
      previewUrl,
    });
    showToast(`Đã chọn file: ${file.name}. Bạn có thể bấm "Xem lại" hoặc "Gửi CV".`, 'info');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Đóng modal xem lại tài liệu
  const handleCloseDocPreview = () => {
    setDocPreviewModal({
      open: false,
      fileName: '',
      fileType: '',
      fileSize: 0,
      url: '',
      paragraphs: [],
      isLoading: false,
      isStaged: false,
    });
  };

  // Lắng nghe phím ESC để đóng modal xem lại tài liệu
  useEffect(() => {
    if (!docPreviewModal.open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseDocPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docPreviewModal.open]);

  // Xem lại file đang chờ gửi (mở form trực tiếp, không tải xuống máy)
  const handlePreviewStagedFile = async () => {
    if (!stagedFile) return;
    const fileName = stagedFile.name || 'CV_UngTuyen';
    const ext = fileName.split('.').pop().toLowerCase();
    const fileSize = stagedFile.size || 0;

    if (ext === 'pdf') {
      const url = stagedFile.previewUrl || URL.createObjectURL(stagedFile.file);
      setDocPreviewModal({
        open: true,
        fileName,
        fileType: 'pdf',
        fileSize,
        url,
        paragraphs: [],
        isLoading: false,
        isStaged: true,
      });
      setDocZoom(100);
      return;
    }

    // Nếu là file DOCX/DOC: gọi API preview-file để trích xuất text hiển thị trực tiếp
    setDocPreviewModal({
      open: true,
      fileName,
      fileType: ext,
      fileSize,
      url: '',
      paragraphs: [],
      isLoading: true,
      isStaged: true,
    });
    setDocZoom(100);

    try {
      const res = await previewDocumentFile(stagedFile.file);
      if (res?.ok && res.data?.paragraphs) {
        setDocPreviewModal((prev) => ({
          ...prev,
          paragraphs: res.data.paragraphs,
          isLoading: false,
        }));
      } else {
        setDocPreviewModal((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.warn('Lỗi xem trước staged file qua API:', err);
      setDocPreviewModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Hủy bỏ file đang chờ gửi (reset về dropzone ban đầu)
  const handleCancelStagedFile = () => {
    if (stagedFile?.previewUrl) {
      try { URL.revokeObjectURL(stagedFile.previewUrl); } catch {}
    }
    setStagedFile(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Đã hủy bỏ file vừa chọn.', 'info');
  };

  // Gửi CV chính thức tới HR
  const handleSubmitCv = async () => {
    if (!stagedFile) return;
    setIsSubmitting(true);
    setUploadError('');

    const now = new Date();
    try {
      const res = await uploadDocument(stagedFile.file, 'cv');
      if (!res.ok) {
        const errorDetail = res.data?.detail || 'Không thể lưu CV lên hệ thống máy chủ.';
        throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
      }
      const docData = res.data;
      const docId = docData?.id || Date.now();
      const submissionInfo = {
        id: docId,
        file_name: docData?.file_name || stagedFile.name,
        file_size: stagedFile.size,
        submitted_at: docData?.created_at || now.toISOString(),
        previewUrl: stagedFile.previewUrl,
      };

      localStorage.setItem('applicant_cv_submission', JSON.stringify(submissionInfo));
      localStorage.removeItem('applicant_decision_status');
      sessionStorage.removeItem('applicant_reject_modal_dismissed');
      setRejectReason('');
      setShowRejectModal(false);
      window.dispatchEvent(new CustomEvent('applicant_cv_updated', { detail: submissionInfo }));

      // Đồng bộ thời gian thực sang HR Dashboard
      syncApplicantSubmission({
        applicantId: user?.id || 7,
        fullName: user?.full_name || user?.name || 'Ứng viên',
        email: user?.email || 'ungvien@ictu.edu.vn',
        phone: user?.phone || '0987.654.321',
        cvFileName: docData?.file_name || stagedFile.name,
        major: user?.major || 'Công nghệ thông tin',
        gpa: user?.gpa || '3.55',
        cvId: docId,
      });

      setCvFile({
        id: docId,
        name: docData?.file_name || stagedFile.name,
        size: stagedFile.size,
        uploadedAt: docData?.created_at || now.toISOString(),
        previewUrl: stagedFile.previewUrl,
      });
      setCvSubmissionDate(now);
      setCurrentStep('applied');
      setStagedFile(null);
      showToast(`Đã gửi CV thành công: ${stagedFile.name}! Hồ sơ đã lưu vào CSDL và gửi yêu cầu tới HR xét duyệt.`, 'success');
    } catch (err) {
      console.error('Lỗi khi nộp CV:', err);
      const errMsg = err.message || 'Lỗi kết nối khi gửi CV tới máy chủ.';
      setUploadError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa file CV đã nộp và khôi phục trạng thái ban đầu
  const handleDeleteSubmittedCv = async () => {
    if (cvFile?.id) {
      try {
        await deleteDocument(cvFile.id);
      } catch (e) {
        console.warn('Lỗi khi xóa tài liệu server:', e);
      }
    }
    if (cvFile?.previewUrl) {
      try { URL.revokeObjectURL(cvFile.previewUrl); } catch {}
    }
    setCvFile(null);
    setCvSubmissionDate(null);
    setStagedFile(null);
    setCurrentStep('unsubmitted');
    setShowContractModal(false);
    setShowRejectModal(false);
    setRejectReason('');
    localStorage.removeItem('applicant_cv_submission');
    localStorage.removeItem('applicant_decision_status');
    localStorage.removeItem('applicant_pending_contract');
    localStorage.removeItem('applicant_onboarded');
    sessionStorage.removeItem('applicant_reject_modal_dismissed');
    setPendingContract(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.dispatchEvent(new CustomEvent('applicant_cv_updated', { detail: null }));

    // Đồng bộ thời gian thực trả về trạng thái chưa nộp sang HR Dashboard
    syncApplicantResetSubmission(user?.id || 7, user?.email || 'ungvien@ictu.edu.vn');

    showToast('Đã xóa file CV và làm mới lại tiến trình về trạng thái ban đầu!', 'info');
  };

  // Xem lại file CV đã nộp (mở form trực tiếp, không tải xuống máy)
  const handlePreviewSubmittedCv = async () => {
    if (!cvFile) return;
    const fileName = cvFile.name || 'CV_UngTuyen';
    const ext = fileName.split('.').pop().toLowerCase();
    const fileSize = cvFile.size || 0;

    if (ext === 'pdf') {
      const viewUrl = cvFile.previewUrl || (cvFile.id ? getDocumentViewUrl(cvFile.id) : '');
      setDocPreviewModal({
        open: true,
        fileName,
        fileType: 'pdf',
        fileSize,
        url: viewUrl,
        paragraphs: [],
        isLoading: false,
        isStaged: false,
      });
      setDocZoom(100);
      return;
    }

    // Nếu là file DOCX/DOC: gọi API /documents/{id}/view?raw=true để trích xuất text
    setDocPreviewModal({
      open: true,
      fileName,
      fileType: ext,
      fileSize,
      url: '',
      paragraphs: [],
      isLoading: true,
      isStaged: false,
    });
    setDocZoom(100);

    if (cvFile.id) {
      try {
        const res = await viewDocument(cvFile.id, { raw: true });
        if (res?.ok && res.data?.paragraphs) {
          setDocPreviewModal((prev) => ({
            ...prev,
            paragraphs: res.data.paragraphs,
            isLoading: false,
          }));
        } else {
          setDocPreviewModal((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        console.warn('Lỗi xem tài liệu đã nộp qua API:', err);
        setDocPreviewModal((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setDocPreviewModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

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

      // Đồng bộ thời gian thực sang HR Portal
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
    }, 1000);
  };

  // Đóng thông báo khi HR từ chối
  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    sessionStorage.setItem('applicant_reject_modal_dismissed', 'true');
    showToast('Đã đóng hộp thoại. Bạn có thể xem kết quả xét tuyển và nhận xét của HR bên dưới.', 'info');
  };

  // Helper định dạng ngày Việt Nam chuẩn DD/MM/YYYY
  const formatVnDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const isCandidateApproved =
    currentStep !== 'rejected' &&
    (currentStep === 'approved' ||
      currentStep === 'onboarded' ||
      user?.profile_status === 'approved');

  // Các bước trong Stepper tiến trình ứng tuyển tính theo thời gian thực ứng viên nộp CV
  const STEPS = [
    {
      id: 'applied',
      label: 'Đã nộp hồ sơ',
      desc: 'Nhận thông tin ứng viên',
      date: cvSubmissionDate ? formatVnDate(cvSubmissionDate) : 'Chưa nộp',
    },
    {
      id: 'reviewing',
      label: 'Đang xem xét',
      desc: 'HR đánh giá CV & chuyên ngành',
      date: cvSubmissionDate
        ? formatVnDate(addDays(cvSubmissionDate, 3))
        : 'Dự kiến',
    },
    {
      id: 'interview',
      label: 'Phỏng vấn',
      desc: currentStep === 'rejected' ? 'Không tiến hành' : 'Trao đổi chuyên môn với Mentor',
      date: cvSubmissionDate
        ? formatVnDate(addDays(cvSubmissionDate, 7))
        : 'Dự kiến',
    },
    {
      id: 'approved',
      label: currentStep === 'rejected' ? 'Chưa tiếp nhận' : isCandidateApproved ? 'Đã phê duyệt' : 'Kết quả duyệt',
      desc: currentStep === 'rejected'
        ? 'Hồ sơ chưa đạt tiêu chuẩn đợt này'
        : isCandidateApproved
        ? 'Đã tiếp nhận chính thức vào kỳ thực tập'
        : 'Ký hợp đồng & tiếp nhận',
      date: currentStep === 'rejected'
        ? (cvSubmissionDate ? formatVnDate(new Date()) : 'Chưa tiếp nhận')
        : isCandidateApproved
        ? (cvSubmissionDate ? formatVnDate(addDays(cvSubmissionDate, 10)) : formatVnDate(new Date()))
        : cvSubmissionDate ? `Dự kiến ${formatVnDate(addDays(cvSubmissionDate, 10))}` : 'Dự kiến',
    },
  ];

  const getStepStatus = (stepId) => {
    if (!cvSubmissionDate || currentStep === 'unsubmitted') {
      if (stepId === 'applied') return 'active';
      return 'pending';
    }

    if (currentStep === 'rejected') {
      if (stepId === 'applied' || stepId === 'reviewing') return 'completed';
      if (stepId === 'approved') return 'rejected';
      return 'pending';
    }

    // Khi đã được phê duyệt tiếp nhận hoặc onboarded: toàn bộ 4 bước đều ĐÃ HOÀN TẤT
    if (isCandidateApproved) {
      return 'completed';
    }

    const order = ['applied', 'reviewing', 'interview', 'approved', 'onboarded'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

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

      {/* 1. THANH TIẾN TRÌNH ỨNG TUYỂN (APPLICATION TRACKER) - ẢNH 1 */}
      <section className="iad-card">
        <div className="iad-card__head">
          <div>
            <h3 className="iad-card__title">Tiến Trình Xét Tuyển Hồ Sơ Của Bạn</h3>
            <p className="iad-card__desc">Cập nhật thời gian thực theo từng bước đánh giá của doanh nghiệp</p>
          </div>
        </div>

        <div className="iad-stepper">
          <div className="iad-stepper__connector">
            <div
              style={{
                width: isCandidateApproved
                  ? '100%'
                  : currentStep === 'interview'
                  ? '66%'
                  : currentStep === 'reviewing' || currentStep === 'rejected'
                  ? '33%'
                  : '0%',
                height: '100%',
                backgroundColor: currentStep === 'rejected' ? '#ef4444' : '#2563eb',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {STEPS.map((step, idx) => {
            const status = getStepStatus(step.id);
            return (
              <div
                key={step.id}
                className={`iad-step ${
                  status === 'completed'
                    ? 'iad-step--completed'
                    : status === 'rejected'
                    ? 'iad-step--rejected'
                    : status === 'active'
                    ? 'iad-step--active'
                    : ''
                }`}
              >
                <div className="iad-step__circle">
                  {status === 'completed' ? (
                    <CheckCircle2 size={20} />
                  ) : status === 'rejected' ? (
                    <X size={20} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <div className="iad-step__title">{step.label}</div>
                <div className="iad-step__desc">{step.desc}</div>
                <div className="iad-step__date">{step.date}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Banner thông báo kết quả khi bị từ chối */}
      {currentStep === 'rejected' && (
        <section
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.06)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileX size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '15.5px', fontWeight: 700, color: '#991B1B' }}>
              Kết Quả Xét Duyệt Hồ Sơ: Chưa tiếp nhận hồ sơ đợt này
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: '13.5px', color: '#7F1D1D', lineHeight: 1.6 }}>
              CV ứng tuyển của bạn hiện chưa đáp ứng đủ tiêu chuẩn tuyển dụng của doanh nghiệp trong đợt này. Bạn hãy dành thêm thời gian hoàn thiện kỹ năng và có thể nộp lại bản CV mới bất kỳ lúc nào!
            </p>
            {rejectReason && (
              <div
                style={{
                  fontSize: '13px',
                  color: '#991B1B',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  marginBottom: '12px',
                }}
              >
                <strong style={{ color: '#B91C1C' }}>Nhận xét từ Phòng Nhân sự (HR): </strong>
                {rejectReason}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="iad-btn iad-btn--primary"
                style={{
                  fontSize: '13px',
                  padding: '7px 16px',
                  background: '#DC2626',
                  borderColor: '#DC2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                <span>Nộp lại bản CV mới</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. KHU VỰC TẢI LÊN CV / HỒ SƠ ỨNG TUYỂN - ẢNH 1 */}
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

        {/* TRƯỜNG HỢP 1: Chưa chọn file và chưa nộp CV -> Dropzone ban đầu */}
        {!stagedFile && !cvFile && (
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
          </div>
        )}

        {/* TRƯỜNG HỢP 2: Đã chọn file nhưng CHƯA BẤM GỬI -> Khung div bọc file & nút Xem lại, Hủy bỏ, Gửi CV */}
        {stagedFile && (
          <div className="iad-staged-box">
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
            <div className="iad-staged-file-card">
              <div className="iad-staged-file-card__left">
                <div className="iad-file-badge">
                  {stagedFile.name.split('.').pop().toUpperCase()}
                </div>
                <div className="iad-file-meta">
                  <p>{stagedFile.name}</p>
                  <span>
                    {(stagedFile.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng gửi xét duyệt
                  </span>
                </div>
              </div>

              <div className="iad-staged-file-card__right">
                <button
                  type="button"
                  onClick={handlePreviewStagedFile}
                  className="iad-btn-preview"
                  title="Mở file để xem lại nội dung"
                >
                  <Eye size={15} />
                  <span>Xem lại</span>
                </button>
              </div>
            </div>

            {/* 2 Nút button bên ngoài khung */}
            <div className="iad-staged-actions">
              <button
                type="button"
                onClick={handleCancelStagedFile}
                disabled={isSubmitting}
                className="iad-btn-cancel-staged"
              >
                <RotateCcw size={15} />
                <span>Hủy bỏ</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitCv}
                disabled={isSubmitting}
                className="iad-btn-submit-cv"
              >
                {isSubmitting ? (
                  <>
                    <span className="iad-spinner-sm" />
                    <span>Đang gửi CV…</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Gửi CV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TRƯỜNG HỢP 3: Đã gửi CV chính thức thành công */}
        {!stagedFile && cvFile && (
          <div
            className="iad-submitted-box"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
            }}
          >
            <div className="iad-submitted-file-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div className="iad-submitted-file-card__left" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div
                  className="iad-file-badge iad-file-badge--success"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  {cvFile.name ? cvFile.name.split('.').pop().toUpperCase() : 'CV'}
                </div>
                <div className="iad-file-meta">
                  <p className="iad-file-meta__name" style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                    {cvFile.name || 'CV_UngTuyen.pdf'}
                  </p>
                  <span className="iad-file-meta__info" style={{ display: 'block', fontSize: '12.5px', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                    {((cvFile.size || 1500000) / 1024 / 1024).toFixed(2)} MB • Đã nộp vào{' '}
                    {cvSubmissionDate ? formatVnDate(cvSubmissionDate) : 'Hôm nay'}
                  </span>
                </div>
              </div>

              <div className="iad-submitted-file-card__right" style={{ display: 'flex', alignItems: 'center' }}>
                {currentStep === 'rejected' ? (
                  <div
                    className="iad-status-pill iad-status-pill--error"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <XCircle size={14} />
                    <span>Chưa đạt yêu cầu đợt này</span>
                  </div>
                ) : isCandidateApproved ? (
                  <div
                    className="iad-status-pill iad-status-pill--success"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Đã phê duyệt tiếp nhận</span>
                  </div>
                ) : (
                  <div
                    className="iad-status-pill iad-status-pill--pending"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Clock size={14} />
                    <span>Đã nộp - Chờ HR thẩm định</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cụm chức năng cho CV đã nộp */}
            <div
              className="iad-submitted-actions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingTop: '14px',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={handlePreviewSubmittedCv}
                className="iad-btn-action iad-btn-action--preview"
                title="Xem trực tiếp nội dung CV trong hệ thống"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 16px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  color: '#1d4ed8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Eye size={15} />
                <span>Xem lại</span>
              </button>

              <a
                href={cvFile.previewUrl || (cvFile.id ? getDocumentDownloadUrl(cvFile.id) : '#')}
                target="_blank"
                rel="noreferrer"
                download={cvFile.name}
                className="iad-btn-action iad-btn-action--download"
                title="Tải bản lưu trữ về máy tính cá nhân"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 16px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Download size={15} />
                <span>Tải xuống</span>
              </a>

              {isCandidateApproved && !isContractConfirmed && (pendingContract || currentStep === 'approved' || currentStep === 'onboarded') && (
                <button
                  type="button"
                  onClick={() => setShowContractModal(true)}
                  className="iad-btn-action"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#10b981',
                    border: '1.5px solid #059669',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Xem hợp đồng thực tập</span>
                </button>
              )}

              {currentStep === 'rejected' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="iad-btn-action"
                  title="Chọn file mới để gửi lại xét tuyển"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    color: '#2563eb',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Nộp lại bản CV mới</span>
                </button>
              )}

              {!isCandidateApproved && (
                <button
                  type="button"
                  onClick={handleDeleteSubmittedCv}
                  className="iad-btn-action iad-btn-action--delete"
                  title="Xóa file đã gửi để chọn và nộp lại CV khác"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '9px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    color: '#dc2626',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Trash2 size={15} />
                  <span>Xóa file</span>
                </button>
              )}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="iad-error-callout">
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}
      </section>

      {/* 3. MODAL XEM LẠI TÀI LIỆU TRỰC TIẾP (IN-APP PREVIEW, KHÔNG CẦN TẢI XUỐNG) */}
      {docPreviewModal.open && (
        <div
          className="iad-doc-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDocPreview();
          }}
        >
          <div className="iad-doc-modal iad-doc-modal-container">
            {/* Header */}
            <div className="iad-doc-modal-header">
              <div className="iad-doc-modal-header__left">
                <div className="iad-doc-modal-icon">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="iad-doc-modal-title">
                    Xem Lại Tài Liệu: <span>{docPreviewModal.fileName}</span>
                  </h3>
                  <span className="iad-doc-modal-sub">
                    Định dạng: {docPreviewModal.fileType ? docPreviewModal.fileType.toUpperCase() : 'TÀI LIỆU'} • Dung lượng: {(docPreviewModal.fileSize / 1024 / 1024).toFixed(2)} MB • Chế độ xem trực tuyến an toàn
                  </span>
                </div>
              </div>

              {/* Zoom Toolbar */}
              <div className="iad-doc-toolbar">
                <div className="iad-doc-zoom-controls">
                  <button
                    type="button"
                    className="iad-doc-zoom-btn"
                    onClick={() => setDocZoom((prev) => Math.max(60, prev - 15))}
                    title="Thu nhỏ (-)"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="iad-doc-zoom-text">{docZoom}%</span>
                  <button
                    type="button"
                    className="iad-doc-zoom-btn"
                    onClick={() => setDocZoom((prev) => Math.min(160, prev + 15))}
                    title="Phóng to (+)"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="iad-doc-zoom-btn iad-doc-zoom-btn--reset"
                    onClick={() => setDocZoom(100)}
                    title="Đặt lại 100%"
                  >
                    100%
                  </button>
                </div>

                <button
                  type="button"
                  className="iad-doc-modal-close"
                  onClick={handleCloseDocPreview}
                  title="Đóng cửa sổ xem lại"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="iad-doc-modal-body">
              {docPreviewModal.isLoading ? (
                <div className="iad-doc-loading">
                  <div className="iad-spinner" style={{ width: 36, height: 36 }} />
                  <p>Đang trích xuất và hiển thị nội dung tài liệu…</p>
                </div>
              ) : docPreviewModal.fileType === 'pdf' ? (
                <div className="iad-doc-pdf-container">
                  <iframe
                    src={docPreviewModal.url}
                    title="Xem trước PDF"
                    className="iad-doc-iframe"
                  />
                </div>
              ) : (
                /* Bản xem trước DOCX / DOC chuẩn A4 Paper View */
                <div className="iad-doc-paper-wrapper">
                  <div
                    className="iad-doc-paper"
                    style={{
                      zoom: docZoom !== 100 ? `${docZoom}%` : undefined,
                    }}
                  >
                    {/* Header giấy CV chuẩn */}
                    <div className="iad-paper-cv-header">
                      <div className="iad-paper-title-col">
                        <h2>{user?.full_name || 'ỨNG VIÊN THỰC TẬP SINH'}</h2>
                        <p className="iad-paper-sub-role">
                          Vị trí ứng tuyển: Frontend / Software Engineer Intern
                        </p>
                      </div>
                      <div className="iad-paper-meta-col">
                        <div><strong>Mã SV/Ứng viên:</strong> {user?.code || 'TTS2026-ICTU'}</div>
                        <div><strong>Email:</strong> {user?.email || 'ungvien@ictu.edu.vn'}</div>
                        <div><strong>Trường:</strong> ĐH Công nghệ Thông tin &amp; Truyền thông (ICTU)</div>
                        <div><strong>Tệp gốc:</strong> {docPreviewModal.fileName}</div>
                      </div>
                    </div>

                    <div className="iad-paper-divider" />

                    {/* Nội dung trích xuất từ file docx thực tế */}
                    {docPreviewModal.paragraphs && docPreviewModal.paragraphs.length > 0 ? (
                      <div className="iad-paper-extracted-content">
                        {docPreviewModal.paragraphs.map((pText, pIdx) => {
                          const trimmed = pText.trim();
                          if (!trimmed) return null;

                          // 1. Kiểm tra lựa chọn trắc nghiệm (A. B. C. D.)
                          const isOption = /^[A-Z]\.\s+/.test(trimmed);
                          if (isOption) {
                            const optionLabel = trimmed.slice(0, 2);
                            const optionContent = trimmed.slice(2).trim();
                            return (
                              <div key={pIdx} className="iad-paper-option">
                                <span className="iad-paper-option-label">{optionLabel}</span>
                                <span className="iad-paper-option-text">{optionContent}</span>
                              </div>
                            );
                          }

                          // 2. Kiểm tra câu hỏi / bài tập (Câu 1, Bài 2, etc.)
                          const isQuestion = /^(câu|bài|phần|chương|q)\s*\d+[:.]?/i.test(trimmed);
                          if (isQuestion) {
                            return (
                              <h4 key={pIdx} className="iad-paper-question">
                                {trimmed}
                              </h4>
                            );
                          }

                          // 3. Kiểm tra danh sách bullet point
                          const isBullet = /^[•\-*]\s*/.test(trimmed);
                          if (isBullet) {
                            return (
                              <div key={pIdx} className="iad-paper-bullet">
                                <span className="iad-paper-bullet-dot">•</span>
                                <span>{trimmed.replace(/^[•\-*]\s*/, '')}</span>
                              </div>
                            );
                          }

                          // 4. Kiểm tra tiêu đề mục chính (Sections in CV: MỤC TIÊU, HỌC VẤN, KỸ NĂNG, etc.)
                          const isSectionHeading =
                            /^(mục tiêu|học vấn|kỹ năng|dự án|kinh nghiệm|chứng chỉ|thông tin liên hệ|giới thiệu|hoạt động|nguyện vọng|sở thích)/i.test(trimmed) ||
                            (trimmed.length >= 6 && trimmed.length < 60 && trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ỹ]{3,}/.test(trimmed) && !/^\d/.test(trimmed));

                          if (isSectionHeading) {
                            return (
                              <h4 key={pIdx} className="iad-paper-heading">
                                {trimmed}
                              </h4>
                            );
                          }

                          // 5. Đoạn văn thông thường
                          return (
                            <p key={pIdx} className="iad-paper-paragraph">
                              {trimmed}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      /* Nội dung mặc định hồ sơ chuẩn nếu file word chưa có text */
                      <div className="iad-paper-default-cv">
                        <div className="iad-paper-section">
                          <h4>🎯 MỤC TIÊU NGHỀ NGHIỆP</h4>
                          <p>
                            Sinh viên chuyên ngành Công nghệ Thông tin (ICTU) định hướng trở thành Lập trình viên Frontend/Fullstack chuyên nghiệp. Mong muốn tham gia chương trình thực tập doanh nghiệp để trau dồi kiến thức thực chiến, rèn luyện kỹ năng làm việc nhóm Agile/Scrum và đóng góp vào các sản phẩm phần mềm chất lượng cao.
                          </p>
                        </div>

                        <div className="iad-paper-section">
                          <h4>🎓 HỌC VẤN &amp; NỀN TẢNG CHUYÊN MÔN</h4>
                          <p>
                            <strong>Trường Đại học Công nghệ Thông tin &amp; Truyền thông (ICTU)</strong><br />
                            Chuyên ngành: Kỹ thuật Phần mềm / Công nghệ Thông tin • Khóa 2022 - 2026<br />
                            Điểm GPA tích lũy: <strong style={{ color: '#2563eb' }}>3.45 / 4.0</strong> (Xếp loại: Giỏi)
                          </p>
                        </div>

                        <div className="iad-paper-section">
                          <h4>⚡ KỸ NĂNG CÔNG NGHỆ CHÍNH</h4>
                          <div className="iad-paper-tags">
                            <span className="iad-paper-tag">JavaScript (ES6+) / TypeScript</span>
                            <span className="iad-paper-tag">React.js / Redux Toolkit</span>
                            <span className="iad-paper-tag">HTML5 / CSS3 / Responsive UI</span>
                            <span className="iad-paper-tag">RESTful API / JSON</span>
                            <span className="iad-paper-tag">Git / GitHub / GitFlow</span>
                            <span className="iad-paper-tag">Scrum / Agile Teamwork</span>
                          </div>
                        </div>

                        <div className="iad-paper-section">
                          <h4>💼 DỰ ÁN &amp; KINH NGHIỆM THỰC HÀNH</h4>
                          <p>
                            <strong>Hệ thống Quản lý Thực tập Doanh nghiệp (ICTU Internship Management)</strong><br />
                            - Xây dựng giao diện ứng viên, thanh tiến trình xét tuyển theo thời gian thực và quản lý tài liệu CV số hóa.<br />
                            - Tích hợp API xác thực phân quyền RBAC và tối ưu hóa trải nghiệm người dùng trên thiết bị di động.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="iad-doc-modal-footer">
              <div className="iad-doc-modal-footer__right">
                <button
                  type="button"
                  className="iad-btn iad-btn--secondary"
                  onClick={handleCloseDocPreview}
                >
                  Đóng
                </button>
                {docPreviewModal.isStaged && (
                  <button
                    type="button"
                    className="iad-btn iad-btn--primary"
                    onClick={() => {
                      handleCloseDocPreview();
                      handleSubmitCv();
                    }}
                  >
                    <Send size={15} />
                    <span>Gửi CV ngay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL THÔNG BÁO & KÝ HỢP ĐỒNG LAO ĐỘNG (KHI HR DUYỆT & GỬI HỢP ĐỒNG) */}
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

      {/* 5. MODAL THÔNG BÁO TỪ CHỐI CV (KHI HR KHÔNG DUYỆT) */}
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
              <p style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                CV của bạn không đạt đủ yêu cầu, bạn hãy dành thêm thời gian để chuẩn bị lại CV cho lần tiếp theo nhé!
              </p>
            </div>

            <div className="iad-modal-footer" style={{ justifyContent: 'center', padding: '16px 20px' }}>
              <button
                type="button"
                onClick={handleCloseRejectModal}
                className="iad-btn iad-btn--secondary"
                style={{ minWidth: 120, justifyContent: 'center', padding: '10px 24px', fontSize: 14, fontWeight: 600 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
