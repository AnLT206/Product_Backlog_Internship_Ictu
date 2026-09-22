# Quy tắc Git: Branch & Commit

## 1. Quy tắc đặt tên branch

### Format

```text
<type>/<short-description>
```

hoặc gắn User Story:

```text
<type>/us-<stt>-<short-description>
```

- Dùng **chữ thường**, `kebab-case` (gạch ngang).
- Không dấu tiếng Việt, không khoảng trắng.
- Mô tả ngắn (khoảng 3–6 từ).

### Type được dùng

| Type | Khi nào dùng | Ví dụ |
| --- | --- | --- |
| `feature` | Tính năng mới | `feature/us-06-register` |
| `fix` | Sửa lỗi | `fix/login-jwt-expire` |
| `docs` | Chỉ tài liệu | `docs/update-readme` |
| `refactor` | Đổi cấu trúc, không đổi hành vi | `refactor/auth-utils` |
| `chore` | Việc lặt vặt (deps, config) | `chore/update-gitignore` |
| `ci` | CI / GitHub Actions | `ci/github-actions` |
| `db` | Schema / migration | `db/add-intern-profiles` |

### Ví dụ tốt / xấu

| Tốt | Tránh |
| --- | --- |
| `feature/us-07-hr-approve` | `Feature/US7` |
| `fix/hash-password-empty` | `sua-loi` |
| `docs/git-conventions` | `update` |
| `db/add-roles-table` | `branch1` |

### Quy trình branch

1. Luôn tạo từ `main` mới nhất (`git pull origin main`).
2. Một branch ≈ một mục tiêu (1 feature / 1 fix / 1 docs).
3. Không commit trực tiếp lên `main`.
4. Xong việc → PR vào `main` → xóa branch sau khi merge.

---

## 2. Quy tắc commit

### Format message

```text
<type>: <mô tả ngắn, tiếng Việt hoặc tiếng Anh nhất quán>
```

Hoặc Conventional Commits đầy đủ:

```text
<type>(<scope>): <mô tả ngắn>
```

### Type commit

| Type | Ý nghĩa |
| --- | --- |
| `feat` | Thêm chức năng |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu |
| `refactor` | Refactor |
| `chore` | Config, deps, việc phụ |
| `ci` | CI |
| `db` | Schema / SQL |
| `style` | Format, không đổi logic |
| `test` | Thêm / sửa test |

### Quy tắc viết message

- **Ngắn gọn**: 1 dòng tiêu đề, tối đa ~72 ký tự.
- **Diễn tả “làm gì / vì sao”**, không liệt kê từng file.
- Dùng **câu mệnh lệnh** hoặc mô tả rõ: `Thêm…`, `Sửa…`, `Cập nhật…`.
- Một commit nên làm **một việc**; tránh commit khổng lồ.
- **Không** commit `.env`, secret, `venv/`, cache.

### Ví dụ

```text
feat: thêm mã hóa mật khẩu bằng bcrypt
fix: sửa verify JWT khi token hết hạn
docs: thêm quy tắc đặt tên branch và commit
db: thiết kế bảng users, roles, intern_profiles
ci: thêm GitHub Actions kiểm tra cú pháp Python
chore: cập nhật .gitignore và .env.example
```

### Ví dụ cần tránh

```text
update
fix bug
WIP
asdf
commit lần 1
```

---

## 3. Pull Request

- Title rõ ràng, gắn US nếu có: `feat(us-06): đăng ký tài khoản thực tập sinh`.
- Mô tả ngắn: đã làm gì, cách test.
- Đảm bảo **CI pass** trước khi merge.
- Ít nhất 1 người review (khi nhóm yêu cầu).

## 4. Checklist trước khi push

- [ ] Branch đúng quy tắc đặt tên
- [ ] Commit message đúng format
- [ ] Không có `.env` / secret trong commit
- [ ] Đã pull `main` và xử lý conflict (nếu có)
- [ ] PR sẵn sàng chờ CI
