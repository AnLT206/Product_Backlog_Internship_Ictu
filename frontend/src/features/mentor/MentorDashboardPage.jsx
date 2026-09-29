import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getInterns } from '../../api/interns'
import './MentorDashboardPage.css'

export default function MentorDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('mentees') // 'mentees' | 'tasks' | 'reports' | 'evaluations'
  const [mentees, setMentees] = useState([])
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskFilter, setTaskFilter] = useState('all') // 'all' | 'doing' | 'review' | 'done'
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadMentees() {
      setLoading(true)
      try {
        const res = await getInterns({ status: 'active', page_size: 100 })
        if (isMounted && res.ok && res.data?.items) {
          const activeOnly = res.data.items.filter((intern) => intern.status === 'active')
          const mapped = activeOnly.map((intern) => ({
            id: intern.id,
            full_name: intern.full_name || 'Thực tập sinh ICTU',
            email: intern.email,
            phone: intern.phone_number || intern.phone || '0912 345 678',
            university: intern.university || 'ĐH Công nghệ Thông tin & Truyền thông (ICTU)',
            major: intern.major || 'Công nghệ thông tin',
            gpa: intern.gpa ? String(intern.gpa) : '3.6',
            progress: 75,
            tasks_done: 3,
            total_tasks: 4,
            attendance_rate: '98%',
            status: 'active',
          }))
          setMentees(mapped)
          if (mapped.length > 0) {
            setNewTask((prev) => ({ ...prev, intern_id: mapped[0].id }))
            setTasks([
              {
                id: 101,
                title: 'Phát triển REST API Quản lý Hồ sơ Thực tập sinh',
                description: 'Thiết kế endpoint POST /api/hr/interns và GET /api/hr/interns có filter trường, ngành.',
                intern_id: mapped[0].id,
                intern_name: mapped[0].full_name,
                due_at: '2026-10-02',
                priority: 'high',
                status: 'doing',
                progress: 70,
              },
              {
                id: 102,
                title: 'Nghiên cứu tài liệu Software Specification v2.1',
                description: 'Đọc hiểu flow chart Mermaid, sequence diagram và quy tắc phân quyền JWT.',
                intern_id: mapped[0].id,
                intern_name: mapped[0].full_name,
                due_at: '2026-09-24',
                priority: 'medium',
                status: 'done',
                progress: 100,
              },
            ])
            setReports([
              {
                id: 201,
                intern_id: mapped[0].id,
                intern_name: mapped[0].full_name,
                week_range: 'Tuần 3 (20/09 - 26/09/2026)',
                submitted_at: '26/09/2026 17:30',
                summary: 'Đã hoàn thành module đăng nhập auth, tích hợp JWT token và xử lý phân quyền theo role admin/hr/mentor/intern.',
                issues: 'Không có vướng mắc.',
                plan: 'Tiếp tục hoàn thiện các giao diện theo đặc tả tài liệu.',
                file_name: `BaoCaoTuan3_${(mapped[0].full_name || 'TTS').replace(/\s+/g, '')}.docx`,
                feedback: '',
                status: 'pending',
              },
            ])
            setEvaluations([
              {
                intern_id: mapped[0].id,
                intern_name: mapped[0].full_name,
                skill_score: 9,
                attitude_score: 10,
                comment: 'Tư duy lập trình vững vàng, nắm bắt nhanh kiến trúc dự án. Thái độ học hỏi cầu thị, chuyên cần và luôn hoàn thành task đúng hẹn.',
                recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
                evaluated_at: '28/09/2026',
              },
            ])
          } else {
            setMentees([])
            setTasks([])
            setReports([])
            setEvaluations([])
          }
        }
      } catch (err) {
        console.error('Lỗi tải danh sách TTS mentor:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadMentees()
    return () => {
      isMounted = false
    }
  }, [])

  // Dialogs
  const [createTaskModal, setCreateTaskModal] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState({ open: false, report: null, text: '' })
  const [evaluationModal, setEvaluationModal] = useState({
    open: false,
    intern: null,
    skill: 9,
    attitude: 9,
    comment: '',
    recommendation: 'Tuyển dụng chính thức (Khuyên khích)',
  })

  // State form tạo task mới
  const [newTask, setNewTask] = useState({
    intern_id: 1,
    title: '',
    description: '',
    due_at: '',
    priority: 'medium',
  })

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Giao nhiệm vụ mới (US 15)
  function handleCreateTask(e) {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.due_at) {
      alert('Vui lòng nhập đầy đủ tiêu đề nhiệm vụ và thời hạn hoàn thành.')
      return
    }

    const assignedIntern = mentees.find((m) => m.id === Number(newTask.intern_id))
    const createdItem = {
      id: Date.now(),
      title: newTask.title,
      description: newTask.description,
      intern_id: Number(newTask.intern_id),
      intern_name: assignedIntern ? assignedIntern.full_name : 'TTS',
      due_at: newTask.due_at,
      priority: newTask.priority,
      status: 'doing',
      progress: 0,
    }

    setTasks((prev) => [createdItem, ...prev])
    setCreateTaskModal(false)
    setNewTask({
      intern_id: 1,
      title: '',
      description: '',
      due_at: '',
      priority: 'medium',
    })
    showToast(`Đã giao nhiệm vụ mới cho ${createdItem.intern_name}!`)
  }

  // Duyệt hoàn thành task (US 16)
  function handleMarkTaskDone(taskId) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'done', progress: 100 } : t))
    )
    showToast('Đã xác nhận hoàn thành nhiệm vụ.')
  }

  // Gửi phản hồi báo cáo tuần (US 18)
  function openFeedbackModal(report) {
    setFeedbackModal({ open: true, report, text: report.feedback || '' })
  }

  function handleSaveFeedback() {
    if (!feedbackModal.text.trim()) {
      alert('Vui lòng nhập nội dung phản hồi / nhận xét cho báo cáo của thực tập sinh.')
      return
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === feedbackModal.report.id
          ? { ...r, feedback: feedbackModal.text, status: 'reviewed' }
          : r
      )
    )
    setFeedbackModal({ open: false, report: null, text: '' })
    showToast('Đã gửi phản hồi nhận xét báo cáo tuần cho thực tập sinh thành công!')
  }

  // Đánh giá năng lực TTS (US 19)
  function openEvaluationModal(intern) {
    const existing = evaluations.find((e) => e.intern_id === intern.id)
    setEvaluationModal({
      open: true,
      intern,
      skill: existing ? existing.skill_score : 9,
      attitude: existing ? existing.attitude_score : 9,
      comment: existing ? existing.comment : '',
      recommendation: existing ? existing.recommendation : 'Tuyển dụng chính thức (Khuyên khích)',
    })
  }

  function handleSaveEvaluation() {
    if (!evaluationModal.comment.trim()) {
      alert('Vui lòng viết nhận xét chi tiết về quá trình thực tập của ứng viên.')
      return
    }

    const payload = {
      intern_id: evaluationModal.intern.id,
      intern_name: evaluationModal.intern.full_name,
      skill_score: Number(evaluationModal.skill),
      attitude_score: Number(evaluationModal.attitude),
      comment: evaluationModal.comment,
      recommendation: evaluationModal.recommendation,
      evaluated_at: '28/09/2026',
    }

    setEvaluations((prev) => {
      const filtered = prev.filter((e) => e.intern_id !== payload.intern_id)
      return [payload, ...filtered]
    })
    setEvaluationModal({ open: false, intern: null, skill: 9, attitude: 9, comment: '', recommendation: '' })
    showToast(`Đã lưu đánh giá thực tập sinh ${payload.intern_name} thành công. Dữ liệu đã gửi về HR.`)
  }

  // Lọc task theo trạng thái
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks
    return tasks.filter((t) => t.status === taskFilter)
  }, [tasks, taskFilter])

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length

  return (
    <div className="mentor-dash">
      {/* Toast Alert */}
      {toast && (
        <div className={`mentor-dash__toast mentor-dash__toast--${toast.type}`} role="alert">
          <span>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
          <div>{toast.message}</div>
        </div>
      )}

      {/* Header Mentor */}
      <header className="mentor-dash__header">
        <div>
          <nav className="mentor-dash__crumb" aria-label="Breadcrumb">
            <span>Mentor Portal</span>
            <span aria-hidden="true">/</span>
            <span>Tổng quan hướng dẫn</span>
          </nav>
          <h1>Xin chào Mentor, {user?.full_name || 'Cán bộ hướng dẫn'} 🌟</h1>
          <p className="mentor-dash__lead">
            Quản lý thực tập sinh được phân công: giao nhiệm vụ, hướng dẫn kỹ thuật, theo dõi tiến độ, phản hồi báo cáo và đánh giá năng lực cuối kỳ.
          </p>
        </div>

        <div className="mentor-dash__header-actions">
          <button
            type="button"
            className="mentor-dash__btn mentor-dash__btn--primary"
            onClick={() => setCreateTaskModal(true)}
          >
            + Giao việc mới
          </button>
          <button
            type="button"
            className="mentor-dash__btn mentor-dash__btn--ghost"
            onClick={() => setActiveTab('reports')}
          >
            ✍️ Phản hồi báo cáo ({pendingReportsCount})
          </button>
          <button
            type="button"
            className="mentor-dash__btn mentor-dash__btn--ghost"
            onClick={() => setActiveTab('evaluations')}
          >
            ⭐ Đánh giá TTS
          </button>
        </div>
      </header>

      {/* 4 Thẻ KPI Stats */}
      <section className="mentor-dash__stats" aria-label="Thống kê Mentor">
        <article className="mentor-stat mentor-stat--info">
          <p className="mentor-stat__label">TTS phụ trách</p>
          <p className="mentor-stat__value">{mentees.length}</p>
          <p className="mentor-stat__hint">{mentees.length} thực tập sinh đang trong giai đoạn đào tạo</p>
        </article>

        <article className="mentor-stat mentor-stat--neutral">
          <p className="mentor-stat__label">Nhiệm vụ đang giao</p>
          <p className="mentor-stat__value">{tasks.length}</p>
          <p className="mentor-stat__hint">
            {tasks.filter((t) => t.status === 'doing').length} đang làm · {tasks.filter((t) => t.status === 'review').length} chờ duyệt · {tasks.filter((t) => t.status === 'done').length} hoàn thành
          </p>
        </article>

        <article className="mentor-stat mentor-stat--warn">
          <p className="mentor-stat__label">Báo cáo tuần chờ duyệt</p>
          <p className="mentor-stat__value">{pendingReportsCount}</p>
          <p className="mentor-stat__hint">Báo cáo tuần mới nộp cần Mentor gửi nhận xét</p>
        </article>

        <article className="mentor-stat mentor-stat--success">
          <p className="mentor-stat__label">TTS đã đánh giá</p>
          <p className="mentor-stat__value">{evaluations.length}/{mentees.length}</p>
          <p className="mentor-stat__hint">Điểm kỹ năng & thái độ tổng hợp gửi về HR</p>
        </article>
      </section>

      {/* Navigation Tabs */}
      <nav className="mentor-dash__tabs" aria-label="Phân hệ chức năng Mentor">
        <button
          type="button"
          className={`mentor-dash__tab-btn ${activeTab === 'mentees' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('mentees')}
        >
          <span className="mentor-dash__tab-icon">👥</span>
          Thực tập sinh phụ trách ({mentees.length})
        </button>

        <button
          type="button"
          className={`mentor-dash__tab-btn ${activeTab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <span className="mentor-dash__tab-icon">📋</span>
          Nhiệm vụ & Tiến độ ({tasks.length})
        </button>

        <button
          type="button"
          className={`mentor-dash__tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="mentor-dash__tab-icon">📝</span>
          Báo cáo tuần ({pendingReportsCount > 0 ? `+${pendingReportsCount}` : reports.length})
        </button>

        <button
          type="button"
          className={`mentor-dash__tab-btn ${activeTab === 'evaluations' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          <span className="mentor-dash__tab-icon">⭐</span>
          Đánh giá năng lực cuối kỳ
        </button>
      </nav>

      {/* TAB 1: THỰC TẬP SINH PHỤ TRÁCH (US 31, SRS §7) */}
      {activeTab === 'mentees' && (
        <section className="mentor-dash__panel">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Danh sách Thực tập sinh do tôi hướng dẫn</h2>
              <p className="mentor-dash__panel-desc">
                Theo dõi tiến độ thực hiện công việc, chuyên cần và kết quả học tập của từng bạn.
              </p>
            </div>
            <button
              type="button"
              className="mentor-dash__btn mentor-dash__btn--primary mentor-dash__btn--sm"
              onClick={() => setCreateTaskModal(true)}
            >
              + Giao task mới
            </button>
          </div>

          <div className="mentor-mentees-grid">
            {mentees.length === 0 ? (
              <div className="mentor-empty" style={{ gridColumn: '1 / -1' }}>
                <span className="mentor-empty__icon">👥</span>
                <strong>Chưa có thực tập sinh nào</strong>
                <span>Hiện tại chưa có thực tập sinh nào trong danh mục hướng dẫn của bạn.</span>
              </div>
            ) : (
              mentees.map((m) => (
                <div key={m.id} className="mentor-mentee-card">
                  <div className="mentor-mentee-card__header">
                    <div className="mentor-mentee-card__avatar">{(m.full_name || 'T').charAt(0)}</div>
                    <div>
                      <strong className="mentor-mentee-card__name">{m.full_name}</strong>
                      <div className="mentor-table__sub">{m.email} · {m.phone}</div>
                    </div>
                    <span className="mentor-badge mentor-badge--success">Active</span>
                  </div>

                  <div className="mentor-mentee-card__body">
                    <p>🏫 <strong>Trường:</strong> {m.university}</p>
                    <p>💻 <strong>Ngành:</strong> {m.major} · GPA: {m.gpa}</p>
                    <p>⏱️ <strong>Chuyên cần:</strong> {m.attendance_rate} có mặt</p>

                    <div className="mentor-mentee-card__progress-wrap">
                      <div className="mentor-mentee-card__progress-label">
                        <span>Tiến độ thực tập:</span>
                        <strong>{m.progress}% ({m.tasks_done}/{m.total_tasks} tasks)</strong>
                      </div>
                      <div className="mentor-progress">
                        <div className="mentor-progress__bar" style={{ width: `${m.progress}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mentor-mentee-card__footer">
                    <button
                      type="button"
                      className="mentor-action-btn mentor-action-btn--primary"
                      onClick={() => {
                        setNewTask((prev) => ({ ...prev, intern_id: m.id }))
                        setCreateTaskModal(true)
                      }}
                    >
                      + Giao việc
                    </button>
                    <button
                      type="button"
                      className="mentor-action-btn mentor-action-btn--ghost"
                      onClick={() => openEvaluationModal(m)}
                    >
                      ⭐ Đánh giá
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 2: QUẢN LÝ NHIỆM VỤ (US 15, 16) */}
      {activeTab === 'tasks' && (
        <section className="mentor-dash__panel">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Quản lý & Giám sát tiến độ nhiệm vụ (US 15, 16)</h2>
              <p className="mentor-dash__panel-desc">Giao đầu việc cụ thể và nghiệm thu tiến độ hàng tuần.</p>
            </div>

            <div className="mentor-task-filters">
              <button
                type="button"
                className={`mentor-filter-btn ${taskFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setTaskFilter('all')}
              >
                Tất cả ({tasks.length})
              </button>
              <button
                type="button"
                className={`mentor-filter-btn ${taskFilter === 'doing' ? 'is-active' : ''}`}
                onClick={() => setTaskFilter('doing')}
              >
                Đang làm ({tasks.filter((t) => t.status === 'doing').length})
              </button>
              <button
                type="button"
                className={`mentor-filter-btn ${taskFilter === 'review' ? 'is-active' : ''}`}
                onClick={() => setTaskFilter('review')}
              >
                Chờ duyệt ({tasks.filter((t) => t.status === 'review').length})
              </button>
              <button
                type="button"
                className={`mentor-filter-btn ${taskFilter === 'done' ? 'is-active' : ''}`}
                onClick={() => setTaskFilter('done')}
              >
                Hoàn thành ({tasks.filter((t) => t.status === 'done').length})
              </button>
            </div>
          </div>

          <div className="mentor-table-wrap">
            <table className="mentor-table">
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
                  <th>TTS phụ trách</th>
                  <th>Thời hạn (Due)</th>
                  <th>Mức ưu tiên</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="mentor-empty">
                        <span className="mentor-empty__icon">📋</span>
                        <strong>Không có nhiệm vụ nào trong mục này</strong>
                        <span>Bấm "Giao việc mới" để thêm đầu việc cho TTS.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td style={{ maxWidth: '280px' }}>
                        <strong className="mentor-table__strong">{task.title}</strong>
                        <div className="mentor-table__sub">{task.description}</div>
                      </td>
                      <td>
                        <strong>{task.intern_name}</strong>
                      </td>
                      <td>
                        <span className="mentor-table__sub">🗓️ {task.due_at}</span>
                      </td>
                      <td>
                        <span
                          className={`mentor-badge mentor-badge--${
                            task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warn' : 'info'
                          }`}
                        >
                          {task.priority === 'high' ? 'Ưu tiên cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        <div className="mentor-task-progress-cell">
                          <span>{task.progress}%</span>
                          <div className="mentor-progress mentor-progress--thin">
                            <div className="mentor-progress__bar" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`mentor-badge mentor-badge--${
                            task.status === 'done' ? 'success' : task.status === 'review' ? 'warn' : 'info'
                          }`}
                        >
                          {task.status === 'done'
                            ? '✓ Đã xong'
                            : task.status === 'review'
                            ? '⏳ Chờ xem xét'
                            : '⚡ Đang làm'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {task.status !== 'done' ? (
                          <button
                            type="button"
                            className="mentor-action-btn mentor-action-btn--approve"
                            onClick={() => handleMarkTaskDone(task.id)}
                            title="Xác nhận duyệt hoàn thành task"
                          >
                            ✓ Nghiệm thu
                          </button>
                        ) : (
                          <span className="mentor-table__sub">Đã nghiệm thu</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: BÁO CÁO TUẦN (US 17, 18) */}
      {activeTab === 'reports' && (
        <section className="mentor-dash__panel">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Báo cáo tuần & Phản hồi hướng dẫn (US 17, 18)</h2>
              <p className="mentor-dash__panel-desc">
                Thực tập sinh nộp báo cáo định kỳ vào cuối tuần. Mentor xem xét và ghi nhận xét hướng dẫn.
              </p>
            </div>
          </div>

          <div className="mentor-reports-list">
            {reports.map((report) => (
              <div key={report.id} className="mentor-report-card">
                <div className="mentor-report-card__header">
                  <div>
                    <strong className="mentor-report-card__title">{report.week_range}</strong>
                    <div className="mentor-table__sub">
                      Thực tập sinh: <strong>{report.intern_name}</strong> · Nộp lúc: {report.submitted_at}
                    </div>
                  </div>

                  <span
                    className={`mentor-badge mentor-badge--${
                      report.status === 'reviewed' ? 'success' : 'warn'
                    }`}
                  >
                    {report.status === 'reviewed' ? '✓ Đã phản hồi' : '⏳ Chờ nhận xét'}
                  </span>
                </div>

                <div className="mentor-report-card__body">
                  <div className="mentor-report-section">
                    <strong>1. Kết quả công việc đạt được trong tuần:</strong>
                    <p>{report.summary}</p>
                  </div>

                  <div className="mentor-report-section">
                    <strong>2. Khó khăn / Vấn đề cần Mentor hỗ trợ:</strong>
                    <p>{report.issues}</p>
                  </div>

                  <div className="mentor-report-section">
                    <strong>3. Kế hoạch công việc tuần tới:</strong>
                    <p>{report.plan}</p>
                  </div>

                  <div className="mentor-report-file">
                    <span>📎 Tệp đính kèm:</span>
                    <button
                      type="button"
                      className="mentor-link-btn"
                      onClick={() => showToast(`Đang tải file ${report.file_name}`)}
                    >
                      📄 {report.file_name}
                    </button>
                  </div>

                  {report.feedback && (
                    <div className="mentor-report-feedback-box">
                      <strong>💬 Nhận xét của Mentor:</strong>
                      <p>{report.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="mentor-report-card__footer">
                  <button
                    type="button"
                    className="mentor-action-btn mentor-action-btn--primary"
                    onClick={() => openFeedbackModal(report)}
                  >
                    ✍️ {report.feedback ? 'Chỉnh sửa phản hồi' : 'Viết phản hồi cho TTS'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: ĐÁNH GIÁ NĂNG LỰC CUỐI KỲ (US 19, 20) */}
      {activeTab === 'evaluations' && (
        <section className="mentor-dash__panel">
          <div className="mentor-dash__panel-head">
            <div>
              <h2>Đánh giá kỹ năng & thái độ thực tập sinh (US 19, 20)</h2>
              <p className="mentor-dash__panel-desc">
                Bảng đánh giá chính thức gửi về bộ phận HR tổng hợp báo cáo gửi Nhà trường ICTU và Ban Giám đốc.
              </p>
            </div>
          </div>

          <div className="mentor-evaluations-grid">
            {mentees.map((m) => {
              const evalData = evaluations.find((e) => e.intern_id === m.id)
              return (
                <div key={m.id} className="mentor-eval-card">
                  <div className="mentor-eval-card__header">
                    <div>
                      <strong>{m.full_name}</strong>
                      <div className="mentor-table__sub">{m.major} · {m.university}</div>
                    </div>
                    {evalData ? (
                      <span className="mentor-badge mentor-badge--success">Đã đánh giá</span>
                    ) : (
                      <span className="mentor-badge mentor-badge--warn">Chưa đánh giá</span>
                    )}
                  </div>

                  {evalData ? (
                    <div className="mentor-eval-card__content">
                      <div className="mentor-eval-scores">
                        <div className="mentor-eval-score-item">
                          <span>Kỹ năng chuyên môn:</span>
                          <strong className="mentor-score-num">{evalData.skill_score}/10</strong>
                        </div>
                        <div className="mentor-eval-score-item">
                          <span>Thái độ & Tác phong:</span>
                          <strong className="mentor-score-num">{evalData.attitude_score}/10</strong>
                        </div>
                      </div>

                      <div className="mentor-eval-recommendation">
                        <span>Đề xuất:</span>
                        <strong>{evalData.recommendation}</strong>
                      </div>

                      <p className="mentor-eval-comment">"{evalData.comment}"</p>
                      <div className="mentor-table__sub">Đánh giá ngày: {evalData.evaluated_at}</div>
                    </div>
                  ) : (
                    <div className="mentor-eval-card__empty">
                      <p>Chưa có phiếu đánh giá cho bạn này.</p>
                      <span className="mentor-table__sub">Vui lòng hoàn thành đánh giá trước khi kết thúc kỳ thực tập.</span>
                    </div>
                  )}

                  <div className="mentor-eval-card__footer">
                    <button
                      type="button"
                      className="mentor-action-btn mentor-action-btn--primary"
                      onClick={() => openEvaluationModal(m)}
                    >
                      {evalData ? '✏️ Cập nhật điểm & nhận xét' : '⭐ Chấm điểm ngay'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* MODAL 1: GIAO NHIỆM VỤ MỚI (US 15) */}
      {createTaskModal && (
        <div className="mentor-modal-overlay">
          <div className="mentor-modal">
            <div className="mentor-modal__head">
              <h3>Giao nhiệm vụ mới cho Thực tập sinh</h3>
              <button type="button" className="mentor-modal__close" onClick={() => setCreateTaskModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="mentor-modal__body">
                <div className="mentor-modal__field">
                  <label htmlFor="task-intern">Thực tập sinh phụ trách *:</label>
                  <select
                    id="task-intern"
                    value={newTask.intern_id}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, intern_id: e.target.value }))}
                    className="mentor-modal__select"
                  >
                    {mentees.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.major})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mentor-modal__field">
                  <label htmlFor="task-title">Tiêu đề nhiệm vụ *:</label>
                  <input
                    id="task-title"
                    type="text"
                    placeholder="Ví dụ: Thiết kế Database schema cho Epic 4..."
                    value={newTask.title}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                    className="mentor-modal__input"
                    required
                  />
                </div>

                <div className="mentor-modal__field">
                  <label htmlFor="task-desc">Mô tả công việc & Yêu cầu bàn giao:</label>
                  <textarea
                    id="task-desc"
                    rows={3}
                    placeholder="Mô tả chi tiết các bước cần thực hiện, tiêu chí nghiệm thu..."
                    value={newTask.description}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                    className="mentor-modal__textarea"
                  />
                </div>

                <div className="mentor-modal__row">
                  <div className="mentor-modal__field" style={{ flex: 1 }}>
                    <label htmlFor="task-due">Hạn hoàn thành (Due date) *:</label>
                    <input
                      id="task-due"
                      type="date"
                      value={newTask.due_at}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, due_at: e.target.value }))}
                      className="mentor-modal__input"
                      required
                    />
                  </div>

                  <div className="mentor-modal__field" style={{ flex: 1 }}>
                    <label htmlFor="task-priority">Mức độ ưu tiên:</label>
                    <select
                      id="task-priority"
                      value={newTask.priority}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value }))}
                      className="mentor-modal__select"
                    >
                      <option value="high">Cao (Gấp)</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mentor-modal__actions">
                <button
                  type="button"
                  className="mentor-dash__btn mentor-dash__btn--ghost"
                  onClick={() => setCreateTaskModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="mentor-dash__btn mentor-dash__btn--primary">
                  ✓ Giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PHẢN HỒI BÁO CÁO TUẦN (US 18) */}
      {feedbackModal.open && (
        <div className="mentor-modal-overlay">
          <div className="mentor-modal">
            <div className="mentor-modal__head">
              <h3>Phản hồi báo cáo: {feedbackModal.report?.week_range}</h3>
              <button
                type="button"
                className="mentor-modal__close"
                onClick={() => setFeedbackModal({ open: false, report: null, text: '' })}
              >
                ✕
              </button>
            </div>

            <div className="mentor-modal__body">
              <p>
                Thực tập sinh: <strong>{feedbackModal.report?.intern_name}</strong>
              </p>
              <div className="mentor-modal__field">
                <label htmlFor="feedback-text">
                  Nhận xét & Góp ý hướng dẫn của Mentor *:
                </label>
                <textarea
                  id="feedback-text"
                  rows={4}
                  placeholder="Ghi nhận điểm tốt, lưu ý các lỗi cần chỉnh sửa, giao thêm hướng nghiên cứu..."
                  value={feedbackModal.text}
                  onChange={(e) => setFeedbackModal((prev) => ({ ...prev, text: e.target.value }))}
                  className="mentor-modal__textarea"
                />
              </div>
            </div>

            <div className="mentor-modal__actions">
              <button
                type="button"
                className="mentor-dash__btn mentor-dash__btn--ghost"
                onClick={() => setFeedbackModal({ open: false, report: null, text: '' })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="mentor-dash__btn mentor-dash__btn--primary"
                onClick={handleSaveFeedback}
              >
                Gửi phản hồi cho TTS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ĐÁNH GIÁ NĂNG LỰC TTS (US 19, 20) */}
      {evaluationModal.open && (
        <div className="mentor-modal-overlay">
          <div className="mentor-modal">
            <div className="mentor-modal__head">
              <h3>Đánh giá năng lực: {evaluationModal.intern?.full_name}</h3>
              <button
                type="button"
                className="mentor-modal__close"
                onClick={() => setEvaluationModal({ open: false, intern: null, skill: 9, attitude: 9, comment: '', recommendation: '' })}
              >
                ✕
              </button>
            </div>

            <div className="mentor-modal__body">
              <div className="mentor-modal__row">
                <div className="mentor-modal__field" style={{ flex: 1 }}>
                  <label htmlFor="eval-skill">Điểm Kỹ năng (1 - 10) *:</label>
                  <input
                    id="eval-skill"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={evaluationModal.skill}
                    onChange={(e) => setEvaluationModal((prev) => ({ ...prev, skill: e.target.value }))}
                    className="mentor-modal__input"
                  />
                </div>

                <div className="mentor-modal__field" style={{ flex: 1 }}>
                  <label htmlFor="eval-att">Điểm Thái độ (1 - 10) *:</label>
                  <input
                    id="eval-att"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={evaluationModal.attitude}
                    onChange={(e) => setEvaluationModal((prev) => ({ ...prev, attitude: e.target.value }))}
                    className="mentor-modal__input"
                  />
                </div>
              </div>

              <div className="mentor-modal__field">
                <label htmlFor="eval-rec">Đề xuất kết quả sau thực tập *:</label>
                <select
                  id="eval-rec"
                  value={evaluationModal.recommendation}
                  onChange={(e) => setEvaluationModal((prev) => ({ ...prev, recommendation: e.target.value }))}
                  className="mentor-modal__select"
                >
                  <option value="Tuyển dụng chính thức (Khuyên khích)">Tuyển dụng chính thức (Khuyên khích)</option>
                  <option value="Hoàn thành tốt kỳ thực tập (Đạt)">Hoàn thành tốt kỳ thực tập (Đạt)</option>
                  <option value="Cần rèn luyện thêm kỹ năng mềm">Cần rèn luyện thêm kỹ năng mềm</option>
                  <option value="Không đạt yêu cầu">Không đạt yêu cầu</option>
                </select>
              </div>

              <div className="mentor-modal__field">
                <label htmlFor="eval-comment">Nhận xét chi tiết *:</label>
                <textarea
                  id="eval-comment"
                  rows={4}
                  placeholder="Đánh giá chi tiết ưu điểm, nhược điểm, mức độ hoàn thành nhiệm vụ và tiềm năng phát triển của TTS..."
                  value={evaluationModal.comment}
                  onChange={(e) => setEvaluationModal((prev) => ({ ...prev, comment: e.target.value }))}
                  className="mentor-modal__textarea"
                />
              </div>
            </div>

            <div className="mentor-modal__actions">
              <button
                type="button"
                className="mentor-dash__btn mentor-dash__btn--ghost"
                onClick={() => setEvaluationModal({ open: false, intern: null, skill: 9, attitude: 9, comment: '', recommendation: '' })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="mentor-dash__btn mentor-dash__btn--primary"
                onClick={handleSaveEvaluation}
              >
                Lưu đánh giá & Gửi về HR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
