import { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  CheckCircle,
  Download,
  Search,
  Eye,
  PlusCircle,
  Trash2,
  Building2,
  UserCheck,
  X,
  Briefcase,
  Layers,
  FileCheck,
  Edit2,
  Send,
} from 'lucide-react'
import {
  fetchContracts,
  deleteContract,
} from '../../api/operations'
import {
  subscribeRealtimeEvents,
  SYNC_EVENTS,
  getContractTemplates,
  syncContractTemplateCreated,
  syncContractTemplateUpdated,
  syncContractTemplateDeleted,
  syncContractCreated,
  syncContractUpdated,
  syncContractDeleted,
  extractPartyBContractInfo,
} from '../../utils/realtimeSync'
import './HrSubPages.css'

// Hợp đồng được coi là "Hoàn tất" khi TTS đã ký xác nhận
function isContractSigned(c) {
  if (!c) return false
  const status = String(c.status || '').toLowerCase()
  if (status === 'pending_intern' || status === 'draft') return false
  if (c.signed_intern === true) return true
  return ['active', 'completed', 'signed'].includes(status)
}

const INITIAL_CONTRACTS = [
  {
    id: 1,
    intern_id: 5,
    contract_code: 'HĐTT-2026-001',
    student_name: 'TTS',
    student_code: 'TTS0001',
    faculty: 'Công nghệ thông tin',
    doc_type: 'Hợp đồng Tiếp nhận Thực tập & Cam kết Bảo mật (NDA)',
    created_at: '28/09/2026',
    start_date: '01/10/2026',
    end_date: '31/12/2026',
    allowance: '3.000.000 đ/tháng',
    department: 'Trung tâm Phát triển Phần mềm ICTU',
    notes: 'Thực tập sinh chính thức đợt 1',
    status: 'active',
    status_label: 'Đang hiệu lực',
  },
  {
    id: 2,
    intern_id: 6,
    contract_code: 'HĐTT-2026-002',
    student_name: 'Lê Hoàng Nam',
    student_code: 'TTS0002',
    faculty: 'Kỹ thuật phần mềm',
    doc_type: 'Hợp đồng Tiếp nhận Thực tập & Cam kết Bảo mật (NDA)',
    created_at: '28/09/2026',
    start_date: '01/10/2026',
    end_date: '31/12/2026',
    allowance: '3.000.000 đ/tháng',
    department: 'Phòng Nghiên cứu Công nghệ Số & AI',
    notes: 'Thực tập sinh chính thức đợt 1',
    status: 'active',
    status_label: 'Đang hiệu lực',
  },
]

