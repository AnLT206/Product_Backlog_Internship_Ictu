# Hệ thống quản lý thực tập sinh — ICTU

Hệ thống số hóa quy trình quản lý thực tập sinh: tiếp nhận hồ sơ, phân công mentor, chấm công, giao việc, báo cáo và đánh giá.

Nguồn Product Backlog: [Google Sheets](https://docs.google.com/spreadsheets/d/17i61fZQ3krRvMaMNQIsfMq-vq9pAVZQu/edit?gid=2128861429#gid=2128861429)

## Mục tiêu sản phẩm

1. **Chuẩn hóa và số hóa quy trình quản lý thực tập sinh**
   - Tự động hóa các bước từ tiếp nhận, phân công, chấm công, báo cáo đến đánh giá.
   - Giảm công việc thủ công (Excel, email rời rạc).

2. **Tăng hiệu quả quản lý và giảm chi phí nhân sự**
   - Giúp HR quản lý số lượng lớn thực tập sinh cùng lúc.
   - Tiết kiệm thời gian theo dõi, đánh giá cho HR và mentor.
   - Tích hợp HRM để tránh trùng lặp dữ liệu.

3. **Nâng cao trải nghiệm cho thực tập sinh**
   - Cổng thông tin / ứng dụng để xem lịch, chấm công, báo cáo.
   - Minh bạch về công việc, tiến độ, quyền lợi và đánh giá.

4. **Củng cố hợp tác doanh nghiệp — trường đại học**
   - Báo cáo minh bạch gửi về trường.
   - Hỗ trợ thương hiệu tuyển dụng và quan hệ chiến lược với các trường.

5. **Cung cấp dữ liệu phân tích cho quản lý chiến lược**
   - Thống kê theo nguồn trường/ngành.
   - Đo lường tỷ lệ hoàn thành, tỷ lệ được tuyển chính thức.

## Vai trò người dùng

| Vai trò | Mô tả ngắn |
| --- | --- |
| **Admin** | Quản trị tài khoản, phân quyền, tích hợp hệ thống |
| **HR** | Hồ sơ, xét duyệt, chương trình, chấm công, phụ cấp, báo cáo |
| **Mentor** | Giao nhiệm vụ, phản hồi báo cáo, đánh giá thực tập sinh |
| **Thực tập sinh** | Đăng ký, nộp hồ sơ, chấm công, báo cáo, xem lịch & quyền lợi |

## Product Backlog (tóm tắt theo Epic)

| # | Epic | Số user story |
| --- | --- | ---: |
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

Chi tiết từng User Story xem bảng dưới hoặc [Product Backlog trên Google Sheets](https://docs.google.com/spreadsheets/d/17i61fZQ3krRvMaMNQIsfMq-vq9pAVZQu/edit?gid=2128861429#gid=2128861429).

### 1. Quản lý hồ sơ thực tập sinh

| STT | Feature | User Story |
| --- | --- | --- |
| 1 | Quản lý thông tin cá nhân | Là HR, tôi muốn thêm mới hồ sơ thực tập sinh để lưu trữ thông tin. |
| 2 | Quản lý thông tin cá nhân | Là HR, tôi muốn chỉnh sửa hồ sơ thực tập sinh để cập nhật thông tin thay đổi. |
| 3 | Quản lý thông tin cá nhân | Là HR, tôi muốn tìm kiếm và lọc thực tập sinh theo trường/ngành để dễ dàng quản lý. |
| 4 | Quản lý tài liệu | Là thực tập sinh, tôi muốn upload CV và đơn xin thực tập để hoàn thiện hồ sơ. |
| 5 | Quản lý tài liệu | Là HR, tôi muốn xem và duyệt tài liệu của thực tập sinh để xác thực hồ sơ. |

### 2. Tiếp nhận và xét duyệt

| STT | Feature | User Story |
| --- | --- | --- |
| 6 | Đăng ký & nộp hồ sơ | Là thực tập sinh, tôi muốn đăng ký tài khoản và nộp hồ sơ trực tuyến để tham gia chương trình thực tập. |
| 7 | Xét duyệt hồ sơ | Là HR, tôi muốn duyệt hoặc từ chối hồ sơ để chọn ứng viên phù hợp. |
| 8 | Xét duyệt hồ sơ | Là hệ thống, tôi muốn gửi email thông báo kết quả xét duyệt để thực tập sinh nhận được thông tin kịp thời. |
| 9 | Quản lý hợp đồng | Là HR, tôi muốn tải lên hợp đồng thực tập để quản lý giấy tờ. |
| 10 | Quản lý hợp đồng | Là thực tập sinh, tôi muốn xác nhận hợp đồng trên hệ thống để hoàn tất thủ tục. |

### 3. Quản lý chương trình thực tập

| STT | Feature | User Story |
| --- | --- | --- |
| 11 | Chương trình & nhóm thực tập | Là HR, tôi muốn tạo chương trình thực tập theo phòng ban để tổ chức kế hoạch. |
| 12 | Chương trình & nhóm thực tập | Là HR, tôi muốn phân công thực tập sinh cho mentor để họ được hướng dẫn. |
| 13 | Lịch thực tập | Là HR, tôi muốn thiết lập ngày bắt đầu và kết thúc chương trình để quản lý thời gian. |
| 14 | Lịch thực tập | Là thực tập sinh, tôi muốn xem lịch thực tập cá nhân để biết kế hoạch. |

### 4. Quản lý công việc & đánh giá

| STT | Feature | User Story |
| --- | --- | --- |
| 15 | Giao nhiệm vụ | Là mentor, tôi muốn giao nhiệm vụ cho thực tập sinh để họ có công việc cụ thể. |
| 16 | Giao nhiệm vụ | Là thực tập sinh, tôi muốn cập nhật tiến độ công việc để mentor theo dõi. |
| 17 | Báo cáo | Là thực tập sinh, tôi muốn nộp báo cáo tuần để báo cáo kết quả thực tập. |
| 18 | Báo cáo | Là mentor, tôi muốn xem báo cáo và phản hồi để hỗ trợ thực tập sinh. |
| 19 | Đánh giá | Là mentor, tôi muốn đánh giá kỹ năng và thái độ của thực tập sinh để tổng kết. |
| 20 | Đánh giá | Là HR, tôi muốn tổng hợp đánh giá thành báo cáo cuối kỳ để gửi cho trường/ban lãnh đạo. |

### 5. Quản lý chấm công & thời gian

| STT | Feature | User Story |
| --- | --- | --- |
| 21 | Chấm công | Là thực tập sinh, tôi muốn check-in/check-out trên hệ thống để ghi nhận thời gian làm việc. |
| 22 | Chấm công | Là HR, tôi muốn xem báo cáo đi làm và nghỉ phép để quản lý sự chuyên cần. |
| 23 | Lịch làm việc | Là HR, tôi muốn thiết lập lịch làm việc linh hoạt để phù hợp với từng nhóm. |
| 24 | Lịch làm việc | Là thực tập sinh, tôi muốn đăng ký nghỉ phép để báo trước cho HR. |

### 6. Quản lý hỗ trợ & quyền lợi

| STT | Feature | User Story |
| --- | --- | --- |
| 25 | Phụ cấp | Là HR, tôi muốn nhập thông tin phụ cấp của thực tập sinh để quản lý quyền lợi. |
| 26 | Phụ cấp | Là thực tập sinh, tôi muốn xem lịch sử nhận phụ cấp để theo dõi thu nhập. |
| 27 | Yêu cầu hỗ trợ | Là thực tập sinh, tôi muốn gửi yêu cầu hỗ trợ (ví dụ: chứng nhận, giấy tờ) để được giải quyết. |
| 28 | Yêu cầu hỗ trợ | Là HR, tôi muốn duyệt và phản hồi yêu cầu hỗ trợ để hỗ trợ thực tập sinh kịp thời. |

### 7. Quản lý mentor & phòng ban

| STT | Feature | User Story |
| --- | --- | --- |
| 29 | Quản lý mentor | Là HR, tôi muốn thêm mới mentor để phân công cho thực tập sinh. |
| 30 | Quản lý mentor | Là HR, tôi muốn gán mentor cho thực tập sinh để họ được hướng dẫn. |
| 31 | Theo dõi mentor | Là HR, tôi muốn xem số lượng thực tập sinh mỗi mentor quản lý để cân bằng khối lượng công việc. |

### 8. Báo cáo & thống kê

| STT | Feature | User Story |
| --- | --- | --- |
| 32 | Thống kê | Là HR, tôi muốn xem số lượng thực tập sinh theo trường/ngành để phân tích nguồn ứng viên. |
| 33 | Thống kê | Là HR, tôi muốn xem tỷ lệ hoàn thành chương trình để đánh giá chất lượng thực tập. |
| 34 | Xuất báo cáo | Là HR, tôi muốn xuất báo cáo ra Excel/PDF để chia sẻ với lãnh đạo hoặc trường đại học. |

### 9. Tích hợp & thông báo

| STT | Feature | User Story |
| --- | --- | --- |
| 35 | Thông báo | Là hệ thống, tôi muốn gửi email tự động khi có lịch họp để thông báo cho thực tập sinh. |
| 36 | Thông báo | Là thực tập sinh, tôi muốn nhận thông báo trên ứng dụng để không bỏ lỡ lịch trình. |
| 37 | Tích hợp hệ thống | Là admin, tôi muốn tích hợp hệ thống với HRM để đồng bộ dữ liệu nhân sự. |
| 38 | Tích hợp hệ thống | Là admin, tôi muốn tích hợp với hệ thống chấm công QR/thẻ để thuận tiện quản lý. |

### 10. Quản trị hệ thống

| STT | Feature | User Story |
| --- | --- | --- |
| 39 | Tài khoản & phân quyền | Là admin, tôi muốn tạo tài khoản cho HR, mentor và thực tập sinh để họ sử dụng hệ thống. |
| 40 | Tài khoản & phân quyền | Là admin, tôi muốn phân quyền chi tiết để kiểm soát chức năng mà mỗi vai trò có thể sử dụng. |
| 41 | Bảo mật & sao lưu | Là hệ thống, tôi muốn sao lưu dữ liệu định kỳ để đảm bảo an toàn. |
| 42 | Bảo mật & sao lưu | Là admin, tôi muốn xem nhật ký hoạt động để theo dõi các thao tác trong hệ thống. |

## Trạng thái codebase hiện tại

Phần đã có trong repo (nền tảng cho Epic **Tiếp nhận / Quản trị / Hồ sơ**):

| Thành phần | Mô tả |
| --- | --- |
| `database/schema.sql` | Bảng `roles`, `users`, `intern_profiles` |
| `backend/utils/hash_password.py` | Mã hóa / kiểm tra mật khẩu (bcrypt) |
| `backend/utils/authenticate_login.py` | Tạo và xác thực JWT khi đăng nhập |
| `docker-compose.yml` | MySQL 8 local, tự nạp schema |
| `backend/requirements.txt` | Dependency Python |

## Cấu trúc thư mục

```
.
├── backend/
│   ├── requirements.txt
│   └── utils/
│       ├── hash_password.py
│       └── authenticate_login.py
├── database/
│   └── schema.sql
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Yêu cầu môi trường

- Python **3.10+**
- Docker & Docker Compose
- Git

## Hướng dẫn chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/AnLT206/Product_Backlog_Internship_Ictu.git
cd Product_Backlog_Internship_Ictu
```

### 2. Tạo môi trường ảo và cài dependency

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Chạy database MySQL

```bash
docker compose up -d
```

Kiểm tra container đang chạy:

```bash
docker compose ps
```

Thông tin kết nối mặc định:

| Thông số | Giá trị |
| --- | --- |
| Host | `localhost` |
| Port | `3306` |
| Database | `ictu_internship` |
| User | `ictu` |
| Password | `ictu` |
| Root password | `root` |

`database/schema.sql` được chạy tự động khi volume MySQL khởi tạo lần đầu.

Dừng / xóa container (giữ dữ liệu):

```bash
docker compose down
```

Xóa cả volume dữ liệu (reset DB):

```bash
docker compose down -v
```

### 4. (Tùy chọn) Đặt secret JWT

```bash
export JWT_SECRET_KEY="your-secret-key"
```

Mặc định trong code: `dev-secret-change-me` (chỉ dùng cho môi trường phát triển).

### 5. Dùng thử tiện ích hiện có

Từ thư mục `backend/utils` (hoặc import tương ứng trong code của bạn):

- `hash_password` / `verify_password` — mã hóa mật khẩu
- `create_access_token` / `verify_access_token` / `authenticate_login` — JWT đăng nhập

> API server đầy đủ chưa được dựng trong repo; hiện mới có schema + tiện ích auth làm nền.

## Cách đóng góp

1. Tạo nhánh từ `main` theo Epic / User Story (ví dụ: `feature/us-06-register`).
2. Cập nhật schema, backend hoặc tài liệu.
3. Mở pull request để nhóm / người hướng dẫn review.

## Tài liệu liên quan

- [Product Backlog (Google Sheets)](https://docs.google.com/spreadsheets/d/17i61fZQ3krRvMaMNQIsfMq-vq9pAVZQu/edit?gid=2128861429#gid=2128861429)

## Tác giả / Nhóm

[AnLT206](https://github.com/AnLT206)
