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

## CRUD `/api/hr/programs`

Quản lý chương trình thực tập. Role: `hr`, `admin`.

### GET `/api/hr/programs`

**Out `200`:** danh sách chương trình (mới nhất trước).

### POST `/api/hr/programs`

**In**

| Field | Type | Required | Rule |
| --- | --- | :---: | --- |
| `name` | string | ✓ | 1–150, unique |
| `department` | string | ✓ | 1–100 |
| `description` | string \| null | | max 500 |
| `start_date` | date | ✓ | `YYYY-MM-DD` |
| `end_date` | date | ✓ | `YYYY-MM-DD`, phải **lớn hơn** `start_date` |

**Out `201`**

```json
{
  "id": 1,
  "name": "Thuc tap Soft Dev 2026",
  "department": "Cong nghe thong tin",
  "description": "Chuong trinh TTS ky he",
  "start_date": "2026-06-01",
  "end_date": "2026-08-31",
  "created_at": "2026-09-25T10:00:00",
  "updated_at": "2026-09-25T10:00:00"
}
```

### GET `/api/hr/programs/{id}`

**Out `200`:** chi tiết một chương trình. `404` nếu không tìm thấy.

### PUT `/api/hr/programs/{id}`

Cập nhật từng phần (các field tùy chọn, cùng rule với POST).

### DELETE `/api/hr/programs/{id}`

**Out `204`.** `404` nếu không tìm thấy.

### Lỗi

| Code | Khi |
| --- | --- |
| 401 / 403 | Thiếu token / sai role |
| 404 | Không tìm thấy chương trình |
| 409 | Trùng `name` |
| 422 | Validate body / `end_date` ≤ `start_date` |

---

## Chưa có

| Method | Path |
| --- | --- |
| GET | `/api/auth/me` |
| — | Upload CV / đơn |
