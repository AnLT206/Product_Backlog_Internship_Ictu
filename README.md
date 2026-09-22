# Hệ thống quản lý thực tập sinh — ICTU

Số hóa quy trình quản lý thực tập sinh: tiếp nhận hồ sơ, phân công mentor, chấm công, giao việc, báo cáo và đánh giá.

**Product Backlog:** [Google Sheets](https://docs.google.com/spreadsheets/d/1jF0gj_Em33a7TeNolltgRWrO9OiZoeYr/edit?gid=405766727#gid=405766727)

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [docs/software-specification.md](docs/software-specification.md) | **Đặc tả phần mềm (SRS) — chi tiết cho developer** |
| [docs/overview.md](docs/overview.md) | Chi tiết dự án, mục tiêu, vai trò, Epic |
| [docs/flow.md](docs/flow.md) | Luồng nghiệp vụ & luồng làm việc nhóm |
| [docs/git-conventions.md](docs/git-conventions.md) | Quy tắc đặt tên branch & commit |
| [docs/product-backlog.md](docs/product-backlog.md) | Chi tiết 42 User Story |

## Yêu cầu

- Python 3.10+
- Docker & Docker Compose
- Git

## Cài đặt nhanh

```bash
git clone https://github.com/AnLT206/Product_Backlog_Internship_Ictu.git
cd Product_Backlog_Internship_Ictu

cp .env.example .env

python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

docker compose up -d
```

Kết nối MySQL mặc định: `localhost:3306` / DB `ictu_internship` / user `ictu` / password `ictu`  
(chi tiết trong `.env.example`)

Dừng DB: `docker compose down` · Reset DB: `docker compose down -v`

## Cấu trúc repo

```
.
├── .github/workflows/ci.yml   # CI kiểm tra PR
├── backend/
│   ├── requirements.txt
│   └── utils/                 # hash password, JWT login
├── database/schema.sql
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

## CI

PR vào `main` → GitHub Actions (`.github/workflows/ci.yml`):

- Cài `backend/requirements.txt`
- Kiểm tra cú pháp Python (`compileall`)

CI fail → không merge. Nên bật branch protection: **Require status checks** → `Check code`.

## Đóng góp

1. Tạo branch từ `main` theo [quy tắc đặt tên](docs/git-conventions.md).
2. Commit theo [quy tắc commit](docs/git-conventions.md).
3. Mở PR vào `main`, chờ CI pass rồi merge.

## Tác giả / Nhóm

[AnLT206](https://github.com/AnLT206)
