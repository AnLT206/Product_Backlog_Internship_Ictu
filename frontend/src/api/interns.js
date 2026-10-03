/**
 * src/api/interns.js
 * Tất cả lời gọi API liên quan đến thực tập sinh (intern).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 *
 * Trạng thái tích hợp:
 *   ✅ approveIntern  → POST /api/hr/interns/{id}/approve   (đã có BE)
 *   ✅ rejectIntern   → PATCH /api/hr/interns/{id}/status   (đã có BE)
 *   ✅ createIntern   → POST /api/hr/interns                (đã có BE)
 *   ✅ getInterns     → GET  /api/hr/interns                (đã có BE)
 *   ✅ getActiveInterns → GET /api/hr/interns?status=active  (đã có BE)
 *   🔧 updateIntern  → PUT /api/hr/interns/{id}            (CHƯA có BE — giữ mock)
 *   🔧 getInternById → GET /api/hr/interns/{id}            (CHƯA có BE — giữ mock)
 */

import apiFetch from './client';

/* ─────────────────────────────────────────────
   updateIntern
───────────────────────────────────────────── */

/**
 * Gọi API cập nhật hồ sơ thực tập sinh.
 *
 * 🔧 MOCK — PUT /api/hr/interns/{id} chưa có trong backend.
 *    Khi BE sẵn sàng: xóa khối MOCK bên dưới và bỏ comment fetch thật.
 *
 * @param {number|string} internId
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function updateIntern(internId, payload) {
  /* ── MOCK (xóa khi BE có PUT /api/hr/interns/{id}) ── */
  await new Promise((r) => setTimeout(r, 600));

  if (Number(internId) === 0) {
    return { ok: false, status: 404, data: { detail: 'Không tìm thấy hồ sơ thực tập sinh.' } };
  }

  if (payload.gpa !== undefined && Number(payload.gpa) > 4) {
    return {
      ok: false,
      status: 422,
      data: { detail: [{ loc: ['body', 'gpa'], msg: 'GPA không được vượt quá 4.0.' }] },
    };
  }

  return {
    ok: true,
    status: 200,
    data: { id: Number(internId), ...payload, role: 'intern', status: 'active' },
  };
  /* ── Bỏ comment khi BE có PUT /api/hr/interns/{id} ──
  return apiFetch(`/api/hr/interns/${internId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  ── */
}

/* ─────────────────────────────────────────────
   buildToast
───────────────────────────────────────────── */

/**
 * Phân tích kết quả API và trả về nội dung toast tương ứng.
 *
 * @param {boolean} ok
 * @param {number}  status
 * @param {object}  data
 * @param {string}  [successMessage='Cập nhật hồ sơ thành công!']
 * @returns {{ type: 'success'|'error', message: string }}
 */
export function buildToast(ok, status, data, successMessage = 'Cập nhật hồ sơ thành công!') {
  if (ok) return { type: 'success', message: successMessage };

  if (status === 404) {
    return { type: 'error', message: data?.detail ?? 'Không tìm thấy hồ sơ thực tập sinh.' };
  }

  if (status === 422) {
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      const msgs = detail.map((e) => e.msg).join('; ');
      return { type: 'error', message: msgs || 'Dữ liệu không hợp lệ.' };
    }
    return { type: 'error', message: detail ?? 'Dữ liệu không hợp lệ.' };
  }

  return { type: 'error', message: data?.detail ?? 'Đã xảy ra lỗi, vui lòng thử lại.' };
}

/* ─────────────────────────────────────────────
   approveIntern
───────────────────────────────────────────── */

/**
 * Duyệt hồ sơ thực tập sinh.
 *
 * ✅ API thật: POST /api/hr/interns/{id}/approve (role: hr, admin)
 *
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function approveIntern(internId) {
  return apiFetch(`/api/hr/interns/${internId}/approve`, { method: 'POST' });
}

/* ─────────────────────────────────────────────
   rejectIntern
───────────────────────────────────────────── */

