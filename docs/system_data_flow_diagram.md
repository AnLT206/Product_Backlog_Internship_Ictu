# SƠ ĐỒ LUỒNG DỮ LIỆU HỆ THỐNG (SYSTEM DATA FLOW DIAGRAM - DFD)
## Dự án: Hệ Thống Quản Lý Thực Tập Sinh ICTU (Product Backlog Internship)

---

## 1. TỔNG QUAN HỆ THỐNG & CÁC TÁC NHÂN (ACTORS)

Hệ thống quản lý thực tập sinh ICTU bao gồm 5 vai trò (Role-Based Access Control - RBAC):
1. **Admin (Quản trị viên)**: Quản lý người dùng, phân quyền, cấu hình hệ thống và danh mục phòng ban.
2. **HR (Bộ phận Nhân sự)**: Tiếp nhận hồ sơ, duyệt/từ chối ứng viên, quản lý thực tập sinh, tính phụ cấp/chế độ.
3. **Mentor (Người hướng dẫn)**: Phân công nhiệm vụ, đánh giá tiến độ, chấm điểm báo cáo hàng tuần của TTS.
4. **Intern (Thực tập sinh chính thức)**: Điểm danh, xem lịch thực tập, nhận task, nộp báo cáo, ký hợp đồng.
5. **Applicant (Ứng viên ứng tuyển)**: Nộp hồ sơ ứng tuyển (CV, thông tin cá nhân), theo dõi trạng thái duyệt, nộp lại CV nếu bị từ chối.

---

## 2. SƠ ĐỒ NGỮ CẢNH (DFD LEVEL 0 - CONTEXT DIAGRAM)

Sơ đồ mô tả luồng trao đổi dữ liệu tổng thể giữa Hệ thống Portal Thực tập sinh ICTU và các tác nhân bên ngoài.

```mermaid
flowchart TD
    subgraph External_Actors ["Các Tác Nhân Ngoài"]
        Admin["Quản trị viên (Admin)"]
        HR["Bộ phận Tuyển dụng (HR)"]
        Mentor["Người hướng dẫn (Mentor)"]
        Intern["Thực tập sinh (Intern)"]
        Applicant["Ứng viên (Applicant)"]
    end

    System["HỆ THỐNG QUẢN LÝ THỰC TẬP SINH ICTU\n(FastAPI + MySQL + React)"]

    %% Admin flows
    Admin -->|"Thông tin phân quyền, cấu hình hệ thống"| System
    System -->|"Log kiểm toán, thống kê toàn hệ thống"| Admin

    %% HR flows
    HR -->|"Quyết định duyệt/từ chối hồ sơ, bảng phân bổ Mentor"| System
    System -->|"Danh sách ứng viên, báo cáo thực tập, chấm công"| HR

    %% Mentor flows
    Mentor -->|"Đầu việc (Tasks), nhận xét & điểm đánh giá tuần"| System
    System -->|"Danh sách TTS phụ trách, báo cáo tuần cần duyệt"| Mentor

    %% Intern flows
    Intern -->|"Dữ liệu điểm danh, kết quả task, báo cáo tuần"| System
    System -->|"Lịch làm việc, nhiệm vụ được giao, kết quả trợ cấp"| Intern

    %% Applicant flows
    Applicant -->|"Hồ sơ ứng tuyển, CV, thông tin cá nhân"| System
    System -->|"Trạng thái phê duyệt hồ sơ (Pending / Approved / Rejected)"| Applicant
```

---

## 3. SƠ ĐỒ PHÂN RÃ CHỨC NĂNG (DFD LEVEL 1)

