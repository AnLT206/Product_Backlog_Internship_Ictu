# API Backend

Base URL: `http://localhost:8000`  
Swagger: `http://localhost:8000/docs`

---

## Chung

| | |
| --- | --- |
| Prefix | `/api` |
| Content-Type | `application/json` |
| CORS | `5173`, `3000`, `8080` |

### Status

| Code | Ý nghĩa |
| --- | --- |
| 200 | Thành công |
| 201 | Tạo mới |
| 409 | Trùng (email) |
| 422 | Validate fail |
| 500 | Lỗi server |

### Lỗi

`422`:

```json
{
  "detail": [
    { "loc": ["body", "password"], "msg": "...", "type": "..." }
  ]
}
```

`409` / `500`:

```json
{ "detail": "Email đã được sử dụng." }
```

---

## GET `/health`

**Out `200`**

```json
{ "status": "ok" }
```

---

## POST `/api/auth/register`

Đăng ký TTS. Luôn tạo `role=intern`, `status=pending`.  
Không dùng cho HR / mentor / admin. Không trả JWT.

### In

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| `full_name` | string | ✓ | 1–100 |
| `email` | string | ✓ | email hợp lệ → lưu lowercase |
| `password` | string | ✓ | 6–128 ký tự |
| `confirm_password` | string | ✓ | khớp `password` |
| `phone_number` | string \| null | | `0…` hoặc `+84…` |
| `dob` | string \| null | | `YYYY-MM-DD` |
| `gender` | string \| null | | `male` \| `female` \| `other` |
| `university` | string \| null | | max 150 |
| `major` | string \| null | | max 150 |
| `academic_year` | string \| null | | max 50 |
| `gpa` | number \| null | | 0–4 |
| `address` | string \| null | | max 255 |

```json
{
  "full_name": "Nguyen Van A",
  "email": "tts.a@example.com",
  "password": "Secret1",
  "confirm_password": "Secret1",
  "phone_number": "0912345678",
  "dob": "2003-05-20",
  "gender": "male",
  "university": "ICTU",
  "major": "CNTT",
  "academic_year": "Nam 3",
  "gpa": 3.25,
  "address": "Thai Nguyen"
}
```

### Out `201`

```json
{
  "id": 1,
  "email": "tts.a@example.com",
  "full_name": "Nguyen Van A",
  "role": "intern",
  "status": "pending",
  "phone_number": "0912345678"
}
```

### Lỗi

| Code | Khi |
| --- | --- |
| 409 | Email đã tồn tại |
| 422 | Sai format / password ngắn / confirm không khớp / SĐT sai |

---

## POST `/api/hr/interns`

HR/admin tạo hồ sơ TTS (`users` + `intern_profiles`). Mặc định `status=pending`.

### In

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| `full_name` | string | ✓ | 1–100 |
| `email` | string (email) | ✓ | bắt buộc, format hợp lệ → lưu lowercase |
| `password` | string | ✓ | 6–128 |
| `phone_number` | string \| null | | max 20 |
| `dob` | date \| null | | `YYYY-MM-DD` |
| `gender` | string \| null | | `male` \| `female` \| `other` |
| `university` | string \| null | | max 150 |
| `major` | string \| null | | max 150 |
| `academic_year` | string \| null | | max 50 |
| `gpa` | number \| null | | 0–4 |
| `address` | string \| null | | max 255 |
| `status` | string | | `pending` (mặc định) \| `active` |

**Out `201`:** cùng shape với register (`id`, `email`, `full_name`, `role`, `status`, `phone_number`).

### Lỗi

| Code | Khi |
| --- | --- |
| 401 / 403 | Thiếu token / sai role |
| 409 | Email đã tồn tại |
| 422 | Validate body / email trống hoặc sai format |

---

## POST `/api/hr/documents/{id}/review`

HR/admin duyệt hoặc từ chối tài liệu. Khi `status=rejected` → tạo notification cho TTS sở hữu file.

### In

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| `status` | string | ✓ | `approved` \| `rejected` |
| `review_note` | string \| null | | bắt buộc khi `rejected`, max 255 |

**Out `200`:** `{ id, user_id, doc_type, file_name, file_path, status, review_note }`

### Lỗi

| Code | Khi |
| --- | --- |
| 404 | Không tìm thấy tài liệu |
| 422 | Reject thiếu `review_note` |

---

## POST `/api/hr/interns/{id}/contract`

HR/admin upload hợp đồng (`multipart/form-data`, field `file`). Tạo `documents` với `doc_type=contract` và gửi notification cho TTS để xác nhận.

**Out `201`:** DocumentResponse (kèm `confirmed_at` null).

### Lỗi

| Code | Khi |
| --- | --- |
| 404 | Không tìm thấy TTS |
| 422 | File trống / thiếu tên |

---

## POST `/api/intern/contract/confirm`

TTS (`role=intern`, `status=active`) xác nhận hợp đồng chưa `confirmed_at`. Gán `status=approved` + `confirmed_at`, đồng thời tạo notification cho mọi HR `active`.

**Out `200`:** DocumentResponse.

### Lỗi

| Code | Khi |
| --- | --- |
| 403 | Không phải intern |
| 404 | Không có hợp đồng cần xác nhận |
| 409 | TTS chưa `active` |

---

## Chưa có

| Method | Path |
| --- | --- |
| GET | `/api/auth/me` |
| — | Upload CV / đơn |
