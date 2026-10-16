# SƠ ĐỒ LUỒNG DỮ LIỆU HỆ THỐNG (SYSTEM DATA FLOW DIAGRAM - DFD)
## Dự án: Hệ Thống Quản Lý Thực Tập Sinh ICTU (Product Backlog Internship)

---

## 1. TỔNG QUAN HỆ THỐNG & CÁC TÁC NHÂN (ACTORS)

Hệ thống quản lý thực tập sinh ICTU bao gồm 5 vai trò (Role-Based Access Control - RBAC):
1. **Admin (Quản trị viên)**: Quản lý người dùng, phân quyền, cấu hình hệ thống, sao lưu cơ sở dữ liệu và danh mục phòng ban.
2. **HR (Bộ phận Tuyển dụng & Nhân sự)**: Tiếp nhận hồ sơ, thẩm định, duyệt/từ chối ứng viên, khởi tạo hồ sơ TTS chính thức, tạo chương trình theo phòng ban, thiết lập lịch, phân công TTS & gán Mentor, tính phụ cấp/chế độ.
3. **Mentor (Người hướng dẫn)**: Nhận TTS phân công, giao nhiệm vụ (tasks), kiểm tra tiến độ, đánh giá báo cáo tuần và chấm điểm năng lực cuối kỳ.
4. **Intern (Thực tập sinh chính thức)**: Hoàn thiện hồ sơ (CV & đơn thực tập), xem lịch cá nhân & Mentor, điểm danh, nhận việc, nộp báo cáo tuần, xem phụ cấp.
5. **Applicant (Ứng viên ứng tuyển)**: Đăng ký tài khoản, nộp hồ sơ/CV trực tuyến ban đầu, theo dõi trạng thái phê duyệt, ký xác nhận hợp đồng khi được chấp nhận.

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
    Admin -->|"Phân quyền, cấu hình hệ thống, sao lưu"| System
    System -->|"Log kiểm toán, thống kê toàn hệ thống"| Admin

    %% HR flows
    HR -->|"Quyết định duyệt/từ chối, Hợp đồng, Chương trình, Phân công Mentor"| System
    System -->|"Danh sách ứng viên/TTS, hồ sơ tài liệu, báo cáo chuyên cần"| HR

    %% Mentor flows
    Mentor -->|"Đầu việc (Tasks), nhận xét & điểm đánh giá tuần"| System
    System -->|"Danh sách TTS phụ trách, báo cáo tuần cần duyệt, lịch họp"| Mentor

    %% Intern flows
    Intern -->|"CV & Đơn chính thức, dữ liệu điểm danh, báo cáo tuần, hợp đồng"| System
    System -->|"Lịch làm việc cá nhân & Mentor, nhiệm vụ, kết quả trợ cấp"| Intern

    %% Applicant flows
    Applicant -->|"Đăng ký tài khoản, CV ứng tuyển trực tuyến"| System
    System -->|"Email kết quả (Trúng tuyển/Từ chối), Hợp đồng tiếp nhận"| Applicant
