/**
 * src/api/interns.js
 * Tất cả lời gọi API liên quan đến thực tập sinh (intern).
 * Dùng helper apiFetch từ ./client.js (base URL + JWT header tự động).
 *
 * Quy tắc folder-structure.md §3: "Gọi API → src/api/, không fetch rải
 * trong mọi component/feature."
 */

/* ─────────────────────────────────────────────
   Cách tích hợp vào UI form sửa hồ sơ (dành cho người phụ trách UI):

   import { updateIntern, buildToast } from '../api/interns';

   async function handleSave(internId, formData) {
     const { ok, status, data } = await updateIntern(internId, formData);
     setToast(buildToast(ok, status, data));
     setTimeout(() => setToast(null), 4000);
   }
───────────────────────────────────────────── */

// TODO: Bỏ comment import bên dưới và xóa toàn bộ khối MOCK khi BE có endpoint thật
// import apiFetch from './client';

/* ─────────────────────────────────────────────
   updateIntern
───────────────────────────────────────────── */

/**
 * Gọi API cập nhật hồ sơ thực tập sinh.
 *
 * TODO: PUT /api/hr/interns/{id} chưa có trong backend (chờ API thật).
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *
 * @param {number|string} internId - ID của thực tập sinh cần cập nhật.
 * @param {object} payload - Dữ liệu hồ sơ đã sửa. Các field được phép:
 *   full_name, phone_number, dob, gender, university, major, academic_year,
 *   gpa, address (software-specification.md §5.1)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { updateIntern } from '../api/interns';
 *
 * const result = await updateIntern(42, {
 *   full_name: 'Nguyễn Văn B',
 *   university: 'ICTU',
 *   gpa: 3.5,
 * });
 */