```mermaid
flowchart TB
    %% Entities
    U["Người Dùng (Tất cả Roles)"]
    AP["Ứng viên (Applicant)"]
    HR["HR Manager"]
    ME["Mentor"]
    IN["Thực tập sinh"]

    %% Processes
    P1["1.0 Xác Thực & Phân Quyền\n(Authentication & RBAC)"]
    P2["2.0 Quản Lý Hồ Sơ & Tuyển Dụng\n(Recruitment & Screening)"]
    P3["3.0 Quản Lý TTS & Phân Công\n(Interns & Mentorship)"]
    P4["4.0 Điểm Danh & Lịch Làm Việc\n(Attendance & Scheduling)"]
    P5["5.0 Quản Lý Giao Việc & Báo Cáo\n(Tasks & Weekly Reports)"]
    P6["6.0 Trợ Cấp & Chế Độ\n(Allowance & Contracts)"]

    %% Data Stores
    D1[("D1: Users & Auth")]
    D2[("D2: Documents & Applications")]
    D3[("D3: Intern Profiles & Mentors")]
    D4[("D4: Attendance & Shifts")]
    D5[("D5: Tasks & Reports")]
    D6[("D6: Allowances & Contracts")]

    %% Data Flow Connections
    U -->|"Email & Mật khẩu"| P1
    P1 -->|"Xác thực mật khẩu (Hash)"| D1
    D1 -->|"User info, Token JWT"| P1
    P1 -->|"Phiên đăng nhập phân hệ"| U

    AP -->|"Nộp/Cập nhật CV, Form info"| P2
    P2 -->|"Lưu trữ file CV & metadata"| D2
    HR -->|"Xem hồ sơ, Duyệt / Từ chối"| P2
    P2 -->|"Cập nhật trạng thái (Approved/Rejected)"| D2
    D2 -->|"Thông báo kết quả ứng tuyển"| AP

    P2 -.->|"Kích hoạt tài khoản TTS khi Approved"| P3
    HR -->|"Phân công Mentor, gán phòng ban"| P3
    P3 -->|"Cập nhật thông tin thực tập"| D3
    D3 -->|"Danh sách TTS theo Mentor"| ME

    IN -->|"Quét QR / Điểm danh GPS"| P4
    P4 -->|"Ghi nhận ca làm việc & giờ check-in"| D4
    D4 -->|"Lịch làm việc cá nhân, thống kê công"| IN

    ME -->|"Tạo Task & giao hạn chót"| P5
    P5 -->|"Lưu chi tiết Task"| D5
    D5 -->|"Nhiệm vụ được giao"| IN
    IN -->|"Nộp bài làm & Báo cáo tuần"| P5
    P5 -->|"Báo cáo nộp lên"| D5
    ME -->|"Chấm điểm & Phản hồi"| P5

    P4 -.->|"Dữ liệu số buổi có mặt"| P6
    P5 -.->|"Kết quả hoàn thành công việc"| P6
    P6 -->|"Bảng kê trợ cấp & ký hợp đồng"| D6
    D6 -->|"Thông tin chi trả phụ cấp"| IN
```

---

## 4. CHI TIẾT CÁC LUỒNG DỮ LIỆU CHÍNH (DFD LEVEL 2)

### 4.1. Luồng Xác Thực & Tách Biệt Phiên Đăng Nhập (Auth & Multi-Portal Isolation)

Cơ chế phân tách phiên đa vai trò (Multi-tab isolation): Mỗi portal lưu trữ token và thông tin người dùng riêng biệt (`access_token_hr`, `access_token_intern`, `access_token_applicant`) nhằm chống ghi đè khi mở nhiều tab đồng thời.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant FE as Frontend Portal
    participant API as /api/auth/login
    participant DB as CSDL (users)
    participant Storage as LocalStorage (Role Scoped)

    User->>FE: Nhập Email + Mật khẩu
    FE->>API: POST /api/auth/login
    API->>DB: Truy vấn user theo Email & verify bcrypt hash
    DB-->>API: Trả về User Record (Role, Status, Profile)
    API-->>FE: HTTP 200 { access_token, user }
    
    rect rgb(240, 248, 255)
        note over FE,Storage: Phân lập Token theo Role
        FE->>Storage: Lưu access_token_{role} & auth_user_{role}
        FE->>Storage: Ghi nhận last_portal_intern_role (intern/applicant)
    end
    
    FE-->>User: Chuyển hướng tới Dashboard đúng vai trò