```

---

## 3. SƠ ĐỒ PHÂN RÃ CHỨC NĂNG (DFD LEVEL 1)

```mermaid
flowchart TB
    %% Entities
    U["Người Dùng (Mọi Roles)"]
    AP["Ứng viên (Applicant)"]
    HR["HR Manager"]
    ME["Mentor"]
    IN["Thực tập sinh chính thức"]

    %% Processes
    P1["1.0 Xác Thực & Phân Quyền\n(Authentication & RBAC)"]
    P2["2.0 Tiếp Nhận & Xét Duyệt\n(Phase 1: Recruitment & Screening)"]
    P3["3.0 Quản Lý Hồ Sơ TTS\n(Phase 2: Profiles & Documents)"]
    P4["4.0 Quản Lý Chương Trình & Mentor\n(Phase 3: Programs & Mentorship)"]
    P5["5.0 Điểm Danh & Lịch Thực Tập\n(Attendance & Shifts)"]
    P6["6.0 Quản Lý Công Việc & Báo Cáo\n(Tasks & Weekly Reports)"]
    P7["7.0 Trợ Cấp & Chế Độ\n(Allowances & Benefits)"]

    %% Data Stores
    D1[("D1: Users & Auth")]
    D2[("D2: Documents & Contracts")]
    D3[("D3: Intern Profiles")]
    D4[("D4: Programs & Mentors")]
    D5[("D5: Attendance & Shifts")]
    D6[("D6: Tasks & Reports")]
    D7[("D7: Allowances")]

    %% Process 1 Connections
    U -->|"Email & Mật khẩu"| P1
    P1 <-->|"Verify bcrypt / Token JWT"| D1
    P1 -->|"Phiên làm việc & Quyền hạn"| U

    %% Process 2 Connections (Phase 1)
    AP -->|"Đăng ký tài khoản & nộp CV trực tuyến"| P2
    P2 -->|"Lưu tài khoản pending & CV"| D1
    P2 -->|"Lưu trữ file CV"| D2
    HR -->|"Xem hồ sơ, Duyệt hoặc Từ chối"| P2
    P2 -->|"Cập nhật trạng thái duyệt/từ chối"| D1
    P2 -->|"Tự động gửi Email thông báo (Đậu/Rớt)"| AP
    HR -->|"Tải lên hợp đồng thực tập"| P2
    P2 -->|"Lưu trữ hợp đồng"| D2
    AP -->|"Xem & xác nhận hợp đồng trên hệ thống"| P2
    P2 -->|"Ghi nhận đã ký kết hợp đồng"| D2

    %% Process 3 Connections (Phase 2)
    P2 -.->|"Kích hoạt khi hoàn tất ký hợp đồng"| P3
    P3 -->|"Khởi tạo hồ sơ TTS chính thức"| D3
    IN -->|"Upload CV & Đơn thực tập chính thức"| P3
    P3 -->|"Lưu tài liệu hoàn thiện hồ sơ"| D2
    HR -->|"Xem & duyệt tài liệu hồ sơ"| P3
    P3 -->|"Yêu cầu bổ sung khi thiếu sót"| IN
    P3 -->|"Cập nhật thông tin & lưu trữ hồ sơ"| D3
    HR -->|"Tìm kiếm / Lọc TTS theo Trường/Ngành"| P3

    %% Process 4 Connections (Phase 3)
    HR -->|"Tạo chương trình theo phòng ban, đặt ngày bắt đầu & kết thúc"| P4
    P4 -->|"Lưu trữ kỳ thực tập"| D4
    HR -->|"Phân công TTS vào chương trình/nhóm"| P4
    HR -->|"Gắn Mentor hướng dẫn cho TTS"| P4
    P4 -->|"Lưu liên kết Mentor - TTS"| D4
    IN -->|"Truy cập cổng thông tin xem Lịch cá nhân & Mentor"| P4
    P4 -->|"Danh sách TTS phụ trách"| ME

    %% Onboarding Completed -> Daily Operations
    P4 -.->|"Hoàn tất tiếp nhận & sẵn sàng thực tập"| P5
    IN -->|"Điểm danh ca trực"| P5
    P5 -->|"Ghi nhận giờ check-in/out"| D5
    HR -->|"Xem báo cáo chuyên cần"| P5

    ME -->|"Giao nhiệm vụ (Task)"| P6
    P6 -->|"Lưu trữ task"| D6
    IN -->|"Cập nhật tiến độ & Nộp báo cáo tuần"| P6
    ME -->|"Chấm điểm & Phản hồi báo cáo"| P6

    P5 -.->|"Số buổi có mặt"| P7
    P6 -.->|"Kết quả hoàn thành công việc"| P7
    P7 -->|"Bảng kê trợ cấp & chi trả"| D7
    D7 -->|"Theo dõi thu nhập"| IN
