import { Link } from 'react-router-dom'
import './AdminPlaceholderPage.css'

/**
 * Trang tạm cho module admin chưa hoàn thiện (vd. system-logs UI).
 */
export default function AdminPlaceholderPage({
  title = 'Đang phát triển',
  description = 'Màn hình này sẽ được bổ sung trong các task tiếp theo.',
}) {
  return (
    <div className="admin-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to="/admin/dashboard">← Về tổng quan</Link>
    </div>
  )
}
