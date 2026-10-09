import { useState, useRef, useEffect } from 'react'
import './InternTrainingMaterials.css'

const INITIAL_TRAINING_DOCS = [
  {
    id: 'doc-1',
    title: 'Sổ tay Onboarding & Văn hóa Trung tâm Phần mềm ICTU (v3.0)',
    category: 'Văn hóa & Quy chế',
    categorySlug: 'culture',
    author: 'Hr & Mentor',
    type: 'PDF',
    size: '2.4 MB',
    readTime: '15 phút đọc',
    description:
      'Nội quy bảo mật thông tin, quy tắc giờ giấc chấm công, trang phục công sở, kênh trao đổi Slack/Zalo và quy trình gửi ticket xin nghỉ phép.',
    tags: ['Nội quy', 'Bảo mật', 'Onboarding'],
    completed: true,
    chapters: [
      '1. Tầm nhìn & Sứ mệnh Trung tâm Phần mềm & AI ICTU',
      '2. Quy chế bảo mật dữ liệu, tài khoản VPN & Source code doanh nghiệp',
      '3. Thời gian làm việc, cơ chế chấm công vân tay/AI Camera (08:15 - 17:30)',
      '4. Kênh truyền thông nội bộ, liên hệ Mentor & Cán bộ Nhân sự (P.302)',
      '5. Quy trình đánh giá kết thúc kỳ thực tập và cơ hội lên Official Developer',
    ],
    contentSummary:
      'Chào mừng bạn gia nhập ICTU Software Center! Tài liệu này quy định toàn bộ quyền lợi, trách nhiệm và văn hóa làm việc chuyên nghiệp. Mọi sinh viên thực tập cần tuân thủ nghiêm ngặt quy chế bảo mật mã nguồn doanh nghiệp, không push private token lên public repo và duy trì tỷ lệ chuyên cần tối thiểu 90% để đủ điều kiện xét tốt nghiệp thực tập.',
  },
  {
    id: 'doc-2',
    title: 'Quy chuẩn Git branching model & Code Review chuẩn GitFlow',
    category: 'Kỹ thuật & Git',
    categorySlug: 'git',
    author: 'Mentor',
    type: 'Markdown / PDF',
    size: '1.8 MB',
    readTime: '25 phút đọc',
    description:
      'Quy tắc đặt tên nhánh (feature/*, bugfix/*), commit convention theo chuẩn Conventional Commits, tạo Pull Request và quy trình nghiệm thu code.',
    tags: ['GitFlow', 'Code Review', 'Pull Request'],
    completed: true,
    chapters: [
      '1. Kiến trúc nhánh: main (production), staging, develop và feature/*',
      '2. Cú pháp commit: feat(auth): ..., fix(db): ..., refactor(api): ...',
      '3. Tạo Pull Request có checklist mô tả và ảnh screenshot demo',
      '4. Quy trình Code Review: Tối thiểu 1 Mentor approve trước khi merge',
      '5. Xử lý conflict an toàn bằng `git rebase develop`',
    ],
    contentSummary:
      'Hướng dẫn chuẩn hóa quy trình phát triển mã nguồn của nhóm kỹ thuật. Mọi commit phải có thông điệp rõ ràng, tuân thủ convention và đính kèm Issue/Task ID tương ứng. Mỗi Pull Request cần đính kèm kết quả test nội bộ và không được tự ý merge nhánh main.',
  },
  {
    id: 'doc-3',
    title: 'Kiến trúc Backend FastAPI, Pydantic DTO & Dependency Injection',
    category: 'Chuyên môn Backend',
    categorySlug: 'backend',
    author: 'Tech Lead R&D ICTU',
    type: 'Tài liệu kỹ thuật',
    size: '3.5 MB',
    readTime: '45 phút đọc',
    description:
      'Mô hình phân tầng Controller - Service - Repository, sử dụng Pydantic v2 schemas để validate request/response và phân quyền bằng JWT OAuth2.',
    tags: ['FastAPI', 'Python 3.11', 'Pydantic', 'JWT'],
    completed: false,
    chapters: [
      '1. Cấu trúc thư mục chuẩn: app/api/routes, app/services, app/schemas, app/models',
      '2. Định nghĩa DTO Request/Response bằng Pydantic BaseSchema',
      '3. FastAPI Depends() để inject Database Session và Current Authenticated User',
      '4. Quản lý phân quyền role-based (RBAC): admin, hr, mentor, intern',
      '5. Global Exception Handler và chuẩn hóa JSON Response định dạng ApiResponseDTO',
    ],
    contentSummary:
      'Tài liệu chuyên sâu dành cho thực tập sinh mảng Backend. Giới thiệu kiến trúc Clean Architecture ứng dụng trong FastAPI, đảm bảo code decoupling, dễ test và hiệu năng cao. Hướng dẫn chi tiết cách viết Router, Schema validation và Dependency Injection.',
  },
  {
    id: 'doc-4',
    title: 'Thiết kế CSDL MySQL 8.0, Indexing & Alembic Migrations',
    category: 'Kiến trúc CSDL',
    categorySlug: 'database',
    author: 'Mentor',
    type: 'Slide & SQL Script',
    size: '4.2 MB',
    readTime: '30 phút đọc',
    description:
      'Quy chuẩn đặt tên bảng, khóa ngoại InnoDB, cấu hình Docker Compose MySQL và cách tạo migration script tự động không làm gián đoạn CSDL.',
    tags: ['MySQL 8', 'SQLAlchemy', 'Alembic', 'Docker'],
    completed: false,
    chapters: [
      '1. Chuẩn hóa thiết kế 3NF cho hệ thống quản lý thực tập sinh',
      '2. Đánh Composite Index và B-Tree Index cho các trường thường xuyên filter',
      '3. Quản lý phiên bản CSDL bằng Alembic migration (`alembic upgrade head`)',
      '4. Script seed dữ liệu mẫu idempotency cho môi trường Docker development',
      '5. Quy tắc phòng chống SQL Injection và tối ưu câu truy vấn N+1',
    ],
    contentSummary:
      'Bộ tài liệu cung cấp kiến thức nền tảng về cơ sở dữ liệu quan hệ MySQL trong dự án. Giúp thực tập sinh nắm vững cách viết migration scripts với SQLAlchemy ORM, phân tích EXPLAIN câu lệnh query và quản lý volume dữ liệu an toàn trong Docker Compose.',
  },
  {
    id: 'doc-5',
    title: 'Viết Unit Test & Integration Test với PyTest & FactoryBoy',
    category: 'Kiểm thử & QA',
    categorySlug: 'testing',
    author: 'QA Lead ICTU Software',
    type: 'PDF & Code mẫu',
    size: '2.1 MB',
    readTime: '35 phút đọc',
    description:
      'Hướng dẫn viết fixture mock database, kiểm thử luồng phân quyền và bảo đảm độ bao phủ (Test Coverage) >= 80% trước khi nghiệm thu Sprint.',
    tags: ['PyTest', 'Integration Test', 'Mocking', 'CI/CD'],
    completed: false,
    chapters: [
      '1. Cài đặt pytest, pytest-cov và httpx TestClient cho FastAPI',
      '2. Khởi tạo SQLite in-memory fixture phục vụ test tốc độ cao',
      '3. Viết Unit Test cho Service business logic và Schemas validation',
      '4. Viết Integration Test kiểm tra status code 200, 201, 400, 403, 404',
      '5. Đọc báo cáo HTML coverage và tích hợp GitHub Actions tự động chấm điểm',
    ],
    contentSummary:
      'Chất lượng phần mềm là ưu tiên hàng đầu tại ICTU Center. Tài liệu này hướng dẫn từng bước thiết lập môi trường test tự động, viết test case bao phủ các trường hợp biên (edge cases) và đảm bảo mã nguồn đạt chuẩn trước khi trình Mentor nghiệm thu.',
  },
  {
    id: 'doc-6',
    title: 'Hướng dẫn lập Báo cáo tuần & Tiêu chí Đánh giá Nghiệm thu Sprint',
    category: 'Quy trình & Báo cáo',
    categorySlug: 'process',
    author: 'Mentor',
    type: 'DOCX & Form mẫu',
    size: '1.2 MB',
    readTime: '20 phút đọc',
    description:
      'Mẫu báo cáo tiến độ tuần, cách ghi nhật ký công việc (log tasks), xử lý blocker và thang điểm đánh giá 5 tiêu chí của Mentor.',
    tags: ['Báo cáo tuần', 'Đánh giá KPI', 'Sprint Review'],
    completed: false,
    chapters: [
      '1. Khung thời gian nộp báo cáo định kỳ: Trước 18:00 Thứ Sáu hàng tuần',
      '2. Ba mục bắt buộc: Kết quả tuần, Khó khăn/Vướng mắc, Kế hoạch tuần kế tiếp',
      '3. Đính kèm file minh chứng code, tài liệu thiết kế hoặc link Pull Request',
      '4. Thang điểm đánh giá: Chuyên cần (20%), Chất lượng code (50%), Tinh thần (30%)',
      '5. Quy trình họp Sprint Review trực tiếp vào 09:30 Thứ Hai hàng tuần',
    ],
    contentSummary:
      'Tài liệu hướng dẫn thực tập sinh cách trình bày báo cáo tuần súc tích, chuyên nghiệp và có bằng chứng cụ thể. Giúp Mentor theo dõi sát sao tiến độ, kịp thời gỡ bỏ các rào cản kỹ thuật và ghi nhận điểm đánh giá công bằng.',
  },
]

