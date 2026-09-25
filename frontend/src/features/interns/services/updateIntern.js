/**
 * updateIntern.js
 * Service: Gọi API PUT /api/hr/interns/{id} để cập nhật hồ sơ thực tập sinh.
 *
 * US: "Là HR, tôi muốn chỉnh sửa hồ sơ thực tập sinh để cập nhật thông tin
 *     thay đổi." (software-specification.md §5.1, §5.3)
 *
 * ⚠️  CHƯA CÓ UI form sửa hồ sơ trong repo (features/interns/ chưa tồn tại).
 *     File này cung cấp sẵn hàm gọi API và helper showToast để người phụ
 *     trách UI tích hợp vào màn hình /hr/interns/{id} khi làm xong giao diện.
 *
 * TODO: Endpoint PUT /api/hr/interns/{id} chưa tồn tại ở backend (chờ API thật).
 *       Hiện tại hàm này giả lập (mock) để FE có thể test độc lập.
 *       Khi BE sẵn sàng: xóa khối MOCK, bỏ comment phần fetch thật bên dưới.
 */

/* ─────────────────────────────────────────────
   Cách tích hợp vào UI form sửa hồ sơ (dành cho người phụ trách UI):

   import { updateIntern, showInternToast } from
     '../../features/interns/services/updateIntern';

   async function handleSave(internId, formData) {
     const { ok, status, data } = await updateIntern(internId, formData);
     showInternToast(ok, status, data);
   }
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   API helper
   TODO: const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
         (bỏ comment dòng trên khi chuyển sang fetch thật)
───────────────────────────────────────────── */

/**
 * Gọi API cập nhật hồ sơ thực tập sinh.
 *
 * TODO: PUT /api/hr/interns/{id} chưa có trong backend.
 *       Khi BE sẵn sàng: xóa khối MOCK bên dưới, bỏ comment fetch thật.
 *
 * @param {number|string} internId - ID của thực tập sinh cần cập nhật.
 * @param {object} payload - Dữ liệu hồ sơ đã sửa. Các field được phép:
 *   full_name, phone_number, dob, gender, university, major, academic_year,
 *   gpa, address (software-specification.md §5.1 / docs/api.md)
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 *
 * @example
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
  //       (yêu cầu role: hr hoặc admin — Authorization: Bearer <jwt>)
  const token = localStorage.getItem('access_token') ?? '';
  const res = await fetch(`${BASE_URL}/api/hr/interns/${internId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  return { ok: res.ok, status: res.status, data };
  ─────────────────────────────────────────────────────────────────────── */
}

/* ─────────────────────────────────────────────
   Toast helper
   Không có Toast component dùng chung trong repo hiện tại.
   Dùng callback pattern để UI tự xử lý hiển thị.

   showInternToast trả về { type, message } để UI gọi setState.
   Xem ví dụ sử dụng trong JSDoc bên dưới.
───────────────────────────────────────────── */

/**
 * Phân tích kết quả API và trả về nội dung toast tương ứng.
 * UI tự gọi setState để hiển thị (xem pattern trong CreateAccountPage.jsx).
 *
 * @param {boolean} ok       - res.ok từ updateIntern
 * @param {number}  status   - HTTP status code
 * @param {object}  data     - Body JSON từ server
 * @returns {{ type: 'success'|'error', message: string }}
 *
 * @example
 * // Trong component form sửa hồ sơ:
 * const [toast, setToast] = useState(null);
 *
 * async function handleSave() {
 *   const { ok, status, data } = await updateIntern(internId, formData);
 *   setToast(buildToast(ok, status, data));
 *   setTimeout(() => setToast(null), 4000);
 * }
 */
export function buildToast(ok, status, data) {
  if (ok) {
    return { type: 'success', message: 'Cập nhật hồ sơ thành công!' };
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
      // Gộp tất cả lỗi thành 1 chuỗi để hiển thị trong toast
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
