/**
 * src/api/notifications.js
 * API lấy và cập nhật thông báo (notifications) gọi backend thật.
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Backend routes:
 *   - GET   /api/notifications               → list_notifications (mọi user đã đăng nhập)
 *   - PATCH /api/notifications/{id}/read      → mark_notification_read
 *   - PUT   /api/notifications/{id}/read      → mark_notification_read
 */

import apiFetch from './client';

/**
 * Lấy danh sách thông báo của người dùng hiện tại từ backend.
 *
 * API thật: GET /api/notifications
 * Response model: NotificationListResponse
 * Shape: { items: Array<{ id, user_id, title, body, is_read, created_at }>, total: number }
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getNotifications() {
  return apiFetch('/api/notifications', {
    method: 'GET',
  });
}

/**
 * Đánh dấu một thông báo đã đọc theo ID.
 *
 * API thật: PATCH /api/notifications/{id}/read
 * Response model: NotificationResponse
 * Shape: { id, user_id, title, body, is_read: true, created_at }
 *
 * @param {number} notificationId - ID của thông báo
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function markNotificationAsRead(notificationId) {
  return apiFetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}