export async function updateIntern(internId, payload) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 404 nếu internId = 0 (để test lỗi)
  if (Number(internId) === 0) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy hồ sơ thực tập sinh.' },
    };
  }

  // Mô phỏng 422 nếu gpa > 4 (để test validate)
  if (payload.gpa !== undefined && Number(payload.gpa) > 4) {
    return {
      ok: false,
      status: 422,
      data: {
        detail: [
          { loc: ['body', 'gpa'], msg: 'GPA không được vượt quá 4.0.' },
        ],
      },
    };
  }

  // Mô phỏng thành công 200
  return {
    ok: true,
    status: 200,
    data: {
      id: Number(internId),
      ...payload,
      role: 'intern',
      status: 'active',
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có PUT /api/hr/interns/{id}
  //       (yêu cầu role: hr hoặc admin — apiFetch tự gắn Authorization header)
  return apiFetch(`/api/hr/interns/${internId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   buildToast
───────────────────────────────────────────── */

/**
 * Phân tích kết quả API và trả về nội dung toast tương ứng.
 * UI tự gọi setState để hiển thị (xem pattern trong CreateAccountPage.jsx).
 *
 * @param {boolean} ok              - res.ok từ API call
 * @param {number}  status          - HTTP status code
 * @param {object}  data            - Body JSON từ server
 * @param {string}  [successMessage='Cập nhật hồ sơ thành công!'] - Message khi thành công
 * @returns {{ type: 'success'|'error', message: string }}
 *
 * @example
 * import { updateIntern, buildToast } from '../api/interns';
 *
 * const [toast, setToast] = useState(null);
 *
 * async function handleSave() {
 *   const { ok, status, data } = await updateIntern(internId, formData);
 *   setToast(buildToast(ok, status, data));
 *   setTimeout(() => setToast(null), 4000);
 * }
 */
export function buildToast(ok, status, data, successMessage = 'Cập nhật hồ sơ thành công!') {
  if (ok) {
    return { type: 'success', message: successMessage };
  }

  // 404 — Không tìm thấy
  if (status === 404) {
    return {
      type: 'error',
      message: data?.detail ?? 'Không tìm thấy hồ sơ thực tập sinh.',
    };
  }

  // 422 — Validate fail (format FastAPI: { detail: [...] } hoặc { detail: "..." })
  if (status === 422) {
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      const msgs = detail.map((e) => e.msg).join('; ');
      return { type: 'error', message: msgs || 'Dữ liệu không hợp lệ.' };
    }
    return { type: 'error', message: detail ?? 'Dữ liệu không hợp lệ.' };
  }

  // 500 hoặc lỗi khác
  return {
    type: 'error',
    message: data?.detail ?? 'Đã xảy ra lỗi, vui lòng thử lại.',
  };
}

/* ─────────────────────────────────────────────
   approveIntern
───────────────────────────────────────────── */

/**
 * Gọi API duyệt hồ sơ thực tập sinh.
 *
 * TODO: POST /api/hr/interns/{id}/approve đã có trong backend (routes/interns.py).
 *       Khi sẵn sàng tích hợp: xóa khối MOCK, bỏ comment fetch thật bên dưới.
 *
 * @param {number|string} internId - ID thực tập sinh cần duyệt.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { approveIntern, buildToast } from '../api/interns';
 *
 * const { ok, status, data } = await approveIntern(internId);
 * setToast(buildToast(ok, status, data, 'Duyệt hồ sơ thành công!'));
 */
export async function approveIntern(internId) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 404 nếu internId = 0 (để test lỗi)
  if (Number(internId) === 0) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy hồ sơ thực tập sinh.' },
    };
  }

  // Mô phỏng thành công 200
  return {
    ok: true,
    status: 200,
    data: { id: Number(internId), status: 'active' },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi sẵn sàng dùng API thật
  //       (endpoint đã có: POST /api/hr/interns/{id}/approve — role: hr/admin)
  return apiFetch(`/api/hr/interns/${internId}/approve`, { method: 'POST' });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   rejectIntern
───────────────────────────────────────────── */

/**
 * Gọi API từ chối hồ sơ thực tập sinh.
 * Theo software-specification.md §5.4: "Từ chối bắt buộc có note."
 *
 * TODO: POST /api/hr/interns/{id}/reject chưa có trong backend (chờ API thật).
 *       Khi BE sẵn sàng: xóa khối MOCK, bỏ comment fetch thật bên dưới.
 *
 * @param {number|string} internId - ID thực tập sinh cần từ chối.
 * @param {string} note            - Lý do từ chối (bắt buộc — spec §5.4).
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { rejectIntern, buildToast } from '../api/interns';
 *
 * const { ok, status, data } = await rejectIntern(internId, 'Không đủ điều kiện');
 * setToast(buildToast(ok, status, data, 'Đã từ chối hồ sơ.'));
 */
export async function rejectIntern(internId, note) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  await new Promise((r) => setTimeout(r, 600));

  // Mô phỏng 404 nếu internId = 0 (để test lỗi)
  if (Number(internId) === 0) {
    return {
      ok: false,
      status: 404,
      data: { detail: 'Không tìm thấy hồ sơ thực tập sinh.' },
    };
  }

  // Mô phỏng thành công 200
  return {
    ok: true,
    status: 200,
    data: { id: Number(internId), status: 'inactive', note },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/hr/interns/{id}/reject
  //       Body: { note } — apiFetch tự gắn Authorization header
  return apiFetch(`/api/hr/interns/${internId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   createIntern
───────────────────────────────────────────── */

/**
 * Gọi API thêm mới hồ sơ thực tập sinh (HR nhập hộ).
 *
 * TODO: POST /api/hr/interns chưa tồn tại ở backend (chờ API thật).
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *       Không cần đổi tên hàm hay shape trả về — InternCreatePage sẽ
 *       không phải sửa 1 dòng nào khi chuyển từ MOCK sang API thật.
 *
 * @param {{
 *   full_name:     string,
 *   email:         string,
 *   phone_number?: string,
 *   dob?:          string,
 *   gender?:       'male'|'female'|'other',
 *   university?:   string,
 *   major?:        string,
 *   academic_year?: string,
 *   gpa?:          number,
 *   address?:      string,
 * }} body  Dữ liệu hồ sơ — field bắt buộc theo software-specification.md §4.3
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
 * import { createIntern, buildToast } from '../api/interns';
 *
 * const { ok, status, data } = await createIntern({
 *   full_name: 'Nguyễn Văn A',
 *   email: 'a@ictu.edu.vn',
 *   university: 'ICTU',
 *   major: 'CNTT',
 * });
 * setToast(buildToast(ok, status, data, 'Thêm hồ sơ thành công!'));
 */
export async function createIntern(body) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 700));

  // Mô phỏng 409 nếu email chứa "exists" (để test lỗi trùng email)
  if (body.email?.toLowerCase().includes('exists')) {
    return {
      ok: false,
      status: 409,
      data: { detail: 'Email đã được sử dụng trong hệ thống.' },
    };
  }

  // Mô phỏng thành công 201
  return {
    ok: true,
    status: 201,
    data: {
      id: Math.floor(Math.random() * 10000),
      ...body,
      status: 'pending',
    },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có POST /api/hr/interns (role: hr/admin)
  //       apiFetch tự gắn Authorization: Bearer <token> từ localStorage
  return apiFetch('/api/hr/interns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   getInternById
───────────────────────────────────────────── */

/**
 * Lấy chi tiết hồ sơ thực tập sinh theo ID.
 *
 * TODO: GET /api/hr/interns/{id} chưa tồn tại ở backend
 *       (backend/app/api/routes/interns.py chỉ có POST, POST approve, POST contract).
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *       Không cần đổi tên hàm hay shape trả về — InternEditPage sẽ không
 *       phải sửa 1 dòng nào khi chuyển từ MOCK sang API thật.
 *
 * @param {number|string} internId - ID của thực tập sinh cần lấy chi tiết.
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   data có shape khớp InternRegisterResponse:
 *     { id, email, full_name, status, role, phone_number, dob, gender,
 *       university, major, academic_year, gpa, address }
 *
 * @example
 * import { getInternById } from '../api/interns';
 *
 * const { ok, status, data } = await getInternById(42);
 * if (ok) {
 *   // Đổ data vào form state
 * }
 */
export async function getInternById(internId) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 400));

  // Trả về dữ liệu mẫu đủ field để InternEditPage pre-fill
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
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có GET /api/hr/interns/{id}
  //       (role: hr hoặc admin — apiFetch tự gắn Authorization header)
  return apiFetch(`/api/hr/interns/${internId}`, { method: 'GET' });
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   getInterns
───────────────────────────────────────────── */

/**
 * Lấy danh sách thực tập sinh với bộ lọc tuỳ chọn.
 *
 * TODO: GET /api/hr/interns chưa tồn tại ở backend
 *       (backend/app/api/routes/interns.py chỉ có POST, PATCH status,
 *        POST approve, POST contract — không có GET list).
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *       Không cần đổi tên hàm hay shape trả về — InternListPage sẽ không
 *       phải sửa 1 dòng nào khi chuyển từ MOCK sang API thật.
 *
 * @param {{
 *   major?: string,  - Lọc theo ngành học (khớp chính xác)
 *   q?:     string,  - Tìm kiếm theo tên hoặc email (full-text)
 *   page?:  number,  - Số trang (1-based, mặc định 1)
 * }} [params={}]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *   data có shape: { items: InternRegisterResponse[], total: number, page: number }
 *
 * @example
 * import { getInterns } from '../api/interns';
 *
 * const { ok, data } = await getInterns({ major: 'Công nghệ thông tin', q: 'An' });
 * if (ok) {
 *   setInterns(data.items);
 * }
 */
export async function getInterns({ major = '', q = '', page = 1 } = {}) {
  /* ── MOCK (xóa khi có API thật) ─────────────────────────────────────── */
  // Giả lập network delay
  await new Promise((r) => setTimeout(r, 450));

  // Dữ liệu mẫu — đủ cấu trúc field theo InternRegisterResponse
  const ALL_INTERNS = [
    {
      id: 1, full_name: 'Nguyễn Văn An',    email: 'an.nv@ictu.edu.vn',
      university: 'Đại học Công nghệ thông tin và Truyền thông',
      major: 'Công nghệ thông tin', status: 'pending',
    },
    {
      id: 2, full_name: 'Trần Thị Bình',  email: 'binh.tt@ictu.edu.vn',
      university: 'Đại học Bách Khoa Hà Nội',
      major: 'Kỹ thuật phần mềm', status: 'active',
    },
    {
      id: 3, full_name: 'Lê Hoàng Cường', email: 'cuong.lh@ictu.edu.vn',
      university: 'Học viện Công nghệ Bưu chính Viễn thông',
      major: 'An toàn thông tin', status: 'active',
    },
    {
      id: 4, full_name: 'Phạm Thị Dung',  email: 'dung.pt@ictu.edu.vn',
      university: 'Đại học Công nghệ thông tin và Truyền thông',
      major: 'Hệ thống thông tin', status: 'inactive',
    },
    {
      id: 5, full_name: 'Hoàng Văn Em',   email: 'em.hv@ictu.edu.vn',
      university: 'Đại học Thái Nguyên',
      major: 'Công nghệ thông tin', status: 'pending',
    },
  ];

  // Lọc theo major
  let result = major
    ? ALL_INTERNS.filter((i) => i.major === major)
    : ALL_INTERNS;

  // Lọc theo q (tên / email, case-insensitive)
  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    result = result.filter(
      (i) =>
        i.full_name.toLowerCase().includes(needle) ||
        i.email.toLowerCase().includes(needle)
    );
  }

  return {
    ok:     true,
    status: 200,
    data:   { items: result, total: result.length, page },
  };
  /* ── END MOCK ─────────────────────────────────────────────────────────

  // TODO: Bỏ comment khối này khi BE có GET /api/hr/interns
  //       (role: hr hoặc admin — apiFetch tự gắn Authorization header)
  const params = new URLSearchParams();
  if (major) params.set('major', major);
  if (q)     params.set('q', q);
  if (page)  params.set('page', String(page));
  const qs = params.toString();
  return apiFetch(`/api/hr/interns${qs ? `?${qs}` : ''}`, { method: 'GET' });
  ─────────────────────────────────────────────────────────────────────── */
}