/**
 * Từ chối / vô hiệu hóa hồ sơ thực tập sinh.
 *
 * ✅ API thật: PATCH /api/hr/interns/{id}/status (role: hr, admin)
 *    Gửi status='inactive' kèm note lý do từ chối.
 *    (Backend không có endpoint /reject riêng — dùng PATCH status thay thế.)
 *
 * @param {number|string} internId
 * @param {string} note - Lý do từ chối (bắt buộc theo spec §5.4)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function rejectIntern(internId, note) {
  return apiFetch(`/api/hr/interns/${internId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'inactive', note }),
  });
}

/* ─────────────────────────────────────────────
   createIntern
───────────────────────────────────────────── */

/**
 * Thêm mới hồ sơ thực tập sinh (HR nhập hộ).
 *
 * ✅ API thật: POST /api/hr/interns (role: hr, admin)
 *
 * Request body (InternCreateRequest — field bắt buộc theo spec §4.3):
 *   full_name, email, password (bắt buộc)
 *   phone_number, dob, gender, university, major, academic_year, gpa, address (tùy chọn)
 *
 * @param {object} body
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function createIntern(body) {
  return apiFetch('/api/hr/interns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/* ─────────────────────────────────────────────
   getInternById
───────────────────────────────────────────── */

/**
 * Lấy chi tiết hồ sơ thực tập sinh theo ID.
 *
 * 🔧 MOCK — GET /api/hr/interns/{id} chưa có trong backend.
 *    Khi BE sẵn sàng: xóa khối MOCK và bỏ comment fetch thật.
 *
 * @param {number|string} internId
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInternById(internId) {
  /* ── MOCK (xóa khi BE có GET /api/hr/interns/{id}) ── */
  await new Promise((r) => setTimeout(r, 400));

  return {
    ok: true,
    status: 200,
    data: {
      id:            Number(internId),
      email:         `intern${internId}@ictu.edu.vn`,
      full_name:     'Nguyễn Văn Mẫu',
      status:        'pending',
      role:          'intern',
      phone_number:  '0912345678',
      dob:           '2002-05-15',
      gender:        'male',
      university:    'Đại học Công nghệ thông tin và Truyền thông',
      major:         'Công nghệ thông tin',
      academic_year: '3',
      gpa:           '3.2',
      address:       '123 Đường ABC, Thái Nguyên',
    },
  };
  /* ── Bỏ comment khi BE có GET /api/hr/interns/{id} ──
  return apiFetch(`/api/hr/interns/${internId}`, { method: 'GET' });
  ── */
}

/* ─────────────────────────────────────────────
   getInterns
───────────────────────────────────────────── */

/**
 * Lấy danh sách thực tập sinh với bộ lọc tuỳ chọn.
 *
 * ✅ API thật: GET /api/hr/interns (role: hr, admin)
 *
 * Query params hỗ trợ (backend/app/api/routes/interns.py):
 *   q          string    — tìm kiếm tên hoặc email
 *   university string    — lọc theo trường đại học
 *   major      string    — lọc theo ngành học
 *   status     string    — 'pending' | 'active' | 'inactive'
 *   page       number    — số trang (1-based)
 *   page_size  number    — số item/trang (max 100)
 *
 * Response shape (InternListResponse):
 *   { items: InternListItem[], total, page, page_size, total_pages }
 *
 * @param {{ q?: string, major?: string, university?: string, status?: string, page?: number, page_size?: number }} [params]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getInterns({
  q = '',
  major = '',
  university = '',
  status = '',
  page = 1,
  page_size,
} = {}) {
  const qs = new URLSearchParams();
  if (q)          qs.set('q', q);
  if (major)      qs.set('major', major);
  if (university) qs.set('university', university);
  if (status)     qs.set('status', status);
  if (page)       qs.set('page', String(page));
  if (page_size)  qs.set('page_size', String(page_size));
  const query = qs.toString();
  return apiFetch(`/api/hr/interns${query ? `?${query}` : ''}`, { method: 'GET' });
}

/* ─────────────────────────────────────────────
   getActiveInterns
───────────────────────────────────────────── */

/**
 * Lấy danh sách thực tập sinh đang active (dùng cho màn hình phân công mentor).
 *
 * ✅ API thật: GET /api/hr/interns?status=active&page_size=100
 *
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function getActiveInterns() {
  return apiFetch('/api/hr/interns?status=active&page_size=100', { method: 'GET' });
}
