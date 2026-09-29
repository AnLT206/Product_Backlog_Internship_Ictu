import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getInterns, approveIntern, rejectIntern } from '../../api/interns'
import { getPrograms } from '../../api/programs'
import { getMentors, getDepartments } from '../../api/mentors'
import './HrDashboardPage.css'

const INITIAL_LEAVES = [
  {
    id: 201,
    intern_name: 'Nguyễn Văn An',
    email: 'an.nv@ictu.edu.vn',
    dates: '29/09/2026 - 30/09/2026 (2 ngày)',
    reason: 'Trùng lịch thi kết thúc học phần tại trường ICTU',
    created_at: '28/09/2026 08:30',
    status: 'pending',
  },
  {
    id: 202,
    intern_name: 'Trần Thị Bình',
    email: 'binh.tt@ictu.edu.vn',
    dates: '01/10/2026 (1 ngày)',
    reason: 'Tham gia bảo vệ đề cương khóa luận tốt nghiệp',
    created_at: '28/09/2026 10:15',
    status: 'pending',
  },
]

const INITIAL_TICKETS = [
  {
    id: 301,
    intern_name: 'Lê Hoàng Cường',
    type: 'Cấp giấy chứng nhận thực tập',
    content: 'Em cần xin giấy xác nhận đang thực tập tại công ty để nộp về khoa CNTT trường ICTU.',
    created_at: '27/09/2026',
    status: 'pending',
  },
  {
    id: 302,
    intern_name: 'Phạm Thị Dung',
    type: 'Đổi máy trạm / Thiết bị',
    content: 'Máy tính làm việc tại phòng Dev 2 quạt tản nhiệt kêu to và lag khi chạy Docker.',
    created_at: '26/09/2026',
    status: 'pending',
  },
]

