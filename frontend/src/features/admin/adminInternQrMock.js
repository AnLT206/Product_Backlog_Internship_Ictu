/**
 * adminInternQrMock.js
 *
 * Tầng Mock Service quản lý mã QR chấm công thực tập sinh (Admin Portal).
 * Được thiết kế độc lập, chuẩn Interface API để sau này thay thế bằng
 * API Backend thật (ví dụ: /api/admin/interns/qr) mà không cần viết lại giao diện.
 */

const STORAGE_KEY = 'ictu_admin_intern_qr_store'

export const INITIAL_INTERN_QR_DATA = [
  {
    id: 1,
    intern_id: 5,
    code: 'TTS0001',
    full_name: 'Nguyễn Văn An',
    email: 'intern@ictu.edu.vn',
    phone: '0981234567',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
    department: 'Phòng Phát triển Phần mềm (Core API)',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: true,
    qr_code: 'intern:TTS0001:1',
    qr_generated_at: '2026-10-01T08:30:00Z',
    notes: 'Đã kích hoạt cổng IoT Lab 302 và Tòa C1',
  },
  {
    id: 2,
    intern_id: 6,
    code: 'TTS0002',
    full_name: 'Lê Hoàng Nam',
    email: 'tts02@student.ictu.edu.vn',
    phone: '0982345678',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Kỹ thuật phần mềm',
    department: 'Phòng Ứng dụng Web & Mobile',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: true,
    qr_code: 'intern:TTS0002:2',
    qr_generated_at: '2026-10-02T09:15:00Z',
    notes: 'Đã kích hoạt cổng IoT Lab 302 và Tòa C1',
  },
  {
    id: 3,
    intern_id: 8,
    code: 'TTS0003',
    full_name: 'Trần Thị Mai Phương',
    email: 'tts03@student.ictu.edu.vn',
    phone: '0983456789',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Hệ thống thông tin',
    department: 'Phòng Dữ liệu & Business Intelligence',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: false,
    qr_code: null,
    qr_generated_at: null,
    notes: 'Chưa cấp phát mã QR điểm danh',
  },
  {
    id: 4,
    intern_id: 9,
    code: 'TTS0004',
    full_name: 'Hoàng Minh Đức',
    email: 'tts04@student.ictu.edu.vn',
    phone: '0984567890',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'An toàn thông tin',
    department: 'Phòng An ninh mạng & DevSecOps',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: false,
    qr_code: null,
    qr_generated_at: null,
    notes: 'Chưa cấp phát mã QR điểm danh',
  },
  {
    id: 5,
    intern_id: 10,
    code: 'TTS0005',
    full_name: 'Vũ Thị Ngọc Ánh',
    email: 'anh.vtn@student.ictu.edu.vn',
    phone: '0985678901',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Công nghệ thông tin',
    department: 'Phòng Kiểm thử & Đảm bảo chất lượng (QA)',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: false,
    qr_code: null,
    qr_generated_at: null,
    notes: 'Chưa cấp phát mã QR điểm danh',
  },
  {
    id: 6,
    intern_id: 11,
    code: 'TTS0006',
    full_name: 'Đặng Tuấn Kiệt',
    email: 'kiet.dt@student.ictu.edu.vn',
    phone: '0986789012',
    university: 'Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)',
    major: 'Khoa học máy tính',
    department: 'Phòng Nghiên cứu AI & R&D',
    batch: 'Khóa K20 - Kỳ Thu 2026',
    avatar: null,
    has_qr: true,
    qr_code: 'intern:TTS0006:6',
    qr_generated_at: '2026-10-05T14:20:00Z',
    notes: 'Đã kích hoạt cổng IoT Lab 302 và Tòa C1',
  },
]

function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [...INITIAL_INTERN_QR_DATA]
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_INTERN_QR_DATA))
      return [...INITIAL_INTERN_QR_DATA]
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...INITIAL_INTERN_QR_DATA]
  } catch {
    return [...INITIAL_INTERN_QR_DATA]
  }
}

function setStorage(items) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('admin_intern_qr_updated', { detail: { items } }))
    }
  } catch {
    // Không ném lỗi nếu localStorage bị chặn
  }
}

/**
 * Lấy danh sách thực tập sinh và trạng thái mã QR
 * Tương thích với API: GET /api/admin/interns/qr
 */
export async function fetchInternQrList({ query = '', status = 'all', department = 'all' } = {}) {
  // Mô phỏng độ trễ mạng nhẹ (100ms) để hỗ trợ kiểm thử loading state
  await new Promise((resolve) => setTimeout(resolve, 60))

  const allItems = getStorage()
  let filtered = allItems

  // Lọc theo từ khóa tìm kiếm (họ tên, mã thực tập sinh, email)
  const q = String(query || '').trim().toLowerCase()
  if (q) {
    filtered = filtered.filter(
      (item) =>
        (item.full_name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.major || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q)
    )
  }

  // Lọc theo trạng thái QR: 'has_qr' | 'no_qr' | 'all'
  if (status === 'has_qr') {
    filtered = filtered.filter((item) => item.has_qr)
  } else if (status === 'no_qr') {
    filtered = filtered.filter((item) => !item.has_qr)
  }

  // Lọc theo phòng ban nếu có
  if (department && department !== 'all') {
    filtered = filtered.filter((item) => item.department === department)
  }

  return {
    ok: true,
    status: 200,
    data: {
      items: filtered,
      total: filtered.length,
      grand_total: allItems.length,
      has_qr_count: allItems.filter((i) => i.has_qr).length,
      no_qr_count: allItems.filter((i) => !i.has_qr).length,
    },
  }
}

/**
 * Tạo mã QR cá nhân cho một thực tập sinh
 * Tương thích với API: POST /api/admin/interns/:id/qr
 */
export async function generateInternQr(internId) {
  await new Promise((resolve) => setTimeout(resolve, 80))

  const items = getStorage()
  const idx = items.findIndex((i) => i.id === internId || i.intern_id === internId)
  if (idx === -1) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy thực tập sinh.' },
    }
  }

  const current = items[idx]
  const updatedItem = {
    ...current,
    has_qr: true,
    qr_code: `intern:${current.code}:${current.id}`,
    qr_generated_at: new Date().toISOString(),
    notes: 'Mã QR đã tạo và kích hoạt thành công cho cổng chấm công',
  }

  items[idx] = updatedItem
  setStorage(items)

  return {
    ok: true,
    status: 200,
    data: updatedItem,
  }
}

/**
 * Tạo mã QR hàng loạt cho nhiều thực tập sinh được chọn
 * Tương thích với API: POST /api/admin/interns/qr/batch
 */
export async function batchGenerateInternQr(internIds = []) {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const items = getStorage()
  const idSet = new Set(internIds)
  let updatedCount = 0

  const updatedItems = items.map((item) => {
    if (idSet.has(item.id) && !item.has_qr) {
      updatedCount++
      return {
        ...item,
        has_qr: true,
        qr_code: `intern:${item.code}:${item.id}`,
        qr_generated_at: new Date().toISOString(),
        notes: 'Mã QR đã tạo và kích hoạt qua thao tác hàng loạt',
      }
    }
    return item
  })

  setStorage(updatedItems)

  return {
    ok: true,
    status: 200,
    data: {
      updated_count: updatedCount,
      items: updatedItems,
    },
  }
}

/**
 * Đặt lại dữ liệu mẫu (dùng cho testing hoặc reset)
 */
export function resetInternQrMockData() {
  setStorage(INITIAL_INTERN_QR_DATA)
}