```

---

## 4. CHI TIẾT CÁC LUỒNG DỮ LIỆU CỐT LÕI (DFD LEVEL 2)

### 4.1. SƠ ĐỒ TỔNG THỂ VÒNG ĐỜI TIẾP NHẬN & QUẢN LÝ (3 GIAI ĐOẠN CHUẨN)

Sơ đồ thể hiện trực quan quy trình nghiệp vụ từ lúc sinh viên đăng ký cho đến khi sẵn sàng thực tập.

```mermaid
flowchart TD
    Start(["Bắt đầu: Sinh viên đăng ký"]):::startEndClass --> Step1

    %% ----------------------------------------------------
    %% GIAI ĐOẠN 1
    %% ----------------------------------------------------
    subgraph G1 ["Giai đoạn 1: Tiếp nhận & Xét duyệt"]
        Step1["TTS đăng ký tài khoản & nộp hồ sơ trực tuyến"]:::boxProcess
        Step2["HR xem & kiểm tra hồ sơ ứng viên"]:::boxProcess
        CheckHR{"HR duyệt hồ sơ?"}:::diamondCheck

        RejectMail["Hệ thống gửi email thông báo từ chối"]:::boxReject
        EndProcess(["Kết thúc quy trình"]):::startEndClass

        ApproveMail["Hệ thống gửi email thông báo trúng tuyển"]:::boxApprove
        UploadContract["HR tải lên hợp đồng thực tập"]:::boxProcess
        ConfirmContract["TTS xem & xác nhận hợp đồng trên hệ thống"]:::boxProcess

        Step1 --> Step2
        Step2 --> CheckHR
        CheckHR -->|Từ chối| RejectMail
        RejectMail --> EndProcess
        CheckHR -->|Đồng ý| ApproveMail
        ApproveMail --> UploadContract
        UploadContract --> ConfirmContract
    end

    %% ----------------------------------------------------
    %% GIAI ĐOẠN 2
    %% ----------------------------------------------------
    subgraph G2 ["Giai đoạn 2: Quản lý hồ sơ thực tập sinh"]
        InitProfile["Hệ thống/HR khởi tạo hồ sơ thực tập sinh chính thức"]:::boxProcess
        UploadOfficialDocs["TTS upload CV & đơn thực tập chính thức để hoàn thiện hồ sơ"]:::boxProcess
        HRReviewDocs["HR xem & duyệt tài liệu hồ sơ của TTS"]:::boxProcess
        CheckDocs{"Tài liệu hợp lệ?"}:::diamondCheck

        RequestSupplement["HR yêu cầu TTS cập nhật/chỉnh sửa hồ sơ"]:::boxProcess
        SaveProfile["HR cập nhật thông tin cá nhân & lưu trữ hồ sơ đầy đủ"]:::boxApprove
        FilterInterns["HR có thể tìm kiếm/lọc TTS theo Trường/Ngành"]:::boxProcess

        InitProfile --> UploadOfficialDocs
        UploadOfficialDocs --> HRReviewDocs
        HRReviewDocs --> CheckDocs
        CheckDocs -->|Cần bổ sung| RequestSupplement
        RequestSupplement -->|"Sửa đổi tài liệu"| UploadOfficialDocs
        CheckDocs -->|Hợp lệ| SaveProfile
        SaveProfile --> FilterInterns
    end

    %% ----------------------------------------------------
    %% GIAI ĐOẠN 3
    %% ----------------------------------------------------
    subgraph G3 ["Giai đoạn 3: Quản lý chương trình thực tập"]
        CreateProgram["HR tạo chương trình thực tập theo phòng ban"]:::boxProcess
        SetSchedule["HR thiết lập lịch thực tập: Ngày bắt đầu & Kết thúc"]:::boxProcess
        AssignInterns["HR phân công thực tập sinh vào chương trình/nhóm"]:::boxProcess
        AssignMentor["HR gắn Mentor hướng dẫn cho TTS"]:::boxProcess
        ViewPortal["TTS truy cập cổng thông tin xem Lịch thực tập cá nhân & Mentor"]:::boxProcess

        CreateProgram --> SetSchedule
        SetSchedule --> AssignInterns
        AssignInterns --> AssignMentor
        AssignMentor --> ViewPortal
    end

    %% Chuyển giao các giai đoạn
    ConfirmContract --> InitProfile
    FilterInterns --> CreateProgram
    ViewPortal --> Ready(["Hoàn tất tiếp nhận & sẵn sàng thực tập"]):::startEndClass

    %% Class Styling
    classDef startEndClass fill:#f472b6,stroke:#db2777,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef boxProcess fill:#bae6fd,stroke:#0284c7,stroke-width:1.5px,color:#0f172a;
    classDef diamondCheck fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12,font-weight:bold;
    classDef boxApprove fill:#bbf7d0,stroke:#16a34a,stroke-width:1.5px,color:#14532d;
    classDef boxReject fill:#fecdd3,stroke:#e11d48,stroke-width:1.5px,color:#881337;