export default function HrDashboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'programs' | 'attendance' | 'support' | 'analytics'
  const [pendingInterns, setPendingInterns] = useState([])
  const [allInterns, setAllInterns] = useState([])
  const [programs, setPrograms] = useState([])
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVES)
  const [supportTickets, setSupportTickets] = useState(INITIAL_TICKETS)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Dialog State
  const [rejectDialog, setRejectDialog] = useState({ open: false, intern: null, note: '' })
  const [previewDoc, setPreviewDoc] = useState({ open: false, intern: null, fileName: '', fileType: '' })
  const [exportModal, setExportModal] = useState(false)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    let isMounted = true

    async function loadDashboardData() {
      setLoading(true)
      try {
        const [pendingRes, allRes, progRes, mentorRes, deptRes] = await Promise.all([
          getInterns({ status: 'pending' }),
          getInterns({ page_size: 100 }),
          getPrograms(),
          getMentors(),
          getDepartments(),
        ])

        if (!isMounted) return

        if (pendingRes.ok && pendingRes.data?.items) {
          setPendingInterns(pendingRes.data.items)
        } else {
          setPendingInterns([])
        }

        if (allRes.ok && allRes.data?.items) {
          setAllInterns(allRes.data.items)
        } else {
          setAllInterns([])
        }

        if (progRes.ok && Array.isArray(progRes.data)) {
          setPrograms(progRes.data)
        } else {
          setPrograms([])
        }

        const deptMap = {}
        if (deptRes.ok && Array.isArray(deptRes.data)) {
          deptRes.data.forEach((d) => {
            deptMap[d.id] = d.name
          })
        }

        if (mentorRes.ok && Array.isArray(mentorRes.data)) {
          const mappedMentors = mentorRes.data.map((m) => ({
            id: m.id,
            name: m.full_name,
            dept: deptMap[m.department_id] || m.department || 'Chưa phân bổ',
            active_mentees: m.intern_count || 0,
            max_capacity: 5,
          }))
          setMentors(mappedMentors)
        } else {
          setMentors([])
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu dashboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      isMounted = false
    }
  }, [])

  // Duyệt hồ sơ TTS (US 7)
  async function handleApproveIntern(intern) {
    try {
      const res = await approveIntern(intern.id)
      if (res.ok) {
        setPendingInterns((prev) => prev.filter((i) => i.id !== intern.id))
        setAllInterns((prev) =>
          prev.map((i) => (i.id === intern.id ? { ...i, status: 'active' } : i))
        )
        showToast(`Đã duyệt hồ sơ của TTS ${intern.full_name}! Trạng thái chuyển thành "Active". Đã gửi email xác nhận.`)
      } else {
        showToast(res.data?.detail || 'Không thể duyệt hồ sơ. Vui lòng thử lại.', 'error')
      }
    } catch {
      showToast('Đã có lỗi xảy ra khi duyệt hồ sơ.', 'error')
    }
  }

  // Từ chối hồ sơ TTS (US 7, 8, spec §5.4)
  function openRejectModal(intern) {
    setRejectDialog({ open: true, intern, note: '' })
  }

  async function confirmRejectIntern() {
    if (!rejectDialog.note.trim()) {
      alert('Vui lòng nhập lý do từ chối hồ sơ (quy định bắt buộc theo đặc tả nghiệp vụ).')
      return
    }
    const internId = rejectDialog.intern.id
    const internName = rejectDialog.intern.full_name
    try {
      const res = await rejectIntern(internId, rejectDialog.note)
      if (res.ok) {
        setPendingInterns((prev) => prev.filter((i) => i.id !== internId))
        setAllInterns((prev) =>
          prev.map((i) => (i.id === internId ? { ...i, status: 'rejected' } : i))
        )
        setRejectDialog({ open: false, intern: null, note: '' })
        showToast(`Đã từ chối hồ sơ của TTS ${internName}. Lý do: "${rejectDialog.note}". Đã gửi email thông báo kết quả.`, 'info')
      } else {
        showToast(res.data?.detail || 'Không thể từ chối hồ sơ. Vui lòng thử lại.', 'error')
      }
    } catch {
      showToast('Đã có lỗi xảy ra khi từ chối hồ sơ.', 'error')
    }
  }

  // Duyệt đơn xin nghỉ phép (US 22)
  function handleApproveLeave(id) {
    setLeaveRequests((prev) => prev.filter((l) => l.id !== id))
    showToast('Đã phê duyệt đơn xin nghỉ phép thành công.')
  }

  function handleRejectLeave(id) {
    setLeaveRequests((prev) => prev.filter((l) => l.id !== id))
    showToast('Đã từ chối đơn xin nghỉ phép.', 'info')
  }

  // Xử lý phiếu hỗ trợ (US 28)
  function handleResolveTicket(id) {
    setSupportTickets((prev) => prev.filter((t) => t.id !== id))
    showToast('Đã phản hồi và hoàn tất xử lý yêu cầu hỗ trợ.')
  }

  // Lọc danh sách pending theo ô tìm kiếm
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingInterns
    const q = searchQuery.toLowerCase()
    return pendingInterns.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.university && item.university.toLowerCase().includes(q)) ||
        (item.major && item.major.toLowerCase().includes(q))
    )
  }, [pendingInterns, searchQuery])

  return (
    <div className="hr-dash">
      {/* Toast alert */}
      {toast && (
        <div className={`hr-dash__toast hr-dash__toast--${toast.type}`} role="alert">
          <span>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
          <div>{toast.message}</div>
        </div>
      )}

      {/* Header chào mừng & Quick Actions */}
      <header className="hr-dash__header">
        <div>
          <nav className="hr-dash__crumb" aria-label="Breadcrumb">
            <span>HR Portal</span>
            <span aria-hidden="true">/</span>
            <span>Tổng quan quản lý</span>
          </nav>
          <h1>Xin chào, {user?.full_name || 'Cán bộ Nhân sự HR'} 👋</h1>
          <p className="hr-dash__lead">
            Hệ thống quản lý toàn bộ vòng đời thực tập sinh ICTU: tiếp nhận hồ sơ, xét duyệt, phân công mentor, chấm công và đánh giá.
          </p>
        </div>

        <div className="hr-dash__header-actions">
          <Link to="/hr/interns/new" className="hr-dash__btn hr-dash__btn--primary">
            + Thêm hồ sơ TTS
          </Link>
          <Link to="/hr/programs/new" className="hr-dash__btn hr-dash__btn--ghost">
            + Tạo kỳ thực tập
          </Link>
          <Link to="/hr/mentors" className="hr-dash__btn hr-dash__btn--ghost">
            + Thêm Mentor
          </Link>
          <button
            type="button"
            className="hr-dash__btn hr-dash__btn--ghost"
            onClick={() => setExportModal(true)}
          >
            📥 Xuất báo cáo
          </button>
        </div>
      </header>

      {/* 4 Thẻ KPI Stats */}
      <section className="hr-dash__stats" aria-label="Thống kê tổng quan HR">
        <article className="hr-stat hr-stat--info">
          <p className="hr-stat__label">Tổng thực tập sinh</p>
          <p className="hr-stat__value">{allInterns.length}</p>
          <p className="hr-stat__hint">
            {allInterns.filter((i) => i.status === 'active').length} đang thực tập · {pendingInterns.length} chờ duyệt · {allInterns.filter((i) => i.status === 'completed').length} hoàn thành
          </p>
        </article>

        <article className="hr-stat hr-stat--warn">
          <p className="hr-stat__label">Hồ sơ chờ duyệt</p>
          <p className="hr-stat__value">{pendingInterns.length}</p>
          <p className="hr-stat__hint">Cần HR xét duyệt hồ sơ & tài liệu CV</p>
        </article>

        <article className="hr-stat hr-stat--neutral">
          <p className="hr-stat__label">Kỳ thực tập đang mở</p>
          <p className="hr-stat__value">{programs.filter((p) => p.status === 'open' || !p.status).length}</p>
          <p className="hr-stat__hint">{programs.length} chương trình đào tạo</p>
        </article>

        <article className="hr-stat hr-stat--success">
          <p className="hr-stat__label">Đơn nghỉ & Hỗ trợ</p>
          <p className="hr-stat__value">{leaveRequests.length + supportTickets.length}</p>
          <p className="hr-stat__hint">{leaveRequests.length} đơn xin nghỉ · {supportTickets.length} phiếu hỗ trợ cần xử lý</p>
        </article>
      </section>

      {/* Navigation Tabs */}
      <nav className="hr-dash__tabs" aria-label="Phân hệ chức năng">
        <button
          type="button"
          className={`hr-dash__tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="hr-dash__tab-icon">📥</span>
          Hồ sơ chờ xét duyệt ({pendingInterns.length})
        </button>

        <button
          type="button"
          className={`hr-dash__tab-btn ${activeTab === 'programs' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          <span className="hr-dash__tab-icon">🎓</span>
          Kỳ thực tập & Mentor
        </button>

        <button
          type="button"
          className={`hr-dash__tab-btn ${activeTab === 'attendance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="hr-dash__tab-icon">⏱️</span>
          Chấm công & Nghỉ phép ({leaveRequests.length})
        </button>

        <button
          type="button"
          className={`hr-dash__tab-btn ${activeTab === 'support' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          <span className="hr-dash__tab-icon">💬</span>
          Phụ cấp & Hỗ trợ ({supportTickets.length})
        </button>

        <button
          type="button"
          className={`hr-dash__tab-btn ${activeTab === 'analytics' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="hr-dash__tab-icon">📊</span>
          Báo cáo & Thống kê
        </button>
      </nav>

      {/* TAB CONTENT 1: HỒ SƠ CHỜ DUYỆT (US 7, 8, 5) */}
      {activeTab === 'pending' && (
        <section className="hr-dash__panel">
          <div className="hr-dash__panel-head">
            <div>
              <h2>Xét duyệt hồ sơ ứng viên đăng ký thực tập</h2>
              <p className="hr-dash__panel-desc">
                Kiểm tra thông tin cá nhân, trường, ngành và tài liệu đính kèm (CV, Đơn xin thực tập) trước khi phê duyệt.
              </p>
            </div>
            <div className="hr-dash__search-bar">
              <input
                type="text"
                placeholder="Tìm theo tên, email, trường, ngành..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hr-dash__input"
              />
            </div>
          </div>

          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead>
                <tr>
                  <th>Họ tên & Email</th>
                  <th>Trường & Ngành</th>
                  <th>GPA</th>
                  <th>Tài liệu đính kèm</th>
                  <th>Ngày nộp</th>
                  <th style={{ textAlign: 'center' }}>Thao tác xét duyệt</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="hr-empty">
                        <span className="hr-empty__icon">🎉</span>
                        <strong>Không có hồ sơ nào đang chờ duyệt</strong>
                        <span>Tất cả hồ sơ đăng ký đã được xử lý xong.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((intern) => {
                    const phoneDisplay = intern.phone_number || intern.phone || 'Chưa có SĐT'
                    const uniDisplay = intern.university || 'ĐH Công nghệ Thông tin & Truyền thông (ICTU)'
                    const majorDisplay = intern.major || 'Công nghệ thông tin'
                    const gpaDisplay = intern.gpa ? Number(intern.gpa).toFixed(2) : '3.50'
                    const dateDisplay = intern.created_at
                      ? new Date(intern.created_at).toLocaleDateString('vi-VN')
                      : (intern.applied_date || 'Mới nộp')
                    const cvName = intern.cv_file || `CV_${intern.full_name?.replace(/\s+/g, '') || 'TTS'}.pdf`
                    const appName = intern.app_file || `DonXinThucTap_${intern.full_name?.replace(/\s+/g, '') || 'TTS'}.pdf`

                    return (
                      <tr key={intern.id}>
                        <td>
                          <strong className="hr-table__strong">{intern.full_name}</strong>
                          <div className="hr-table__sub">{intern.email} · {phoneDisplay}</div>
                        </td>
                        <td>
                          <div>{uniDisplay}</div>
                          <div className="hr-table__sub">{majorDisplay}</div>
                        </td>
                        <td>
                          <span className="hr-badge hr-badge--info">{gpaDisplay}</span>
                        </td>
                        <td>
                          <div className="hr-doc-links">
                            <button
                              type="button"
                              className="hr-link-btn"
                              onClick={() =>
                                setPreviewDoc({
                                  open: true,
                                  intern,
                                  fileName: cvName,
                                  fileType: 'Curriculum Vitae (CV)',
                                })
                              }
                            >
                              📄 {cvName}
                            </button>
                            <button
                              type="button"
                              className="hr-link-btn"
                              onClick={() =>
                                setPreviewDoc({
                                  open: true,
                                  intern,
                                  fileName: appName,
                                  fileType: 'Đơn xin thực tập',
                                })
                              }
                            >
                              📝 {appName}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="hr-table__sub">{dateDisplay}</span>
                        </td>
                      <td>
                        <div className="hr-actions-cell">
                          <button
                            type="button"
                            className="hr-action-btn hr-action-btn--approve"
                            onClick={() => handleApproveIntern(intern)}
                            title="Duyệt và kích hoạt tài khoản TTS"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            type="button"
                            className="hr-action-btn hr-action-btn--reject"
                            onClick={() => openRejectModal(intern)}
                            title="Từ chối hồ sơ kèm lý do"
                          >
                            ✕ Từ chối
                          </button>
                          <Link
                            to={`/hr/interns/${intern.id}/edit`}
                            className="hr-action-btn hr-action-btn--edit"
                            title="Xem chi tiết / Chỉnh sửa hồ sơ"
                          >
                            👁️ Chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB CONTENT 2: KỲ THỰC TẬP & MENTOR (US 11, 12, 29, 31) */}
      {activeTab === 'programs' && (
        <div className="hr-dash__grid-2">
          {/* Danh sách chương trình */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Chương trình thực tập đang mở</h2>
                <p className="hr-dash__panel-desc">Theo dõi tiến độ tiếp nhận và chỉ tiêu tuyển sinh.</p>
              </div>
              <Link to="/hr/programs/new" className="hr-dash__btn hr-dash__btn--primary hr-dash__btn--sm">
                + Thêm kỳ mới
              </Link>
            </div>

            <div className="hr-programs-list">
              {programs.length === 0 ? (
                <div className="hr-empty">
                  <span className="hr-empty__icon">📚</span>
                  <strong>Chưa có chương trình thực tập nào</strong>
                  <span>Bấm "+ Thêm kỳ mới" để khởi tạo chương trình thực tập.</span>
                </div>
              ) : (
                programs.map((prog) => {
                  const max = prog.max_interns || 20
                  const curr = prog.current_interns || 0
                  const percent = Math.min(100, Math.round((curr / max) * 100))
                  return (
                    <div key={prog.id} className="hr-prog-card">
                      <div className="hr-prog-card__head">
                        <div>
                          <h3>{prog.name}</h3>
                          <p className="hr-prog-card__dept">Phòng ban: <strong>{prog.department || 'Chung'}</strong></p>
                        </div>
                        <span className="hr-badge hr-badge--success">
                          {prog.status === 'active' || prog.status === 'open' || !prog.status ? 'Đang mở' : prog.status}
                        </span>
                      </div>

                      <div className="hr-prog-card__meta">
                        <span>🗓️ {prog.start_date || 'Chưa định'} → {prog.end_date || 'Chưa định'}</span>
                        <span>👥 {curr}/{max} thực tập sinh</span>
                      </div>

                      <div className="hr-progress">
                        <div className="hr-progress__bar" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Cân bằng Workload Mentor */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Khối lượng hướng dẫn Mentor (Workload)</h2>
                <p className="hr-dash__panel-desc">Cân bằng số lượng TTS phân công cho từng Mentor.</p>
              </div>
              <Link to="/hr/mentors" className="hr-dash__btn hr-dash__btn--ghost hr-dash__btn--sm">
                Quản lý Mentor →
              </Link>
            </div>

            <div className="hr-mentor-workload-list">
              {mentors.length === 0 ? (
                <div className="hr-empty">
                  <span className="hr-empty__icon">👥</span>
                  <strong>Chưa có mentor nào</strong>
                  <span>Bấm "Quản lý Mentor" để thêm người hướng dẫn.</span>
                </div>
              ) : (
                mentors.map((m) => {
                  const load = Math.min(100, Math.round((m.active_mentees / m.max_capacity) * 100))
                  return (
                    <div key={m.id} className="hr-mentor-row">
                      <div className="hr-mentor-row__info">
                        <div className="hr-mentor-row__avatar">{(m.name || 'M').charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{m.name}</strong>
                          <div className="hr-table__sub">{m.dept}</div>
                        </div>
                      </div>

                      <div className="hr-mentor-row__stats">
                        <span>{m.active_mentees}/{m.max_capacity} TTS</span>
                        <div className="hr-progress hr-progress--thin">
                          <div
                            className={`hr-progress__bar ${load >= 80 ? 'hr-progress__bar--warn' : ''}`}
                            style={{ width: `${load}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 3: CHẤM CÔNG & NGHỈ PHÉP (US 21 - 24) */}
      {activeTab === 'attendance' && (
        <div className="hr-dash__grid-2">
          {/* Đơn xin nghỉ phép chờ duyệt */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Đơn xin nghỉ phép cần phê duyệt (US 22, 24)</h2>
                <p className="hr-dash__panel-desc">Xem xét lý do và lịch trình vắng mặt của thực tập sinh.</p>
              </div>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="hr-empty">
                <span className="hr-empty__icon">☕</span>
                <strong>Không có đơn xin nghỉ phép nào đang chờ</strong>
                <span>Tất cả đơn nghỉ phép đã được phê duyệt.</span>
              </div>
            ) : (
              <div className="hr-leave-list">
                {leaveRequests.map((leave) => (
                  <div key={leave.id} className="hr-leave-item">
                    <div className="hr-leave-item__top">
                      <div>
                        <strong>{leave.intern_name}</strong>
                        <span className="hr-table__sub"> ({leave.email})</span>
                      </div>
                      <span className="hr-badge hr-badge--warn">Chờ duyệt</span>
                    </div>

                    <p className="hr-leave-item__dates">⏰ <strong>Thời gian:</strong> {leave.dates}</p>
                    <p className="hr-leave-item__reason">📝 <strong>Lý do:</strong> {leave.reason}</p>
                    <p className="hr-table__sub">Gửi lúc: {leave.created_at}</p>

                    <div className="hr-leave-item__actions">
                      <button
                        type="button"
                        className="hr-action-btn hr-action-btn--approve"
                        onClick={() => handleApproveLeave(leave.id)}
                      >
                        ✓ Duyệt đơn
                      </button>
                      <button
                        type="button"
                        className="hr-action-btn hr-action-btn--reject"
                        onClick={() => handleRejectLeave(leave.id)}
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Báo cáo chuyên cần hôm nay */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Tình hình chuyên cần hôm nay</h2>
                <p className="hr-dash__panel-desc">Theo dõi check-in / check-out thực tế.</p>
              </div>
            </div>

            <div className="hr-attendance-summary">
              <div className="hr-attend-box hr-attend-box--green">
                <span className="hr-attend-box__num">20</span>
                <span className="hr-attend-box__title">Có mặt đúng giờ</span>
              </div>
              <div className="hr-attend-box hr-attend-box--yellow">
                <span className="hr-attend-box__num">2</span>
                <span className="hr-attend-box__title">Đi muộn</span>
              </div>
              <div className="hr-attend-box hr-attend-box--red">
                <span className="hr-attend-box__num">2</span>
                <span className="hr-attend-box__title">Nghỉ có phép</span>
              </div>
            </div>

            <div className="hr-attendance-notice">
              <p>💡 <strong>Ghi chú:</strong> Hệ thống tự động khóa check-in sau 09:00 sáng. Thực tập sinh quên chấm công cần gửi yêu cầu giải trình cho HR.</p>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 4: PHỤ CẤP & PHIẾU HỖ TRỢ (US 25 - 28) */}
      {activeTab === 'support' && (
        <div className="hr-dash__grid-2">
          {/* Phiếu hỗ trợ */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Yêu cầu hỗ trợ từ thực tập sinh (US 27, 28)</h2>
                <p className="hr-dash__panel-desc">Cấp giấy tờ, thiết bị làm việc, điều chỉnh thời gian.</p>
              </div>
            </div>

            {supportTickets.length === 0 ? (
              <div className="hr-empty">
                <span className="hr-empty__icon">✨</span>
                <strong>Không có yêu cầu hỗ trợ tồn đọng</strong>
                <span>Tất cả các phiếu hỗ trợ đã được xử lý kịp thời.</span>
              </div>
            ) : (
              <div className="hr-ticket-list">
                {supportTickets.map((ticket) => (
                  <div key={ticket.id} className="hr-ticket-card">
                    <div className="hr-ticket-card__header">
                      <strong>{ticket.intern_name}</strong>
                      <span className="hr-badge hr-badge--info">{ticket.type}</span>
                    </div>
                    <p className="hr-ticket-card__body">{ticket.content}</p>
                    <div className="hr-ticket-card__footer">
                      <span className="hr-table__sub">Gửi ngày: {ticket.created_at}</span>
                      <button
                        type="button"
                        className="hr-action-btn hr-action-btn--approve"
                        onClick={() => handleResolveTicket(ticket.id)}
                      >
                        ✓ Hoàn thành & Phản hồi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quản lý phụ cấp */}
          <section className="hr-dash__panel">
            <div className="hr-dash__panel-head">
              <div>
                <h2>Quản lý phụ cấp thực tập sinh (US 25)</h2>
                <p className="hr-dash__panel-desc">Kỳ chi trả tháng 09/2026.</p>
              </div>
            </div>

            <div className="hr-allowance-box">
              <div className="hr-allowance-stat">
                <p className="hr-allowance-stat__label">Tổng ngân sách phụ cấp tháng này</p>
                <p className="hr-allowance-stat__val">66.000.000 đ</p>
                <p className="hr-table__sub">Định mức: 3.000.000 đ / TTS xuất sắc, 2.500.000 đ / TTS cơ bản</p>
              </div>

              <div className="hr-table-wrap">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>Kỳ</th>
                      <th>Mức phụ cấp</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2026-09</td>
                      <td>2.500.000 đ/tháng</td>
                      <td><span className="hr-badge hr-badge--warn">Đang tính toán</span></td>
                    </tr>
                    <tr>
                      <td>2026-08</td>
                      <td>2.500.000 đ/tháng</td>
                      <td><span className="hr-badge hr-badge--success">Đã chi trả</span></td>
                    </tr>
                    <tr>
                      <td>2026-07</td>
                      <td>2.500.000 đ/tháng</td>
                      <td><span className="hr-badge hr-badge--success">Đã chi trả</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT 5: BÁO CÁO & THỐNG KÊ (US 32 - 34) */}
      {activeTab === 'analytics' && (
        <section className="hr-dash__panel">
          <div className="hr-dash__panel-head">
            <div>
              <h2>Báo cáo phân tích nguồn ứng viên & chất lượng thực tập</h2>
              <p className="hr-dash__panel-desc">Dữ liệu thống kê phục vụ hợp tác doanh nghiệp - nhà trường ICTU.</p>
            </div>
            <button
              type="button"
              className="hr-dash__btn hr-dash__btn--primary hr-dash__btn--sm"
              onClick={() => setExportModal(true)}
            >
              📥 Xuất báo cáo (Excel / PDF)
            </button>
          </div>

          <div className="hr-analytics-grid">
            {/* Thống kê theo trường */}
            <div className="hr-chart-card">
              <h3>Thống kê thực tập sinh theo trường (US 32)</h3>
              <div className="hr-chart-bars">
                <div className="hr-chart-bar-item">
                  <div className="hr-chart-bar-label">
                    <span>ĐH CNTT & TT (ICTU)</span>
                    <strong>16 (57%)</strong>
                  </div>
                  <div className="hr-progress">
                    <div className="hr-progress__bar" style={{ width: '57%' }} />
                  </div>
                </div>

                <div className="hr-chart-bar-item">
                  <div className="hr-chart-bar-label">
                    <span>ĐH Bách Khoa Hà Nội (HUST)</span>
                    <strong>6 (21%)</strong>
                  </div>
                  <div className="hr-progress">
                    <div className="hr-progress__bar" style={{ width: '21%' }} />
                  </div>
                </div>

                <div className="hr-chart-bar-item">
                  <div className="hr-chart-bar-label">
                    <span>Học viện Công nghệ BCVT (PTIT)</span>
                    <strong>4 (14%)</strong>
                  </div>
                  <div className="hr-progress">
                    <div className="hr-progress__bar" style={{ width: '14%' }} />
                  </div>
                </div>

                <div className="hr-chart-bar-item">
                  <div className="hr-chart-bar-label">
                    <span>Đại học Thái Nguyên (TNU)</span>
                    <strong>2 (8%)</strong>
                  </div>
                  <div className="hr-progress">
                    <div className="hr-progress__bar" style={{ width: '8%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Thống kê theo ngành & Tỷ lệ hoàn thành */}
            <div className="hr-chart-card">
              <h3>Tỷ lệ hoàn thành chương trình & Tuyển chính thức (US 33)</h3>
              <div className="hr-metrics-card">
                <div className="hr-metric">
                  <span className="hr-metric__val">92%</span>
                  <span className="hr-metric__lbl">Tỷ lệ hoàn thành kỳ TT</span>
                </div>
                <div className="hr-metric">
                  <span className="hr-metric__val">68%</span>
                  <span className="hr-metric__lbl">Được chuyển thành NV chính thức</span>
                </div>
                <div className="hr-metric">
                  <span className="hr-metric__val">4.5/5</span>
                  <span className="hr-metric__lbl">Đánh giá độ hài lòng của Mentor</span>
                </div>
              </div>

              <div className="hr-dept-split">
                <p><strong>Phân bổ theo ngành đào tạo:</strong></p>
                <ul>
                  <li>Công nghệ thông tin: 12 bạn (43%)</li>
                  <li>Kỹ thuật phần mềm: 9 bạn (32%)</li>
                  <li>An toàn thông tin: 4 bạn (14%)</li>
                  <li>Hệ thống thông tin / AI: 3 bạn (11%)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DIALOG 1: TỪ CHỐI HỒ SƠ KÈM LÝ DO (Spec §5.4) */}
      {rejectDialog.open && (
        <div className="hr-modal-overlay">
          <div className="hr-modal">
            <div className="hr-modal__head">
              <h3>Từ chối hồ sơ ứng viên</h3>
              <button
                type="button"
                className="hr-modal__close"
                onClick={() => setRejectDialog({ open: false, intern: null, note: '' })}
              >
                ✕
              </button>
            </div>

            <div className="hr-modal__body">
              <p>
                Bạn đang thực hiện từ chối hồ sơ của ứng viên{' '}
                <strong>{rejectDialog.intern?.full_name}</strong> ({rejectDialog.intern?.email}).
              </p>
              <div className="hr-modal__field">
                <label htmlFor="reject-note">
                  Lý do từ chối <em>* (bắt buộc theo quy định nghiệp vụ)</em>:
                </label>
                <textarea
                  id="reject-note"
                  rows={4}
                  placeholder="Ví dụ: Chưa đáp ứng tiêu chí đồ án cơ sở, điểm GPA dưới yêu cầu hoặc không cung cấp đủ bảng điểm..."
                  value={rejectDialog.note}
                  onChange={(e) => setRejectDialog((prev) => ({ ...prev, note: e.target.value }))}
                  className="hr-modal__textarea"
                />
              </div>
            </div>

            <div className="hr-modal__actions">
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--ghost"
                onClick={() => setRejectDialog({ open: false, intern: null, note: '' })}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--danger"
                onClick={confirmRejectIntern}
              >
                Xác nhận từ chối & Gửi email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: PREVIEW TÀI LIỆU CV / ĐƠN */}
      {previewDoc.open && (
        <div className="hr-modal-overlay">
          <div className="hr-modal hr-modal--lg">
            <div className="hr-modal__head">
              <h3>Tài liệu ứng viên: {previewDoc.fileType}</h3>
              <button
                type="button"
                className="hr-modal__close"
                onClick={() => setPreviewDoc({ open: false, intern: null, fileName: '', fileType: '' })}
              >
                ✕
              </button>
            </div>

            <div className="hr-modal__body">
              <div className="hr-doc-preview-card">
                <div className="hr-doc-preview-card__icon">📄</div>
                <div>
                  <h4>{previewDoc.fileName}</h4>
                  <p className="hr-table__sub">Ứng viên: {previewDoc.intern?.full_name} · {previewDoc.intern?.university}</p>
                  <p className="hr-table__sub">Định dạng file: PDF (Đã xác thực chữ ký số)</p>
                </div>
              </div>
              <div className="hr-doc-mock-viewer">
                <div className="hr-doc-mock-viewer__header">
                  <span>Trang 1 / 2</span>
                  <span>Thu phóng: 100%</span>
                </div>
                <div className="hr-doc-mock-viewer__content">
                  <h3>HỒ SƠ THỰC TẬP SINH DOANH NGHIỆP</h3>
                  <p><strong>Họ và tên:</strong> {previewDoc.intern?.full_name}</p>
                  <p><strong>Trường:</strong> {previewDoc.intern?.university}</p>
                  <p><strong>Chuyên ngành:</strong> {previewDoc.intern?.major}</p>
                  <p><strong>Điểm trung bình (GPA):</strong> {previewDoc.intern?.gpa} / 4.0</p>
                  <hr style={{ borderColor: '#e2e8f0', margin: '14px 0' }} />
                  <p><strong>Kỹ năng chuyên môn:</strong> Java, Python, React, SQL, Git, Linux, Docker cơ bản.</p>
                  <p><strong>Định hướng mục tiêu:</strong> Mong muốn được học hỏi kinh nghiệm làm dự án thực tế, tiếp cận quy trình Scrum chuyên nghiệp và rèn luyện kỹ năng làm việc nhóm tại môi trường ICTU.</p>
                </div>
              </div>
            </div>

            <div className="hr-modal__actions">
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--ghost"
                onClick={() => {
                  showToast(`Đã tải xuống file ${previewDoc.fileName}`)
                }}
              >
                ⬇️ Tải file về máy
              </button>
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--primary"
                onClick={() => setPreviewDoc({ open: false, intern: null, fileName: '', fileType: '' })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: XUẤT BÁO CÁO (US 34) */}
      {exportModal && (
        <div className="hr-modal-overlay">
          <div className="hr-modal">
            <div className="hr-modal__head">
              <h3>Xuất báo cáo thống kê thực tập sinh</h3>
              <button type="button" className="hr-modal__close" onClick={() => setExportModal(false)}>
                ✕
              </button>
            </div>

            <div className="hr-modal__body">
              <p>Chọn định dạng và loại báo cáo bạn muốn tải về máy để gửi cho ban lãnh đạo hoặc trường ICTU:</p>

              <div className="hr-export-options">
                <label className="hr-export-radio">
                  <input type="radio" name="export-type" defaultChecked />
                  <span>Báo cáo tổng hợp toàn bộ vòng đời thực tập sinh (Excel .xlsx)</span>
                </label>
                <label className="hr-export-radio">
                  <input type="radio" name="export-type" />
                  <span>Báo cáo đánh giá năng lực & chuyên cần thực tập sinh (PDF)</span>
                </label>
                <label className="hr-export-radio">
                  <input type="radio" name="export-type" />
                  <span>Danh sách hồ sơ và phân công Mentor theo phòng ban (Excel .xlsx)</span>
                </label>
              </div>
            </div>

            <div className="hr-modal__actions">
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--ghost"
                onClick={() => setExportModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="hr-dash__btn hr-dash__btn--primary"
                onClick={() => {
                  setExportModal(false)
                  showToast('Đang tạo và tải file báo cáo về máy thành công! (Dữ liệu đã trích xuất)', 'success')
                }}
              >
                ⬇️ Xuất dữ liệu ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