const CATEGORIES = [
  { id: 'all', label: 'Tất cả tài liệu' },
  { id: 'culture', label: 'Văn hóa & Quy chế' },
  { id: 'git', label: 'Kỹ thuật & Git' },
  { id: 'backend', label: 'Chuyên môn Backend' },
  { id: 'database', label: 'Kiến trúc CSDL' },
  { id: 'testing', label: 'Kiểm thử & QA' },
  { id: 'process', label: 'Quy trình & Báo cáo' },
]

export default function InternTrainingMaterials({ onNavigateToReports }) {
  // Lấy danh sách trạng thái hoàn thành từ localStorage nếu có
  const [materials, setMaterials] = useState(() => {
    try {
      const stored = localStorage.getItem('intern_training_completed_ids')
      if (stored) {
        const completedIds = JSON.parse(stored)
        if (Array.isArray(completedIds)) {
          return INITIAL_TRAINING_DOCS.map((doc) => ({
            ...doc,
            completed: completedIds.includes(doc.id),
          }))
        }
      }
    } catch (err) {
      console.warn('LocalStorage error:', err)
    }
    return INITIAL_TRAINING_DOCS
  })

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'completed' | 'uncompleted'
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterDropdownRef = useRef(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Đóng dropdown khi click bên ngoài hoặc bấm phím Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFilterOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Tự động lưu tiến độ vào localStorage
  const saveProgressToStorage = (updatedDocs) => {
    try {
      const completedIds = updatedDocs.filter((d) => d.completed).map((d) => d.id)
      localStorage.setItem('intern_training_completed_ids', JSON.stringify(completedIds))
    } catch (err) {
      console.warn('LocalStorage write error:', err)
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3200)
  }

  // Toggle hoàn thành tài liệu
  const handleToggleComplete = (docId, e) => {
    if (e) e.stopPropagation()
    setMaterials((prev) => {
      const updated = prev.map((item) =>
        item.id === docId ? { ...item, completed: !item.completed } : item
      )
      saveProgressToStorage(updated)
      const targetDoc = updated.find((d) => d.id === docId)
      if (targetDoc?.completed) {
        showToast(`🎉 Đã đánh dấu hoàn thành: "${targetDoc.title}"`)
      } else {
        showToast(`Đã chuyển sang trạng thái chưa hoàn thành.`)
      }
      return updated
    })

    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc((prev) => (prev ? { ...prev, completed: !prev.completed } : null))
    }
  }

  // Giả lập tải file
  const handleDownload = (doc, e) => {
    if (e) e.stopPropagation()
    showToast(`⬇ Đang tải file [${doc.title}] (${doc.size})...`)
  }

  // Tính toán chỉ số tiến độ
  const totalDocs = materials.length
  const completedDocs = materials.filter((d) => d.completed).length
  const progressPercent = Math.round((completedDocs / totalDocs) * 100)

  const STATUS_OPTIONS = [
    {
      value: 'all',
      label: 'Tất cả trạng thái',
      count: totalDocs,
    },
    {
      value: 'completed',
      label: 'Đã hoàn thành',
      count: completedDocs,
    },
    {
      value: 'uncompleted',
      label: 'Chưa đọc',
      count: totalDocs - completedDocs,
    },
  ]

  const currentStatusOption =
    STATUS_OPTIONS.find((opt) => opt.value === filterStatus) || STATUS_OPTIONS[0]

  // Lọc tài liệu theo category, search, status
  const filteredMaterials = materials.filter((doc) => {
    const matchCategory =
      activeCategory === 'all' || doc.categorySlug === activeCategory
    const matchSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' && doc.completed) ||
      (filterStatus === 'uncompleted' && !doc.completed)

    return matchCategory && matchSearch && matchStatus
  })

  return (
    <div className="training-container">
      {/* Toast thông báo */}
      {toastMessage && (
        <div style={styles.toast}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── BANNER TIẾN ĐỘ HỌC TẬP ONBOARDING ── */}
      <section className="training-hero">
        <div className="training-hero-content">
          <div className="training-hero-left">
            <div className="training-badge-hero">
              <span>Chương trình Đào tạo Thực tập sinh ICTU 2026</span>
            </div>
            <h2 className="training-hero-title">Tài Liệu Đào Tạo & Onboarding Kỹ Thuật</h2>
            <p className="training-hero-subtitle">
              Trang bị toàn bộ quy chuẩn code, quy chế bảo mật, kiến trúc phần mềm và kỹ năng
              chuyên môn cần thiết để hoàn thành xuất sắc kỳ thực tập tại Trung tâm ICTU.
            </p>
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="training-action-secondary-btn"
                style={{
                  marginTop: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span>Nộp báo cáo tiến độ tuần</span>
              </button>
            )}
          </div>

          <div className="training-hero-stat-card">
            <div className="training-stat-row">
              <div>
                <span className="training-stat-label">Tiến độ đọc tài liệu:</span>
                <div className="training-stat-value-row">
                  <strong className="training-stat-bignum">{progressPercent}%</strong>
                  <span className="training-stat-subtext">
                    ({completedDocs}/{totalDocs} tài liệu)
                  </span>
                </div>
              </div>
              <div className="training-stat-badge-status">
                {progressPercent === 100
                  ? 'Đã hoàn thành tất cả'
                  : progressPercent >= 50
                  ? 'Đang tiến triển tốt'
                  : 'Cần hoàn thiện thêm'}
              </div>
            </div>

            {/* Progress bar */}
            <div className="training-progress-track">
              <div
                className="training-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="training-stat-hint">
              * Hoàn thành đọc tài liệu để chuẩn bị cho buổi nghiệm thu Sprint tuần 8 cùng Mentor.
            </span>
          </div>
        </div>
      </section>

      {/* ── THANH TÌM KIẾM & BỘ LỌC ── */}
      <div className="training-controls-bar">
        {/* Search Input */}
        <div className="training-search-wrap">
          <svg
            className="training-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tài liệu theo tên, từ khóa (FastAPI, Git, MySQL, Onboarding)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="training-search-input"
            aria-label="Tìm kiếm tài liệu đào tạo"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="training-clear-btn"
              title="Xóa tìm kiếm"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Custom Dropdown */}
        <div
          ref={filterDropdownRef}
          className={`training-filter-container ${isFilterOpen ? 'is-open' : ''} ${filterStatus !== 'all' ? 'has-active-filter' : ''}`}
        >
          <button
            type="button"
            className="training-filter-trigger-btn"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
            aria-label="Lọc tài liệu theo trạng thái"
          >
            <div className="training-filter-trigger-left">
              <svg
                className="training-filter-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span className="training-filter-label">Trạng thái:</span>
              <span className="training-filter-current-value">
                {currentStatusOption.label}
              </span>
            </div>

            <div className="training-filter-trigger-right">
              {filterStatus !== 'all' && (
                <span
                  role="button"
                  tabIndex={0}
                  className="training-filter-quick-clear"
                  title="Xóa bộ lọc"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFilterStatus('all')
                    setIsFilterOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      setFilterStatus('all')
                      setIsFilterOpen(false)
                    }
                  }}
                >
                  ✕
                </span>
              )}
              <svg
                className={`training-filter-chevron ${isFilterOpen ? 'is-open' : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {isFilterOpen && (
            <div className="training-filter-dropdown-menu" role="listbox">
              <div className="training-filter-menu-header">
                <span>Trạng thái tài liệu</span>
              </div>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = filterStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`training-filter-menu-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setFilterStatus(opt.value)
                      setIsFilterOpen(false)
                    }}
                  >
                    <span className="training-filter-item-label">{opt.label}</span>

                    {isSelected && (
                      <svg
                        className="training-filter-check-icon"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── CÁC TAB DANH MỤC (HOVER NHẸ) ── */}
      <div className="training-category-pills-wrap">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          const count =
            cat.id === 'all'
              ? materials.length
              : materials.filter((m) => m.categorySlug === cat.id).length
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`training-cat-pill ${isActive ? 'is-active' : ''}`}
            >
              <span>{cat.label}</span>
              <span className="training-cat-count">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── DANH SÁCH TÀI LIỆU (GRID 2 CỘT) ── */}
      {filteredMaterials.length === 0 ? (
        <div style={styles.emptyState}>
          <h3 style={{ margin: '12px 0 4px', color: '#1E293B', fontSize: '16px' }}>
            Không tìm thấy tài liệu phù hợp
          </h3>
          <p style={{ margin: 0, color: '#64748B', fontSize: '13.5px' }}>
            Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục "Tất cả tài liệu".
          </p>
        </div>
      ) : (
        <div className="training-cards-grid">
          {filteredMaterials.map((doc) => (
            <div
              key={doc.id}
              className={`training-doc-card ${doc.completed ? 'is-completed' : ''}`}
              onClick={() => setPreviewDoc(doc)}
            >
              {/* Card Header */}
              <div className="training-card-header">
                <div className="training-card-meta">
                  <span className="training-cat-badge">{doc.category}</span>
                  <span className="training-type-badge">{doc.type}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleToggleComplete(doc.id, e)}
                  title={doc.completed ? 'Bấm để đánh dấu chưa học' : 'Bấm để đánh dấu đã học'}
                  className={`training-check-btn ${doc.completed ? 'is-done' : ''}`}
                >
                  <span>{doc.completed ? 'Đã học' : 'Đánh dấu đã học'}</span>
                </button>
              </div>

              {/* Title & Desc */}
              <h3 className="training-doc-title" title={doc.title}>
                {doc.title}
              </h3>

              <p className="training-doc-desc">{doc.description}</p>

              {/* Tags */}
              <div className="training-tags-row">
                {doc.tags.map((t, idx) => (
                  <span key={idx} className="training-tag-item">
                    {t}
                  </span>
                ))}
              </div>

              {/* Card Footer */}
              <div className="training-card-footer">
                <div className="training-footer-meta">
                  <div className="training-meta-item">
                    <span>{doc.readTime}</span>
                  </div>
                  <span className="training-meta-divider">•</span>
                  <div className="training-meta-item">
                    <span>{doc.size}</span>
                  </div>
                </div>

                <div className="training-action-btns" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="training-preview-btn"
                    onClick={() => setPreviewDoc(doc)}
                    title="Xem chi tiết nội dung tài liệu"
                  >
                    <span>Xem trước</span>
                  </button>

                  <button
                    type="button"
                    className="training-download-btn"
                    onClick={(e) => handleDownload(doc, e)}
                    title={`Tải xuống ${doc.title}`}
                  >
                    <span>Tải về</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* ── MODAL XEM TRƯỚC TÀI LIỆU (PREVIEW MODAL) ── */}
      {previewDoc && (
        <div className="training-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="training-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="training-modal-header">
              <div>
                <span className="training-cat-badge">{previewDoc.category}</span>
                <h3 className="training-modal-title">{previewDoc.title}</h3>
                <span className="training-modal-author">
                  Biên soạn bởi: <strong>{previewDoc.author}</strong> · Thời lượng: {previewDoc.readTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="training-modal-close-btn"
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            <div className="training-modal-body">
              <div className="training-preview-box">
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1E293B' }}>
                  Tóm tắt nội dung tài liệu
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                  {previewDoc.contentSummary}
                </p>
              </div>

              <h4 style={{ margin: '20px 0 10px 0', fontSize: '15px', color: '#0F172A' }}>
                Mục lục các chương chính:
              </h4>
              <div className="training-chapters-list">
                {previewDoc.chapters.map((ch, idx) => (
                  <div key={idx} className="training-chapter-item">
                    <span className="training-chapter-bullet">•</span>
                    <span>{ch}</span>
                  </div>
                ))}
              </div>

              <div className="training-info-callout">
                <p style={{ margin: 0, fontSize: '13.5px', color: '#1E3A8A' }}>
                  Mẹo học tập: Hãy đọc kỹ và thực hành áp dụng trực tiếp vào các Task được giao trên
                  Sprint Board để Mentor đánh giá kết quả hàng tuần.
                </p>
              </div>
            </div>

            <div className="training-modal-footer">
              <button
                type="button"
                onClick={(e) => handleToggleComplete(previewDoc.id, e)}
                className={`training-modal-toggle-btn ${previewDoc.completed ? 'is-done' : ''}`}
              >
                <span>
                  {previewDoc.completed ? 'Đã hoàn thành đọc' : 'Đánh dấu đã hoàn thành'}
                </span>
              </button>

              <button
                type="button"
                className="training-modal-download-btn"
                onClick={(e) => handleDownload(previewDoc, e)}
              >
                <span>Tải tài liệu ({previewDoc.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.2s ease-in-out',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 9999,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: '12px 20px',
    borderRadius: '10px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '500',
  },
  progressHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '28px 32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
  },
  progressHeroContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px',
  },
  heroLeft: {
    flex: '1 1 450px',
  },
  badgeHero: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px solid #DBEAFE',
    marginBottom: '10px',
  },
  heroTitle: {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: '-0.02em',
  },
  heroSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#64748B',
    lineHeight: '1.6',
    maxWidth: '560px',
  },
  heroRightCard: {
    flex: '0 0 340px',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #DBEAFE',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  statLabel: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#475569',
  },
  statValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginTop: '2px',
  },
  statBigNum: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#2563EB',
  },
  statSubText: {
    fontSize: '13px',
    color: '#64748B',
    fontWeight: '500',
  },
  statBadgeStatus: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  progressBarTrack: {
    width: '100%',
    height: '9px',
    backgroundColor: '#E2E8F0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: '10px',
    transition: 'width 0.4s ease-in-out',
    background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
  },
  statHint: {
    fontSize: '11.5px',
    color: '#94A3B8',
    display: 'block',
    lineHeight: '1.4',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  searchWrap: {
    flex: '1 1 360px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    color: '#94A3B8',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '11px 40px 11px 38px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '14px',
  },
  statusFilterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFFFF',
    padding: '5px 12px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
  },
  statusSelect: {
    border: 'none',
    outline: 'none',
    fontSize: '13.5px',
    fontWeight: '500',
    color: '#334155',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  categoryPillsWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '24px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  categoryPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    color: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
  },
  categoryCount: {
    fontSize: '11px',
    padding: '1px 6px',
    borderRadius: '12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
  },
  categoryCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1.5px dashed #CBD5E1',
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px',
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1px solid #E2E8F0',
    padding: '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  docCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  catBadge: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
  },
  checkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkBtnDone: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    borderColor: '#86EFAC',
    fontWeight: '700',
  },
  docTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: '1.4',
  },
  docDesc: {
    margin: '0 0 14px 0',
    fontSize: '13.5px',
    color: '#475569',
    lineHeight: '1.5',
    flex: '1',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '18px',
  },
  tagItem: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11.5px',
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    border: '1px solid #F1F5F9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  cardFooter: {
    borderTop: '1px solid #F1F5F9',
    paddingTop: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  footerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12.5px',
    color: '#64748B',
  },
  metaDivider: {
    color: '#CBD5E1',
    fontSize: '12px',
  },
  actionBtnsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #2563EB',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roadmapSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '24px 28px',
    marginTop: '12px',
  },
  roadmapHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '20px',
  },
  roadmapHint: {
    fontSize: '12.5px',
    color: '#64748B',
  },
  roadmapSteps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  stepCard: {
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  stepNum: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: '14.5px',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: '12.5px',
    color: '#64748B',
    lineHeight: '1.4',
    margin: 0,
    flex: '1',
  },
  stepDoneBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content',
    marginTop: '6px',
  },
  stepActiveBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content',
    marginTop: '6px',
  },
  stepPendingBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content',
    marginTop: '6px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    maxWidth: '680px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    margin: '6px 0 4px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0F172A',
  },
  modalAuthor: {
    fontSize: '13px',
    color: '#64748B',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: '1',
  },
  previewBox: {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '10px',
    padding: '16px',
  },
  chaptersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  chapterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    border: '1px solid #F1F5F9',
    fontSize: '13.5px',
    color: '#334155',
    fontWeight: '500',
  },
  infoCallout: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    border: '1px solid #BAE6FD',
    borderRadius: '10px',
    padding: '14px',
    marginTop: '20px',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    border: '1.5px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    cursor: 'pointer',
  },
  modalToggleBtnDone: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    borderColor: '#86EFAC',
    fontWeight: '700',
  },
  modalDownloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
}
