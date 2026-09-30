/**
 * Quản lý người dùng — chia theo 3 vai trò: HR / Mentor / TTS
 * Mỗi dòng có nút Hành động → panel chi tiết + thao tác tài khoản.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchUsers,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
} from '../../api/admin'
import './AdminPage.css'

const TABS = [
  { key: 'hr', label: 'HR', hint: 'Nhân sự' },
  { key: 'mentor', label: 'Mentor', hint: 'Hướng dẫn viên' },
  { key: 'intern', label: 'TTS', hint: 'Thực tập sinh' },
  { key: 'admin', label: 'Admin', hint: 'Quản trị viên' },
]

const ROLE_LABEL = {
  hr: 'HR',
  mentor: 'Mentor',
  intern: 'Thực tập sinh',
  admin: 'Quản trị viên',
}

const STATUS_LABEL = {
  active: 'Hoạt động',
  pending: 'Chờ duyệt',
  inactive: 'Đã đóng băng',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const activeRole = TABS.some((t) => t.key === roleParam) ? roleParam : 'hr'

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    function handleUsersUpdated() {
      setRefreshTick((t) => t + 1)
    }
    window.addEventListener('admin_users_updated', handleUsersUpdated)
    return () => window.removeEventListener('admin_users_updated', handleUsersUpdated)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      setSelected(null)
      try {
        const { ok, data, status } = await fetchUsers({ role: activeRole })
        if (cancelled) return
        if (!ok) {
          setItems([])
          setTotal(0)
          setError(
            status === 401 || status === 403
              ? 'Không có quyền xem danh sách người dùng.'
              : data?.detail || 'Không tải được danh sách người dùng.',
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
  }, [activeRole, refreshTick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    )
  }, [items, query])

  function setRole(role) {
    setSearchParams({ role })
    setQuery('')
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function patchUser(id, patch) {
    setItems((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
  }

  async function runAction(action) {
    if (!selected || busy) return
    setBusy(true)

    try {
      switch (action) {
        case 'freeze': {
          const res = await updateUserStatus(selected.id, 'inactive')
          if (!res.ok) {
            showToast(res.data?.detail || 'Không thể đóng băng tài khoản.', 'error')
            return
          }
          patchUser(selected.id, { status: 'inactive' })
          showToast('Đã đóng băng tài khoản trong cơ sở dữ liệu thành công.')
          break
        }
        case 'unfreeze': {
          const res = await updateUserStatus(selected.id, 'active')
          if (!res.ok) {
            showToast(res.data?.detail || 'Không thể mở đóng băng tài khoản.', 'error')
            return
          }
          patchUser(selected.id, { status: 'active' })
          showToast('Đã mở đóng băng tài khoản trong cơ sở dữ liệu thành công.')
          break
        }
        case 'reset_password': {
          const res = await resetUserPassword(selected.id)
          if (!res.ok) {
            showToast(res.data?.detail || 'Không thể đặt lại mật khẩu.', 'error')
            return
          }
          const tempPass = res.data?.temporary_password || 'Ictu@2026'
          showToast(`Đã đổi mật khẩu trong DB thành: ${tempPass}`)
          break
        }
        case 'delete': {
          const res = await deleteUser(selected.id)
          if (!res.ok) {
            showToast(res.data?.detail || 'Không thể xóa tài khoản người dùng.', 'error')
            return
          }
          const deletedId = selected.id
          setSelected(null)
          setItems((prev) => prev.filter((u) => u.id !== deletedId))
          setTotal((n) => Math.max(0, n - 1))
          showToast('Đã xóa vĩnh viễn tài khoản khỏi cơ sở dữ liệu.', 'error')
          break
        }
        default:
          break
      }
    } catch {
      showToast('Đã xảy ra lỗi khi kết nối tới máy chủ.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      {toast && (
        <div
          className={`admin-toast admin-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      <header className="admin-page__head admin-page__head--row">
        <div>
          <nav className="admin-page__crumb" aria-label="Breadcrumb">
            <Link to="/admin/dashboard">Admin</Link>
            <span aria-hidden="true">/</span>
            <span>Người dùng</span>
          </nav>
          <h1>Quản lý người dùng</h1>
          <p>Danh sách tài khoản theo vai trò HR, Mentor và Thực tập sinh.</p>
        </div>
        {activeRole !== 'intern' ? (
          <Link className="admin-page__cta" to="/admin/users/new">
            + Tạo tài khoản
          </Link>
        ) : (
          <Link
            className="admin-page__cta admin-page__cta--ghost"
            to="/register"
            target="_blank"
            rel="noreferrer"
          >
            Đăng ký TTS (công khai)
          </Link>
        )}
      </header>

      <section className="admin-page__card">
        <div className="admin-tabs" role="tablist" aria-label="Vai trò">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeRole === tab.key}
              className={`admin-tabs__btn${activeRole === tab.key ? ' is-active' : ''}`}
              onClick={() => setRole(tab.key)}
            >
              <span className="admin-tabs__label">{tab.label}</span>
              <span className="admin-tabs__hint">{tab.hint}</span>
            </button>
          ))}
        </div>

        <div className="admin-page__toolbar">
          <label className="admin-page__search">
            <span className="visually-hidden">Tìm kiếm</span>
            <input
              type="search"
              placeholder="Tìm theo họ tên hoặc email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="admin-page__meta">
            {loading
              ? 'Đang tải…'
              : query.trim()
                ? `${filtered.length} / ${total} người dùng`
                : `${total} người dùng`}
          </p>
        </div>

        {error && <p className="admin-page__error">{error}</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="admin-table__actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty">
                      <strong>Không có người dùng</strong>
                      <span>
                        {query.trim()
                          ? 'Không tìm thấy kết quả phù hợp.'
                          : activeRole === 'intern'
                            ? 'Chưa có thực tập sinh đăng ký.'
                            : 'Chưa có tài khoản ở vai trò này. Hãy tạo tài khoản mới.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={selected?.id === user.id ? 'is-selected-row' : ''}
                >
                  <td><strong className="admin-user-code">{user.code || `ID-${user.id}`}</strong></td>
                  <td>{user.full_name || '—'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`admin-status admin-status--${user.status || 'pending'}`}
                    >
                      {STATUS_LABEL[user.status] || user.status || '—'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td className="admin-table__actions-col">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => setSelected(user)}
                    >
                      Hành động
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="admin-drawer-root" role="presentation">
          <button
            type="button"
            className="admin-drawer__backdrop"
            aria-label="Đóng"
            onClick={() => setSelected(null)}
          />
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-title"
          >
            <header className="admin-drawer__head">
              <div>
                <p className="admin-drawer__eyebrow">Thao tác tài khoản</p>
                <h2 id="user-action-title">{selected.full_name || selected.email}</h2>
              </div>
              <button
                type="button"
                className="admin-drawer__close"
                onClick={() => setSelected(null)}
              >
                Đóng
              </button>
            </header>

            <div className="admin-drawer__body">
              <h3>Thông tin tài khoản</h3>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--detail">
                  <tbody>
                    <tr>
                      <th>Mã</th>
                      <td>{selected.code || '—'}</td>
                    </tr>
                    <tr>
                      <th>ID hệ thống</th>
                      <td>{selected.id}</td>
                    </tr>
                    <tr>
                      <th>Họ tên</th>
                      <td>{selected.full_name || '—'}</td>
                    </tr>
                    <tr>
                      <th>Email</th>
                      <td>{selected.email}</td>
                    </tr>
                    <tr>
                      <th>Vai trò</th>
                      <td>{ROLE_LABEL[selected.role] || selected.role}</td>
                    </tr>
                    <tr>
                      <th>Trạng thái</th>
                      <td>
                        <span
                          className={`admin-status admin-status--${selected.status || 'pending'}`}
                        >
                          {STATUS_LABEL[selected.status] || selected.status || '—'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Ngày tạo</th>
                      <td>{formatDateTime(selected.created_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>Hành động</h3>
              <div className="admin-drawer__actions">
                {selected.status !== 'inactive' ? (
                  <button
                    type="button"
                    className="admin-drawer__action"
                    disabled={busy}
                    onClick={() => runAction('freeze')}
                  >
                    Đóng băng tài khoản
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-drawer__action"
                    disabled={busy}
                    onClick={() => runAction('unfreeze')}
                  >
                    Mở đóng băng
                  </button>
                )}

                <button
                  type="button"
                  className="admin-drawer__action"
                  disabled={busy}
                  onClick={() => runAction('reset_password')}
                >
                  Đặt lại mật khẩu
                </button>

                <button
                  type="button"
                  className="admin-drawer__action admin-drawer__action--danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Xác nhận xóa vĩnh viễn tài khoản ${selected.email} khỏi cơ sở dữ liệu? Thao tác không thể hoàn tác.`,
                      )
                    ) {
                      runAction('delete')
                    }
                  }}
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