```

---

### 4.2. CHI TIẾT TRÌNH TỰ TƯƠNG TÁC (SEQUENCE DIAGRAMS)

#### 4.2.1. Giai đoạn 1: Tiếp nhận & Xét duyệt (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor TTS as Sinh viên / Ứng viên
    participant FE as Frontend Portal
    participant API as Backend FastAPI
    participant DB as CSDL (users, documents)
    participant Mail as Dịch vụ Email (SMTP)
    actor HR as Bộ phận Nhân sự (HR)

    %% Đăng ký & Nộp hồ sơ
    TTS->>FE: Điền form đăng ký & tải lên CV
    FE->>API: POST /api/auth/register (thông tin) + POST /api/documents/cv (file)
    API->>DB: Tạo user (status='pending', role='intern/applicant'), lưu document (doc_type='cv')
    API-->>FE: HTTP 201 Created
    FE-->>TTS: Thông báo nộp hồ sơ thành công, trạng thái 'Chờ duyệt'

    %% HR Thẩm định
    HR->>FE: Mở Bảng thẩm định hồ sơ ứng viên
    FE->>API: GET /api/hr/interns?status=pending
    API->>DB: Truy vấn danh sách ứng viên & file CV
    DB-->>API: Trả về danh sách
    API-->>FE: Hiển thị bảng ứng viên
    HR->>FE: Bấm 'Xem CV' để kiểm tra hồ sơ
    FE->>API: GET /api/documents/{id}/view
    API-->>FE: Stream nội dung PDF / trích xuất văn bản

    %% Quyết định duyệt
    alt HR Từ chối hồ sơ
        HR->>FE: Bấm 'Từ chối' & nhập lý do phản hồi
        FE->>API: POST /api/hr/interns/{id}/reject { note: "..." }
        API->>DB: Cập nhật user.status='rejected', document.status='rejected'
        API->>Mail: Enqueue email thông báo từ chối kèm lý do
        Mail-->>TTS: Nhận email thông báo chưa tiếp nhận
        API-->>FE: HTTP 200 OK (Kết thúc quy trình tiếp nhận hồ sơ này)
    else HR Đồng ý phê duyệt
        HR->>FE: Bấm 'Phê duyệt'
        FE->>API: POST /api/hr/interns/{id}/approve
        API->>DB: Cập nhật user.status='active', profile.status='approved'
        API->>Mail: Enqueue email chúc mừng trúng tuyển
        Mail-->>TTS: Nhận email thông báo trúng tuyển
        API-->>FE: HTTP 200 OK

        %% Upload hợp đồng & ký
        HR->>FE: Tải lên Hợp đồng thực tập
        FE->>API: POST /api/hr/interns/{id}/contract (file hợp đồng)
        API->>DB: Lưu document (doc_type='contract', status='pending')
        API-->>TTS: Gửi notification có hợp đồng chờ ký
        TTS->>FE: Đọc nội dung hợp đồng & bấm 'Xác nhận hợp đồng'
        FE->>API: POST /api/intern/contract/confirm
        API->>DB: Cập nhật document.status='approved', confirmed_at=NOW()
        API-->>FE: Ký hợp đồng thành công
    end
```

---

#### 4.2.2. Giai đoạn 2: Quản lý hồ sơ thực tập sinh (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor TTS as Thực tập sinh
    participant FE as Intern Portal (/intern/upload)
    participant API as Backend FastAPI
    participant DB as CSDL (intern_profiles, documents)
    actor HR as Bộ phận Nhân sự (HR)

    Note over API,DB: Hệ thống/HR khởi tạo hồ sơ TTS chính thức (Mã TTS00xx, role='intern')

    %% TTS hoàn thiện hồ sơ
    TTS->>FE: Mở trang Nộp hồ sơ hoàn thiện
    TTS->>FE: Chọn file CV chính thức & Đơn thực tập chính thức
    FE->>API: POST /api/intern/documents/upload?doc_type=cv
    FE->>API: POST /api/intern/documents/upload?doc_type=application
    API->>DB: Lưu các documents (status='pending')
    API-->>FE: HTTP 201 Created (Tải lên thành công)

    %% HR Thẩm định tài liệu
    HR->>FE: Mở Quản lý hồ sơ TTS
    FE->>API: GET /api/hr/documents/intern/{id}
    API->>DB: Truy vấn tài liệu của TTS
    DB-->>API: Trả về CV & Đơn thực tập
    API-->>FE: Hiển thị giao diện thẩm định

    alt Tài liệu Cần bổ sung
        HR->>FE: Bấm 'Yêu cầu chỉnh sửa' + nhập lý do
        FE->>API: POST /api/hr/documents/{id}/review { status: 'rejected', review_note: '...' }
        API->>DB: Cập nhật document.status='rejected', lưu review_note
        API-->>TTS: Gửi thông báo yêu cầu cập nhật lại hồ sơ
        TTS->>FE: Xem lý do và tải lên lại tài liệu sửa đổi (Vòng lặp quay lại bước upload)
    else Tài liệu Hợp lệ
        HR->>FE: Bấm 'Phê duyệt tài liệu'
        FE->>API: POST /api/hr/documents/{id}/review { status: 'approved' }
        API->>DB: Cập nhật document.status='approved'
        HR->>FE: Cập nhật thông tin cá nhân & lưu trữ hồ sơ
        FE->>API: PUT /api/hr/interns/{id} (dob, phone, address, gpa, major...)
        API->>DB: Lưu trữ hồ sơ đầy đủ vào intern_profiles
        API-->>FE: Cập nhật thành công

        %% Tìm kiếm / Lọc theo Trường / Ngành
        HR->>FE: Mở bộ lọc danh sách TTS
        FE->>API: GET /api/hr/interns?university=ICTU&major=CNTT
        API->>DB: Query users JOIN intern_profiles theo tiêu chí
        DB-->>API: Danh sách TTS khớp bộ lọc
        API-->>FE: Hiển thị kết quả lọc
    end
