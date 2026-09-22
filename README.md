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

- Docker & Docker Compose (cách nhanh nhất)
- Hoặc: Python 3.10+, Node.js 22+, Git

## Chạy dự án nhanh (Docker)

> Stack tên **`pbi-ictu`** (Product Backlog Internship ICTU).  
> Port mặc định tránh đụng stack khác trên máy (MySQL 3306, phpMyAdmin 8080, pgAdmin 8081).

```bash
git clone https://github.com/AnLT206/Product_Backlog_Internship_Ictu.git
cd Product_Backlog_Internship_Ictu

cp .env.example .env
docker compose down
docker compose up --build -d
```

Sau khi chạy:

| Service | Container | URL / Port |
| --- | --- | --- |
| Frontend (React + nginx) | `pbi-ictu-frontend` | http://localhost:3000 |
| MySQL | `pbi-ictu-mysql` | `localhost:3307` — DB `ictu_internship` / user `ictu` / pass `ictu` |

Dừng:

```bash
docker compose down
```

Reset DB (xóa volume):

```bash
docker compose down -v
```

### Frontend hot-reload (dev)

```bash
docker compose --profile dev up db frontend-dev
```

Mở http://localhost:5173 (container `pbi-ictu-frontend-dev`).

## Chạy local (không Docker FE)

```bash
cp .env.example .env
docker compose up -d db

# Backend utils
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm ci
npm run dev
```

## Cấu trúc repo

```
.
├── .github/workflows/ci.yml
├── backend/
│   ├── requirements.txt
│   └── utils/
├── frontend/                  # React + Vite
│   ├── Dockerfile
│   └── src/
├── database/schema.sql
├── docs/
├── docker-compose.yml         # db + frontend (+ frontend-dev)
├── .env.example
└── README.md
```

## CI (GitHub Actions)

PR vào `main` → `.github/workflows/ci.yml` chạy song song:

| Job | Kiểm tra |
| --- | --- |
| **Backend (Python)** | Cài deps + `compileall` |
| **Frontend (React)** | `npm ci` + lint + build |
| **Docker Compose config** | `docker compose config` hợp lệ |

CI fail → không merge. Branch protection: bật **Require status checks** cho các job trên.

## Đóng góp

1. Tạo branch từ `main` theo [quy tắc đặt tên](docs/git-conventions.md).
2. Commit theo [quy tắc commit](docs/git-conventions.md).
3. Mở PR vào `main`, chờ CI pass rồi merge.

## Tác giả / Nhóm

[AnLT206](https://github.com/AnLT206)
