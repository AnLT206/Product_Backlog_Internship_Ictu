import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import './AdminPage.css'

/**
 * US-40 — Ma trận phân quyền theo vai trò.
 * Đồng bộ với phân quyền nghiệp vụ hiện có trong hệ thống.
 */

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'hr', label: 'HR' },
  { key: 'mentor', label: 'Mentor' },
  { key: 'intern', label: 'TTS' },
]

const PERMISSIONS = [
  {
    module: 'Tài khoản & phân quyền',
    items: [
      { name: 'Tạo tài khoản HR / Mentor', admin: true, hr: false, mentor: false, intern: false },
      { name: 'Xem nhật ký hệ thống', admin: true, hr: false, mentor: false, intern: false },
      { name: 'Xem ma trận phân quyền', admin: true, hr: false, mentor: false, intern: false },
    ],
  },
  {
    module: 'Hồ sơ thực tập sinh',
    items: [
      { name: 'Thêm / sửa hồ sơ TTS', admin: true, hr: true, mentor: false, intern: false },
      { name: 'Tìm kiếm / lọc TTS', admin: true, hr: true, mentor: false, intern: false },
      { name: 'Upload CV / đơn (của mình)', admin: false, hr: false, mentor: false, intern: true },
      { name: 'Duyệt tài liệu hồ sơ', admin: false, hr: true, mentor: false, intern: false },
    ],
  },
  {
    module: 'Tiếp nhận & hợp đồng',
    items: [
      { name: 'Đăng ký tài khoản TTS', admin: false, hr: false, mentor: false, intern: true },
      { name: 'Duyệt / từ chối hồ sơ', admin: false, hr: true, mentor: false, intern: false },
      { name: 'Tải lên hợp đồng', admin: true, hr: true, mentor: false, intern: false },
      { name: 'Xác nhận hợp đồng', admin: false, hr: false, mentor: false, intern: true },
    ],
  },
  {
    module: 'Chương trình thực tập',
    items: [
      { name: 'Tạo / cập nhật chương trình', admin: true, hr: true, mentor: false, intern: false },
      { name: 'Phân công mentor', admin: true, hr: true, mentor: false, intern: false },
      { name: 'Xem lịch thực tập', admin: true, hr: true, mentor: true, intern: true },
    ],
  },
  {
    module: 'Công việc & đánh giá',
    items: [
      { name: 'Giao nhiệm vụ', admin: true, hr: false, mentor: true, intern: false },
      { name: 'Cập nhật tiến độ / nộp báo cáo', admin: false, hr: false, mentor: false, intern: true },
      { name: 'Xem báo cáo & phản hồi', admin: true, hr: true, mentor: true, intern: false },
      { name: 'Đánh giá TTS', admin: true, hr: false, mentor: true, intern: false },
      { name: 'Tổng hợp đánh giá cuối kỳ', admin: true, hr: true, mentor: false, intern: false },
    ],
  },
]

function Cell({ allowed }) {
  return (
    <td className={allowed ? 'is-yes' : 'is-no'}>
      <span aria-label={allowed ? 'Có quyền' : 'Không có quyền'}>
        {allowed ? '●' : '—'}
      </span>
    </td>
  )
}

export default function RolesPermissionsPage() {
  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <nav className="admin-page__crumb" aria-label="Breadcrumb">
            <Link to="/admin/dashboard">Admin</Link>
            <span aria-hidden="true">/</span>
            <span>Phân quyền</span>
          </nav>
          <h1>Phân quyền theo vai trò</h1>
          <p>
            Quyền truy cập chức năng theo từng vai trò trong hệ thống thực tập ICTU.
          </p>
        </div>
      </header>

      <section className="admin-page__card">
        <div className="admin-table-wrap admin-table-wrap--scroll">
          <table className="admin-table admin-table--matrix">
            <thead>
              <tr>
                <th>Chức năng</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="admin-table__role">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((group) => (
                <Fragment key={group.module}>
                  <tr className="admin-table__group">
                    <td colSpan={1 + ROLES.length}>{group.module}</td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={`${group.module}-${item.name}`}>
                      <td>{item.name}</td>
                      {ROLES.map((r) => (
                        <Cell key={r.key} allowed={Boolean(item[r.key])} />
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="admin-page__footnote">
          ● Có quyền · — Không có quyền. Ma trận phản ánh phân quyền hiện tại của hệ thống.
        </p>
      </section>
    </div>
  )
}
