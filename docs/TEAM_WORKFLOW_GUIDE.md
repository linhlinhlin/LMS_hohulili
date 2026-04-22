# Quy tắc làm việc — LMS Maritime Team

> Tài liệu này dành cho tất cả thành viên (Prob) sử dụng Claude Code hoặc Codex trong dự án.
> **Đọc kỹ trước khi bắt đầu code.**

---

## 1. QUY TẮC GIT — BẮT BUỘC

### 1.1 Branching

```
main     = production (auto-deploy lên holilihu.online)
develop  = staging (CI chạy, không deploy)
```

**KHÔNG BAO GIỜ push trực tiếp vào `main` hoặc `develop`.**
Mọi thay đổi phải qua Pull Request.

### 1.2 Tạo branch

```bash
# Luôn bắt đầu từ main mới nhất
git checkout main && git pull origin main
git checkout -b <prefix>/<mô-tả-ngắn>
```

**Prefix bắt buộc:**

| Prefix | Dùng khi | Ví dụ |
|--------|----------|-------|
| `feature/` | Tính năng mới | `feature/student-certificate-download` |
| `fix/` | Sửa bug | `fix/issue-38-enrollment-truth` |
| `chore/` | Config, cleanup, refactor | `chore/cleanup-stale-migrations` |
| `docs/` | Tài liệu | `docs/api-reference-update` |
| `hotfix/` | Fix khẩn cấp production | `hotfix/login-500-error` |

**Quy tắc tên branch:**
- Tiếng Anh, chữ thường, dấu gạch ngang `-`
- Gắn số issue nếu có: `fix/issue-38-enrollment-truth`
- Tối đa 50 ký tự
- **KHÔNG** dùng tên mơ hồ như `abcd`, `test`, `tlinh`, `hung-backend`

### 1.3 Commit message

```
type(scope): mô tả ngắn gọn bằng tiếng Anh

Closes #XX (nếu close issue)
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>  (nếu dùng AI)
```

| Type | Ý nghĩa |
|------|---------|
| `feat` | Tính năng mới |
| `fix` | Sửa bug |
| `chore` | Cleanup, config |
| `docs` | Tài liệu |
| `refactor` | Cải thiện code, không đổi behavior |
| `test` | Thêm/sửa test |
| `perf` | Cải thiện performance |
| `ci` | CI/CD pipeline |

**Ví dụ đúng:**
```
feat(assessment): add rubric grading flow
fix(#38): resolve enrollment state pagination bug
chore(ci): add develop branch to CI triggers
```

**Ví dụ SAI:**
```
2                          ← không mô tả gì
update                     ← quá mơ hồ
Tlinh                      ← tên người, không phải mô tả
fix bug                    ← thiếu scope, thiếu chi tiết
```

### 1.4 Quy trình tạo PR

```bash
# 1. Push branch
git push -u origin feature/my-feature

# 2. Tạo PR (target: main)
gh pr create --base main \
  --title "feat(scope): mô tả" \
  --body "## Summary\n- Thay đổi 1\n- Thay đổi 2\n\nCloses #XX"

# 3. Chờ CI pass (4 checks: Backend Tests, Frontend Build, Compose Validation, Docker Smoke Test)
# 4. Chờ reviewer approve
# 5. Merge
```

**PR checklist:**
- [ ] CI 4/4 pass
- [ ] Ít nhất 1 reviewer approve
- [ ] Commit message đúng format
- [ ] Không chứa file thừa (worktree files, node_modules, .env, ...)
- [ ] Migration number không trùng (kiểm tra `backend/src/main/resources/db/migration/`)

### 1.5 Những điều TUYỆT ĐỐI KHÔNG LÀM

| Hành vi | Hậu quả |
|---------|---------|
| Push trực tiếp vào `main` | Deploy code chưa review lên production |
| `git push --force` (không có `--force-with-lease`) | Mất code của người khác |
| `git add -A` hoặc `git add .` | Commit file thừa (worktrees, test data, secrets) |
| Merge PR khi CI đỏ | Code lỗi lên production |
| Commit file `.env`, credentials, secrets | Lộ thông tin bảo mật |
| Dùng tên branch mơ hồ (`test`, `abc`, `1`) | Không ai hiểu branch chứa gì |

---

## 2. QUY TẮC KHI DÙNG CLAUDE CODE / CODEX

### 2.1 Trước khi bắt đầu