```

---

#### 4.2.3. Giai đoạn 3: Quản lý chương trình thực tập (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor HR as Bộ phận Nhân sự (HR)
    participant FE as HR Portal (/hr/programs, /hr/mentor-assignment)
    participant API as Backend FastAPI
    participant DB as CSDL (programs, mentors, members, schedules)
    actor TTS as Thực tập sinh
    actor Mentor as Mentor phụ trách

    %% 1. Tạo chương trình theo phòng ban
    HR->>FE: Nhập tên chương trình, chọn phòng ban (Trung tâm Phần mềm/AI)
    FE->>API: POST /api/hr/programs { name, department, max_interns }
    API->>DB: INSERT INTO internship_programs
    API-->>FE: Tạo chương trình thành công

    %% 2. Thiết lập lịch thực tập: Ngày bắt đầu & Kết thúc
    HR->>FE: Chọn ngày bắt đầu & ngày kết thúc (12 tuần)
    FE->>API: PUT /api/hr/programs/{id}/period { start_date, end_date }
    API->>DB: UPDATE internship_programs SET start_date, end_date
    API-->>FE: Cập nhật khung thời gian thành công

    %% 3. Phân công TTS vào chương trình/nhóm
    HR->>FE: Chọn danh sách TTS đủ điều kiện -> Gán vào chương trình
    FE->>API: POST /api/hr/programs/{id}/assign { intern_ids: [1, 2, 5] }
    API->>DB: INSERT INTO program_members (program_id, user_id)
    API-->>FE: Phân công chương trình thành công

    %% 4. HR gắn Mentor hướng dẫn cho TTS
    HR->>FE: Chọn Mentor phụ trách & ghép cặp cho TTS
    FE->>API: POST /api/hr/assign-mentor { mentor_id: 3, intern_ids: [1, 2], program_id: 1 }
    API->>DB: UPDATE intern_profiles SET mentor_id = 3, INSERT INTO mentor_interns
    API-->>Mentor: Thông báo: Bạn được phân công hướng dẫn TTS mới
    API-->>FE: Gắn Mentor thành công

    %% 5. TTS xem Lịch cá nhân & Mentor
    TTS->>FE: Đăng nhập Cổng TTS (/intern/schedule & /intern/dashboard)
    FE->>API: GET /api/intern/schedule
    API->>DB: Truy vấn ca làm việc, workshop, review 1-1, thông tin Mentor
    DB-->>API: Dữ liệu lịch trình & Mentor phụ trách
    API-->>FE: Hiển thị Lịch cá nhân & Mentor hướng dẫn

    Note over TTS,HR: Hoàn tất tiếp nhận & sẵn sàng thực tập!
```

---

## 5. MA TRẬN ÁNH XẠ DỮ LIỆU & BẢO VỆ ENDPOINTS (API DATA MATRIX)

