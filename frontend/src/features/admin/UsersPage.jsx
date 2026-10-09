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
import { getSavedAvatar } from '../../utils/avatarHelper'
import { getRealtimeSyncState, subscribeRealtimeEvents, syncAdminUserChange } from '../../utils/realtimeSync'
import './AdminPage.css'

function getUserInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  if (trimmed.toUpperCase() === 'TTS') return 'TTS'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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

  const savedProfile = useMemo(() => {
    try {
      const p = localStorage.getItem('ictu_user_profile')
      return p ? JSON.parse(p) : null
    } catch {
      return null
    }
  }, [refreshTick])

  useEffect(() => {
    function handleRefresh() {
      setRefreshTick((t) => t + 1)
    }
    const unsubRealtime = subscribeRealtimeEvents(handleRefresh)
    window.addEventListener('admin_users_updated', handleRefresh)
    window.addEventListener('ictu_profile_updated', handleRefresh)
    window.addEventListener('ictu_avatar_changed', handleRefresh)
    return () => {
      unsubRealtime()
      window.removeEventListener('admin_users_updated', handleRefresh)
      window.removeEventListener('ictu_profile_updated', handleRefresh)
      window.removeEventListener('ictu_avatar_changed', handleRefresh)
    }
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
        const syncState = getRealtimeSyncState()
        const rawList = Array.isArray(data?.items) ? data.items : []
        const mergedList = rawList.map((u) => {
          const resolvedAvatar = getSavedAvatar(u.email, u.id, u.full_name) || u.avatar
          if (activeRole === 'intern') {
            const match = (syncState.applicants || []).find(
              (a) => a.id === u.id || (u.email && a.email?.toLowerCase() === u.email.toLowerCase())
            )
            if (match) {
              let resolvedStatus = u.status
              if (match.account_status === 'inactive' || match.is_frozen) {
                resolvedStatus = 'inactive'
              } else if (match.status === 'approved' || u.status === 'active') {
                resolvedStatus = 'active'
              } else if (match.status === 'rejected') {
                resolvedStatus = 'inactive'
              } else if (match.status === 'pending') {
                resolvedStatus = 'pending'
              }
              return {
                ...u,
                status: resolvedStatus,
                avatar: resolvedAvatar || match.avatar,
              }
            }
          }
          return {
            ...u,
            avatar: resolvedAvatar,
          }
        })
        setItems(mergedList)
        setTotal(typeof data?.total === 'number' ? data.total : mergedList.length)
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
          syncAdminUserChange({ action: 'freeze', user: { ...selected, status: 'inactive' } })
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
          syncAdminUserChange({ action: 'unfreeze', user: { ...selected, status: 'active' } })
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
          const deletedUser = selected
          const deletedId = selected.id
          setSelected(null)
          setItems((prev) => prev.filter((u) => u.id !== deletedId))
          setTotal((n) => Math.max(0, n - 1))
          syncAdminUserChange({ action: 'delete', user: deletedUser })
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
          <p>Danh sách tài khoản theo vai trò HR, Mentor, Thực tập sinh và Quản trị viên.</p>
        </div>
        <Link className="admin-page__cta" to="/admin/users/new">
          + Tạo tài khoản
        </Link>
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
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar-thumb">
                        {getSavedAvatar(user.email, user.id, user.full_name) || user.avatar ? (
                          <img
                            src={getSavedAvatar(user.email, user.id, user.full_name) || user.avatar}
                            alt={user.full_name || ''}
                            className="admin-avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        <span
                          className="admin-avatar-initials"
                          style={{
                            display: (getSavedAvatar(user.email, user.id, user.full_name) || user.avatar) ? 'none' : 'flex',
                          }}
                        >
                          {getUserInitials(user.full_name || user.email)}
                        </span>
                      </div>
                      <div className="admin-user-info">
                        <span className="admin-user-name">{user.full_name || '—'}</span>
                      </div>
                    </div>
                  </td>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="admin-avatar-thumb admin-avatar-thumb--lg">
                  {getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar ? (
                    <img
                      src={getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar}
                      alt={selected.full_name || ''}
                      className="admin-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex'
                        }
                      }}
                    />
                  ) : null}
                  <span
                    className="admin-avatar-initials"
                    style={{
                      display: (getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar) ? 'none' : 'flex',
                    }}
                  >
                    {getUserInitials(selected.full_name || selected.email)}
                  </span>
                </div>
                <div>
                  <p className="admin-drawer__eyebrow">Thao tác tài khoản</p>
                  <h2 id="user-action-title">{selected.full_name || selected.email}</h2>
                </div>
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
                      <th>Ảnh đại diện</th>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="admin-avatar-thumb admin-avatar-thumb--sm">
                            {getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar ? (
                              <img
                                src={getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar}
                                alt={selected.full_name || ''}
                                className="admin-avatar-img"
                              />
                            ) : (
                              <span className="admin-avatar-initials">
                                {getUserInitials(selected.full_name || selected.email)}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {getSavedAvatar(selected.email, selected.id, selected.full_name) || selected.avatar
                              ? 'Đã đồng bộ ảnh hồ sơ'
                              : 'Chưa cập nhật ảnh đại diện'}
                          </span>
                        </div>
                      </td>
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
                    {selected.role === 'intern' && (
                      <>
                        <tr>
                          <th>Số điện thoại</th>
                          <td>{savedProfile?.phone || selected.phone_number || '0987654321'}</td>
                        </tr>
                        <tr>
                          <th>Số CCCD</th>
                          <td>{savedProfile?.cccd || '001203019876'}</td>
                        </tr>
                        <tr>
                          <th>Địa chỉ</th>
                          <td>{savedProfile?.address || 'Phường Quyết Thắng, TP. Thái Nguyên'}</td>
                        </tr>
                        <tr>
                          <th>Tài khoản ngân hàng</th>
                          <td>{savedProfile?.bank_account ? `${savedProfile.bank_name || 'MB Bank'} • ${savedProfile.bank_account}` : 'MB Bank • 999908123456'}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {selected.role === 'intern' && selected.status === 'pending' && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    color: '#92400e',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    marginBottom: '14px',
                  }}
                >
                  ℹ️ <strong>Hồ sơ thực tập sinh đang chờ duyệt:</strong> Thẩm quyền xét duyệt hồ sơ ứng viên/TTS thuộc về Bộ phận Nhân sự (HR). Quản trị viên (Admin) không thực hiện duyệt hoặc từ chối hồ sơ ứng viên.
                </div>
              )}

              <h3>Hành động</h3>
              <div className="admin-drawer__actions">
                {selected.status === 'inactive' ? (
                  <button
                    type="button"
                    className="admin-drawer__action btn-approve"
                    style={{ backgroundColor: '#2563eb', color: '#fff', border: '1px solid #1d4ed8' }}
                    disabled={busy}
                    onClick={() => runAction('unfreeze')}
                  >
                    Mở đóng băng (Kích hoạt)
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-drawer__action"
                    disabled={busy}
                    onClick={() => runAction('freeze')}
                  >
                    Đóng băng tài khoản
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