```bash
# Luôn pull main mới nhất
git checkout main && git pull origin main

# Tạo branch MỚI từ main
git checkout -b fix/issue-XX-description
```

**KHÔNG** làm việc trực tiếp trên `main` hoặc `develop`.

### 2.2 Khi commit

```bash
# ĐÚNG — chỉ add file liên quan
git add backend/src/.../MyFile.java fe/src/.../my-component.ts
git commit -m "feat(scope): description"

# SAI — add tất cả (bao gồm file từ worktree khác)
git add -A
git add .
```

### 2.3 Kiểm tra trước khi push

```bash
# Xem file nào sẽ commit — đảm bảo không có file thừa
git status
git diff --cached --stat

# Kiểm tra migration number không trùng
ls backend/src/main/resources/db/migration/V1*.sql | tail -5
# → Migration mới phải là số TIẾP THEO (VD: nếu cuối là V116, dùng V117)
```

### 2.4 Kiểm tra trước khi tạo PR

```bash
# Backend tests
cd backend && mvn test -B

# Frontend build
cd fe && npm run build
```

---

## 3. QUY TẮC CODE

### 3.1 Backend (Spring Boot + Clean Architecture)

```
JPA Repository → JpaEntity (KHÔNG BAO GIỜ domain model)
Domain Repository Interface → Domain Model
Adapter converts giữa chúng
```

**Migration Flyway:**
- Tên file: `V<số>__mô_tả.sql` (VD: `V117__add_student_notes.sql`)
- Kiểm tra số cuối cùng: `ls backend/src/main/resources/db/migration/ | tail -1`
- Dùng `IF NOT EXISTS` / `IF EXISTS` cho idempotent
- **KHÔNG** dùng số migration đã tồn tại

**Admin role check:**
```java
// ĐÚNG — ADMIN và ORG_ADMIN đều bypass ownership
private boolean isAdminRole(UserJpaEntity user) {
    return user.getRole() == UserJpaEntity.UserRole.ADMIN
            || user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN;
}
```

### 3.2 Frontend (Angular 20 + Signals)

```typescript
// ĐÚNG — Angular 20 conventions
@Component({
  selector: 'app-example',
  // KHÔNG có standalone: true (default trong Angular 20)
  changeDetection: ChangeDetectionStrategy.OnPush,  // BẮT BUỘC
  template: `...`
})
export class ExampleComponent {
  private service = inject(MyService);    // inject(), KHÔNG constructor
  data = input.required<Data>();          // input(), KHÔNG @Input()
  items = signal<Item[]>([]);             // signal cho state
  count = computed(() => this.items().length); // computed cho derived
}

// Template: @if/@for/@switch, KHÔNG *ngIf/*ngFor
```

**Imports:**
- `CommonModule` — chỉ khi dùng `| date`, `| number`, `[ngClass]`, `[ngStyle]`
- `FormsModule` — chỉ khi dùng `ngModel`, `ngForm`, `(ngSubmit)`
- Nếu dùng directive mà không import → build error `NG8003`

### 3.3 Design tokens

```
Primary:     #0056D2 (hover: #004BB5)
Danger/Red:  #dc2626 (CHỈ cho lỗi, destructive actions)
Cards:       bg-white rounded-xl border border-gray-200 shadow-sm
Page BG:     bg-slate-50
Focus ring:  focus:ring-[#0056D2] focus:border-[#0056D2]
```

---

## 4. CHECKLIST NHANH

Trước mỗi PR, tự hỏi:

- [ ] Branch tạo từ `main` mới nhất?
- [ ] Tên branch đúng format `prefix/description`?
- [ ] Commit message đúng `type(scope): description`?
- [ ] `git status` không có file thừa?
- [ ] Migration number không trùng?
- [ ] Backend tests pass? (`mvn test -B`)
- [ ] Frontend build pass? (`npm run build`)
- [ ] PR có mô tả rõ ràng (Summary + Test plan)?

---

## 5. LIÊN HỆ

- **Repo**: https://github.com/linhlinhlin/LMS_hohulili
- **Production**: https://holilihu.online
- **Issues**: Kiểm tra tab Issues trước khi bắt đầu — tránh làm trùng
- **Branch protection**: Chờ linhlinhlin bật trên GitHub Settings

---

*Cập nhật: 2026-04-22 | Ref: CONTRIBUTING.md, CLAUDE.md*