| Thực thể dữ liệu | Tác nhân chính | Phương thức & Endpoint | Quyền hạn (RBAC) | Mô tả xử lý dữ liệu |
|---|---|---|---|---|
| **Users / Auth** | Public / Mọi roles | `POST /api/auth/register`<br>`POST /api/auth/login` | Public | Đăng ký tài khoản ứng viên, xác thực bcrypt và cấp JWT |
| **Candidate CV** | Applicant | `POST /api/documents/cv` | Public / Applicant | Upload file CV ứng tuyển ban đầu vào hệ thống |
| **Candidate Approval**| HR, Admin | `POST /api/hr/interns/{id}/approve` | HR, Admin | Duyệt hồ sơ trúng tuyển, tự động kích hoạt gửi email trúng tuyển |
| **Candidate Reject**  | HR, Admin | `POST /api/hr/interns/{id}/reject`  | HR, Admin | Từ chối hồ sơ, tự động gửi email giải thích lý do |
| **Contract Upload**   | HR, Admin | `POST /api/hr/interns/{id}/contract`| HR, Admin | HR tải lên hợp đồng tiếp nhận thực tập |
| **Contract Confirm**  | Intern / Applicant | `POST /api/intern/contract/confirm` | Intern | TTS ký/xác nhận hợp đồng trên hệ sinh thái |
| **Official Docs**     | Intern | `POST /api/intern/documents/upload` | Intern | TTS nộp CV & Đơn thực tập chính thức để hoàn thiện hồ sơ |
| **Document Review**   | HR, Admin | `POST /api/hr/documents/{id}/review`| HR, Admin | HR thẩm định: Duyệt hợp lệ hoặc yêu cầu TTS bổ sung sửa đổi |
| **Update Profile**    | HR, Admin | `PUT /api/hr/interns/{id}`          | HR, Admin | HR cập nhật thông tin cá nhân và lưu trữ hồ sơ đầy đủ |
| **Filter by Uni/Major**| HR, Admin | `GET /api/hr/interns?university=&major=` | HR, Admin, Mentor | Tìm kiếm và lọc TTS theo Trường đại học và Ngành đào tạo |
| **Program Setup**     | HR, Admin | `POST /api/hr/programs`             | HR, Admin | HR tạo chương trình thực tập theo phòng ban |
| **Program Period**    | HR, Admin | `PUT /api/hr/programs/{id}/period`  | HR, Admin | HR cấu hình ngày bắt đầu & ngày kết thúc chương trình |
| **Program Assign**    | HR, Admin | `POST /api/hr/programs/{id}/assign` | HR, Admin | Phân công TTS vào kỳ thực tập và nhóm chuyên môn |
| **Mentor Assign**     | HR, Admin | `POST /api/hr/assign-mentor`        | HR, Admin | Gắn Mentor hướng dẫn 1-1 hoặc theo nhóm cho TTS |
| **Personal Schedule** | Intern | `GET /api/intern/schedule`          | Intern | TTS xem Lịch thực tập cá nhân & thông tin Mentor phụ trách |
| **Attendance Check**  | Intern | `POST /api/intern/attendance/check-in`| Intern | TTS chấm công ca làm việc qua mã QR / GPS |
| **Task Management**   | Mentor / Intern | `POST /api/mentor/tasks`<br>`PATCH /api/intern/tasks/{id}` | Mentor, Intern | Mentor giao task, TTS cập nhật tiến độ công việc |
| **Weekly Reports**    | Intern / Mentor | `POST /api/intern/weekly-reports`<br>`POST /api/mentor/reports/{id}/review` | Intern, Mentor | TTS nộp báo cáo tuần, Mentor chấm điểm & phản hồi |
| **Allowances**        | HR, Admin | `GET /api/hr/allowances`            | HR, Admin | Tính toán và phê duyệt phụ cấp thực tập sinh |

---

## 6. NGUYÊN TẮC BẢO MẬT & ĐẢM BẢO TOÀN VẸN DỮ LIỆU

1. **Phân quyền đa lớp (Dual-Layer RBAC)**:
   - **Frontend Router Guard**: Bắt buộc kiểm tra quyền truy cập theo vai trò trước khi nạp trang. Chuyển hướng chính xác về portal tương ứng (`/hr`, `/intern`, `/mentor`, `/admin`).
   - **FastAPI Backend Depends**: Mọi endpoint đều bảo vệ bởi `require_roles(...)`. Token được giải mã và kiểm tra quyền hạn chặt chẽ trên mỗi request.
2. **Xử lý toàn vẹn dữ liệu trong vòng lặp hồ sơ**:
   - Khi hồ sơ cần bổ sung, trạng thái tài liệu chuyển sang `rejected` kèm ghi chú hướng dẫn, không làm mất lịch sử các lần nộp trước đó.
   - Khi ứng viên nộp lại tài liệu sửa đổi, trạng thái được tự động reset về `pending` và bắn thông báo tới HR để thẩm định lại.
3. **Đồng bộ hóa thời gian thực (Real-time Cross-Portal Synchronization)**:
   - Khi HR duyệt hồ sơ, tải hợp đồng hoặc phân công Mentor, các sự kiện thời gian thực tự động kích hoạt cập nhật giao diện Cổng TTS mà không cần tải lại trang.