```

---

### 4.2. Luồng Nộp Hồ Sơ, Xét Duyệt & Nộp Lại CV (Recruitment Lifecycle)

Xử lý vòng đời ứng viên: Nộp CV $\rightarrow$ Chờ duyệt $\rightarrow$ HR duyệt hoặc từ chối $\rightarrow$ Nếu bị từ chối, ứng viên có thể cập nhật CV mới và nộp lại.

```mermaid
flowchart TD
    Start([Ứng viên nộp CV lần đầu]) --> Step1[Tải file CV PDF/DOCX]
    Step1 --> Step2[POST /api/documents/cv]
    Step2 --> DB_Save[(Lưu vào CSDL: status = pending)]

    DB_Save --> HR_View[HR mở Tab 'Chờ duyệt']
    HR_View --> HR_Action{HR quyết định}

    %% Tuyển dụng duyệt
    HR_Action -->|Phê duyệt| Approve_Flow[PATCH /api/hr/interns/ID/approve]
    Approve_Flow --> Approve_DB[(Cập nhật status = approved)]
    Approve_DB --> Notify_Approve[Ứng viên nhận thông báo trúng tuyển]
    Notify_Approve --> Sign_Contract[Chuyển sang bước Ký Hợp Đồng & Kích hoạt TTS]

    %% Từ chối
    HR_Action -->|Từ chối| Reject_Flow[PATCH /api/hr/interns/ID/reject]
    Reject_Flow --> Reject_DB[(Cập nhật status = rejected)]
    Reject_DB --> HR_UI[Giao diện HR: Chỉ hiển thị nút 'Xem CV', ẩn nút Duyệt]
    Reject_DB --> App_UI[Giao diện Ứng viên: Trạng thái 'Bị từ chối']

    App_UI --> Reupload_Check{Ứng viên nộp lại?}
    Reupload_Check -->|Có| Reupload[Chọn file CV mới & Nộp lại]
    Reupload --> Reset_Pending[Hệ thống tự động chuyển status về 'pending']
    Reset_Pending --> DB_Save
    Reupload_Check -->|Không| End([Kết thúc quá trình])
```

---

### 4.3. Luồng Quản Lý Điểm Danh & Lịch Thực Tập (Attendance & Schedule)

```mermaid
sequenceDiagram
    autonumber
    actor Intern as Thực tập sinh
    participant App as Intern Portal (/intern/schedule)
    participant AttAPI as /api/intern/attendance
    participant DB as CSDL (attendances)
    actor HR as Bộ phận Nhân sự

    Intern->>App: Mở trang Lịch thực tập & Chấm công
    App->>AttAPI: GET /api/intern/attendance/my-shifts
    AttAPI->>DB: Lấy lịch phân ca tháng hiện tại
    DB-->>App: Trả về danh sách ca làm việc

    Intern->>App: Bấm Check-in (GPS / Mã QR ca trực)
    App->>AttAPI: POST /api/intern/attendance/check-in { timestamp, lat, long }
    AttAPI->>DB: Ghi nhận bản ghi check_in_time, status='present'
    AttAPI-->>App: Xác nhận điểm danh thành công

    Intern->>App: Bấm Check-out khi hết ca
    App->>AttAPI: POST /api/intern/attendance/check-out { timestamp }
    AttAPI->>DB: Tính toán tổng thời lượng ca (hours_worked)

    HR->>AttAPI: GET /api/hr/attendance/monthly-summary
    AttAPI->>DB: Thống kê số buổi làm việc & vắng mặt
    DB-->>HR: Xuất báo cáo tính phụ cấp
