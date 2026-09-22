# Luồng dự án

## 1. Luồng nghiệp vụ (end-to-end)

```text
Đăng ký / nộp hồ sơ
        │
        ▼
   HR xét duyệt ──(từ chối)──► Thông báo kết quả
        │
     (duyệt)
        ▼
  Ký / xác nhận hợp đồng
        │
        ▼
 Phân công mentor + chương trình / lịch
        │
        ▼
┌───────┴────────┐
│  Thực tập sinh │  Mentor / HR
│  - Chấm công   │  - Giao việc
│  - Báo cáo     │  - Phản hồi / đánh giá
│  - Nghỉ phép   │  - Duyệt hỗ trợ / phụ cấp
└───────┬────────┘
        ▼
 Đánh giá cuối kỳ + báo cáo gửi trường / lãnh đạo
```

### Theo vai trò

| Giai đoạn | Thực tập sinh | HR | Mentor |
| --- | --- | --- | --- |
| Tiếp nhận | Đăng ký, upload CV/đơn | Duyệt hồ sơ, hợp đồng | — |
| Triển khai | Xem lịch, chấm công | Tạo chương trình, gán mentor | Nhận phân công |
| Thực hiện | Cập nhật task, báo cáo tuần | Theo dõi chuyên cần, phụ cấp | Giao việc, phản hồi |
| Kết thúc | Xem đánh giá / quyền lợi | Tổng hợp báo cáo | Đánh giá kỹ năng/thái độ |

## 2. Luồng dữ liệu cốt lõi (hiện có)

```text
Client / Script
      │
      ▼
hash_password / authenticate_login  ──JWT──►  bảo vệ API (sau này)
      │
      ▼
MySQL (roles, users, intern_profiles)
```

1. User đăng ký → lưu `users` + `intern_profiles`, mật khẩu hash bcrypt.
2. Login → verify password → cấp JWT (`JWT_SECRET_KEY` trong `.env`).
3. Các API sau này dùng JWT + `role` để phân quyền.

## 3. Luồng làm việc nhóm (Git)

```text
main (ổn định)
  │
  ├── tạo branch theo quy tắc
  │
  ├── code + commit nhỏ, rõ nghĩa
  │
  ├── push + mở Pull Request vào main
  │
  ├── CI GitHub Actions chạy tự động
  │
  └── review → CI pass → merge
```

Chi tiết đặt tên branch / commit: [git-conventions.md](git-conventions.md).

## 4. Thứ tự phát triển gợi ý

1. **Nền tảng** — schema, auth, phân quyền (đang làm)
2. **Hồ sơ & xét duyệt** — Epic 1–2
3. **Chương trình & mentor** — Epic 3, 7
4. **Công việc & chấm công** — Epic 4–5
5. **Quyền lợi & báo cáo** — Epic 6, 8
6. **Tích hợp & thông báo** — Epic 9–10
