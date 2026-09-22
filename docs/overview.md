# Chi tiết dự án

## Giới thiệu

Hệ thống quản lý thực tập sinh giúp doanh nghiệp và trường đại học (ICTU) theo dõi toàn bộ vòng đời thực tập: từ nộp hồ sơ đến đánh giá cuối kỳ.

Nguồn yêu cầu: [Product Backlog — Google Sheets](https://docs.google.com/spreadsheets/d/1jF0gj_Em33a7TeNolltgRWrO9OiZoeYr/edit?gid=405766727#gid=405766727)

## Mục tiêu sản phẩm

1. **Chuẩn hóa & số hóa quy trình** — tự động hóa tiếp nhận, phân công, chấm công, báo cáo, đánh giá; giảm Excel/email rời rạc.
2. **Tăng hiệu quả quản lý** — HR quản lý nhiều thực tập sinh cùng lúc; tiết kiệm thời gian cho HR/mentor; hướng tới tích hợp HRM.
3. **Trải nghiệm thực tập sinh** — xem lịch, chấm công, báo cáo; minh bạch tiến độ, quyền lợi, đánh giá.
4. **Hợp tác doanh nghiệp — trường** — báo cáo minh bạch gửi trường; hỗ trợ thương hiệu tuyển dụng.
5. **Dữ liệu phân tích** — thống kê theo trường/ngành; tỷ lệ hoàn thành / được tuyển chính thức.

## Vai trò người dùng

| Vai trò | Trách nhiệm chính |
| --- | --- |
| **Admin** | Tài khoản, phân quyền, tích hợp hệ thống, nhật ký |
| **HR** | Hồ sơ, xét duyệt, chương trình, chấm công, phụ cấp, báo cáo |
| **Mentor** | Giao việc, phản hồi báo cáo, đánh giá |
| **Thực tập sinh** | Đăng ký, nộp hồ sơ, chấm công, báo cáo, xem lịch & quyền lợi |

## Phạm vi chức năng (Epic)

| # | Epic | Số US |
| --- | ---: | ---: |
| 1 | Quản lý hồ sơ thực tập sinh | 5 |
| 2 | Tiếp nhận và xét duyệt | 5 |
| 3 | Quản lý chương trình thực tập | 4 |
| 4 | Quản lý công việc & đánh giá | 6 |
| 5 | Quản lý chấm công & thời gian | 4 |
| 6 | Quản lý hỗ trợ & quyền lợi | 4 |
| 7 | Quản lý mentor & phòng ban | 3 |
| 8 | Báo cáo & thống kê | 3 |
| 9 | Tích hợp & thông báo | 4 |
| 10 | Quản trị hệ thống | 4 |

Chi tiết từng story: [product-backlog.md](product-backlog.md).

## Stack kỹ thuật hiện tại

| Thành phần | Công nghệ |
| --- | --- |
| Backend utils | Python 3.10+, bcrypt, PyJWT |
| Database | MySQL 8 (`database/schema.sql`) |
| Local DB | Docker Compose |
| Cấu hình | `.env` / `.env.example` |
| CI | GitHub Actions |

## Trạng thái codebase

Đã có nền tảng cho Epic **Tiếp nhận / Quản trị / Hồ sơ**:

- `database/schema.sql` — `roles`, `users`, `intern_profiles`
- `backend/utils/hash_password.py` — mã hóa / verify mật khẩu
- `backend/utils/authenticate_login.py` — JWT login
- `docker-compose.yml` + `.env.example`

Chưa có API server đầy đủ; các module còn lại sẽ bổ sung theo backlog.
