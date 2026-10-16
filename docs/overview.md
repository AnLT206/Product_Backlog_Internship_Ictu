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

## Quy trình nghiệp vụ 3 giai đoạn cốt lõi

Quy trình hoạt động của hệ thống được chuẩn hóa thành 3 giai đoạn trước khi TTS bước vào kỳ thực tập chính thức:
- **Giai đoạn 1: Tiếp nhận & Xét duyệt (Epic 2)**: TTS nộp hồ sơ trực tuyến → HR xét duyệt → Gửi email kết quả (Trúng tuyển/Từ chối) → Ký kết hợp đồng tiếp nhận số.
- **Giai đoạn 2: Quản lý hồ sơ thực tập sinh (Epic 1)**: Khởi tạo hồ sơ chính thức → TTS nộp CV & Đơn thực tập chính thức → HR thẩm định tài liệu (Hợp lệ / Yêu cầu bổ sung) → Lưu trữ hồ sơ & Lọc theo Trường/Ngành.
- **Giai đoạn 3: Quản lý chương trình thực tập (Epic 3 & Epic 7)**: Tạo chương trình theo phòng ban → Thiết lập ngày bắt đầu/kết thúc → Phân công TTS vào nhóm → Gán Mentor hướng dẫn → TTS truy cập cổng xem Lịch cá nhân & Mentor → Hoàn tất tiếp nhận & sẵn sàng thực tập.

## Phạm vi chức năng (Epic)

| # | Epic | Ánh xạ quy trình chuẩn | Số US |
| --- | --- | --- | ---: |
| 1 | Quản lý hồ sơ thực tập sinh | **Giai đoạn 2** (Khởi tạo hồ sơ, upload tài liệu, thẩm định, lọc) | 5 |
| 2 | Tiếp nhận và xét duyệt | **Giai đoạn 1** (Đăng ký, duyệt/từ chối, email, hợp đồng tiếp nhận) | 5 |
| 3 | Quản lý chương trình thực tập | **Giai đoạn 3** (Chương trình phòng ban, lịch thực tập, phân nhóm) | 4 |
| 4 | Quản lý công việc & đánh giá | Thực thi kỳ thực tập (Task Kanban, báo cáo tuần, đánh giá) | 6 |
| 5 | Quản lý chấm công & thời gian | Thực thi kỳ thực tập (Check-in GPS/QR, chuyên cần, nghỉ phép) | 4 |
| 6 | Quản lý hỗ trợ & quyền lợi | Quyền lợi TTS (Tính phụ cấp hàng tháng, ticket hỗ trợ) | 4 |
| 7 | Quản lý mentor & phòng ban | **Giai đoạn 3** (Gán Mentor hướng dẫn 1-1, tải công việc) | 3 |
| 8 | Báo cáo & thống kê | Tổng kết & Đánh giá (Báo cáo Trường/Khoa, tỷ lệ hoàn thành) | 3 |
| 9 | Tích hợp & thông báo | Hạ tầng hệ thống (Email tự động SMTP, thông báo in-app) | 4 |
| 10 | Quản trị hệ thống | Quản trị nền tảng (Phân quyền RBAC, sao lưu dữ liệu, system logs) | 4 |

Chi tiết từng story: [product-backlog.md](product-backlog.md). Chi tiết sơ đồ luồng: [flow.md](flow.md).

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

- `database/schema.sql` — `roles`, `users`, `intern_profiles`, `documents`
- `backend/app/` — FastAPI: `POST /api/auth/register` (chỉ TTS)
- `backend/app/utils/` — hash bcrypt, JWT helper
- `docker-compose.yml` + `.env.example`

Swagger API: `http://localhost:8000/docs`.  
Chưa có: login / me / upload CV — bổ sung theo backlog.
