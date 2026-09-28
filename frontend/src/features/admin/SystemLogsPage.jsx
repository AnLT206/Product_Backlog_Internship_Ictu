import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSystemLogs } from '../../api/admin'
import './AdminPage.css'

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
]

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function SystemLogsPage() {
  const [action, setAction] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const { ok, status, data } = await fetchSystemLogs({
          limit: 50,
          offset: 0,
          action: action || undefined,
        })
        if (cancelled) return
        if (!ok) {
          setItems([])
          setTotal(0)
          setError(
            status === 401 || status === 403
              ? 'Không có quyền xem nhật ký.'
              : data?.detail || 'Không tải được nhật ký hệ thống.',
          )
          return
        }
        setItems(Array.isArray(data?.items) ? data.items : [])
        setTotal(typeof data?.total === 'number' ? data.total : 0)
      } catch {
        if (!cancelled) {
          setItems([])
          setTotal(0)
          setError('Không thể kết nối tới máy chủ.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [action])

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <nav className="admin-page__crumb" aria-label="Breadcrumb">
            <Link to="/admin/dashboard">Admin</Link>
            <span aria-hidden="true">/</span>
            <span>Nhật ký hệ thống</span>
          </nav>
          <h1>Nhật ký hệ thống</h1>
          <p>Theo dõi thao tác CREATE / UPDATE / DELETE trên hệ thống.</p>
        </div>
      </header>

      <section className="admin-page__card">
        <div className="admin-page__toolbar">
          <label className="admin-page__filter">
            <span>Loại thao tác</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="admin-page__meta">
            {loading ? 'Đang tải…' : `${total} bản ghi`}
          </p>
        </div>

        {error && <p className="admin-page__error">{error}</p>}

        <p className="admin-scroll-hint">Vuốt ngang để xem đủ cột →</p>

        <div className="admin-table-wrap admin-logs-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Vai trò</th>
                <th>Hành động</th>
                <th>Tài nguyên</th>
                <th>Method</th>
                <th>Path</th>
                <th>Mã</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && !error && (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty">
                      <strong>Chưa có nhật ký</strong>
                      <span>Các thao tác thêm / sửa / xóa sẽ xuất hiện tại đây.</span>
                    </div>
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{formatTime(row.created_at)}</td>
                  <td>{row.role || '—'}</td>
                  <td>
                    <span className={`admin-tag admin-tag--${row.action?.toLowerCase()}`}>
                      {row.action}
                    </span>
                  </td>
                  <td>{row.resource || '—'}</td>
                  <td>{row.method}</td>
                  <td className="admin-table__path">{row.path}</td>
                  <td>{row.status_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-log-cards" aria-label="Nhật ký dạng thẻ">
          {!loading && items.length === 0 && !error && (
            <div className="admin-empty">
              <strong>Chưa có nhật ký</strong>
              <span>Các thao tác thêm / sửa / xóa sẽ xuất hiện tại đây.</span>
            </div>
          )}
          {items.map((row) => (
            <article key={`card-${row.id}`} className="admin-log-card">
              <header className="admin-log-card__head">
                <span className={`admin-tag admin-tag--${row.action?.toLowerCase()}`}>
                  {row.action}
                </span>
                <time>{formatTime(row.created_at)}</time>
              </header>
              <dl className="admin-log-card__body">
                <div>
                  <dt>Vai trò</dt>
                  <dd>{row.role || '—'}</dd>
                </div>
                <div>
                  <dt>Tài nguyên</dt>
                  <dd>{row.resource || '—'}</dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{row.method}</dd>
                </div>
                <div>
                  <dt>Path</dt>
                  <dd className="admin-log-card__path">{row.path}</dd>
                </div>
                <div>
                  <dt>Mã</dt>
                  <dd>{row.status_code}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
