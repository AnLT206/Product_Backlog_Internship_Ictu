import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Users,
  CheckSquare,
  FileText,
  Award,
  Plus,
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Send,
  Filter,
  Trash2,
  Edit3,
  Download,
  Briefcase,
} from 'lucide-react'
import {
  fetchMentorMentees,
  fetchMentorTasks,
  createMentorTask,
  updateMentorTaskStatus,
  deleteMentorTask,
  fetchMentorReports,
  gradeMentorReport,
  fetchMentorEvaluations,
  saveMentorEvaluation,
  fetchLeaveRequests,
} from '../../api/operations'
import {
  subscribeRealtimeEvents,
  emitRealtimeEvent,
  SYNC_EVENTS,
  getRealtimeSyncState,
} from '../../utils/realtimeSync'
import { getSavedAvatar } from '../../utils/avatarHelper'
import './MentorDashboardPage.css'

/** 5 Tiêu chí Rubric Đánh giá năng lực cuối kỳ sử dụng Thang điểm (Rating Scale 1 - 5) */
const EVAL_QUESTIONS = [
  {
    id: 'q1',
    category: 'Chuyên môn & Code Quality',
    title: '1. Kỹ năng chuyên môn & Chất lượng mã nguồn (Technical & Code Quality)',
    desc: 'Khả năng vận dụng công nghệ, cấu trúc mã nguồn sạch (Clean Code), hoàn thành các task Sprint được giao.',
  },
  {
    id: 'q2',
    category: 'Thái độ & Trách nhiệm',
    title: '2. Thái độ học hỏi & Tinh thần cầu thị (Learning Attitude & Ownership)',
    desc: 'Chủ động tiếp thu góp ý từ Mentor, kiên trì xử lý lỗi, có trách nhiệm cao với sản phẩm.',
  },
  {
    id: 'q3',
    category: 'Làm việc nhóm & Giao tiếp',
    title: '3. Kỹ năng làm việc nhóm & Giao tiếp (Teamwork & Communication)',
    desc: 'Phối hợp hiệu quả với đồng đội, trao đổi rõ ràng, tham gia đầy đủ các buổi Daily/Scrum đúng giờ.',
  },
  {
    id: 'q4',
    category: 'Kỷ luật & Tuân thủ',
    title: '4. Kỷ luật lao động, Chuyên cần & Tuân thủ nội quy (Discipline & Punctuality)',
    desc: 'Chấp hành nghiêm thời gian làm việc, chấm công đúng quy định, tuân thủ bảo mật thông tin nội bộ (NDA).',
  },
  {
    id: 'q5',
    category: 'Tư duy & Giải quyết vấn đề',
    title: '5. Khả năng tư duy độc lập & Giải quyết vấn đề (Problem Solving)',
    desc: 'Chủ động nghiên cứu tài liệu kỹ thuật, phân tích nguyên nhân gốc và đề xuất giải pháp trước khi hỏi Mentor.',
  },
]

const RATING_SCALES = [
  { value: 1, label: 'Kém', scoreStr: '2.0 đ' },
  { value: 2, label: 'Yếu', scoreStr: '4.0 đ' },
  { value: 3, label: 'Đạt yêu cầu', scoreStr: '6.0 đ' },
  { value: 4, label: 'Khá tốt', scoreStr: '8.0 đ' },
  { value: 5, label: 'Xuất sắc', scoreStr: '10 đ' },
]

/**
 * Đồng bộ nhiệm vụ mới được giao vào localStorage của Thực tập sinh
 */
function syncTaskToInternStorage(newTaskItem) {
  try {
    const raw = localStorage.getItem('intern_sprint1_tasks_v1')
    let currentTasks = []
    if (raw) {
      try {
        currentTasks = JSON.parse(raw)
      } catch {}
    }
    const internTaskObj = {
      id: newTaskItem.id || Date.now(),
      title: newTaskItem.title,
      description: newTaskItem.description,
      due_at: newTaskItem.due_at,
      priority: newTaskItem.priority,
      status: newTaskItem.status || 'doing',
      progress: newTaskItem.progress || 0,
      tags: ['Sprint 1', 'Mentor giao'],
      note: `Giao bởi Mentor. Hạn chót: ${newTaskItem.due_at}`,
      subtasks: [
        { id: `st-${Date.now()}-1`, text: 'Đọc kỹ mô tả & yêu cầu Definition of Done', completed: false },
        { id: `st-${Date.now()}-2`, text: 'Triển khai kỹ thuật & hoàn thiện tính năng', completed: false },
        { id: `st-${Date.now()}-3`, text: 'Tạo Pull Request & gửi Mentor nghiệm thu', completed: false },
      ],
    }
    const updated = [internTaskObj, ...currentTasks.filter((t) => t.id !== internTaskObj.id)]
    localStorage.setItem('intern_sprint1_tasks_v1', JSON.stringify(updated))
    window.dispatchEvent(new Event('storage'))
  } catch (err) {
    console.warn('Sync task to intern storage failed:', err)
  }
}

/**
 * Đồng bộ trạng thái nghiệm thu nhiệm vụ sang Thực tập sinh
 */
function syncTaskStatusToInternStorage(taskId, status, progress) {
  try {
    const raw = localStorage.getItem('intern_sprint1_tasks_v1')
    if (raw) {
      const currentTasks = JSON.parse(raw)
      const updated = currentTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: status === 'done' ? 'done' : t.status,
            progress: progress !== undefined ? progress : t.progress,
            subtasks: status === 'done' ? (t.subtasks || []).map((st) => ({ ...st, completed: true })) : t.subtasks,
          }
        }
        return t
      })
      localStorage.setItem('intern_sprint1_tasks_v1', JSON.stringify(updated))
      window.dispatchEvent(new Event('storage'))
    }
  } catch {}
}

/**
 * Đồng bộ phản hồi nhận xét báo cáo tuần sang Thực tập sinh
 */
function syncReportFeedbackToInternStorage(reportId, score, feedback) {
  try {
    const raw = localStorage.getItem('intern_report_history')
    if (raw) {
      const currentReports = JSON.parse(raw)
      if (Array.isArray(currentReports)) {
        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
        const updated = currentReports.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              feedback,
              mentor_feedback: feedback,
              score,
              status: 'Đã duyệt',
              reviewed_at: nowStr,
            }
          }
          return r
        })
        localStorage.setItem('intern_report_history', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new CustomEvent('intern_data_changed'))
      }
    }
  } catch {}
}