export default function HrContractsPage() {
  const [activeTab, setActiveTab] = useState('templates') // 'templates' | 'issued'
  const [templates, setTemplates] = useState(() => getContractTemplates())
  const [items, setItems] = useState(INITIAL_CONTRACTS)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  // Modals state
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // Contract Modals state
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)

  // Form State Mẫu Hợp Đồng (Tạo mới & Chỉnh sửa)
  const [tplCode, setTplCode] = useState('HĐ-MAU-05')
  const [tplTitle, setTplTitle] = useState('')
  const [tplCategory, setTplCategory] = useState('Thực tập Chuyên ngành')
  const [tplDuration, setTplDuration] = useState('03 tháng (Từ 01/10/2026 đến 31/12/2026)')
  const [tplAllowance, setTplAllowance] = useState('3.000.000 đ/tháng')
  const [tplDepartment, setTplDepartment] = useState('Trung tâm Phát triển Phần mềm ICTU')
  const [tplDesc, setTplDesc] = useState('')
  const [tplTerms, setTplTerms] = useState('')

  // Form State Hợp Đồng Phát Hành (Tạo mới & Chỉnh sửa)
  const [contractForm, setContractForm] = useState({
    contract_code: '',
    student_name: '',
    student_code: '',
    faculty: 'Khoa Công nghệ Thông tin',
    doc_type: 'Hợp đồng Tiếp nhận Thực tập & Cam kết Bảo mật (NDA)',
    start_date: '01/10/2026',
    end_date: '31/12/2026',
    allowance: '3.000.000 đ/tháng',
    department: 'Trung tâm Phát triển Phần mềm ICTU',
    status: 'active',
    notes: 'Thực tập sinh chính thức đợt tiếp nhận 2026.',
  })

  const [submitting, setSubmitting] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load contracts từ DB & Realtime Sync
  useEffect(() => {
    async function loadData() {
      try {
        const resContracts = await fetchContracts()
        if (resContracts.ok && Array.isArray(resContracts.data) && resContracts.data.length > 0) {
          const valid = resContracts.data.filter(
            (c) => !c.student_name?.toLowerCase().includes('ứng viên') && c.intern_id !== 7
          )
          if (valid.length > 0) {
            setItems(valid)
          }
        }
      } catch {
        // fallback
      }
    }
    loadData()
    setTemplates(getContractTemplates())

    const unsubscribeSync = subscribeRealtimeEvents((event) => {
      if (event.type === SYNC_EVENTS.CONTRACT_SENT || event.type === SYNC_EVENTS.CONTRACT_UPLOADED) {
        const { contract } = event.payload || {}
        if (contract) {
          setItems((prev) => {
            const idx = prev.findIndex((c) => c.id === contract.id || c.contract_code === contract.contract_code)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = { ...updated[idx], ...contract }
              return updated
            }
            return [contract, ...prev]
          })
          showToast(`Đã ghi nhận hợp đồng mới phát hành: ${contract.contract_code}!`)
        }
      } else if (event.type === SYNC_EVENTS.CONTRACT_SIGNED) {
        const { contract } = event.payload || {}
        if (contract) {
          setItems((prev) =>
            prev.map((c) =>
              c.id === contract.id || c.contract_code === contract.contract_code
                ? { ...c, status: 'completed', status_label: 'Hoàn tất', signed_intern: true }
                : c
            )
          )
          showToast(`Sinh viên ${contract.student_name} vừa ký xác nhận hợp đồng!`)
        }
      } else if (event.type === SYNC_EVENTS.CONTRACT_UPDATED) {
        const { contractId, updatedData } = event.payload || {}
        if (contractId && updatedData) {
          setItems((prev) =>
            prev.map((c) => (c.id === contractId || c.contract_code === contractId ? { ...c, ...updatedData } : c))
          )
        }
      } else if (event.type === SYNC_EVENTS.CONTRACT_DELETED) {
        const { contractId } = event.payload || {}
        if (contractId) {
          setItems((prev) => prev.filter((c) => c.id !== contractId && c.contract_code !== contractId))
        }
      } else if (
        event.type === SYNC_EVENTS.CONTRACT_TEMPLATE_CREATED ||
        event.type === SYNC_EVENTS.CONTRACT_TEMPLATE_UPDATED ||
        event.type === SYNC_EVENTS.CONTRACT_TEMPLATE_DELETED
      ) {
        setTemplates(getContractTemplates())
      }
    })

    return () => {
      unsubscribeSync()
    }
  }, [])

  // ── 1. Thao tác MẪU HỢP ĐỒNG (Templates) ──
  function handleOpenCreateTemplate() {
    setEditingTemplate(null)
    const nextNum = templates.length + 1
    const padNum = String(nextNum).padStart(2, '0')
    setTplCode(`HĐ-MAU-${padNum}`)
    setTplTitle('')
    setTplCategory('Thực tập Chuyên ngành')
    setTplDuration('03 tháng (Từ 01/10/2026 đến 31/12/2026)')
    setTplAllowance('3.000.000 đ/tháng')
    setTplDepartment('Trung tâm Phát triển Phần mềm ICTU')
    setTplDesc('')
    setTplTerms(
      '1. Thời gian làm việc tối thiểu 20 giờ/tuần theo phân công của Mentor.\n2. Bảo mật tuyệt đối mã nguồn và cơ sở dữ liệu doanh nghiệp.\n3. Hưởng phụ cấp thực tập theo thỏa thuận và đánh giá điểm học phần.'
    )
    setIsCreateTemplateModalOpen(true)
  }

  function handleOpenEditTemplate(tpl) {
    setEditingTemplate(tpl)
    setTplCode(tpl.code || '')
    setTplTitle(tpl.title || '')
    setTplCategory(tpl.category || 'Thực tập Chuyên ngành')
    setTplDuration(tpl.duration || '')
    setTplAllowance(tpl.defaultAllowance || '')
    setTplDepartment(tpl.department || 'Trung tâm Phát triển Phần mềm ICTU')
    setTplDesc(tpl.description || '')
    setTplTerms(Array.isArray(tpl.terms) ? tpl.terms.join('\n') : (tpl.terms || ''))
    setIsCreateTemplateModalOpen(true)
  }

  function handleTemplateFormSubmit(e) {
    e.preventDefault()
    if (!tplTitle.trim()) {
      showToast('Vui lòng nhập Tên loại văn bản hợp đồng!')
      return
    }

    setSubmitting(true)
    const termsArr = tplTerms
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)

    if (editingTemplate) {
      // Cập nhật mẫu hiện có
      const updated = {
        ...editingTemplate,
        code: tplCode.trim(),
        title: tplTitle.trim(),
        category: tplCategory,
        duration: tplDuration,
        defaultAllowance: tplAllowance,
        department: tplDepartment,
        description: tplDesc.trim() || 'Biểu mẫu hợp đồng tiếp nhận thực tập sinh viên chính thức.',
        terms: termsArr,
      }
      syncContractTemplateUpdated(editingTemplate.id, updated)
      setTemplates((prev) => prev.map((t) => (t.id === editingTemplate.id ? updated : t)))
      if (previewTemplate && previewTemplate.id === editingTemplate.id) {
        setPreviewTemplate(updated)
      }
      showToast(`Đã cập nhật biểu mẫu "${updated.title}" thành công!`)
    } else {
      // Tạo mẫu mới
      const newTemplate = {
        id: `TPL-${String(templates.length + 1).padStart(2, '0')}`,
        code: tplCode.trim(),
        title: tplTitle.trim(),
        category: tplCategory,
        duration: tplDuration,
        defaultAllowance: tplAllowance,
        department: tplDepartment,
        description: tplDesc.trim() || 'Biểu mẫu hợp đồng tiếp nhận thực tập sinh viên chính thức.',
        terms: termsArr,
      }
      syncContractTemplateCreated(newTemplate)
      setTemplates((prev) => [newTemplate, ...prev])
      showToast(`Đã thêm thành công mẫu "${newTemplate.title}" vào Kho văn bản hệ thống!`)
    }

    setIsCreateTemplateModalOpen(false)
    setEditingTemplate(null)
    setSubmitting(false)
  }

  function handleDeleteTemplate(id, title) {
    const ok = window.confirm(`Bạn có chắc chắn muốn xóa mẫu hợp đồng "${title}" khỏi hệ thống?`)
    if (!ok) return
    syncContractTemplateDeleted(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id && t.code !== id))
    if (previewTemplate && (previewTemplate.id === id || previewTemplate.code === id)) {
      setPreviewTemplate(null)
    }
    showToast(`Đã xóa biểu mẫu "${title}" thành công!`)
  }

  // ── 2. Thao tác HỢP ĐỒNG PHÁT HÀNH (Contracts) ──
  function handleOpenCreateContract() {
    const defTpl = templates[0] || {}
    const code = `HĐTT-2026-00${items.length + 1}`
    setContractForm({
      contract_code: code,
      student_name: '',
      student_code: '',
      university: '',
      phone: '',
      email: '',
      faculty: 'Khoa Công nghệ Thông tin',
      doc_type: defTpl.title || 'Hợp đồng Tiếp nhận Thực tập & Cam kết Bảo mật (NDA)',
      start_date: '01/10/2026',
      end_date: '31/12/2026',
      allowance: defTpl.defaultAllowance || '3.000.000 đ/tháng',
      department: defTpl.department || 'Trung tâm Phát triển Phần mềm ICTU',
      status: 'pending_intern',
      notes: Array.isArray(defTpl.terms) ? defTpl.terms.join('\n') : (defTpl.description || ''),
    })
    setEditingContract(null)
    setIsCreateContractModalOpen(true)
  }

  function handleOpenEditContract(contract) {
    setEditingContract(contract)
    setContractForm({
      contract_code: contract.contract_code || '',
      student_name: contract.student_name || '',
      student_code: contract.student_code || '',
      university: contract.university || '',
      phone: contract.phone || contract.phone_number || '',
      email: contract.email || '',
      faculty: contract.faculty || 'Khoa Công nghệ Thông tin',
      doc_type: contract.doc_type || '',
      start_date: contract.start_date || '01/10/2026',
      end_date: contract.end_date || '31/12/2026',
      allowance: contract.allowance || '3.000.000 đ/tháng',
      department: contract.department || 'Trung tâm Phát triển Phần mềm ICTU',
      status: contract.status || 'active',
      notes: contract.notes || '',
    })
  }

  function handleContractFormSubmit(e) {
    e.preventDefault()
    if (!contractForm.student_name.trim()) {
      showToast('Vui lòng nhập Họ tên sinh viên tiếp nhận!')
      return
    }

    setSubmitting(true)
    if (editingContract) {
      // Sửa hợp đồng
      const updated = {
        ...editingContract,
        ...contractForm,
        signed_intern: contractForm.status === 'completed',
        status_label: contractForm.status === 'completed' ? 'Hoàn tất' : 'Chờ TTS ký nhận',
      }
      syncContractUpdated(editingContract.id, updated)
      setItems((prev) => prev.map((c) => (c.id === editingContract.id ? updated : c)))
      if (selectedContract && selectedContract.id === editingContract.id) {
        setSelectedContract(updated)
      }
      showToast(`Đã cập nhật hợp đồng cho sinh viên ${updated.student_name} thành công!`)
      setEditingContract(null)
    } else {
      // Phát hành hợp đồng mới
      const newContract = syncContractCreated(contractForm)
      setItems((prev) => [newContract, ...prev])
      showToast(`Đã phát hành hợp đồng cho sinh viên ${newContract.student_name}!`)
      setIsCreateContractModalOpen(false)
    }
    setSubmitting(false)
  }

  async function handleDeleteContract(id, studentName) {
    const ok = window.confirm(`Bạn có chắc chắn muốn hủy / xóa hợp đồng của sinh viên ${studentName || ''}?`)
    if (!ok) return

    try {
      await deleteContract(id)
    } catch {
      // fallback
    }
    syncContractDeleted(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (selectedContract && (selectedContract.id === id)) {
      setSelectedContract(null)
    }
    showToast(`Đã xóa hợp đồng thành công!`)
  }

  // Download PDF
  function handleDownloadPdf(docTitle) {
    showToast(`Đang kết xuất văn bản hợp đồng PDF...`)
  }

  // Filtered contracts đã gửi
  const filteredContracts = useMemo(() => {
    let list = items
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (i) =>
          (i.student_name || '').toLowerCase().includes(q) ||
          (i.contract_code || '').toLowerCase().includes(q) ||
          (i.student_code || '').toLowerCase().includes(q) ||
          (i.department || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((i) =>
        statusFilter === 'completed' ? isContractSigned(i) : !isContractSigned(i)
      )
    }
    return list
  }, [items, query, statusFilter])

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (!query.trim()) return templates
    const q = query.toLowerCase()
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }, [templates, query])

  return (
    <div className="hr-subpage-container">
      {toast && (
        <div className="subpage-toast" role="status">
          <CheckCircle size={16} color="#10B981" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="hr-subpage-header">
        <div className="subpage-title-group">
          <h1>Hợp đồng & Tiếp nhận sinh viên</h1>
          <p>
            Quản lý kho văn bản hợp đồng có sẵn, cấu hình biểu mẫu tiếp nhận và theo dõi tiến độ gửi &amp; ký kết của ứng viên.
          </p>
        </div>
        <div className="subpage-actions-cluster">
          <button
            type="button"
            className="subpage-btn subpage-btn--primary"
            onClick={handleOpenCreateTemplate}
          >
            <PlusCircle size={16} />
            <span>Tạo mẫu hợp đồng mới</span>
          </button>
        </div>
      </header>

      {/* Tab chuyển đổi giữa Kho văn bản mẫu và Hợp đồng đã phát hành */}
      <div className="subpage-tabs-bar">
        <button
          type="button"
          className={`subpage-tab-btn ${activeTab === 'templates' ? 'subpage-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <Layers size={15} />
          <span>Kho văn bản &amp; Biểu mẫu hợp đồng có sẵn</span>
          <span className="subpage-tab-badge">{templates.length}</span>
        </button>
        <button
          type="button"
          className={`subpage-tab-btn ${activeTab === 'issued' ? 'subpage-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('issued')}
        >
          <FileCheck size={15} />
          <span>Hợp đồng đã gửi &amp; Tiến độ tiếp nhận</span>
          <span className="subpage-tab-badge">{items.length}</span>
        </button>
      </div>

      {/* TAB 1: KHO BIỂU MẪU HỢP ĐỒNG CÓ SẴN TRONG HỆ THỐNG */}
      {activeTab === 'templates' && (
        <section className="subpage-panel">
          <div className="subpage-panel-toolbar">
            <div className="subpage-search-wrap">
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Tìm kiếm mẫu hợp đồng theo tên, mã văn bản, phân loại..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="subpage-search-input"
              />
            </div>
          </div>

          <div className="contract-templates-grid">
            {filteredTemplates.map((tpl) => (
              <div key={tpl.id} className="contract-template-card">
                <div>
                  <div className="template-card-header" style={{ justifyContent: 'flex-start' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, background: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      {tpl.category}
                    </span>
                  </div>
                  <h3 className="template-card-title">{tpl.title}</h3>
                  <p className="template-card-desc">{tpl.description}</p>

                  <div className="template-card-specs">
                    <div>
                      <strong>Thời hạn:</strong> {tpl.duration}
                    </div>
                    <div>
                      <strong>Phụ cấp chuẩn:</strong>{' '}
                      <span style={{ color: '#047857', fontWeight: 700 }}>
                        {tpl.defaultAllowance}
                      </span>
                    </div>
                    <div>
                      <strong>Đơn vị:</strong> {tpl.department}
                    </div>
                  </div>
                </div>

                <div className="template-card-actions">
                  <button
                    type="button"
                    className="sub-table-btn sub-table-btn--outline"
                    onClick={() => setPreviewTemplate(tpl)}
                    title="Xem trước toàn văn biểu mẫu"
                  >
                    <Eye size={13} />
                    <span>Xem</span>
                  </button>
                  <button
                    type="button"
                    className="sub-table-btn sub-table-btn--outline"
                    onClick={() => handleDownloadPdf(tpl.title)}
                    title="Tải tệp mẫu PDF"
                  >
                    <Download size={13} />
                    <span>Tải PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: DANH SÁCH HỢP ĐỒNG ĐÃ PHÁT HÀNH CHO SINH VIÊN */}
      {activeTab === 'issued' && (
        <section className="subpage-panel">
          <div className="subpage-panel-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
              <div className="subpage-search-wrap" style={{ flex: 1 }}>
                <Search size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Tìm theo mã HĐ, tên sinh viên, mã SV..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="subpage-search-input"
                />
              </div>

              <div className="subpage-filter-group">
                <select
                  className="subpage-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="completed">Hoàn tất (TTS đã ký)</option>
                  <option value="pending_intern">Chờ TTS ký nhận</option>
                </select>
              </div>
            </div>
          </div>

          <div className="subpage-table-wrapper">
            <table className="subpage-table contracts-issued-table">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Loại văn bản hợp đồng</th>
                  <th>Sinh viên tiếp nhận</th>
                  <th>Thời hạn thực tập</th>
                  <th>Phụ cấp &amp; Phòng Lab</th>
                  <th className="col-center">Ngày gửi</th>
                  <th className="col-center">Trạng thái</th>
                  <th className="col-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong style={{ color: '#0F172A', fontSize: '0.86rem', lineHeight: 1.4, display: 'block' }}>
                        {row.doc_type}
                      </strong>
                    </td>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                          {row.student_name}
                        </strong>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                          {row.student_code ? `${row.student_code} · ` : ''}{row.faculty}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.79rem', color: '#334155', lineHeight: 1.35 }}>
                        <div><strong>Từ:</strong> {row.start_date || '01/10/2026'}</div>
                        <div style={{ marginTop: '2px' }}><strong>Đến:</strong> {row.end_date || '31/12/2026'}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                          {row.allowance || '3.000.000 đ/tháng'}
                        </span>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px', lineHeight: 1.3 }}>
                          {row.department || 'TT Phát triển Phần mềm ICTU'}
                        </div>
                      </div>
                    </td>
                    <td className="col-center" style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {row.created_at || '28/09/2026'}
                    </td>
                    <td className="col-center">
                      <span
                        className={`sub-status-pill ${
                          isContractSigned(row)
                            ? 'sub-status-pill--success'
                            : 'sub-status-pill--warning'
                        }`}
                      >
                        {isContractSigned(row) ? '✓ Hoàn tất' : '⏳ Chờ TTS ký'}
                      </span>
                    </td>
                    <td className="col-center">
                      <div className="contracts-actions">
                        <button
                          type="button"
                          className="sub-table-btn sub-table-btn--outline"
                          onClick={() => setSelectedContract(row)}
                          title="Xem chi tiết toàn văn hợp đồng"
                        >
                          <Eye size={13} />
                          <span>Xem</span>
                        </button>
                        {!isContractSigned(row) && (
                          <button
                            type="button"
                            className="sub-table-btn sub-table-btn--outline"
                            onClick={() => handleOpenEditContract(row)}
                            title="Chỉnh sửa thông số hợp đồng này"
                          >
                            <Edit2 size={13} />
                            <span>Sửa</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="sub-table-btn sub-table-btn--outline"
                          onClick={() => handleDownloadPdf(row.doc_type)}
                          title="Tải văn bản hợp đồng PDF"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                        {!isContractSigned(row) && (
                          <button
                            type="button"
                            className="sub-table-btn sub-table-btn--danger"
                            onClick={() => handleDeleteContract(row.id, row.student_name)}
                            title="Hủy / Xóa hợp đồng"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                      Chưa có hợp đồng nào được phát hành trong mục này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL 1: TẠO MỚI / CHỈNH SỬA MẪU HỢP ĐỒNG LƯU VÀO KHO VĂN BẢN ── */}
      {isCreateTemplateModalOpen && (
        <div
          className="hr-modal-overlay"
          onClick={() => {
            setIsCreateTemplateModalOpen(false)
            setEditingTemplate(null)
          }}
        >
          <div className="hr-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <div>
                <h2>
                  {editingTemplate ? <Edit2 size={20} color="#2563EB" /> : <PlusCircle size={20} color="#2563EB" />}
                  <span>{editingTemplate ? 'Chỉnh Sửa Biểu Mẫu Hợp Đồng' : 'Tạo Mẫu Hợp Đồng Mới Trong Hệ Thống'}</span>
                </h2>
                <p>
                  {editingTemplate
                    ? `Cập nhật nội dung biểu mẫu: ${editingTemplate.title}`
                    : 'Khởi tạo biểu mẫu văn bản có sẵn để HR sử dụng gửi cho ứng viên sau khi duyệt'}
                </p>
              </div>
              <button
                type="button"
                className="hr-modal-close-btn"
                onClick={() => {
                  setIsCreateTemplateModalOpen(false)
                  setEditingTemplate(null)
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form className="hr-modal-form" onSubmit={handleTemplateFormSubmit}>
              <div className="hr-modal-body">
                <input type="hidden" value={tplCode} />
                <div className="hr-form-group">
                  <label className="hr-form-label">Phân loại biểu mẫu</label>
                  <select
                    className="hr-form-select"
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                  >
                    <option value="Thực tập Chuyên ngành">Thực tập Chuyên ngành</option>
                    <option value="Đào tạo Tín chỉ 3 bên">Đào tạo Tín chỉ 3 bên</option>
                    <option value="Dự án Nghiên cứu R&D">Dự án Nghiên cứu R&amp;D</option>
                    <option value="Thử việc & Chuyển tiếp">Thử việc &amp; Chuyển tiếp</option>
                  </select>
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">
                    Tên loại văn bản hợp đồng <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="hr-form-input"
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    placeholder="VD: Hợp đồng Tiếp nhận Thực tập Kỹ sư AI & Cloud"
                    required
                  />
                </div>

                <div className="hr-form-grid-2">
                  <div className="hr-form-group">
                    <label className="hr-form-label">Thời hạn chuẩn</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={tplDuration}
                      onChange={(e) => setTplDuration(e.target.value)}
                      placeholder="VD: 03 tháng (Từ 01/10/2026 đến 31/12/2026)"
                    />
                  </div>
                  <div className="hr-form-group">
                    <label className="hr-form-label">Mức phụ cấp chuẩn</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={tplAllowance}
                      onChange={(e) => setTplAllowance(e.target.value)}
                      placeholder="VD: 3.000.000 đ/tháng"
                    />
                  </div>
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">Đơn vị / Phòng Lab tiếp nhận chuẩn</label>
                  <select
                    className="hr-form-select"
                    value={tplDepartment}
                    onChange={(e) => setTplDepartment(e.target.value)}
                  >
                    <option value="Trung tâm Phát triển Phần mềm ICTU">
                      Trung tâm Phát triển Phần mềm ICTU
                    </option>
                    <option value="Phòng Nghiên cứu Công nghệ Số & AI">
                      Phòng Nghiên cứu Công nghệ Số &amp; AI
                    </option>
                    <option value="Phòng Đảm bảo Chất lượng & QA/QC">
                      Phòng Đảm bảo Chất lượng &amp; QA/QC
                    </option>
                    <option value="Bộ phận Kỹ thuật Phần mềm Doanh nghiệp">
                      Bộ phận Kỹ thuật Phần mềm Doanh nghiệp
                    </option>
                  </select>
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">Mô tả</label>
                  <textarea
                    className="hr-form-textarea"
                    rows={2}
                    value={tplDesc}
                    onChange={(e) => setTplDesc(e.target.value)}
                    placeholder="Mô tả phạm vi áp dụng, đối tượng sinh viên tiếp nhận..."
                  />
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">Các điều khoản chuẩn</label>
                  <textarea
                    className="hr-form-textarea"
                    rows={3}
                    value={tplTerms}
                    onChange={(e) => setTplTerms(e.target.value)}
                    placeholder="Nội dung quyền lợi, trách nhiệm và cam kết bảo mật..."
                  />
                </div>
              </div>

              <div className="hr-modal-footer">
                <button
                  type="button"
                  className="subpage-btn subpage-btn--outline"
                  onClick={() => setIsCreateTemplateModalOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="subpage-btn subpage-btn--primary"
                  disabled={submitting}
                >
                  <PlusCircle size={15} />
                  <span>{submitting ? 'Đang lưu...' : (editingTemplate ? 'Lưu thay đổi' : 'Lưu vào Kho Văn bản')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: XEM TOÀN VĂN MẪU BIỂU MẪU CÓ SẴN ── */}
      {previewTemplate && (
        <div className="hr-modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div
            className="hr-modal-container hr-modal-container--large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hr-modal-header">
              <div>
                <h2>
                  <FileText size={20} color="#2563EB" />
                  Biểu mẫu hợp đồng: {previewTemplate.title}
                </h2>
                <p>Toàn văn biểu mẫu hợp đồng tiêu chuẩn có sẵn trong hệ thống</p>
              </div>
              <button
                type="button"
                className="hr-modal-close-btn"
                onClick={() => setPreviewTemplate(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="hr-modal-body">
              <div className="contract-paper">
                <div className="contract-paper-header">
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#475569' }}>
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="contract-paper-title">{previewTemplate.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Phân loại: {previewTemplate.category}
                  </div>
                </div>

                <div className="contract-section">
                  <div className="contract-section-title">
                    <Building2 size={15} color="#2563EB" />
                    Bên A: Đơn vị tiếp nhận thực tập (Doanh nghiệp)
                  </div>
                  <div className="contract-info-grid">
                    <span className="label">Đơn vị:</span>
                    <span className="val">{previewTemplate.department}</span>
                    <span className="label">Đại diện:</span>
                    <span className="val">Ban Quản lý Chương trình Thực tập Doanh nghiệp ICTU</span>
                    <span className="label">Địa chỉ làm việc:</span>
                    <span className="val">Tòa nhà Công nghệ ICTU, Đường Z115, TP. Thái Nguyên</span>
                  </div>
                </div>

                <div className="contract-section">
                  <div className="contract-section-title">
                    <UserCheck size={15} color="#2563EB" />
                    Bên B: Sinh viên thực tập / Thực tập sinh tiếp nhận
                  </div>
                  <div className="contract-info-grid">
                    <span className="label">Họ và tên:</span>
                    <span className="val" style={{ color: '#2563EB', fontWeight: 600 }}>
                      [Họ tên ứng viên / TTS cụ thể khi gửi]
                    </span>
                    <span className="label">Mã SV:</span>
                    <span className="val">
                      [Mã sinh viên] <small style={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>(Hệ thống tự trích xuất nếu có. Nếu không có sẽ ẩn và thay bằng SĐT)</small>
                    </span>
                    <span className="label">Cơ sở đào tạo:</span>
                    <span className="val">
                      Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU) <small style={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>(Hệ thống tự trích xuất nếu có. Nếu không có sẽ ẩn và thay bằng Email)</small>
                    </span>
                  </div>
                </div>

                <div className="contract-section">
                  <div className="contract-section-title">
                    <Briefcase size={15} color="#2563EB" />
                    Các điều khoản &amp; Quyền lợi quy định trong mẫu
                  </div>
                  <div className="contract-info-grid">
                    <span className="label">Thời hạn chuẩn:</span>
                    <span className="val">{previewTemplate.duration}</span>
                    <span className="label">Mức phụ cấp:</span>
                    <span className="val" style={{ color: '#047857', fontWeight: 700 }}>
                      {previewTemplate.defaultAllowance}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.825rem' }}>
                    <strong>Nội dung cam kết:</strong>
                    <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.25rem', color: '#334155' }}>
                      {Array.isArray(previewTemplate.terms) &&
                        previewTemplate.terms.map((term, idx) => <li key={idx}>{term}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="hr-modal-footer">
              <button
                type="button"
                className="subpage-btn"
                style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                onClick={() => handleDeleteTemplate(previewTemplate.id, previewTemplate.title)}
              >
                <Trash2 size={14} />
                <span>Xóa mẫu</span>
              </button>
              <button
                type="button"
                className="subpage-btn subpage-btn--outline"
                onClick={() => {
                  const tplToEdit = previewTemplate
                  setPreviewTemplate(null)
                  handleOpenEditTemplate(tplToEdit)
                }}
              >
                <Edit2 size={14} />
                <span>Sửa mẫu</span>
              </button>
              <button
                type="button"
                className="subpage-btn subpage-btn--outline"
                onClick={() => handleDownloadPdf(previewTemplate.title)}
              >
                <Download size={14} />
                <span>Tải văn bản mẫu</span>
              </button>
              <button
                type="button"
                className="subpage-btn subpage-btn--primary"
                onClick={() => setPreviewTemplate(null)}
              >
                <span>Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: XEM CHI TIẾT HỢP ĐỒNG ĐÃ PHÁT HÀNH CHO SINH VIÊN ── */}
      {selectedContract && (
        <div className="hr-modal-overlay" onClick={() => setSelectedContract(null)}>
          <div
            className="hr-modal-container hr-modal-container--large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hr-modal-header">
              <div>
                <h2>
                  <FileText size={20} color="#2563EB" />
                  Hợp đồng Tiếp nhận Thực tập: {selectedContract.student_name}
                </h2>
                <p>Văn bản tiếp nhận chính thức đã gửi cho {selectedContract.student_name}</p>
              </div>
              <button
                type="button"
                className="hr-modal-close-btn"
                onClick={() => setSelectedContract(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="hr-modal-body">
              <div className="contract-paper">
                <div className="contract-paper-header">
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#475569' }}>
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="contract-paper-title">{selectedContract.doc_type}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Thái Nguyên, ngày {selectedContract.created_at || '28/09/2026'}
                  </div>
                </div>

                <div className="contract-section">
                  <div className="contract-section-title">
                    <Building2 size={15} color="#2563EB" />
                    Bên A: Đơn vị tiếp nhận thực tập (Doanh nghiệp)
                  </div>
                  <div className="contract-info-grid">
                    <span className="label">Đơn vị:</span>
                    <span className="val">{selectedContract.department || 'Trung tâm Phát triển Phần mềm ICTU'}</span>
                    <span className="label">Đại diện:</span>
                    <span className="val">Ban Quản lý Chương trình Thực tập Doanh nghiệp ICTU</span>
                  </div>
                </div>

                {(() => {
                  const partyB = extractPartyBContractInfo(selectedContract)
                  return (
                    <div className="contract-section">
                      <div className="contract-section-title">
                        <UserCheck size={15} color="#2563EB" />
                        Bên B: {partyB.isStudent ? 'Sinh viên thực tập (Thực tập sinh)' : 'Thực tập sinh tiếp nhận'}
                      </div>
                      <div className="contract-info-grid">
                        <span className="label">Họ và tên:</span>
                        <span className="val" style={{ color: '#2563EB', fontSize: '0.95rem' }}>
                          {partyB.fullName}
                        </span>
                        {partyB.isStudent ? (
                          <>
                            <span className="label">Mã SV:</span>
                            <span className="val">{partyB.studentCode || '---'}</span>
                            <span className="label">Cơ sở đào tạo:</span>
                            <span className="val">
                              {partyB.university || selectedContract.faculty || 'Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="label">Số điện thoại:</span>
                            <span className="val">{partyB.phone || '---'}</span>
                            <span className="label">Email liên hệ:</span>
                            <span className="val">{partyB.email || '---'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })()}

                <div className="contract-section">
                  <div className="contract-section-title">
                    <Briefcase size={15} color="#2563EB" />
                    Điều khoản thực tập &amp; Quyền lợi
                  </div>
                  <div className="contract-info-grid">
                    <span className="label">Thời hạn:</span>
                    <span className="val">
                      Từ ngày {selectedContract.start_date || '01/10/2026'} đến ngày {selectedContract.end_date || '31/12/2026'}
                    </span>
                    <span className="label">Mức phụ cấp:</span>
                    <span className="val" style={{ color: '#047857', fontWeight: 700 }}>
                      {selectedContract.allowance || '3.000.000 đ/tháng'}
                    </span>
                    <span className="label">Trạng thái:</span>
                    <span className="val" style={{ color: isContractSigned(selectedContract) ? '#047857' : '#B45309', fontWeight: 700 }}>
                      {isContractSigned(selectedContract)
                        ? '✓ Hoàn tất (TTS đã ký xác nhận)'
                        : '⏳ Chờ TTS ký nhận'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hr-modal-footer">
              {!isContractSigned(selectedContract) && (
                <>
                  <button
                    type="button"
                    className="subpage-btn"
                    style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                    onClick={() => handleDeleteContract(selectedContract.id, selectedContract.student_name)}
                  >
                    <Trash2 size={14} />
                    <span>Xóa hợp đồng</span>
                  </button>
                  <button
                    type="button"
                    className="subpage-btn subpage-btn--outline"
                    onClick={() => {
                      const cToEdit = selectedContract
                      setSelectedContract(null)
                      handleOpenEditContract(cToEdit)
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Sửa hợp đồng</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="subpage-btn subpage-btn--outline"
                onClick={() => handleDownloadPdf(selectedContract.doc_type)}
              >
                <Download size={14} />
                <span>Tải văn bản PDF</span>
              </button>
              <button
                type="button"
                className="subpage-btn subpage-btn--primary"
                onClick={() => setSelectedContract(null)}
              >
                <span>Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PHÁT HÀNH / CHỈNH SỬA HỢP ĐỒNG CHO SINH VIÊN ── */}
      {(isCreateContractModalOpen || editingContract) && (
        <div
          className="hr-modal-overlay"
          onClick={() => {
            setIsCreateContractModalOpen(false)
            setEditingContract(null)
          }}
        >
          <div className="hr-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <div>
                <h2>
                  <FileCheck size={20} color="#2563EB" />
                  {editingContract
                    ? `Chỉnh sửa Hợp đồng: ${editingContract.student_name || 'Ứng viên'}`
                    : 'Phát hành Hợp đồng Thực tập Mới'}
                </h2>
                <p>
                  {editingContract
                    ? 'Cập nhật thông tin sinh viên, điều khoản hoặc trạng thái hợp đồng'
                    : 'Chọn mẫu văn bản và điền thông tin sinh viên tiếp nhận để phát hành'}
                </p>
              </div>
              <button
                type="button"
                className="hr-modal-close-btn"
                onClick={() => {
                  setIsCreateContractModalOpen(false)
                  setEditingContract(null)
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleContractFormSubmit}>
              <div className="hr-modal-body">
                <input type="hidden" value={contractForm.contract_code} />
                <div className="hr-form-group" style={{ marginBottom: '1rem' }}>
                  <label className="hr-form-label">Áp dụng Mẫu biểu văn bản</label>
                  <select
                    className="hr-form-select"
                    value={contractForm.doc_type}
                    onChange={(e) => {
                      const selectedTpl = templates.find((t) => t.title === e.target.value)
                      setContractForm((prev) => ({
                        ...prev,
                        doc_type: e.target.value,
                        allowance: selectedTpl?.defaultAllowance || prev.allowance,
                        department: selectedTpl?.department || prev.department,
                        notes: Array.isArray(selectedTpl?.terms)
                          ? selectedTpl.terms.join('\n')
                          : selectedTpl?.description || prev.notes,
                      }))
                    }}
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.title}>
                        {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hr-form-row">
                  <div className="hr-form-group">
                    <label className="hr-form-label">
                      Họ và tên Sinh viên <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.student_name}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, student_name: e.target.value }))
                      }
                      placeholder="VD: Trần Văn Nam"
                      required
                    />
                  </div>

                  <div className="hr-form-group">
                    <label className="hr-form-label">Mã số Sinh viên (nếu có)</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.student_code}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, student_code: e.target.value }))
                      }
                      placeholder="VD: DTC2051220001 (Nếu là sinh viên)"
                    />
                  </div>
                </div>

                <div className="hr-form-row">
                  <div className="hr-form-group">
                    <label className="hr-form-label">Tên trường / Cơ sở đào tạo (nếu có)</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.university}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, university: e.target.value }))
                      }
                      placeholder="VD: Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)"
                    />
                  </div>

                  <div className="hr-form-group">
                    <label className="hr-form-label">Bộ phận / Đơn vị tiếp nhận</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.department}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, department: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="hr-form-row">
                  <div className="hr-form-group">
                    <label className="hr-form-label">Số điện thoại TTS</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.phone}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="VD: 0987654321"
                    />
                  </div>

                  <div className="hr-form-group">
                    <label className="hr-form-label">Email liên hệ TTS</label>
                    <input
                      type="email"
                      className="hr-form-input"
                      value={contractForm.email}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="VD: intern@ictu.edu.vn"
                    />
                  </div>
                </div>

                <div className="hr-form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <div className="hr-form-group">
                    <label className="hr-form-label">Ngày bắt đầu</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.start_date}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, start_date: e.target.value }))
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  <div className="hr-form-group">
                    <label className="hr-form-label">Ngày kết thúc</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.end_date}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, end_date: e.target.value }))
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  <div className="hr-form-group">
                    <label className="hr-form-label">Mức phụ cấp</label>
                    <input
                      type="text"
                      className="hr-form-input"
                      value={contractForm.allowance}
                      onChange={(e) =>
                        setContractForm((prev) => ({ ...prev, allowance: e.target.value }))
                      }
                      placeholder="3.000.000 đ/tháng"
                    />
                  </div>
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">Trạng thái hợp đồng</label>
                  <select
                    className="hr-form-select"
                    value={contractForm.status}
                    onChange={(e) =>
                      setContractForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="pending_intern">⏳ Chờ TTS ký nhận</option>
                    <option value="completed">✓ Hoàn tất (TTS đã ký)</option>
                  </select>
                </div>

                <div className="hr-form-group">
                  <label className="hr-form-label">Điều khoản &amp; Ghi chú bổ sung</label>
                  <textarea
                    className="hr-form-textarea"
                    rows={3}
                    value={contractForm.notes}
                    onChange={(e) =>
                      setContractForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Quy định làm việc, cam kết bảo mật NDA hoặc ghi chú thêm..."
                  />
                </div>
              </div>

              <div className="hr-modal-footer">
                <button
                  type="button"
                  className="subpage-btn subpage-btn--outline"
                  onClick={() => {
                    setIsCreateContractModalOpen(false)
                    setEditingContract(null)
                  }}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="subpage-btn subpage-btn--primary"
                  disabled={submitting}
                >
                  {editingContract ? <Edit2 size={15} /> : <PlusCircle size={15} />}
                  <span>
                    {submitting
                      ? 'Đang lưu...'
                      : editingContract
                      ? 'Lưu cập nhật hợp đồng'
                      : 'Xác nhận phát hành'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
