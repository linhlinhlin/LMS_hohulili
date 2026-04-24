# Hướng dẫn đóng góp

Tài liệu này mô tả cách làm việc nhất quán trong repo, đặc biệt cho các thay đổi có ảnh hưởng tới runtime, docs, và deploy.

---

## 0. Git Workflow — QUY TẮC BẮT BUỘC

### Branching Strategy (Git Flow)

```
feature/xxx ──PR──▶ main ──auto──▶ Deploy Production
fix/xxx     ──PR──▶ main
chore/xxx   ──PR──▶ main
hotfix/xxx  ──PR──▶ main (khẩn cấp)
```

- **`main`** = production + integration branch duy nhất. Mỗi commit trên main tự động deploy lên holilihu.online (khi `DEPLOY_ENABLED=true`).
- **Feature branches** = nhánh làm việc cá nhân/nhóm, merge thẳng vào main qua PR.

### Quy tắc TUYỆT ĐỐI

| Quy tắc | Lý do |
|---------|-------|
| **KHÔNG push trực tiếp vào `main`** | main = production, mỗi push tự động deploy |
| **MỌI thay đổi phải qua Pull Request** | Đảm bảo code review + CI pass |
| **KHÔNG merge PR khi CI đỏ** | Backend tests, frontend build, compose phải pass |
| **KHÔNG dùng `--force` push** | Có thể mất code của người khác. Dùng `--force-with-lease` nếu cần rebase branch mình |

### Đặt tên branch

```
feature/short-description     # Tính năng mới
fix/issue-number-description   # Sửa bug (VD: fix/issue-48-reject-modal)
chore/description              # Dọn dẹp, refactor, config
docs/description               # Tài liệu
hotfix/description             # Fix khẩn cấp production
```

Quy tắc:
- Dùng tiếng Anh, chữ thường, dấu gạch ngang `-`
- Gắn số issue nếu có: `fix/issue-48-reject-modal`
- Ngắn gọn, mô tả được nội dung: tối đa 50 ký tự

### Commit Message (Conventional Commits)

```
type(scope): mô tả ngắn gọn (tiếng Anh)

# Types: feat, fix, chore, docs, refactor, test, perf, ci
# Scope: module bị ảnh hưởng (identity, assessment, admin, student, ...)
```

Ví dụ:
```
feat(assessment): add rubric grading flow
fix(#48): replace window.prompt with app-dialog modal
chore(ci): tighten dependabot schedule to Monday 08:00
refactor(admin): extract dashboard chart component
```

Quy tắc:
- Dòng đầu ≤ 72 ký tự
- Viết ở thể mệnh lệnh: "add", "fix", "remove" (không phải "added", "fixes")
- Nếu close issue, ghi `Closes #XX` trong body
- Nếu dùng AI hỗ trợ, thêm `Co-Authored-By: ...` cuối body

### Quy trình làm việc

```bash
# 1. Cập nhật main mới nhất
git checkout main && git pull origin main

# 2. Tạo feature branch
git checkout -b feature/my-feature

# 3. Làm việc, commit thường xuyên
git add <files> && git commit -m "feat(scope): description"

# 4. Push branch lên remote
git push -u origin feature/my-feature

# 5. Tạo Pull Request trên GitHub (target: main)
gh pr create --base main --title "feat(scope): description" --body "..."

# 6. Chờ CI pass + review → Merge
```

### Code Review

- Mỗi PR cần ít nhất **1 reviewer approve** trước khi merge
- Reviewer kiểm tra: logic đúng, conventions tuân thủ, test coverage, không có security issue
- Tác giả PR không tự merge — để reviewer merge sau khi approve
- Nếu PR lớn (>500 dòng), cân nhắc chia nhỏ

### Xử lý conflict

```bash
# Cập nhật branch với main mới nhất (dùng rebase, KHÔNG merge)
git checkout feature/my-feature
git fetch origin
git rebase origin/main

# Nếu có conflict → resolve → continue
git add <resolved-files>
git rebase --continue

# Push (cần force vì đã rebase)
git push --force-with-lease
```

> **`--force-with-lease`** an toàn hơn `--force`: nó từ chối push nếu remote có commit mới mà bạn chưa fetch.

---

## 1. Nguyên tắc chung

- Ưu tiên thay đổi nhỏ, có thể kiểm chứng, và dễ rollback.
- Không coi plan, report, hay research là source of truth nếu code/runtime đã khác.
- Khi sửa luồng cốt lõi, luôn cập nhật tài liệu chuẩn tương ứng.

## 2. Trước khi bắt đầu

- Đọc [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [docs/README.md](docs/README.md)
- Nếu đụng backend, đọc thêm [backend/README.md](backend/README.md)
- Nếu đụng frontend, đọc thêm [fe/FRONTEND_ARCHITECTURE.md](fe/FRONTEND_ARCHITECTURE.md)

## 3. Quy tắc cập nhật tài liệu

### Bắt buộc cập nhật docs khi:

- thay đổi runtime conventions
- thay đổi deploy flow
- thay đổi role/permission behavior
- thay đổi learner/teacher/admin flow ở mức người dùng thấy được
- thêm hoặc đổi API/contract quan trọng
- thay đổi chiến lược offline/PWA/payment/video

### Cập nhật ở đâu

- thay đổi cấp dự án: `CHANGELOG.md`
- runtime/reference: `docs/reference/`
- runbook thao tác: `docs/runbooks/`
- architecture/boundary: `docs/architecture/`
- QA: `docs/testing/`
- work-in-progress spec: `docs/plans/` hoặc `docs/superpowers/specs/`

## 4. Quy tắc phân loại docs

- `README.md`, `ONBOARDING.md`, `CHANGELOG.md`, `docs/reference/`, `docs/runbooks/`, `docs/testing/`: tài liệu chuẩn
- `docs/architecture/`: tài liệu kiến trúc và boundary hiện hành
- `docs/plans/`, `docs/superpowers/specs/`: tài liệu đang triển khai
- `docs/reports/`, `docs/research/`: tài liệu historical/reference

Không đưa hướng dẫn runtime sống vào `docs/plans/` hoặc `docs/reports/`.

## 5. Kiểm tra tối thiểu trước khi ship

### Backend

```bash
cd backend
mvn test -B
```

### Frontend

```bash
cd fe
npm run build
```

### Manual

- chạy checklist phù hợp trong `docs/testing/`
- nếu deploy production, chạy [docs/runbooks/PRODUCTION_SMOKE_TEST.md](docs/runbooks/PRODUCTION_SMOKE_TEST.md)

## 6. Quy tắc changelog

- thay đổi có ảnh hưởng rõ tới hệ thống phải vào `CHANGELOG.md`
- ghi ngắn gọn, theo góc nhìn hành vi hoặc vận hành
- không dùng changelog như nhật ký debug từng file

## 7. Quy tắc dọn repo

- xóa artifact tạm thời, export trùng lặp, file debug hết giá trị
- giữ lại historical docs nếu còn giá trị truy vết
- trước khi xóa, tự hỏi:
  - file này có đang là source of truth không
  - file này có chỉ là bản export của một markdown gốc không
  - file này còn được team dùng để kiểm chứng không

## 8. Khi mở PR hoặc bàn giao nội bộ

Nên ghi rõ:

- mục tiêu thay đổi
- luồng người dùng bị ảnh hưởng
- file docs đã cập nhật
- cách verify
- residual nếu còn
