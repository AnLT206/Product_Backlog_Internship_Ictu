# Product Backlog — Thực tập ICTU

Kho quản lý **product backlog** và codebase cho kỳ thực tập tại Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU).

## Mục đích

- Ghi lại yêu cầu sản phẩm dưới dạng user story.
- Quản lý schema dữ liệu và các tiện ích backend (mã hóa mật khẩu, xác thực JWT).
- Làm tài liệu tham chiếu chung cho thực tập sinh và người hướng dẫn.

## Cấu trúc dự án

```
.
├── .github/workflows/
│   └── ci.yml                    # Kiểm tra code trên Pull Request
├── backend/
│   ├── requirements.txt
│   ├── tests/
│   └── utils/
│       ├── hash_password.py
│       └── authenticate_login.py
├── database/
│   └── schema.sql
├── docker-compose.yml
├── pytest.ini
├── ruff.toml
├── .gitignore
└── README.md
```

## Yêu cầu môi trường

- Python 3.10+
- Docker & Docker Compose (để chạy MySQL)
- Git

## Cài đặt

### 1. Clone repository

```bash
git clone <url-repo>
cd Product_Backlog_Internship_Ictu
```

### 2. Tạo môi trường ảo và cài dependency

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Chạy database (MySQL)

```bash
docker compose up -d
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

File `database/schema.sql` được chạy tự động lần đầu khi container khởi tạo (volume trống).

Dừng database:

```bash
docker compose down
```

## Database

`database/schema.sql` định nghĩa:

| Bảng | Mô tả |
| --- | --- |
| `roles` | Vai trò người dùng |
| `users` | Tài khoản (email, password hash, role, status) |
| `intern_profiles` | Hồ sơ thực tập sinh (trường, ngành, GPA, …) |

## Backend hiện có

### `backend/utils/hash_password.py`

- `hash_password(plain_password)` — mã hóa mật khẩu bằng bcrypt
- `verify_password(plain_password, hashed_password)` — kiểm tra mật khẩu

### `backend/utils/authenticate_login.py`

- `create_access_token(user_id, role)` — tạo JWT
- `verify_access_token(token)` — giải mã / xác thực JWT
- `authenticate_login(...)` — đăng nhập: kiểm tra mật khẩu rồi trả về access token

Biến môi trường (tùy chọn):

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `JWT_SECRET_KEY` | `dev-secret-change-me` | Secret ký JWT |

## Cấu trúc backlog

Mỗi hạng mục theo mẫu:

> Là **[vai trò]**, tôi muốn **[hành động]** để **[giá trị]**.

| ID | User story | Độ ưu tiên | Trạng thái | Sprint |
| --- | --- | --- | --- | --- |
| PB-001 | | Cao / Trung bình / Thấp | To do | |

### Quy ước

- Mã hạng mục: `PB-xxx`, tăng dần theo thứ tự thêm mới.
- Độ ưu tiên: **Cao**, **Trung bình**, **Thấp**.
- Trạng thái: **To do**, **In progress**, **Done**.
- Cập nhật trạng thái khi bắt đầu làm và khi hoàn thành.

## CI (GitHub Actions)

Khi mở Pull Request vào `main`, workflow `.github/workflows/ci.yml` tự chạy để kiểm tra code trước khi merge:

1. Cài dependency Python
2. Chạy MySQL 8 và nạp `database/schema.sql`
3. Lint bằng Ruff
4. Chạy pytest

Nếu CI fail, không nên merge PR.

Chạy kiểm tra local:

```bash
source venv/bin/activate
pip install -r backend/requirements.txt
docker compose up -d
ruff check backend
pytest -q
```

> Trên GitHub: Settings → Branches → Branch protection rule cho `main` → bật **Require status checks to pass before merging** và chọn check `Check code`.

## Cách đóng góp

1. Tạo nhánh từ `main`.
2. Cập nhật code, schema hoặc tài liệu liên quan.
3. Mở pull request vào `main` — chờ CI pass rồi mới merge.

## Tác giả

[AnLT206](https://github.com/AnLT206)