export default function MentorDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // 5 Tabs trọng tâm: mentees, tasks, reports, evaluations, leave
  const [activeTab, setActiveTab] = useState('mentees') // 'mentees' | 'tasks' | 'reports' | 'evaluations' | 'leave'
  const [toast, setToast] = useState(null)

  // ── Danh sách Mentees do Mentor phụ trách (Đồng bộ chuẩn xác từ HR gồm TTS0001 & TTS0002) ──
  const [mentees, setMentees] = useState([
    {
      id: 5,
      code: 'TTS0001',
      full_name: 'TTS',
      email: 'intern@ictu.edu.vn',
      phone: '0987 654 321',
      major: 'Công nghệ thông tin',
      gpa: 3.65,
      lab: 'R&D Software Engineering',
      attendance_rate: '98%',
    },
    {
      id: 6,
      code: 'TTS0002',
      full_name: 'Lê Hoàng Nam',
      email: 'tts02@student.ictu.edu.vn',
      phone: '0912 888 999',
      major: 'Kỹ thuật phần mềm',
      gpa: 3.52,
      lab: 'R&D Software Engineering',
      attendance_rate: '96%',
    },
  ])

  // ── Đơn xin nghỉ phép của TTS (Đồng bộ thời gian thực từ HR & TTS) ──
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('all')

  // ── Chức năng 1: Tasks state & Filters ──
  const [tasks, setTasks] = useState([
    {
      id: 101,
      title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
      description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
      intern_id: 5,
      intern_name: 'TTS (TTS0001)',
      due_at: '2026-10-02',
      priority: 'high',
      status: 'doing',
      progress: 70,
    },
    {
      id: 103,
      title: 'Nghiên cứu tài liệu Software Specification v2.1',
      description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
      intern_id: 5,
      intern_name: 'TTS (TTS0001)',
      due_at: '2026-09-24',
      priority: 'medium',
      status: 'done',
      progress: 100,
    },
  ])
  const [taskFilterIntern, setTaskFilterIntern] = useState('all')
  const [taskFilterStatus, setTaskFilterStatus] = useState('all')

  // Form tạo Task mới (Chức năng 1)
  const [taskModal, setTaskModal] = useState(false)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    intern_id: 5,
    title: '',
    description: '',
    due_at: '2026-10-15',
    priority: 'medium',
  })
  const [taskErrors, setTaskErrors] = useState({})

  // ── Chức năng 2: Reports state & Filters ──
  const [reports, setReports] = useState([
    {
      id: 201,
      intern_id: 5,
      intern_name: 'TTS (TTS0001)',
      intern_major: 'K20 - Công nghệ Thông tin',
      week_range: 'Tuần 08 (21/09 - 27/09/2026)',
      submitted_at: '27/09/2026 17:30',
      summary: 'Đã hoàn thành module đăng nhập auth, tích hợp JWT token và xử lý phân quyền theo role admin/hr/mentor/intern.',
      issues: 'Cần hướng dẫn thêm về cơ chế refresh token khi hết hạn phiên làm việc.',
      plan: 'Xây dựng giao diện form tiếp nhận ứng viên cho phòng HR và viết API kiểm thử pytest.',
      feedback: '',
      mentor_feedback: '',
      score: null,
      status: 'pending', // 'pending' = Chưa đọc / Chờ duyệt, 'reviewed' = Đã phản hồi
      file_name: 'BaoCaoTuan08_TTS.docx',
      file_size: '1.4 MB',
    },
  ])
  const [reportFilterStatus, setReportFilterStatus] = useState('all') // 'all' | 'pending' | 'reviewed'
  const [reportFilterIntern, setReportFilterIntern] = useState('all')

  // Modal Chi tiết báo cáo & Viết phản hồi (Chức năng 2)
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    report: null,
    text: '',
    score: 9.0,
  })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // ── Chức năng 3: Evaluations state & Rating Scale Form ──
  const [evaluationsByIntern, setEvaluationsByIntern] = useState({
    5: {
      intern_id: 5,
      intern_name: 'TTS (TTS0001)',
      q1: 4,
      q2: 5,
      q3: 5,
      q4: 5,
      q5: 4,
      strength: 'Tư duy lập trình tốt, chủ động học hỏi Docker & FastAPI. Hoàn thành các task Sprint đúng hạn và có tinh thần trách nhiệm cao.',
      improvement: 'Cần nâng cao thêm kỹ năng viết Unit Test tự động (Pytest) và tối ưu hóa câu truy vấn CSDL.',
      recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
      evaluated_at: '28/09/2026',
      status: 'evaluated',
    },
  })

  // Modal Đánh giá năng lực cuối kỳ với Thang điểm Rating Scale (Chức năng 3)
  const [evalModal, setEvalModal] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)
  const [evalForm, setEvalForm] = useState({
    intern_id: 5,
    q1: 4,
    q2: 5,
    q3: 5,
    q4: 5,
    q5: 4,
    strength: '',
    improvement: '',
    recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
  })
  const [evalErrors, setEvalErrors] = useState({})

  // Chat/Feedback nhanh modal
  const [chatModal, setChatModal] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatTargetIntern, setChatTargetIntern] = useState(null)

  // Sync hash với tab
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (['mentees', 'tasks', 'reports', 'evaluations', 'leave'].includes(hash)) {
      setActiveTab(hash)
    } else if (!hash) {
      setActiveTab('mentees')
    }
  }, [location.hash])

  function handleTabChange(tabKey) {
    setActiveTab(tabKey)
    if (tabKey === 'mentees') {
      navigate('/mentor/dashboard', { replace: true })
    } else {
      navigate(`/mentor/dashboard#${tabKey}`, { replace: true })
    }
  }

  // Khóa scroll body và xử lý phím ESC khi mở bất kỳ modal nào
  useEffect(() => {
    const isAnyModalOpen = taskModal || feedbackModal.open || evalModal || chatModal
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (taskModal) setTaskModal(false)
          if (feedbackModal.open) setFeedbackModal({ open: false, report: null, text: '', score: 9.0 })
          if (evalModal) setEvalModal(false)
          if (chatModal) setChatModal(false)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = prevOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [taskModal, feedbackModal.open, evalModal, chatModal])

  // Load và đồng bộ dữ liệu đa phân hệ
  useEffect(() => {
    async function loadAllData() {
      try {
        const [menteesRes, taskRes, repRes, evalRes] = await Promise.all([
          fetchMentorMentees(),
          fetchMentorTasks(),
          fetchMentorReports(),
          fetchMentorEvaluations(),
        ])

        // 1. Phân bổ Mentees theo phân công thực tế từ HR (Backend CSDL & Realtime Sync)
        if (menteesRes.ok && Array.isArray(menteesRes.data) && menteesRes.data.length > 0) {
          const mappedMentees = menteesRes.data.map((m) => ({
            id: m.id,
            code: m.code || `TTS000${m.id}`,
            full_name: m.full_name || 'Thực tập sinh',
            email: m.email || 'intern@ictu.edu.vn',
            avatar: m.avatar || getSavedAvatar(m.email, m.id, m.full_name),
            phone: m.phone || '0912 345 678',
            major: m.major || 'Công nghệ thông tin',
            gpa: Number(m.gpa || 3.5),
            lab: m.program_name || 'R&D Software Engineering',
            attendance_rate: '98%',
          }))
          setMentees(mappedMentees)
        } else {
          const syncState = getRealtimeSyncState()
          const myAssignments = (syncState.mentorAssignments || []).filter(
            (m) => m.mentor_id === 3 || m.mentor === 'Mentor'
          )
          if (myAssignments.length > 0) {
            const mapped = myAssignments.map((a) => {
              const appObj = (syncState.applicants || []).find((ap) => ap.id === a.intern_id)
              const email = appObj?.email || 'intern@ictu.edu.vn'
              return {
                id: a.intern_id,
                code: appObj?.student_code || a.student_code?.split(' ')[0] || `TTS000${a.intern_id}`,
                full_name: appObj?.full_name || a.student || `TTS #${a.intern_id}`,
                email,
                avatar: appObj?.avatar || getSavedAvatar(email, a.intern_id, appObj?.full_name || a.student),
                phone: appObj?.phone || '0912 345 678',
                major: appObj?.major || 'Công nghệ thông tin',
                gpa: Number(appObj?.gpa || 3.65),
                lab: a.project || 'R&D Software Engineering',
                attendance_rate: '98%',
              }
            })
            const unique = []
            const seen = new Set()
            mapped.forEach((item) => {
              const key = item.code || item.email || item.full_name
              if (!seen.has(key)) {
                seen.add(key)
                unique.push(item)
              }
            })
            setMentees(unique)
          }
        }

        // 2. Nhiệm vụ Tasks: Kết hợp API CSDL và intern_sprint1_tasks_v1 từ TTS
        let loadedTasks = []
        if (taskRes.ok && Array.isArray(taskRes.data) && taskRes.data.length > 0) {
          loadedTasks = [...taskRes.data]
        }
        try {
          const rawTasks = localStorage.getItem('intern_sprint1_tasks_v1')
          if (rawTasks) {
            const localTasks = JSON.parse(rawTasks)
            if (Array.isArray(localTasks) && localTasks.length > 0) {
              localTasks.forEach((lt) => {
                const existing = loadedTasks.find((t) => t.id === lt.id || t.title === lt.title)
                if (existing) {
                  existing.progress = lt.progress !== undefined ? lt.progress : existing.progress
                  existing.status = lt.status || existing.status
                } else {
                  loadedTasks.push({
                    id: lt.id,
                    title: lt.title,
                    description: lt.description || '',
                    intern_id: 5,
                    intern_name: 'TTS (TTS0001)',
                    due_at: lt.due_at || '2026-10-15',
                    priority: lt.priority || 'medium',
                    status: lt.status || 'doing',
                    progress: lt.progress || 0,
                  })
                }
              })
            }
          }
        } catch {}

        if (loadedTasks.length > 0) {
          setTasks(loadedTasks)
        }

        // 3. Báo cáo tuần: Kết hợp API và dữ liệu thực từ trang Thực tập sinh (intern_report_history)
        let mergedReports = []
        if (repRes.ok && Array.isArray(repRes.data)) {
          mergedReports = repRes.data.map((r) => ({
            ...r,
            intern_name: r.intern_name || 'TTS (TTS0001)',
            week_range: r.week_title || r.week_range || `Báo cáo Tuần ${r.id}`,
            summary: r.tasks_done || r.summary || 'Đang cập nhật',
            plan: r.plan || 'Tiếp tục hoàn thiện các task Sprint theo phân công',
            file_name: r.file_name || 'BaoCaoTuan.docx',
            file_size: '1.4 MB',
            status: (r.status === 'reviewed' || r.status === 'graded' || r.mentor_feedback) ? 'reviewed' : 'pending',
          }))
        }

        // Đọc thêm báo cáo nộp thực từ intern_report_history
        try {
          const raw = localStorage.getItem('intern_report_history')
          if (raw) {
            const localReps = JSON.parse(raw)
            if (Array.isArray(localReps)) {
              localReps.forEach((lr, idx) => {
                const repId = lr.id || (idx + 300)
                const exists = mergedReports.some((mr) => mr.id === repId)
                if (!exists) {
                  mergedReports.push({
                    id: repId,
                    intern_id: lr.intern_id || 5,
                    intern_name: lr.intern_name || 'TTS (TTS0001)',
                    intern_major: lr.intern_major || 'Công nghệ Thông tin',
                    week_range: lr.week || lr.week_range || (lr.report_time ? `Báo cáo ngày ${lr.report_time}` : `Báo cáo Tuần ${idx + 1}`),
                    submitted_at: lr.report_time || lr.submitted_at || lr.submittedDate || '28/09/2026 16:45',
                    summary: lr.summary || lr.contentSummary || lr.content || lr.task_name || 'Đã hoàn thành các nhiệm vụ tuần.',
                    issues: lr.issues || 'Không có khó khăn lớn.',
                    plan: lr.plan || 'Tiếp tục hoàn thiện các nhiệm vụ theo kế hoạch.',
                    mentor_feedback: lr.feedback || lr.mentor_feedback || '',
                    feedback: lr.feedback || lr.mentor_feedback || '',
                    score: lr.score || (lr.status === 'Đã duyệt' ? 9.0 : null),
                    status: (lr.status === 'Đã duyệt' || lr.status === 'reviewed' || lr.feedback) ? 'reviewed' : 'pending',
                    file_name: lr.fileName || lr.file_name || 'BaoCaoTuan.docx',
                    file_size: lr.fileSize || lr.file_size || '1.4 MB',
                  })
                }
              })
            }
          }
        } catch {}

        if (mergedReports.length > 0) {
          setReports(mergedReports)
        }

        // 4. Bảng điểm đánh giá
        if (evalRes.ok && Array.isArray(evalRes.data) && evalRes.data.length > 0) {
          const map = {}
          evalRes.data.forEach((e) => {
            map[e.intern_id] = {
              intern_id: e.intern_id,
              intern_name: e.name,
              q1: 4,
              q2: 5,
              q3: 5,
              q4: 5,
              q5: 4,
              strength: e.mentor_note?.split('|')[0]?.replace('[Ưu điểm]:', '').trim() || 'Thái độ tốt, tiếp thu nhanh.',
              improvement: e.mentor_note?.split('|')[1]?.replace('[Cần cải thiện]:', '').trim() || 'Rèn luyện thêm tư duy giải thuật.',
              recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
              evaluated_at: 'Gần đây',
              finalScore: e.final_score,
              letterGrade: e.letter_grade,
              status: 'evaluated',
            }
          })
          setEvaluationsByIntern((prev) => ({ ...prev, ...map }))
        }

        // 5. Đơn xin nghỉ phép của TTS (Đồng bộ từ CSDL / localStorage)
        let loadedLeaves = []
        try {
          const leaveRes = await fetchLeaveRequests()
          if (leaveRes.ok && Array.isArray(leaveRes.data) && leaveRes.data.length > 0) {
            loadedLeaves = leaveRes.data
          }
        } catch {}
        if (loadedLeaves.length === 0) {
          try {
            const rawLeaves = localStorage.getItem('intern_leave_requests_v1')
            if (rawLeaves) {
              const parsed = JSON.parse(rawLeaves)
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedLeaves = parsed
              }
            }
          } catch {}
        }
        setLeaveRequests(loadedLeaves)
      } catch (err) {
        console.warn('Lỗi khi tải dữ liệu mentor dashboard:', err)
      }
    }

    loadAllData()

    // Đồng bộ thời gian thực từ phân hệ HR và TTS
    const unsubscribeSync = subscribeRealtimeEvents((event) => {
      if (event.type === SYNC_EVENTS.MENTOR_ASSIGNED) {
        // HR vừa phân công TTS mới cho Mentor
        loadAllData()
        showToast('HR vừa phân bổ thực tập sinh mới vào dự án của bạn theo thời gian thực!')
      } else if (
        event.type === 'SYNC_LEAVE_STATUS_CHANGED' ||
        event.type === SYNC_EVENTS.LEAVE_REQUEST_SUBMITTED ||
        event.type === 'SYNC_LEAVE_REQUEST_SUBMITTED'
      ) {
        // Đồng bộ tức thì đơn xin nghỉ phép của TTS
        loadAllData()
      } else if (event.type === SYNC_EVENTS.APPLICANT_UPDATED) {
        const updateData = event.payload?.updateData
        if (updateData) {
          setMentees((prev) =>
            prev.map((m) =>
              m.id === updateData.id || (updateData.email && m.email?.toLowerCase() === updateData.email.toLowerCase())
                ? {
                    ...m,
                    avatar: updateData.avatar || m.avatar || getSavedAvatar(m.email, m.id, m.full_name),
                    full_name: updateData.full_name || m.full_name,
                    phone: updateData.phone || m.phone,
                  }
                : m
            )
          )
        }
      }
    })

    const handleDataChanged = () => {
      loadAllData()
    }
    window.addEventListener('storage', handleDataChanged)
    window.addEventListener('intern_data_sync_event', handleDataChanged)
    window.addEventListener('intern_data_changed', handleDataChanged)
    window.addEventListener('ictu_profile_updated', handleDataChanged)
    window.addEventListener('ictu_avatar_changed', handleDataChanged)

    return () => {
      unsubscribeSync()
      window.removeEventListener('storage', handleDataChanged)
      window.removeEventListener('intern_data_sync_event', handleDataChanged)
      window.removeEventListener('intern_data_changed', handleDataChanged)
      window.removeEventListener('ictu_profile_updated', handleDataChanged)
      window.removeEventListener('ictu_avatar_changed', handleDataChanged)
    }
  }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHỨC NĂNG 1: FORM TẠO TASK & XỬ LÝ SUBMIT GỌI API (SCRUM-121)
  // ─────────────────────────────────────────────────────────────────────────────
  function handleOpenCreateTaskModal(preferredInternId = null) {
    setTaskErrors({})
    const defaultInternId = preferredInternId || mentees[0]?.id || 5
    setNewTask({
      intern_id: defaultInternId,
      title: '',
      description: '',
      due_at: '2026-10-15',
      priority: 'medium',
    })
    setTaskModal(true)
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    const errors = {}

    if (!newTask.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề nhiệm vụ.'
    }
    if (!newTask.due_at) {
      errors.due_at = 'Vui lòng chọn hạn chót hoàn thành.'
    }
    if (!newTask.intern_id) {
      errors.intern_id = 'Vui lòng chọn thực tập sinh phụ trách.'
    } else {
      // QA Check: Đảm bảo Mentor chỉ có thể giao việc cho TTS thuộc quyền quản lý của mình
      const isManaged = mentees.some((m) => m.id === Number(newTask.intern_id))
      if (!isManaged) {
        errors.intern_id = 'Bạn chỉ có quyền giao nhiệm vụ cho thực tập sinh do bạn trực tiếp phụ trách.'
      }
    }

    setTaskErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmittingTask(true)
    const assignedIntern = mentees.find((m) => m.id === Number(newTask.intern_id)) || mentees[0]
    const internName = assignedIntern ? `${assignedIntern.full_name} (${assignedIntern.code})` : 'Thực tập sinh'

    try {
      const res = await createMentorTask({
        intern_id: Number(newTask.intern_id),
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        due_at: newTask.due_at,
        priority: newTask.priority,
        status: 'doing',
        progress: 0,
      })

      if (res.ok && res.data) {
        const created = res.data
        setTasks([created, ...tasks])
        // Tự động gán và đồng bộ sang tài khoản của Intern
        syncTaskToInternStorage(created)
        setTaskModal(false)
        showToast(`Đã giao nhiệm vụ mới thành công cho ${internName}!`)
        return
      }
    } catch {
      // offline fallback
    } finally {
      setIsSubmittingTask(false)
    }

    const localTask = {
      id: Date.now(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      intern_id: Number(newTask.intern_id),
      intern_name: internName,
      due_at: newTask.due_at,
      priority: newTask.priority,
      status: 'doing',
      progress: 0,
    }
    setTasks([localTask, ...tasks])
    // Tự động gán và đồng bộ sang tài khoản của Intern
    syncTaskToInternStorage(localTask)
    setTaskModal(false)
    showToast(`Đã giao nhiệm vụ mới thành công cho ${internName}!`)
  }

  // Nghiệm thu hoàn thành nhiệm vụ
  async function handleVerifyTask(task) {
    try {
      await updateMentorTaskStatus(task.id, 'done', 100)
    } catch {}
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: 'done', progress: 100 } : t)))
    syncTaskStatusToInternStorage(task.id, 'done', 100)
    showToast(`Đã nghiệm thu hoàn thành nhiệm vụ "${task.title}"!`)
  }

  // Xóa nhiệm vụ
  async function handleDeleteTask(task) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ "${task.title}"?`)) return
    try {
      await deleteMentorTask(task.id)
    } catch {}
    setTasks(tasks.filter((t) => t.id !== task.id))
    showToast(`Đã xóa nhiệm vụ "${task.title}".`, 'info')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHỨC NĂNG 2: XEM BÁO CÁO VÀ GỬI PHẢN HỒI (SCRUM-122, SCRUM-123)
  // ─────────────────────────────────────────────────────────────────────────────
  function handleOpenReportDetail(report) {
    setFeedbackModal({
      open: true,
      report,
      text: report.mentor_feedback || report.feedback || '',
      score: report.score || 9.0,
    })
  }

  async function handleSaveFeedback(e) {
    if (e) e.preventDefault()
    if (!feedbackModal.text.trim()) {
      alert('Vui lòng nhập nội dung nhận xét & hướng dẫn phản hồi cho sinh viên.')
      return
    }

    setIsSubmittingFeedback(true)
    const reportId = feedbackModal.report.id
    const internName = feedbackModal.report.intern_name

    try {
      await gradeMentorReport(reportId, Number(feedbackModal.score), feedbackModal.text.trim())
    } catch {
      // offline fallback
    } finally {
      setIsSubmittingFeedback(false)
    }

    const nowTimeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')

    const nextReports = reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            mentor_feedback: feedbackModal.text.trim(),
            feedback: feedbackModal.text.trim(),
            status: 'reviewed',
            score: Number(feedbackModal.score),
            reviewed_at: nowTimeStr,
          }
        : r
    )
    setReports(nextReports)

    // Đồng bộ tức thời kết quả chấm điểm sang tài khoản của Intern
    syncReportFeedbackToInternStorage(reportId, Number(feedbackModal.score), feedbackModal.text.trim())

    emitRealtimeEvent(SYNC_EVENTS.MENTOR_EVALUATED, {
      reportId,
      internName,
      score: Number(feedbackModal.score),
      feedback: feedbackModal.text.trim(),
      reviewed_at: nowTimeStr,
      type: 'report_graded',
    })

    setFeedbackModal({ open: false, report: null, text: '', score: 9.0 })

    const remainingPending = nextReports.filter(
      (r) => r.status === 'pending' || !r.mentor_feedback
    ).length

    if (remainingPending === 0) {
      showToast(`Hiện tại đã hết báo cáo tuần để duyệt (Đã gửi phản hồi cho ${internName})`)
    } else {
      showToast(`Đã gửi phản hồi nhận xét báo cáo tuần thành công cho ${internName}!`)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHỨC NĂNG 3: ĐÁNH GIÁ NĂNG LỰC CUỐI KỲ VỚI RATING SCALE (EVALUATIONS)
  // ─────────────────────────────────────────────────────────────────────────────
  function calculateLiveScores(formData, menteeId = null) {
    const { q1 = 3, q2 = 3, q3 = 3, q4 = 3, q5 = 3 } = formData
    const techAvg = Number(((q1 * 0.6 + q5 * 0.4) * 2).toFixed(1))
    const attitudeAvg = Number(((q2 * 0.4 + q3 * 0.3 + q4 * 0.3) * 2).toFixed(1))
    const rubricBase = Number(((q1 + q2 + q3 + q4 + q5) / 5 * 2).toFixed(1))

    // Tính điểm trung bình các lần mentor chấm báo cáo tuần cho TTS này
    const targetInternId = menteeId || formData.intern_id
    const targetMentee = mentees.find((m) => m.id === targetInternId)
    const targetName = targetMentee?.full_name

    const internReports = reports.filter(
      (r) =>
        (Number(r.intern_id) === Number(targetInternId) ||
          (targetName && r.intern_name === targetName) ||
          (targetInternId === 5 && (!r.intern_id || r.intern_id === 5))) &&
        r.score !== null &&
        r.score !== undefined &&
        !isNaN(Number(r.score))
    )

    const gradedReportsCount = internReports.length
    let reportAvg = null
    let finalScore = rubricBase

    if (gradedReportsCount > 0) {
      const sum = internReports.reduce((acc, r) => acc + Number(r.score), 0)
      reportAvg = Number((sum / gradedReportsCount).toFixed(1))
      // Tổng điểm cuối kỳ kết hợp: 30% Điểm báo cáo tuần + 70% Điểm đánh giá năng lực Rubric
      finalScore = Number((reportAvg * 0.3 + rubricBase * 0.7).toFixed(1))
    }

    const gpa4 = Number(((finalScore / 10) * 4).toFixed(2))

    let letterGrade;
    let gradeBadge;
    if (finalScore >= 9.0) {
      letterGrade = 'Xuất sắc (A+)'
      gradeBadge = 'success'
    } else if (finalScore >= 8.5) {
      letterGrade = 'Giỏi (A)'
      gradeBadge = 'success'
    } else if (finalScore >= 8.0) {
      letterGrade = 'Giỏi (A-)'
      gradeBadge = 'success'
    } else if (finalScore >= 7.0) {
      letterGrade = 'Khá (B+)'
      gradeBadge = 'primary'
    } else if (finalScore >= 6.0) {
      letterGrade = 'Khá (B)'
      gradeBadge = 'primary'
    } else if (finalScore >= 5.0) {
      letterGrade = 'Trung bình (C)'
      gradeBadge = 'warning'
    } else {
      letterGrade = 'Chưa đạt (D)'
      gradeBadge = 'danger'
    }

    return {
      techAvg,
      attitudeAvg,
      rubricBase,
      reportAvg,
      gradedReportsCount,
      finalScore,
      gpa4,
      letterGrade,
      gradeBadge,
    }
  }

  function handleOpenEvalModal(targetInternId = null) {
    const internId = targetInternId || mentees[0]?.id || 5
    const existing = evaluationsByIntern[internId]
    setEvalErrors({})

    if (existing) {
      setEvalForm({
        intern_id: internId,
        q1: existing.q1 || 4,
        q2: existing.q2 || 5,
        q3: existing.q3 || 5,
        q4: existing.q4 || 5,
        q5: existing.q5 || 4,
        strength: existing.strength || '',
        improvement: existing.improvement || '',
        recommendation: existing.recommendation || 'Tuyển dụng chính thức (Khuyên khích)',
      })
    } else {
      setEvalForm({
        intern_id: internId,
        q1: 4,
        q2: 5,
        q3: 5,
        q4: 5,
        q5: 4,
        strength: '',
        improvement: '',
        recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
      })
    }
    setEvalModal(true)
  }

  function handleSelectInternToEval(internId) {
    const existing = evaluationsByIntern[internId]
    if (existing) {
      setEvalForm({
        intern_id: internId,
        q1: existing.q1 || 4,
        q2: existing.q2 || 5,
        q3: existing.q3 || 5,
        q4: existing.q4 || 5,
        q5: existing.q5 || 4,
        strength: existing.strength || '',
        improvement: existing.improvement || '',
        recommendation: existing.recommendation || 'Tuyển dụng chính thức (Khuyên khích)',
      })
    } else {
      setEvalForm((prev) => ({
        ...prev,
        intern_id: internId,
      }))
    }
  }

  async function handleSaveEvaluation(e) {
    e.preventDefault()
    if (isSubmittingEval) return // Chặn mentor bấm nhiều lần liên tiếp

    const errors = {}
    if (!evalForm.strength.trim()) {
      errors.strength = 'Vui lòng ghi nhận xét về ưu điểm nổi bật của thực tập sinh.'
    } else if (evalForm.strength.trim().length < 10) {
      errors.strength = 'Nhận xét ưu điểm cần chi tiết tối thiểu 10 ký tự.'
    }

    if (!evalForm.improvement.trim()) {
      errors.improvement = 'Vui lòng ghi điểm cần cải thiện hoặc định hướng phát triển.'
    }

    setEvalErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmittingEval(true)
    const { techAvg, attitudeAvg, finalScore, letterGrade } = calculateLiveScores(evalForm)
    const internObj = mentees.find((m) => m.id === Number(evalForm.intern_id)) || mentees[0]
    const internName = internObj ? `${internObj.full_name} (${internObj.code})` : 'TTS'

    try {
      await saveMentorEvaluation({
        intern_id: Number(evalForm.intern_id),
        attendance_score: attitudeAvg,
        tech_score: techAvg,
        report_score: 9.0,
        final_score: finalScore,
        letter_grade: letterGrade,
        mentor_note: `[Ưu điểm]: ${evalForm.strength} | [Cần cải thiện]: ${evalForm.improvement}`,
        status: 'verified',
      })
    } catch {
      // offline fallback
    } finally {
      setIsSubmittingEval(false)
    }

    const todayStr = new Date().toLocaleDateString('vi-VN')
    const updatedEvalItem = {
      ...evalForm,
      intern_name: internName,
      techScore: techAvg,
      attitudeScore: attitudeAvg,
      finalScore,
      letterGrade,
      evaluated_at: todayStr,
      status: 'evaluated',
    }
    // Cập nhật/ghi đè bản ghi đánh giá cho intern (chặn đúp 2 lần) và lưu vào localStorage cho HR
    setEvaluationsByIntern((prev) => {
      const next = {
        ...prev,
        [evalForm.intern_id]: updatedEvalItem,
      }
      try {
        localStorage.setItem('intern_evaluations', JSON.stringify(next))
      } catch {}
      return next
    })

    setEvalModal(false)
    emitRealtimeEvent(SYNC_EVENTS.MENTOR_EVALUATED, {
      internId: evalForm.intern_id,
      internName,
      q4: evalForm.q4,
      finalScore,
      letterGrade,
      type: 'evaluation_completed',
    })
    showToast(`Đã lưu bảng đánh giá năng lực cuối kỳ thành công cho ${internName}! Dữ liệu đã chuyển tới HR & Nhà trường.`)
  }

  // Nhắn tin góp ý kỹ thuật nhanh
  function handleOpenChatModal(intern) {
    setChatTargetIntern(intern)
    setChatMessage('')
    setChatModal(true)
  }

  function handleSendMessage(e) {
    e.preventDefault()
    if (!chatMessage.trim()) return
    const targetName = chatTargetIntern ? chatTargetIntern.full_name : 'TTS'
    showToast(`Đã gửi góp ý kỹ thuật tới sinh viên ${targetName}: "${chatMessage}"`)
    setChatMessage('')
    setChatModal(false)
  }

  // Đếm số lượng báo cáo chưa đọc
  const unreadReportsCount = reports.filter((r) => r.status === 'pending' || !r.mentor_feedback).length

  // Bộ lọc danh sách Tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskFilterIntern !== 'all' && t.intern_id !== Number(taskFilterIntern)) return false
    if (taskFilterStatus !== 'all' && t.status !== taskFilterStatus) return false
    return true
  })

  // Bộ lọc danh sách Reports
  const filteredReports = reports.filter((r) => {
    if (reportFilterIntern !== 'all' && r.intern_id !== Number(reportFilterIntern)) return false
    if (reportFilterStatus === 'pending' && r.status !== 'pending' && r.mentor_feedback) return false
    if (reportFilterStatus === 'reviewed' && (r.status !== 'reviewed' || !r.mentor_feedback)) return false
    return true
  })

  // Lọc danh sách đơn xin nghỉ phép của TTS theo trạng thái
  const filteredMentorLeaves = useMemo(() => {
    let list = leaveRequests
    if (leaveFilterStatus !== 'all') {
      list = list.filter((r) => r.status === leaveFilterStatus)
    }
    return list
  }, [leaveRequests, leaveFilterStatus])

  // Tính điểm tạm thời real-time cho modal đánh giá
  const liveScores = calculateLiveScores(evalForm, evalForm.intern_id)
  const isEditingExistingEval = Boolean(evaluationsByIntern[evalForm.intern_id])

  return (
    <div className="mentor-portal-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`portal-toast portal-toast--${toast.type}`} role="alert">
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER MENTOR ── */}
      <section className="mentor-hero-header">
        <div className="mentor-hero-content">
          <h1>Bảng điều hành Hướng dẫn Chuyên môn 👋</h1>
          <p className="mentor-role-desc">
            Tập trung vào 3 nhiệm vụ chính: Phân công nhiệm vụ cụ thể, duyệt &amp; phản hồi báo cáo tuần, và đánh giá năng lực tổng kết cuối kỳ theo chuẩn Rubric ICTU.
          </p>
        </div>

        {/* Cụm nút tác vụ nhanh */}
        <div className="mentor-action-cluster">
          <button
            type="button"
            className="mentor-btn mentor-btn--primary"
            onClick={() => handleOpenCreateTaskModal()}
          >
            <Plus size={16} />
            <span>+ Giao việc mới</span>
          </button>

          <button
            type="button"
            className="mentor-btn mentor-btn--outline"
            onClick={() => {
              handleTabChange('reports')
              if (reports.length > 0) {
                const unread = reports.find((r) => r.status === 'pending' || !r.mentor_feedback) || reports[0]
                handleOpenReportDetail(unread)
              }
            }}
          >
            <FileText size={16} />
            <span>Chấm báo cáo tuần {unreadReportsCount > 0 ? `(${unreadReportsCount} mới)` : ''}</span>
          </button>

          <button
            type="button"
            className="mentor-btn mentor-btn--outline"
            onClick={() => handleOpenEvalModal()}
          >
            <Award size={16} />
            <span>Đánh giá năng lực cuối kỳ</span>
          </button>
        </div>
      </section>

      {/* ── 2. HÀNG CHỈ SỐ KPI (4 THẺ TRỌNG TÂM) ── */}
      <section className="mentor-kpi-grid" aria-label="Thống kê Mentor">
        {/* Thẻ 1: Sinh viên phụ trách (dữ liệu từ HR) */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Sinh viên phụ trách</span>
            <div className="kpi-icon-badge kpi-icon-badge--blue">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">{mentees.length}</span>
            <span className="kpi-unit">TTS phân công từ HR</span>
          </div>
          <span className="kpi-hint">
            {mentees.map((m) => m.full_name).join(' · ')}
          </span>
        </div>

        {/* Thẻ 2: Tasks đang theo dõi */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tasks đang theo dõi</span>
            <div className="kpi-icon-badge kpi-icon-badge--purple">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">{tasks.length}</span>
            <span className="kpi-unit">nhiệm vụ Sprint</span>
          </div>
          <span className="kpi-hint">
            {tasks.filter((t) => t.status === 'doing').length} đang làm · {tasks.filter((t) => t.status === 'done').length} đã hoàn thành
          </span>
        </div>

        {/* Thẻ 3: Báo cáo tuần chờ phản hồi */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Báo cáo tuần chờ phản hồi</span>
            <div className="kpi-icon-badge kpi-icon-badge--orange">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">{unreadReportsCount}</span>
            <span className="kpi-badge-pill kpi-badge-pill--orange">
              {unreadReportsCount > 0 ? `${unreadReportsCount} báo cáo cần phản hồi` : 'Hiện tại đã hết báo cáo tuần để duyệt'}
            </span>
          </div>
          <span className="kpi-hint">Duyệt kịp thời trước thứ Hai hàng tuần</span>
        </div>

        {/* Thẻ 4: Tiến độ đánh giá năng lực cuối kỳ */}
        <div className="mentor-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đánh giá năng lực cuối kỳ</span>
            <div className="kpi-icon-badge kpi-icon-badge--green">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-val-row">
            <span className="kpi-value">
              {mentees.filter((m) => evaluationsByIntern[m.id]).length}/{mentees.length}
            </span>
            <span className="kpi-badge-pill kpi-badge-pill--green">Hoàn tất rubric</span>
          </div>
          <span className="kpi-hint">Chấm điểm 5 tiêu chí kỹ năng &amp; thái độ</span>
        </div>
      </section>

      {/* ── 3. NAVIGATION TABS (CHỈ GIỮ 4 TAB CỐT LÕI) ── */}
      <nav className="mentor-tabs-bar" aria-label="Tabs Mentor">
        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'mentees' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('mentees')}
        >
          <Users size={16} />
          <span>Danh sách TTS phụ trách ({mentees.length})</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('tasks')}
        >
          <CheckSquare size={16} />
          <span>Phân công nhiệm vụ (Tasks - {tasks.length})</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('reports')}
        >
          <FileText size={16} />
          <span>
            Duyệt báo cáo tuần {unreadReportsCount > 0 ? `(${unreadReportsCount} mới)` : ''}
          </span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'evaluations' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('evaluations')}
        >
          <Award size={16} />
          <span>Đánh giá &amp; Điểm cuối kỳ</span>
        </button>

        <button
          type="button"
          className={`mentor-tab-btn ${activeTab === 'leave' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('leave')}
        >
          <Calendar size={16} />
          <span>Theo dõi đơn nghỉ phép ({leaveRequests.length})</span>
        </button>
      </nav>

      {/* ── 4. TAB 1: DANH SÁCH THỰC TẬP SINH PHỤ TRÁCH (ĐỒNG BỘ TỪ HR) ── */}
      {activeTab === 'mentees' && (
        <div className="mentor-main-grid">
          {/* CỘT TRÁI (65%): Danh sách chi tiết Mentees */}
          <div className="mentor-col-left">
            <section className="mentor-panel">
              <div className="mentor-panel-header">
                <div>
                  <h2>Thực tập sinh do tôi phụ trách trực tiếp</h2>
                  <p>Dữ liệu đồng bộ trực tiếp từ phân công của Phòng Nhân sự (HR Portal).</p>
                </div>
                <button
                  type="button"
                  className="mentor-btn mentor-btn--primary mentor-btn--sm"
                  onClick={() => handleOpenCreateTaskModal()}
                >
                  <Plus size={15} />
                  <span>+ Phân công task mới</span>
                </button>
              </div>

              <div className="mentor-mentee-cards-stack">
                {mentees.map((mentee) => {
                  // Tìm task gần nhất của mentee này (ưu tiên task đang thực hiện)
                  const menteeTasks = tasks.filter((t) => t.intern_id === mentee.id || t.intern_id == null)
                  const latestTask = menteeTasks.find((t) => t.status === 'doing') || menteeTasks.find((t) => t.status === 'review') || menteeTasks[0]
                  const menteeReports = reports.filter((r) => r.intern_id === mentee.id)
                  const hasPendingReport = menteeReports.some((r) => r.status === 'pending' || !r.mentor_feedback)
                  const isEvaluated = Boolean(evaluationsByIntern[mentee.id])

                  // Initials
                  const trimmedName = (mentee.full_name || '').trim()
                  let initials = 'TTS'
                  if (trimmedName.toUpperCase() === 'TTS') {
                    initials = 'TTS'
                  } else if (trimmedName) {
                    const parts = trimmedName.split(' ').filter(Boolean)
                    if (parts.length === 1) {
                      initials = parts[0].length <= 3 ? parts[0].toUpperCase() : parts[0].substring(0, 2).toUpperCase()
                    } else {
                      initials = parts.slice(-2).map((w) => w[0]).join('').toUpperCase()
                    }
                  }

                  return (
                    <div key={mentee.id} className="mentee-full-card">
                      <div className="mentee-card-top">
                        <div className="mentee-avatar-box">
                          {mentee.avatar && mentee.avatar.startsWith('data:image') ? (
                            <img src={mentee.avatar} alt={mentee.full_name} className="mentee-avatar-img" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="mentee-head-info">
                          <div className="mentee-title-line">
                            <h3>{mentee.full_name}</h3>
                            <span className="mentee-code-tag">{mentee.code}</span>
                            <span className="status-badge status-badge--success">
                              {mentee.attendance_rate || '98%'} Chuyên cần
                            </span>
                            {isEvaluated && (
                              <span className="status-badge status-badge--primary" style={{ fontSize: '11.5px' }}>
                                ✓ Đã đánh giá
                              </span>
                            )}
                          </div>
                          <p className="mentee-sub-line">
                            {mentee.major} · GPA <strong>{mentee.gpa} / 4.0</strong> · Dự án: <strong>{mentee.lab || 'R&D Software Engineering'}</strong>
                            {mentee.phone && <span> · SĐT: <strong>{mentee.phone}</strong></span>}
                            {mentee.email && <span> · Email: <strong>{mentee.email}</strong></span>}
                          </p>
                        </div>
                      </div>

                      {/* Box nhiệm vụ gần nhất */}
                      <div className="mentee-task-box">
                        <div className="mentee-task-header">
                          <span className="task-box-label">Task gần nhất:</span>
                          <span className="task-box-due">
                            {latestTask ? `Hạn chót: ${latestTask.due_at}` : 'Chưa có task'}
                          </span>
                        </div>
                        <h4 className="task-box-name">
                          {latestTask ? latestTask.title : 'Chưa có nhiệm vụ Sprint nào được giao cho sinh viên này.'}
                        </h4>
                        {latestTask ? (
                          <div className="task-box-progress-row">
                            <div className="progress-bar-track">
                              <div
                                className={`progress-bar-val ${latestTask.progress === 100 ? 'is-complete' : ''}`}
                                style={{ width: `${latestTask.progress}%` }}
                              />
                            </div>
                            <span className="task-box-pct">{latestTask.progress}% hoàn thiện</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mentor-btn mentor-btn--outline mentor-btn--sm"
                            style={{ marginTop: '6px' }}
                            onClick={() => handleOpenCreateTaskModal(mentee.id)}
                          >
                            <Plus size={12} />
                            <span>Giao task đầu tiên</span>
                          </button>
                        )}
                      </div>

                      {/* Các nút hành động tập trung vào 3 chức năng chính */}
                      <div className="mentee-card-actions">
                        <button
                          type="button"
                          className="mentor-btn mentor-btn--primary mentor-btn--sm"
                          onClick={() => handleOpenCreateTaskModal(mentee.id)}
                        >
                          <Plus size={13} />
                          <span>+ Giao việc (Task)</span>
                        </button>

                        <button
                          type="button"
                          className={`mentor-btn ${hasPendingReport ? 'mentor-btn--primary' : 'mentor-btn--outline'} mentor-btn--sm`}
                          onClick={() => {
                            setReportFilterIntern(String(mentee.id))
                            handleTabChange('reports')
                          }}
                        >
                          <FileText size={13} />
                          <span>
                            Duyệt báo cáo {hasPendingReport ? '(!)' : ''}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="mentor-btn mentor-btn--outline mentor-btn--sm"
                          onClick={() => handleOpenEvalModal(mentee.id)}
                        >
                          <Award size={13} />
                          <span>{isEvaluated ? 'Cập nhật đánh giá' : 'Đánh giá năng lực'}</span>
                        </button>

                        <button
                          type="button"
                          className="mentor-btn mentor-btn--ghost mentor-btn--sm"
                          onClick={() => handleOpenChatModal(mentee)}
                          title="Góp ý chuyên môn / Hướng dẫn code"
                        >
                          <MessageSquare size={13} />
                          <span>Góp ý nhanh</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* CỘT PHẢI (35%): Thang Rubric & Tổng quan tiến độ hướng dẫn */}
          <div className="mentor-col-right">
            {/* Card Rubric Tiêu Chuẩn */}
            <div className="mentor-sidebar-card">
              <div className="mentor-sidebar-card-head">
                <div>
                  <h3>Rubric Tiêu Chuẩn Đánh Giá</h3>
                  <span className="card-sub-tag">Quy chuẩn Viện CNTT ICTU</span>
                </div>
                <Award size={20} className="text-primary" />
              </div>

              <div className="rubric-items-list">
                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>1. Kỹ năng chuyên môn Kỹ thuật:</strong>
                    <span className="rubric-pct-pill">40%</span>
                  </div>
                  <p>Chất lượng source code, khả năng hoàn thành API, xử lý lỗi &amp; cấu trúc kiến trúc phần mềm Clean Code.</p>
                </div>

                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>2. Kỷ luật &amp; Chuyên cần:</strong>
                    <span className="rubric-pct-pill">30%</span>
                  </div>
                  <p>Giờ giấc có mặt tại Lab, nộp báo cáo tuần đúng hạn, tuân thủ nội quy dự án và bảo mật dữ liệu NDA.</p>
                </div>

                <div className="rubric-item">
                  <div className="rubric-item-header">
                    <strong>3. Kỹ năng mềm &amp; Teamwork:</strong>
                    <span className="rubric-pct-pill">30%</span>
                  </div>
                  <p>Giao tiếp, tinh thần chủ động báo cáo blocker, phối hợp nhóm và tinh thần học hỏi cầu thị.</p>
                </div>
              </div>
            </div>

            {/* Card Tổng quan tiến độ 3 nhiệm vụ chính */}
            <div className="mentor-sidebar-card">
              <div className="mentor-sidebar-card-head">
                <div>
                  <h3>Tiến Độ 3 Chức Năng Chính</h3>
                  <span className="card-sub-tag">Nhiệm vụ của Người hướng dẫn</span>
                </div>
                <Briefcase size={20} className="text-primary" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1E293B', display: 'block' }}>1. Giao nhiệm vụ Sprint</strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{tasks.length} tasks đã tạo</span>
                  </div>
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--primary mentor-btn--sm"
                    onClick={() => handleTabChange('tasks')}
                  >
                    Xem Tasks
                  </button>
                </div>

                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1E293B', display: 'block' }}>2. Duyệt báo cáo tuần</strong>
                    <span style={{ fontSize: '12px', color: unreadReportsCount > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                      {unreadReportsCount > 0 ? `${unreadReportsCount} báo cáo cần phản hồi` : 'Đã phản hồi toàn bộ'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--primary mentor-btn--sm"
                    onClick={() => handleTabChange('reports')}
                  >
                    Duyệt ngay
                  </button>
                </div>

                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1E293B', display: 'block' }}>3. Đánh giá năng lực cuối kỳ</strong>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Đã hoàn thành {Object.keys(evaluationsByIntern).length}/{mentees.length} sinh viên
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mentor-btn mentor-btn--primary mentor-btn--sm"
                    onClick={() => handleTabChange('evaluations')}
                  >
                    Chấm điểm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TAB 2: QUẢN LÝ NHIỆM VỤ (CHỨC NĂNG 1 - SCRUM-121) ── */}
      {activeTab === 'tasks' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Phân công &amp; Theo dõi nhiệm vụ Sprint (Tasks)</h2>
              <p>Giao việc cụ thể cho sinh viên thuộc quyền quản lý, đặt hạn chót và nghiệm thu kết quả công việc.</p>
            </div>
            <button
              type="button"
              className="mentor-btn mentor-btn--primary"
              onClick={() => handleOpenCreateTaskModal()}
            >
              <Plus size={16} />
              <span>+ Giao nhiệm vụ mới</span>
            </button>
          </div>

          {/* Bộ lọc Task */}
          <div className="report-filter-bar">
            <div className="report-filter-pills">
              <button
                type="button"
                className={`report-pill-btn ${taskFilterStatus === 'all' ? 'is-active' : ''}`}
                onClick={() => setTaskFilterStatus('all')}
              >
                Tất cả ({tasks.length})
              </button>
              <button
                type="button"
                className={`report-pill-btn ${taskFilterStatus === 'doing' ? 'is-active' : ''}`}
                onClick={() => setTaskFilterStatus('doing')}
              >
                Đang làm ({tasks.filter((t) => t.status === 'doing').length})
              </button>
              <button
                type="button"
                className={`report-pill-btn ${taskFilterStatus === 'done' ? 'is-active' : ''}`}
                onClick={() => setTaskFilterStatus('done')}
              >
                Đã hoàn thành ({tasks.filter((t) => t.status === 'done').length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Lọc theo TTS:</span>
              <select
                value={taskFilterIntern}
                onChange={(e) => setTaskFilterIntern(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="all">Tất cả thực tập sinh ({mentees.length})</option>
                {mentees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th style={{ width: '36%' }}>Nhiệm vụ &amp; Mô tả công việc</th>
                <th>TTS phụ trách</th>
                <th>Hạn chót</th>
                <th>Mức ưu tiên</th>
                <th style={{ width: '16%' }}>Tiến độ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    Chưa có nhiệm vụ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong className="task-name">{task.title}</strong>
                      <p className="task-desc">{task.description || 'Chưa có mô tả chi tiết'}</p>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} color="#2563EB" />
                        {task.intern_name}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <Calendar size={13} color="#64748B" />
                        {task.due_at}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge priority-badge--${task.priority === 'high' ? 'danger' : task.priority === 'low' ? 'slate' : 'warning'}`}>
                        {task.priority === 'high' ? 'Cao' : task.priority === 'low' ? 'Thấp' : 'Trung bình'}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-track">
                          <div
                            className={`progress-bar-val ${task.progress === 100 ? 'is-complete' : ''}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="progress-text">{task.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${task.status === 'done' ? 'success' : 'primary'}`}>
                        {task.status === 'done' ? 'Hoàn thành' : 'Đang làm việc'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {task.status !== 'done' ? (
                          <button
                            type="button"
                            className="table-action-btn"
                            title="Xác nhận hoàn thành nghiệm thu nhiệm vụ"
                            onClick={() => handleVerifyTask(task)}
                          >
                            Nghiệm thu
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>✓ Đã nghiệm thu</span>
                        )}

                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}
                          title="Xóa nhiệm vụ"
                          onClick={() => handleDeleteTask(task)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* ── 6. TAB 3: DUYỆT BÁO CÁO TUẦN (CHỨC NĂNG 2 - SCRUM-122, SCRUM-123) ── */}
      {activeTab === 'reports' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Danh sách báo cáo tuần cần duyệt &amp; Phản hồi</h2>
              <p>Đọc báo cáo tiến độ của sinh viên, viết phản hồi hướng dẫn chuyên môn và chấm điểm tuần theo quy định.</p>
            </div>
          </div>

          {/* Bộ lọc Báo cáo */}
          <div className="report-filter-bar">
            <div className="report-filter-pills">
              <button
                type="button"
                className={`report-pill-btn ${reportFilterStatus === 'all' ? 'is-active' : ''}`}
                onClick={() => setReportFilterStatus('all')}
              >
                Tất cả ({reports.length})
              </button>
              <button
                type="button"
                className={`report-pill-btn ${reportFilterStatus === 'pending' ? 'is-active' : ''}`}
                onClick={() => setReportFilterStatus('pending')}
              >
                <span>Chưa đọc / Chờ duyệt</span>
                <span className="report-pill-badge">{unreadReportsCount}</span>
              </button>
              <button
                type="button"
                className={`report-pill-btn ${reportFilterStatus === 'reviewed' ? 'is-active' : ''}`}
                onClick={() => setReportFilterStatus('reviewed')}
              >
                <span>Đã phản hồi</span>
                <span className="report-pill-badge">{reports.length - unreadReportsCount}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Lọc theo TTS:</span>
              <select
                value={reportFilterIntern}
                onChange={(e) => setReportFilterIntern(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="all">Tất cả thực tập sinh</option>
                {mentees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Danh sách thẻ báo cáo */}
          <div className="reports-stack">
            {filteredReports.length === 0 ? (
              unreadReportsCount === 0 || reportFilterStatus === 'pending' ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1.5px dashed #86EFAC' }}>
                  <CheckCircle2 size={46} color="#16A34A" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px', color: '#166534', fontSize: '18px', fontWeight: 800 }}>
                    Hiện tại đã hết báo cáo tuần để duyệt
                  </h3>
                  <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '13.5px' }}>
                    Toàn bộ báo cáo tiến độ tuần của thực tập sinh đã được xem xét và gửi phản hồi chuyên môn đầy đủ.
                  </p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '20px', background: '#DCFCE7', color: '#15803D', fontSize: '12.5px', fontWeight: 600 }}>
                    <Clock size={13} /> Dữ liệu thời gian thực cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                  <FileText size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy báo cáo nào phù hợp với bộ lọc hiện tại.</p>
                </div>
              )
            ) : (
              filteredReports.map((report) => {
                const isPending = report.status === 'pending' || !report.mentor_feedback
                return (
                  <div
                    key={report.id}
                    className={`report-card-item ${isPending ? 'report-card-item--unread' : 'report-card-item--reviewed'}`}
                  >
                    <div className="report-card-top">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 className="report-title" style={{ margin: 0 }}>
                            {report.week_range || report.week_title}
                          </h3>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '12px', fontWeight: 600 }}>
                            {report.intern_name}
                          </span>
                        </div>
                        <span className="report-timestamp" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Clock size={12} /> Nộp lúc: {report.submitted_at}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isPending ? (
                          <span className="status-badge report-status-badge--pending">
                            <Clock size={12} /> Chưa đọc / Chờ duyệt
                          </span>
                        ) : (
                          <span className="status-badge report-status-badge--reviewed">
                            <CheckCircle2 size={12} /> Đã phản hồi {report.score ? `(${report.score}/10 đ)` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="report-body">
                      <div className="report-section">
                        <strong style={{ color: '#1D4ED8', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                          1. Kết quả công việc đạt được trong tuần:
                        </strong>
                        <p>{report.summary || report.tasks_done || 'Đang cập nhật'}</p>
                      </div>

                      <div className="report-section">
                        <strong style={{ color: '#1D4ED8', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                          2. Khó khăn / Vướng mắc (Blockers):
                        </strong>
                        <p>{report.issues || 'Không có khó khăn lớn'}</p>
                      </div>

                      <div className="report-section">
                        <strong style={{ color: '#1D4ED8', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                          3. Kế hoạch tuần tiếp theo:
                        </strong>
                        <p>{report.plan || 'Tiếp tục hoàn thiện các task Sprint theo phân công'}</p>
                      </div>

                      {/* Phản hồi hiện tại của Mentor nếu có */}
                      {(report.mentor_feedback || report.feedback) ? (
                        <div className="report-feedback-box" style={{ background: '#F0FDF4', borderLeft: '4px solid #16A34A', padding: '12px 14px', borderRadius: '6px', marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: '#15803D', fontSize: '13px' }}>Nhận xét phản hồi của Mentor:</strong>
                            {report.score && (
                              <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                                Điểm: {report.score} / 10
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', fontStyle: 'italic' }}>
                            "{report.mentor_feedback || report.feedback}"
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="report-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                        Tệp đính kèm: <strong>{report.file_name || 'BaoCaoTuan.docx'}</strong>
                      </span>
                      <button
                        type="button"
                        className={`mentor-btn ${isPending ? 'mentor-btn--primary' : 'mentor-btn--outline'}`}
                        onClick={() => handleOpenReportDetail(report)}
                      >
                        <Edit3 size={14} />
                        <span>{isPending ? 'Xem chi tiết & Viết phản hồi' : 'Xem chi tiết / Sửa phản hồi'}</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* ── 7. TAB 4: ĐÁNH GIÁ NĂNG LỰC CUỐI KỲ (CHỨC NĂNG 3 - EVALUATIONS) ── */}
      {activeTab === 'evaluations' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Đánh giá năng lực cuối kỳ thực tập sinh</h2>
              <p>Thang điểm Rubric chuẩn đánh giá kỹ năng chuyên môn, thái độ và đề xuất tuyển dụng chuyển về phòng HR.</p>
            </div>
            <button
              type="button"
              className="mentor-btn mentor-btn--primary"
              onClick={() => handleOpenEvalModal()}
            >
              <span>+ Tạo / Cập nhật đánh giá</span>
            </button>
          </div>

          {/* Thẻ đánh giá của từng sinh viên do mentor quản lý */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {mentees.map((mentee) => {
              const evalData = evaluationsByIntern[mentee.id]
              const hasEvaluated = Boolean(evalData)
              const scores = evalData ? calculateLiveScores(evalData, mentee.id) : null

              return (
                <div key={mentee.id} className="eval-summary-card">
                  <div className="eval-card-header">
                    <div>
                      <h3 style={{ fontSize: '17px', margin: '0 0 4px', color: '#0F172A' }}>
                        {mentee.full_name} ({mentee.code}) - {mentee.major}
                      </h3>
                      <span className="eval-date">
                        {hasEvaluated ? `Đã hoàn tất đánh giá ngày: ${evalData.evaluated_at || 'Gần đây'}` : 'Chưa có bản đánh giá cuối kỳ'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {hasEvaluated ? (
                        <span className="status-badge status-badge--success">
                          ✓ Đã hoàn thành đánh giá: {scores?.letterGrade}
                        </span>
                      ) : (
                        <span className="status-badge status-badge--warning">
                          Chờ Mentor đánh giá
                        </span>
                      )}
                      <button
                        type="button"
                        className="mentor-btn mentor-btn--primary mentor-btn--sm"
                        onClick={() => handleOpenEvalModal(mentee.id)}
                      >
                        <Edit3 size={13} />
                        <span>{hasEvaluated ? 'Cập nhật đánh giá' : 'Đánh giá ngay'}</span>
                      </button>
                    </div>
                  </div>

                  {hasEvaluated && scores ? (
                    <>
                      {/* Grid điểm số (4 box: Báo cáo tuần, Chuyên môn, Thái độ, Tổng kết GPA) */}
                      <div className="eval-scores-grid">
                        <div className="score-box">
                          <span className="score-label">Điểm Báo cáo tuần (TB):</span>
                          <span className="score-val" style={{ color: '#2563EB' }}>
                            {scores.reportAvg !== null ? `${scores.reportAvg} / 10` : 'Chưa chấm'}
                          </span>
                          <span className="score-subtext">
                            {scores.gradedReportsCount > 0 ? `(${scores.gradedReportsCount} báo cáo đã duyệt · 30%)` : '(Chưa có báo cáo · 30%)'}
                          </span>
                        </div>
                        <div className="score-box">
                          <span className="score-label">Điểm chuyên môn (Tech):</span>
                          <span className="score-val">{scores.techAvg} / 10</span>
                          <span className="score-subtext">Kỹ thuật &amp; Chất lượng code (35%)</span>
                        </div>
                        <div className="score-box">
                          <span className="score-label">Điểm thái độ &amp; Kỷ luật:</span>
                          <span className="score-val">{scores.attitudeAvg} / 10</span>
                          <span className="score-subtext">Chuyên cần &amp; Trách nhiệm (35%)</span>
                        </div>
                        <div className="score-box score-box--final">
                          <span className="score-label">Tổng kết GPA (Thang 4):</span>
                          <span className="score-val">
                            {scores.finalScore} / 10 ({scores.gpa4} đ)
                          </span>
                          <span className="score-subtext">
                            Xếp loại: {scores.letterGrade}
                          </span>
                        </div>
                      </div>

                      {/* Đề xuất & nhận xét */}
                      <div style={{ marginTop: '14px', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Đề xuất tiếp nhận sau kỳ thực tập: </span>
                          <strong style={{ color: '#2563EB', fontSize: '13.5px' }}>{evalData.recommendation}</strong>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong style={{ fontSize: '13px', color: '#166534' }}>Ưu điểm nổi bật: </strong>
                          <span style={{ fontSize: '13px', color: '#334155' }}>{evalData.strength}</span>
                        </div>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#B45309' }}>Điểm cần cải thiện: </strong>
                          <span style={{ fontSize: '13px', color: '#334155' }}>{evalData.improvement}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                      <p style={{ margin: '0 0 10px', color: '#64748B', fontSize: '13.5px' }}>
                        Sinh viên <strong>{mentee.full_name}</strong> chưa có bản điểm đánh giá năng lực cuối kỳ.
                      </p>
                      <button
                        type="button"
                        className="mentor-btn mentor-btn--primary mentor-btn--sm"
                        onClick={() => handleOpenEvalModal(mentee.id)}
                      >
                        <Award size={14} />
                        <span>Mở form chấm điểm 5 tiêu chí Rubric</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 8. TAB 5: THEO DÕI ĐƠN NGHỈ PHÉP THỰC TẬP SINH (ĐỒNG BỘ ĐA PHÂN HỆ) ── */}
      {activeTab === 'leave' && (
        <section className="mentor-panel">
          <div className="mentor-panel-header">
            <div>
              <h2>Theo dõi Đơn xin nghỉ phép của Thực tập sinh</h2>
              <p>
                Dữ liệu được đồng bộ trực tiếp từ Phòng Nhân sự (HR) và Thực tập sinh theo thời gian thực.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <Filter size={15} color="#64748B" />
                <select
                  value={leaveFilterStatus}
                  onChange={(e) => setLeaveFilterStatus(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#334155', cursor: 'pointer' }}
                >
                  <option value="all">Tất cả trạng thái ({leaveRequests.length})</option>
                  <option value="pending">Chờ HR duyệt ({leaveRequests.filter((r) => r.status === 'pending').length})</option>
                  <option value="approved">Đã duyệt ({leaveRequests.filter((r) => r.status === 'approved').length})</option>
                  <option value="rejected">Bị từ chối ({leaveRequests.filter((r) => r.status === 'rejected').length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 Thẻ KPI tóm tắt nhanh */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TỔNG SỐ ĐƠN NGHỈ</span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{leaveRequests.length}</div>
            </div>
            <div style={{ background: '#FFFBEB', padding: '16px', borderRadius: '10px', border: '1px solid #FDE68A', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 600 }}>CHỜ HR DUYỆT</span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>{leaveRequests.filter((r) => r.status === 'pending').length}</div>
            </div>
            <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '10px', border: '1px solid #A7F3D0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>ĐÃ PHÊ DUYỆT</span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{leaveRequests.filter((r) => r.status === 'approved').length}</div>
            </div>
            <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '10px', border: '1px solid #FECACA', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 600 }}>BỊ TỪ CHỐI</span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>{leaveRequests.filter((r) => r.status === 'rejected').length}</div>
            </div>
          </div>

          {/* Bảng danh sách đơn nghỉ phép của TTS */}
          <div style={{ overflowX: 'auto', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>Mã đơn</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Thực tập sinh</th>
                  <th style={{ padding: '12px 14px', width: '140px' }}>Loại nghỉ</th>
                  <th style={{ padding: '12px 14px', width: '160px' }}>Thời gian nghỉ</th>
                  <th style={{ padding: '12px 14px', width: '125px', textAlign: 'center' }}>Trạng thái HR</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Lý do xin nghỉ</th>
                  <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>Ngày nộp</th>
                  <th style={{ padding: '12px 14px', width: '190px' }}>Phản hồi của HR</th>
                </tr>
              </thead>
              <tbody>
                {filteredMentorLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                      Không có đơn xin nghỉ phép nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredMentorLeaves.map((req) => {
                    const reqId = req.requestCode || req.id
                    const isPending = req.status === 'pending'
                    const isApproved = req.status === 'approved'
                    const isRejected = req.status === 'rejected'

                    return (
                      <tr key={reqId} style={{ borderBottom: '1px solid #F1F5F9', background: isRejected ? '#FEF2F2' : '#FFFFFF' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '6px' }}>
                            {reqId}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#E0E7FF', color: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                              {(req.internName || 'T').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{req.internName || 'TTS'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{req.internCode || 'TTS0001'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-block', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '6px', fontWeight: 500, color: '#1E293B' }}>
                            {req.type || req.leave_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            {req.startDate === req.endDate ? req.startDate : `${req.startDate} → ${req.endDate}`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {req.session || req.duration} ({req.duration})
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {isPending && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                              <Clock size={11} />
                              <span>Chờ HR duyệt</span>
                            </span>
                          )}
                          {isApproved && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#ECFDF5', color: '#15803D', border: '1px solid #A7F3D0' }}>
                              <CheckCircle size={11} />
                              <span>Đã duyệt</span>
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                              <XCircle size={11} />
                              <span>Từ chối</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ color: '#475569', maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {req.reason}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748B' }}>
                          {req.createdDate || req.created_date}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isPending ? (
                            <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>Chờ Phòng Nhân sự xem xét</span>
                          ) : (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                                Người duyệt: {req.approver || 'Hr'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                                {req.feedback || 'Không có ghi chú'}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL 1: GIAO VIỆC MỚI VỚI DROPDOWN CHỌN INTERN (CHỨC NĂNG 1) ── */}
      {taskModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTaskModal(false); }}>
          <div className="modal-container modal-container--medium">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} color="#2563EB" />
                <h3>Giao nhiệm vụ mới cho Thực tập sinh</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                {/* Dropdown chỉ cho chọn TTS mà mentor đang quản lý */}
                <div className="modal-field">
                  <label htmlFor="t-intern">
                    Thực tập sinh phụ trách <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <select
                    id="t-intern"
                    value={newTask.intern_id}
                    onChange={(e) => {
                      setNewTask({ ...newTask, intern_id: Number(e.target.value) })
                      if (taskErrors.intern_id) setTaskErrors({ ...taskErrors, intern_id: null })
                    }}
                    className="modal-select"
                    required
                  >
                    {mentees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.code}) — Chuyên ngành: {m.major}
                      </option>
                    ))}
                  </select>
                  {taskErrors.intern_id && <span style={{ color: '#EF4444', fontSize: '12px' }}>{taskErrors.intern_id}</span>}
                </div>

                {/* Tiêu đề nhiệm vụ */}
                <div className="modal-field">
                  <label htmlFor="t-title">
                    Tiêu đề nhiệm vụ <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <input
                    id="t-title"
                    type="text"
                    required
                    placeholder="Ví dụ: Phát triển REST API Quản lý Báo cáo thực tập..."
                    value={newTask.title}
                    onChange={(e) => {
                      setNewTask({ ...newTask, title: e.target.value })
                      if (taskErrors.title) setTaskErrors({ ...taskErrors, title: null })
                    }}
                    className="modal-input"
                  />
                  {taskErrors.title && <span style={{ color: '#EF4444', fontSize: '12px' }}>{taskErrors.title}</span>}
                </div>

                {/* Mô tả công việc & Tiêu chí nghiệm thu (Definition of Done) */}
                <div className="modal-field">
                  <label htmlFor="t-desc">Mô tả công việc &amp; Yêu cầu bàn giao (Definition of Done):</label>
                  <textarea
                    id="t-desc"
                    rows={4}
                    placeholder="Mô tả cụ thể yêu cầu kỹ thuật, các endpoint cần xây dựng, quy ước test case và tiêu chuẩn nghiệm thu..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="modal-textarea"
                  />
                </div>

                <div className="modal-row-2">
                  {/* Hạn chót */}
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="t-due">
                      Hạn hoàn thành (Due date) <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <input
                      id="t-due"
                      type="date"
                      required
                      value={newTask.due_at}
                      onChange={(e) => {
                        setNewTask({ ...newTask, due_at: e.target.value })
                        if (taskErrors.due_at) setTaskErrors({ ...taskErrors, due_at: null })
                      }}
                      className="modal-input"
                    />
                    {taskErrors.due_at && <span style={{ color: '#EF4444', fontSize: '12px' }}>{taskErrors.due_at}</span>}
                  </div>

                  {/* Mức ưu tiên */}
                  <div className="modal-field" style={{ flex: 1 }}>
                    <label htmlFor="t-prio">Mức độ ưu tiên:</label>
                    <select
                      id="t-prio"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="modal-select"
                    >
                      <option value="high">Cao (Gấp / Blocker)</option>
                      <option value="medium">Trung bình (Kế hoạch)</option>
                      <option value="low">Thấp (Cải tiến / Optional)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setTaskModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="mentor-btn mentor-btn--primary" disabled={isSubmittingTask}>
                  <CheckSquare size={16} />
                  <span>{isSubmittingTask ? 'Đang giao...' : 'Giao nhiệm vụ ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHI TIẾT BÁO CÁO & PHẢN HỒI (CHỨC NĂNG 2) ── */}
      {feedbackModal.open && feedbackModal.report && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFeedbackModal({ open: false, report: null, text: '', score: 9.0 });
          }}
        >
          <div className="modal-container modal-container--large">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#2563EB" />
                <div>
                  <h3 style={{ margin: 0 }}>
                    Chi tiết Báo cáo: {feedbackModal.report.week_range || feedbackModal.report.week_title}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Sinh viên: <strong>{feedbackModal.report.intern_name}</strong> • Nộp lúc: {feedbackModal.report.submitted_at}
                    {feedbackModal.report.status === 'reviewed' && (
                      <span style={{ marginLeft: '8px', color: '#16A34A', fontWeight: 600 }}>
                        • Đã duyệt (Điểm: {feedbackModal.report.score}/10)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setFeedbackModal({ open: false, report: null, text: '', score: 9.0 })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeedback}>
              <div className="modal-body">
                <div className="report-detail-layout">
                  {/* CỘT TRÁI: Nội dung chi tiết sinh viên gửi */}
                  <div className="report-intern-content-col">
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: 600, color: '#1D4ED8' }}>
                        1. Công việc đã hoàn thành trong tuần:
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', lineHeight: 1.5, background: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        {feedbackModal.report.summary || feedbackModal.report.tasks_done || 'Đang cập nhật'}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: 600, color: '#1D4ED8' }}>
                        2. Khó khăn, vướng mắc gặp phải:
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', lineHeight: 1.5, background: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        {feedbackModal.report.issues || 'Không có khó khăn lớn trong tuần này.'}
                      </p>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: 600, color: '#1D4ED8' }}>
                        3. Kế hoạch công việc tuần tiếp theo:
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', lineHeight: 1.5, background: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        {feedbackModal.report.plan || 'Tiếp tục hoàn thiện các nhiệm vụ theo đúng tiến độ Sprint.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      <span style={{ fontSize: '12.5px', color: '#1D4ED8', fontWeight: 500 }}>
                        Tệp đính kèm: <strong>{feedbackModal.report.file_name || 'BaoCaoTuan.docx'}</strong>
                      </span>
                      <button
                        type="button"
                        className="mentor-btn mentor-btn--outline mentor-btn--sm"
                        onClick={() => showToast(`Đang mở tệp đính kèm: ${feedbackModal.report.file_name || 'BaoCaoTuan.docx'}`, 'info')}
                      >
                        <Download size={13} />
                        <span>Xem file</span>
                      </button>
                    </div>
                  </div>

                  {/* CỘT PHẢI: Form viết phản hồi của Mentor */}
                  <div className="report-mentor-feedback-col">
                    {/* Điểm đánh giá tuần */}
                    <div className="modal-field">
                      <label htmlFor="fb-score">Điểm đánh giá tuần (Thang 10):</label>
                      <div className="report-score-input-wrap">
                        <input
                          id="fb-score"
                          type="number"
                          step="0.5"
                          min="1"
                          max="10"
                          value={feedbackModal.score}
                          onChange={(e) => setFeedbackModal({ ...feedbackModal, score: Number(e.target.value) })}
                          className="modal-input"
                          style={{ width: '80px', fontWeight: 700, fontSize: '16px', color: '#2563EB' }}
                        />
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {[8.0, 8.5, 9.0, 9.5, 10.0].map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`score-quick-btn ${feedbackModal.score === s ? 'is-selected' : ''}`}
                              onClick={() => setFeedbackModal({ ...feedbackModal, score: s })}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Textarea Viết phản hồi */}
                    <div className="modal-field" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label htmlFor="fb-text">
                        Nội dung nhận xét &amp; Hướng dẫn chuyên môn <span style={{ color: '#EF4444' }}>*</span>:
                      </label>
                      <textarea
                        id="fb-text"
                        rows={7}
                        required
                        value={feedbackModal.text}
                        onChange={(e) => setFeedbackModal({ ...feedbackModal, text: e.target.value })}
                        placeholder="Ghi nhận xét đánh giá kết quả công việc, góp ý cải tiến mã nguồn và hướng dẫn gỡ vướng blocker cho sinh viên..."
                        className="modal-textarea"
                        style={{ flex: 1, minHeight: '140px' }}
                      />
                      <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', textAlign: 'right' }}>
                        {feedbackModal.text.length} ký tự
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="mentor-btn mentor-btn--ghost"
                  onClick={() => setFeedbackModal({ open: false, report: null, text: '', score: 9.0 })}
                >
                  Đóng
                </button>
                <button type="submit" className="mentor-btn mentor-btn--primary" disabled={isSubmittingFeedback}>
                  <Send size={15} />
                  <span>
                    {isSubmittingFeedback
                      ? 'Đang gửi...'
                      : feedbackModal.report.status === 'reviewed'
                      ? 'Cập nhật phản hồi cho sinh viên'
                      : 'Gửi phản hồi cho sinh viên'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ĐÁNH GIÁ NĂNG LỰC CUỐI KỲ VỚI RATING SCALE (CHỨC NĂNG 3) ── */}
      {evalModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEvalModal(false);
          }}
        >
          <div className="modal-container modal-container--large">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={22} color="#2563EB" />
                <div>
                  <h3 style={{ margin: 0 }}>Đánh Giá Năng Lực &amp; Điểm Tổng Kết Thực Tập</h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Quy chuẩn Thang điểm Rubric Viện Công nghệ Thông tin - ICTU
                  </span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setEvalModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEvaluation}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* 1. Chọn Thực tập sinh phụ trách */}
                <div className="modal-field" style={{ marginBottom: '16px' }}>
                  <label htmlFor="ev-intern-select" style={{ fontWeight: 700 }}>
                    Chọn Thực tập sinh cần đánh giá <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <select
                    id="ev-intern-select"
                    value={evalForm.intern_id}
                    onChange={(e) => handleSelectInternToEval(Number(e.target.value))}
                    className="modal-select"
                  >
                    {mentees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.code}) — Chuyên ngành: {m.major} (GPA: {m.gpa})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chặn submit đúp: Thông báo nếu sinh viên đã được đánh giá */}
                {isEditingExistingEval && (
                  <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>
                      Sinh viên này đã có bản đánh giá cuối kỳ ngày <strong>{evaluationsByIntern[evalForm.intern_id]?.evaluated_at || 'trước đó'}</strong>. Bạn đang ở chế độ cập nhật bảng đánh giá hiện có.
                    </span>
                  </div>
                )}

                {/* 2. Banner Tính tổng điểm tạm thời trên UI (Real-time dynamic score calculation) */}
                <div className="eval-live-score-banner">
                  <div className="eval-score-main">
                    <div className="eval-score-circle">
                      <span className="eval-score-num">{liveScores.finalScore}</span>
                      <span className="eval-score-max">/ 10 đ</span>
                    </div>
                    <div className="eval-score-meta">
                      <h4>Xếp loại: {liveScores.letterGrade}</h4>
                      <div className="eval-score-sub">
                        GPA Quy đổi hệ 4: <strong>{liveScores.gpa4} / 4.0</strong> • Tự động tính theo thời gian thực
                      </div>
                    </div>
                  </div>

                  <div className="eval-score-breakdown">
                    <div className="eval-sub-score-box">
                      <span className="label">Báo cáo tuần (TB)</span>
                      <span className="val" style={{ color: '#2563EB' }}>
                        {liveScores.reportAvg !== null ? `${liveScores.reportAvg} / 10` : 'Chưa có'}
                      </span>
                    </div>
                    <div className="eval-sub-score-box">
                      <span className="label">Điểm Kỹ năng (Tech)</span>
                      <span className="val">{liveScores.techAvg} / 10</span>
                    </div>
                    <div className="eval-sub-score-box">
                      <span className="label">Điểm Thái độ &amp; Kỷ luật</span>
                      <span className="val">{liveScores.attitudeAvg} / 10</span>
                    </div>
                  </div>
                </div>

                {/* 3. Năm câu hỏi sử dụng thang điểm Rating Scale 1 - 5 */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>
                    Phần I: Đánh giá theo Thang điểm Rubric chuẩn (Rating Scale 1 - 5)
                  </h4>

                  {EVAL_QUESTIONS.map((q) => {
                    const currentVal = evalForm[q.id] || 3
                    const scaleObj = RATING_SCALES.find((s) => s.value === currentVal) || RATING_SCALES[2]

                    return (
                      <div key={q.id} className="rating-question-card">
                        <div className="rating-question-header">
                          <div>
                            <h5 className="rating-question-title">{q.title}</h5>
                            <p className="rating-question-desc">{q.desc}</p>
                          </div>
                          <span className="rating-current-val-tag">
                            {scaleObj.label} ({scaleObj.scoreStr})
                          </span>
                        </div>

                        {/* Hàng 5 nút bấm thang điểm Rating Scale */}
                        <div className="rating-scale-row">
                          {RATING_SCALES.map((scale) => {
                            const isSelected = currentVal === scale.value
                            return (
                              <button
                                key={scale.value}
                                type="button"
                                className={`rating-scale-btn ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => setEvalForm({ ...evalForm, [q.id]: scale.value })}
                              >
                                <span className="rating-scale-num">{scale.value}</span>
                                <span className="rating-scale-label">{scale.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 4. Khu vực text đánh giá chi tiết */}
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>
                    Phần II: Nhận xét chi tiết &amp; Đề xuất tiếp nhận sau kỳ thực tập
                  </h4>

                  {/* Ưu điểm nổi bật */}
                  <div className="modal-field">
                    <label htmlFor="ev-strength">
                      Ưu điểm nổi bật của thực tập sinh <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <textarea
                      id="ev-strength"
                      rows={3}
                      required
                      placeholder="Nêu các phẩm chất, kỹ năng chuyên môn và kết quả cụ thể mà sinh viên đã thể hiện xuất sắc..."
                      value={evalForm.strength}
                      onChange={(e) => {
                        setEvalForm({ ...evalForm, strength: e.target.value })
                        if (evalErrors.strength) setEvalErrors({ ...evalErrors, strength: null })
                      }}
                      className="modal-textarea"
                    />
                    {evalErrors.strength && <span style={{ color: '#EF4444', fontSize: '12px' }}>{evalErrors.strength}</span>}
                  </div>

                  {/* Điểm cần cải thiện */}
                  <div className="modal-field">
                    <label htmlFor="ev-improvement">
                      Điểm cần cải thiện &amp; Lời khuyên định hướng <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <textarea
                      id="ev-improvement"
                      rows={3}
                      required
                      placeholder="Góp ý về kiến thức công nghệ hoặc kỹ năng mềm sinh viên cần tiếp tục rèn luyện..."
                      value={evalForm.improvement}
                      onChange={(e) => {
                        setEvalForm({ ...evalForm, improvement: e.target.value })
                        if (evalErrors.improvement) setEvalErrors({ ...evalErrors, improvement: null })
                      }}
                      className="modal-textarea"
                    />
                    {evalErrors.improvement && <span style={{ color: '#EF4444', fontSize: '12px' }}>{evalErrors.improvement}</span>}
                  </div>

                  {/* Đề xuất tuyển dụng */}
                  <div className="modal-field">
                    <label htmlFor="ev-rec" style={{ fontWeight: 700 }}>
                      Đề xuất tiếp nhận từ Mentor:
                    </label>
                    <select
                      id="ev-rec"
                      value={evalForm.recommendation}
                      onChange={(e) => setEvalForm({ ...evalForm, recommendation: e.target.value })}
                      className="modal-select"
                    >
                      <option value="Tuyển dụng chính thức (Khuyên khích)">
                        Đề xuất tuyển dụng chính thức vị trí Junior Developer (Khuyên khích)
                      </option>
                      <option value="Đề xuất gia hạn thực tập sinh tiềm năng">
                        Đề xuất gia hạn thực tập sinh tiềm năng để bồi dưỡng thêm
                      </option>
                      <option value="Hoàn thành thực tập đạt yêu cầu">
                        Hoàn thành kỳ thực tập đạt chuẩn đầu ra
                      </option>
                      <option value="Cần đào tạo thêm trước khi tốt nghiệp">
                        Cần đào tạo thêm trước khi tốt nghiệp
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setEvalModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="mentor-btn mentor-btn--primary" disabled={isSubmittingEval}>
                  <Award size={16} />
                  <span>
                    {isSubmittingEval
                      ? 'Đang lưu...'
                      : isEditingExistingEval
                      ? 'Cập nhật bảng đánh giá'
                      : 'Nộp bảng đánh giá cho HR & Nhà trường'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NHẮN TIN GÓP Ý NHANH CHO TTS ── */}
      {chatModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChatModal(false);
          }}
        >
          <div className="modal-container">
            <div className="modal-header">
              <h3>Nhắn tin hướng dẫn kỹ thuật cho {chatTargetIntern?.full_name || 'TTS'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setChatModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div className="modal-body">
                <div className="modal-field">
                  <label htmlFor="chat-msg">Tin nhắn góp ý code review / hướng dẫn:</label>
                  <textarea
                    id="chat-msg"
                    rows={4}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Gửi hướng dẫn giải quyết blocker, góp ý cấu trúc Clean Code hoặc link tài liệu kỹ thuật..."
                    className="modal-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="mentor-btn mentor-btn--ghost" onClick={() => setChatModal(false)}>Hủy</button>
                <button type="submit" className="mentor-btn mentor-btn--primary">Gửi tin nhắn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
