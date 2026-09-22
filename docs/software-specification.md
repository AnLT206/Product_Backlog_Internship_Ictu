# Đặc tả phần mềm (Software Requirements Specification)

**Tên hệ thống:** Hệ thống quản lý thực tập sinh — ICTU  
**Phiên bản tài liệu:** 1.0  
**Ngày:** 2026-09-22  
**Nguồn yêu cầu:** [Product Backlog (Google Sheets)](https://docs.google.com/spreadsheets/d/1jF0gj_Em33a7TeNolltgRWrO9OiZoeYr/edit?gid=405766727#gid=405766727)

---

## 1. Giới thiệu

### 1.1. Mục đích tài liệu

Tài liệu này mô tả chi tiết yêu cầu phần mềm cho hệ thống quản lý thực tập sinh, làm cơ sở cho:

- Phân tích thiết kế, lập trình và kiểm thử
- Thống nhất phạm vi giữa nhóm phát triển, HR và mentor
- Theo dõi tiến độ theo Product Backlog (42 User Story / 10 Epic)



### 1.2. Phạm vi sản phẩm

Hệ thống số hóa toàn bộ vòng đời thực tập sinh trong doanh nghiệp:

- Tiếp nhận & xét duyệt hồ sơ
- Phân công mentor / chương trình
- Chấm công, giao việc, báo cáo, đánh giá
- Quản lý phụ cấp & yêu cầu hỗ trợ
- Báo cáo thống kê, thông báo, tích hợp hệ thống ngoài
- Quản trị tài khoản, phân quyền, bảo mật

**Ngoài phạm vi (giai đoạn đầu):** ứng dụng mobile native đầy đủ, tích hợp HRM/QR chấm công sâu (chỉ định hướng trong backlog Epic 9).

### 1.3. Định nghĩa & từ viết tắt


| Thuật ngữ | Ý nghĩa                                   |
| --------- | ----------------------------------------- |
| TTS       | Thực tập sinh                             |
| HR        | Nhân sự phụ trách chương trình thực tập   |
| Mentor    | Người hướng dẫn TTS                       |
| Admin     | Quản trị hệ thống                         |
| JWT       | JSON Web Token — xác thực phiên đăng nhập |
| SRS       | Software Requirements Specification       |
| US        | User Story                                |
| HRM       | Human Resource Management system          |
| Epic      | Nhóm chức năng lớn trong backlog          |




### 1.4. Tài liệu liên quan


| Tài liệu            | Vị trí                                   |
| ------------------- | ---------------------------------------- |
| Product Backlog     | Google Sheets (link trên)                |
| Tổng quan dự án     | [overview.md](overview.md)               |
| Luồng nghiệp vụ     | [flow.md](flow.md)                       |
| Chi tiết User Story | [product-backlog.md](product-backlog.md) |
| Quy tắc Git         | [git-conventions.md](git-conventions.md) |
| Schema DB hiện tại  | `database/schema.sql`                    |


---



## 2. Tầm nhìn & mục tiêu



### 2.1. Tầm nhìn (Product Vision)

> Tạo ra một hệ thống số hóa toàn diện để quản lý thực tập sinh, giúp doanh nghiệp tối ưu quy trình tuyển chọn, quản lý và đánh giá; đồng thời mang đến cho thực tập sinh trải nghiệm minh bạch, chuyên nghiệp và hiệu quả.



### 2.2. Mục tiêu sản phẩm (Product Goals)

1. **Chuẩn hóa và số hóa quy trình**
  - Tự động hóa: tiếp nhận → phân công → chấm công → báo cáo → đánh giá
  - Giảm Excel / email rời rạc
2. **Tăng hiệu quả quản lý, giảm chi phí nhân sự**
  - HR quản lý số lượng lớn TTS cùng lúc
  - Tiết kiệm thời gian theo dõi, đánh giá cho HR và mentor
  - Hướng tới tích hợp HRM, tránh trùng dữ liệu
3. **Nâng cao trải nghiệm TTS**
  - Cổng thông tin / ứng dụng: lịch, chấm công, báo cáo
  - Minh bạch công việc, tiến độ, quyền lợi, đánh giá
4. **Củng cố hợp tác doanh nghiệp — trường**
  - Báo cáo chi tiết gửi trường
  - Hỗ trợ thương hiệu tuyển dụng với sinh viên
5. **Dữ liệu phân tích chiến lược**
  - Thống kê theo trường / ngành
  - Tỷ lệ hoàn thành, tỷ lệ được tuyển chính thức
  - Cơ sở dự báo nguồn nhân lực trẻ

---



## 3. Tổng quan hệ thống



### 3.1. Bối cảnh

```text
                    ┌─────────────────────┐
                    │  Email / Thông báo  │
                    └──────────▲──────────┘
                               │
┌──────────┐    ┌──────────────┴──────────────┐    ┌────────────┐
│  TTS Web │───►│  Hệ thống quản lý TTS ICTU  │◄───│ HR / Mentor│
│  / App   │    │  (Backend + DB + Auth)      │    │   Web      │
└──────────┘    └──────────────┬──────────────┘    └────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ MySQL + (tương lai) │
                    │ HRM / QR chấm công  │
                    └─────────────────────┘
```



### 3.2. Đối tượng người dùng (Actors)


| Actor             | Mô tả                           | Quyền chính                                                     |
| ----------------- | ------------------------------- | --------------------------------------------------------------- |
| **Thực tập sinh** | Sinh viên tham gia chương trình | Đăng ký, hồ sơ, chấm công, báo cáo, nghỉ phép, xem phụ cấp      |
| **HR**            | Quản lý chương trình thực tập   | Hồ sơ, duyệt, chương trình, mentor, chấm công, phụ cấp, báo cáo |
| **Mentor**        | Hướng dẫn TTS được phân công    | Giao việc, phản hồi báo cáo, đánh giá                           |
| **Admin**         | Quản trị hệ thống               | Tài khoản, phân quyền, tích hợp, nhật ký, sao lưu               |
| **Hệ thống**      | Tiến trình tự động              | Email thông báo, sao lưu định kỳ                                |




### 3.3. Giả định & ràng buộc


| Loại               | Nội dung                                                     |
| ------------------ | ------------------------------------------------------------ |
| Giả định           | Người dùng có trình duyệt hiện đại; email TTS hợp lệ         |
| Giả định           | Mỗi TTS thuộc một chương trình / mentor (sau khi được duyệt) |
| Ràng buộc kỹ thuật | Backend Python; DB MySQL 8; xác thực JWT                     |
| Ràng buộc bảo mật  | Không commit `.env`; mật khẩu lưu dạng hash (bcrypt)         |
| Ràng buộc vận hành | CI phải pass trước khi merge vào `main`                      |




### 3.4. Stack kỹ thuật (hiện tại & hướng tới)


| Lớp      | Hiện tại                                      | Hướng mở rộng             |
| -------- | --------------------------------------------- | ------------------------- |
| Backend  | Python utils (bcrypt, PyJWT)                  | REST API (FastAPI/Flask…) |
| Database | MySQL 8 — `roles`, `users`, `intern_profiles` | Bổ sung bảng theo Epic    |
| Cấu hình | `.env` / Docker Compose                       | Staging / Production      |
| CI       | GitHub Actions — syntax check                 | Test / lint mở rộng       |


---



## 4. Yêu cầu chức năng

Quy ước ID: `FR-<Epic>-<STT>` map với User Story trong backlog.

### 4.1. Epic 1 — Quản lý hồ sơ thực tập sinh (US 1–5)


| ID      | Actor | Mô tả yêu cầu                     | Tiêu chí chấp nhận (tóm tắt)                             |
| ------- | ----- | --------------------------------- | -------------------------------------------------------- |
| FR-1-01 | HR    | Thêm mới hồ sơ TTS                | Tạo được hồ sơ với thông tin bắt buộc; lưu DB thành công |
| FR-1-02 | HR    | Chỉnh sửa hồ sơ TTS               | Cập nhật được các trường cho phép; ghi `updated_at`      |
| FR-1-03 | HR    | Tìm kiếm / lọc theo trường, ngành | Kết quả khớp bộ lọc; phân trang nếu danh sách lớn        |
| FR-1-04 | TTS   | Upload CV và đơn xin thực tập     | File hợp lệ (loại/size); gắn với hồ sơ TTS               |
| FR-1-05 | HR    | Xem và duyệt tài liệu             | Duyệt / từ chối kèm ghi chú; TTS thấy trạng thái         |


**Dữ liệu liên quan (hiện có / mở rộng):** `intern_profiles`, bảng tài liệu (đề xuất: `documents`).

### 4.2. Epic 2 — Tiếp nhận và xét duyệt (US 6–10)


| ID      | Actor    | Mô tả yêu cầu                        | Tiêu chí chấp nhận                                                             |
| ------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| FR-2-01 | TTS      | Đăng ký tài khoản + nộp hồ sơ online | Email unique; password hash; tạo `users` + `intern_profiles`; status `pending` |
| FR-2-02 | HR       | Duyệt / từ chối hồ sơ                | Đổi trạng thái; không duyệt trùng logic sai                                    |
| FR-2-03 | Hệ thống | Email thông báo kết quả xét duyệt    | Gửi sau khi HR quyết định; nội dung đúng kết quả                               |
| FR-2-04 | HR       | Upload hợp đồng thực tập             | File gắn TTS đã duyệt                                                          |
| FR-2-05 | TTS      | Xác nhận hợp đồng trên hệ thống      | TTS xác nhận; hệ thống ghi nhận thời điểm xác nhận                             |




### 4.3. Epic 3 — Quản lý chương trình thực tập (US 11–14)


| ID      | Actor | Mô tả yêu cầu                     | Tiêu chí chấp nhận                                 |
| ------- | ----- | --------------------------------- | -------------------------------------------------- |
| FR-3-01 | HR    | Tạo chương trình theo phòng ban   | Có tên, phòng ban, mô tả; lưu thành công           |
| FR-3-02 | HR    | Phân công TTS cho mentor          | Mỗi TTS có mentor; mentor thấy danh sách được giao |
| FR-3-03 | HR    | Thiết lập ngày bắt đầu / kết thúc | `start_date` ≤ `end_date`                          |
| FR-3-04 | TTS   | Xem lịch thực tập cá nhân         | Chỉ thấy lịch của mình                             |




### 4.4. Epic 4 — Quản lý công việc & đánh giá (US 15–20)


| ID      | Actor  | Mô tả yêu cầu              | Tiêu chí chấp nhận                            |
| ------- | ------ | -------------------------- | --------------------------------------------- |
| FR-4-01 | Mentor | Giao nhiệm vụ cho TTS      | Task có tiêu đề, hạn, TTS nhận                |
| FR-4-02 | TTS    | Cập nhật tiến độ công việc | Đổi % / trạng thái; mentor xem được           |
| FR-4-03 | TTS    | Nộp báo cáo tuần           | Nội dung + thời gian nộp                      |
| FR-4-04 | Mentor | Xem báo cáo & phản hồi     | Comment lưu được; TTS thấy phản hồi           |
| FR-4-05 | Mentor | Đánh giá kỹ năng & thái độ | Điểm / nhận xét theo tiêu chí                 |
| FR-4-06 | HR     | Tổng hợp đánh giá cuối kỳ  | Xuất báo cáo tổng hợp theo chương trình / TTS |




### 4.5. Epic 5 — Quản lý chấm công & thời gian (US 21–24)


| ID      | Actor | Mô tả yêu cầu                     | Tiêu chí chấp nhận                                 |
| ------- | ----- | --------------------------------- | -------------------------------------------------- |
| FR-5-01 | TTS   | Check-in / check-out              | Ghi nhận thời gian; không check-out trước check-in |
| FR-5-02 | HR    | Xem báo cáo đi làm / nghỉ phép    | Lọc theo ngày, TTS, trạng thái                     |
| FR-5-03 | HR    | Thiết lập lịch làm việc linh hoạt | Áp dụng theo nhóm / chương trình                   |
| FR-5-04 | TTS   | Đăng ký nghỉ phép                 | Gửi yêu cầu; HR duyệt (luồng liên quan FR-5-02)    |




### 4.6. Epic 6 — Quản lý hỗ trợ & quyền lợi (US 25–28)


| ID      | Actor | Mô tả yêu cầu                             | Tiêu chí chấp nhận          |
| ------- | ----- | ----------------------------------------- | --------------------------- |
| FR-6-01 | HR    | Nhập thông tin phụ cấp                    | Số tiền, kỳ, TTS            |
| FR-6-02 | TTS   | Xem lịch sử phụ cấp                       | Chỉ dữ liệu của chính TTS   |
| FR-6-03 | TTS   | Gửi yêu cầu hỗ trợ (chứng nhận, giấy tờ…) | Tạo ticket với loại & mô tả |
| FR-6-04 | HR    | Duyệt / phản hồi yêu cầu hỗ trợ           | Đổi trạng thái + phản hồi   |




### 4.7. Epic 7 — Quản lý mentor & phòng ban (US 29–31)


| ID      | Actor | Mô tả yêu cầu             | Tiêu chí chấp nhận               |
| ------- | ----- | ------------------------- | -------------------------------- |
| FR-7-01 | HR    | Thêm mới mentor           | Tạo user role mentor             |
| FR-7-02 | HR    | Gán mentor cho TTS        | Cập nhật quan hệ mentor–TTS      |
| FR-7-03 | HR    | Xem số lượng TTS / mentor | Dashboard / danh sách có cột đếm |




### 4.8. Epic 8 — Báo cáo & thống kê (US 32–34)


| ID      | Actor | Mô tả yêu cầu                     | Tiêu chí chấp nhận                         |
| ------- | ----- | --------------------------------- | ------------------------------------------ |
| FR-8-01 | HR    | Thống kê TTS theo trường / ngành  | Biểu đồ hoặc bảng số liệu đúng filter      |
| FR-8-02 | HR    | Xem tỷ lệ hoàn thành chương trình | Công thức rõ; cập nhật theo trạng thái TTS |
| FR-8-03 | HR    | Xuất Excel / PDF                  | File tải được; nội dung khớp bộ lọc        |




### 4.9. Epic 9 — Tích hợp & thông báo (US 35–38)


| ID      | Actor    | Mô tả yêu cầu                | Tiêu chí chấp nhận                         |
| ------- | -------- | ---------------------------- | ------------------------------------------ |
| FR-9-01 | Hệ thống | Email khi có lịch họp        | Gửi đúng người, đúng thời điểm cấu hình    |
| FR-9-02 | TTS      | Nhận thông báo trên ứng dụng | Có danh sách / badge chưa đọc              |
| FR-9-03 | Admin    | Tích hợp HRM đồng bộ nhân sự | Đồng bộ theo lịch hoặc thủ công; log lỗi   |
| FR-9-04 | Admin    | Tích hợp chấm công QR / thẻ  | Bản ghi chấm công từ thiết bị vào hệ thống |




### 4.10. Epic 10 — Quản trị hệ thống (US 39–42)


| ID       | Actor    | Mô tả yêu cầu                    | Tiêu chí chấp nhận                                                  |
| -------- | -------- | -------------------------------- | ------------------------------------------------------------------- |
| FR-10-01 | Admin    | Tạo tài khoản HR / mentor / TTS  | Gán đúng `role`; có thể kích hoạt / khóa                            |
| FR-10-02 | Admin    | Phân quyền chi tiết theo vai trò | Mỗi role chỉ truy cập chức năng được phép                           |
| FR-10-03 | Hệ thống | Sao lưu dữ liệu định kỳ          | Backup thành công theo lịch; có thể khôi phục (môi trường cho phép) |
| FR-10-04 | Admin    | Xem nhật ký hoạt động            | Audit log: ai, hành động, thời gian                                 |


---



## 5. Luồng nghiệp vụ tổng thể

```text
Đăng ký / nộp hồ sơ (TTS)
        → HR xét duyệt → (từ chối) → Email thông báo
        → (duyệt) → Hợp đồng → TTS xác nhận
        → HR tạo chương trình / lịch + gán mentor
        → Thực hiện: chấm công | nhiệm vụ | báo cáo | nghỉ phép | hỗ trợ
        → Mentor đánh giá → HR tổng hợp → Xuất báo cáo trường / lãnh đạo
```

Chi tiết thêm: [flow.md](flow.md).

---



## 6. Yêu cầu phi chức năng


| ID     | Nhóm        | Yêu cầu                                                          |
| ------ | ----------- | ---------------------------------------------------------------- |
| NFR-01 | Bảo mật     | Mật khẩu hash bcrypt; không lưu plain text                       |
| NFR-02 | Bảo mật     | API sau này bắt buộc JWT hợp lệ; hết hạn theo cấu hình           |
| NFR-03 | Bảo mật     | Phân quyền theo role; TTS không xem dữ liệu TTS khác             |
| NFR-04 | Hiệu năng   | Danh sách hồ sơ / báo cáo hỗ trợ phân trang, lọc                 |
| NFR-05 | Khả dụng    | Thời gian phản hồi thao tác thông thường < 3s (môi trường chuẩn) |
| NFR-06 | Usability   | Giao diện tiếng Việt; thông báo lỗi rõ ràng                      |
| NFR-07 | Tương thích | Hỗ trợ Chrome / Edge / Firefox phiên bản gần nhất                |
| NFR-08 | Bảo trì     | Log lỗi phía server; audit log thao tác quan trọng               |
| NFR-09 | Sao lưu     | Backup DB định kỳ (theo FR-10-03)                                |
| NFR-10 | CI/CD       | PR vào `main` phải qua GitHub Actions CI                         |


---



## 7. Mô hình dữ liệu



### 7.1. Đã triển khai (`database/schema.sql`)


| Bảng              | Mục đích                                                    |
| ----------------- | ----------------------------------------------------------- |
| `roles`           | Vai trò: admin, hr, mentor, intern…                         |
| `users`           | Tài khoản: email, password_hash, full_name, role_id, status |
| `intern_profiles` | Hồ sơ TTS: SĐT, DOB, gender, university, major, GPA…        |


**Quan hệ:** `users.role_id` → `roles.id`; `intern_profiles.user_id` → `users.id` (1–1, CASCADE).

### 7.2. Thực thể đề xuất (các Epic còn lại)


| Thực thể                          | Mô tả ngắn                  | Epic |
| --------------------------------- | --------------------------- | ---- |
| `documents`                       | CV, đơn, hợp đồng           | 1, 2 |
| `applications` / trạng thái duyệt | Luồng xét duyệt             | 2    |
| `programs`                        | Chương trình theo phòng ban | 3    |
| `program_assignments`             | TTS ↔ chương trình ↔ mentor | 3, 7 |
| `tasks`                           | Nhiệm vụ mentor giao        | 4    |
| `weekly_reports`                  | Báo cáo tuần + phản hồi     | 4    |
| `evaluations`                     | Đánh giá cuối kỳ            | 4    |
| `attendance`                      | Check-in / out              | 5    |
| `leave_requests`                  | Nghỉ phép                   | 5    |
| `allowances`                      | Phụ cấp                     | 6    |
| `support_tickets`                 | Yêu cầu hỗ trợ              | 6    |
| `notifications`                   | Thông báo in-app            | 9    |
| `audit_logs`                      | Nhật ký hoạt động           | 10   |


---



## 8. Giao diện & tích hợp



### 8.1. Giao diện người dùng (UI)


| Module UI                        | Actor chính            |
| -------------------------------- | ---------------------- |
| Đăng ký / Đăng nhập              | TTS, HR, Mentor, Admin |
| Dashboard                        | Theo role              |
| Quản lý hồ sơ & tài liệu         | HR, TTS                |
| Xét duyệt & hợp đồng             | HR, TTS                |
| Chương trình & lịch              | HR, TTS                |
| Nhiệm vụ & báo cáo & đánh giá    | Mentor, TTS, HR        |
| Chấm công & nghỉ phép            | TTS, HR                |
| Phụ cấp & hỗ trợ                 | TTS, HR                |
| Thống kê / xuất báo cáo          | HR                     |
| Quản trị user / phân quyền / log | Admin                  |




### 8.2. Giao diện hệ thống


| Hệ thống ngoài       | Hướng tích hợp                | Epic |
| -------------------- | ----------------------------- | ---- |
| SMTP / Email service | Thông báo xét duyệt, lịch họp | 2, 9 |
| HRM                  | Đồng bộ nhân sự               | 9    |
| Thiết bị QR / thẻ    | Chấm công                     | 9    |




### 8.3. API (định hướng)

- Kiểu: REST JSON
- Auth: `Authorization: Bearer <JWT>`
- Nhóm endpoint gợi ý: `/auth`, `/interns`, `/programs`, `/tasks`, `/attendance`, `/reports`, `/admin`…

*(Chi tiết OpenAPI sẽ bổ sung khi dựng API server.)*

---



## 9. Ma trận phân quyền (tóm tắt)


| Chức năng                     | TTS              | Mentor        | HR           | Admin |
| ----------------------------- | ---------------- | ------------- | ------------ | ----- |
| Đăng ký / nộp hồ sơ           | ✓                |               |              |       |
| Duyệt hồ sơ / hợp đồng        | xác nhận         |               | ✓            |       |
| Quản lý chương trình / mentor | xem lịch         | xem được giao | ✓            |       |
| Giao việc / đánh giá          | cập nhật tiến độ | ✓             | xem tổng hợp |       |
| Chấm công / nghỉ phép         | ✓                |               | ✓            |       |
| Phụ cấp / hỗ trợ              | xem / gửi        |               | ✓            |       |
| Thống kê / xuất báo cáo       |                  |               | ✓            | ✓     |
| Tạo user / phân quyền         |                  |               |              | ✓     |
| Cấu hình tích hợp / xem audit |                  |               |              | ✓     |


---



## 10. Ưu tiên triển khai đề xuất


| Giai đoạn | Nội dung                             | US            |
| --------- | ------------------------------------ | ------------- |
| **MVP 1** | Auth, phân quyền, đăng ký, hồ sơ TTS | 1–3, 6, 39–40 |
| **MVP 2** | Xét duyệt, tài liệu, hợp đồng, email | 4–5, 7–10     |
| **MVP 3** | Chương trình, mentor, lịch           | 11–14, 29–31  |
| **MVP 4** | Task, báo cáo tuần, đánh giá         | 15–20         |
| **MVP 5** | Chấm công, nghỉ phép                 | 21–24         |
| **MVP 6** | Phụ cấp, hỗ trợ                      | 25–28         |
| **MVP 7** | Thống kê, xuất Excel/PDF             | 32–34         |
| **MVP 8** | Thông báo, tích hợp, backup, audit   | 35–38, 41–42  |


---



## 11. Kiểm thử & chấp nhận



### 11.1. Chiến lược

- Unit test cho auth / hash password
- API / integration test với MySQL
- Kiểm thử phân quyền theo role
- UAT với HR / mentor / TTS theo checklist từng US



### 11.2. Điều kiện nghiệm thu module

Một User Story được coi là **Done** khi:

1. Đúng actor và hành vi mô tả trong backlog
2. Pass tiêu chí chấp nhận tương ứng mục 4
3. Có phân quyền đúng
4. Code qua CI trên PR

---



## 12. Rủi ro


| Rủi ro                     | Mức        | Hướng xử lý                              |
| -------------------------- | ---------- | ---------------------------------------- |
| Phạm vi 42 US quá rộng     | Cao        | Làm theo MVP từng giai đoạn              |
| Tích hợp HRM / QR phức tạp | Trung bình | Để giai đoạn sau; thiết kế interface sẵn |
| Email bị spam / fail       | Trung bình | Queue + retry; log lỗi                   |
| Rò rỉ dữ liệu cá nhân TTS  | Cao        | JWT + RBAC + HTTPS + không commit secret |


---



## 13. Phụ lục



### A. Mapping Epic ↔ số lượng US


| #   | Epic                          | Số US  |
| --- | ----------------------------- | ------ |
| 1   | Quản lý hồ sơ thực tập sinh   | 5      |
| 2   | Tiếp nhận và xét duyệt        | 5      |
| 3   | Quản lý chương trình thực tập | 4      |
| 4   | Quản lý công việc & đánh giá  | 6      |
| 5   | Quản lý chấm công & thời gian | 4      |
| 6   | Quản lý hỗ trợ & quyền lợi    | 4      |
| 7   | Quản lý mentor & phòng ban    | 3      |
| 8   | Báo cáo & thống kê            | 3      |
| 9   | Tích hợp & thông báo          | 4      |
| 10  | Quản trị hệ thống             | 4      |
|     | **Tổng**                      | **42** |




### B. Trạng thái codebase tại thời điểm viết SRS

- Đã có: schema `roles` / `users` / `intern_profiles`, hash password, JWT login, Docker MySQL, CI, docs  
- Chưa có: REST API đầy đủ, UI, các bảng/module Epic 2–10



### C. Lịch sử tài liệu


| Phiên bản | Ngày       | Mô tả                                            |
| --------- | ---------- | ------------------------------------------------ |
| 1.0       | 2026-09-22 | Bản đầu — dựa trên Product Backlog Google Sheets |