```

---

### 4.4. Luồng Phân Công Công Việc, Báo Cáo Tuần & Đánh Giá (Tasks & Reports)

```mermaid
sequenceDiagram
    autonumber
    actor Mentor as Mentor (Người hướng dẫn)
    participant TaskAPI as /api/mentor/tasks
    participant DB as CSDL (tasks, reports)
    actor Intern as Thực tập sinh

    Mentor->>TaskAPI: POST /api/mentor/tasks (Tên việc, Deadline, Tài liệu)
    TaskAPI->>DB: Lưu Task mới (status='assigned')
    DB-->>Intern: Hiển thị task tại Dashboard cá nhân

    Intern->>TaskAPI: PATCH /api/intern/tasks/ID (Cập nhật tiến độ 50%, 100%)
    Intern->>TaskAPI: POST /api/intern/reports (Nộp báo cáo tuần đính kèm file)
    TaskAPI->>DB: Lưu Báo cáo tuần (status='submitted')

    Mentor->>TaskAPI: GET /api/mentor/reports/pending
    DB-->>Mentor: Danh sách báo cáo cần nghiệm thu
    Mentor->>TaskAPI: POST /api/mentor/reports/ID/review { score: 9.5, comments: 'Tốt' }
    TaskAPI->>DB: Cập nhật kết quả đánh giá (status='reviewed')
    DB-->>Intern: Xem nhận xét và điểm số của Mentor
```

---

## 5. MA TRẬN DỮ LIỆU & ENDPOINT BẢO VỆ (API DATA MATRIX)

| Thực thể dữ liệu | Tác nhân chính | Phương thức & Endpoint | Quyền hạn (RBAC) | Mô tả xử lý dữ liệu |
|---|---|---|---|---|
| **Users / Auth** | Mọi vai trò | `POST /api/auth/login` | Public | Xác thực thông tin, trả về JWT token |
| **Documents / CV** | Applicant / Intern | `POST /api/documents/cv` | Applicant / Intern | Upload file hồ sơ CV lên hệ sinh thái |
| **Candidate Approval**| HR | `PATCH /api/hr/interns/{id}/approve` | HR, Admin | Đổi trạng thái ứng viên thành Approved |
| **Candidate Reject**  | HR | `PATCH /api/hr/interns/{id}/reject`  | HR, Admin | Đổi trạng thái thành Rejected, khóa thao tác duyệt lại |
| **Attendance** | Intern | `POST /api/intern/attendance/check-in`| Intern | Ghi nhận thời gian và tọa độ check-in |
| **Schedule Events** | Intern | `GET /api/intern/schedule` | Intern | Trả về danh sách ca làm việc và workshop |
| **Tasks Assignment**| Mentor | `POST /api/mentor/tasks` | Mentor | Tạo và giao task cho TTS trực thuộc |
| **Weekly Reports** | Intern / Mentor | `POST /api/intern/reports` | Intern | TTS nộp báo cáo tiến độ Sprint / tuần |
| **Allowances** | HR | `GET /api/hr/allowances` | HR, Admin | Tính toán phụ cấp dựa trên dữ liệu chuyên cần |

---

## 6. NGUYÊN TẮC BẢO MẬT & ĐẢM BẢO TOÀN VẸN DỮ LIỆU

1. **Phân quyền tại 2 lớp (Dual-Layer RBAC)**:
   - **Frontend**: Điều hướng Router Guard theo vai trò, tự động chuyển hướng nếu không đúng phân hệ.
   - **Backend**: FastAPI `Depends(get_current_active_user)` bắt buộc kiểm tra `role` trong payload của JWT Token cho từng endpoint.
2. **Xử lý Race-Condition & Cache Token**:
   - `client.js` tự động cấp phát token mới theo vai trò đích (`acquireTokenForRole`) khi phát hiện token hết hạn hoặc gặp lỗi 401/403.
   - Ngăn chặn triệt để lỗi ghi đè profile giữa ứng viên (`ungvien@ictu.edu.vn`) và thực tập sinh chính thức (`intern@ictu.edu.vn`).
