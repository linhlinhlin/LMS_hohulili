# Handoff: Admin Professional Setup — 2026-04-24

> **From**: maintainer (collaborator account `meiiie`)
> **To**: repo admin (owner `linhlinhlin`)
> **Executor**: admin trực tiếp hoặc Codex CLI dưới quyền admin
> **Deadline**: hoàn tất trong 1 tuần tới (trước khi bắt đầu milestone cấp trường)
> **Scope**: kích hoạt toàn bộ SOTA GitHub features + cài CodeRabbit + thiết lập rule cho multi-agent PR workflow

---

## 0. Tóm tắt cho người bận

Có **7 Pull Request** đang chờ review + merge đã đẩy lên repo. Sau khi merge xong, bạn cần làm **10 thao tác admin** (tổng ~15-20 phút) trong Settings của GitHub + 1 lần install CodeRabbit app. Xong, repo sẽ ở trạng thái chuyên nghiệp, sẵn sàng cho nhiều AI agent (Claude Code, Codex, …) cùng work mà không gây conflict.

**TL;DR action list:**

1. Merge 7 PR theo thứ tự đề xuất (mục 2)
2. Install CodeRabbit qua Marketplace (mục 4)
3. Bật 6 setting trong Settings → General, Branches, Code security (mục 5)
4. Xác thực qua CLI `gh api` (mục 7)
5. Đọc + phổ biến quy tắc multi-agent PR cho cả team/agent (mục 8)

---

## 1. Context

### 1.1 Tại sao session này phát sinh

Repo vừa đóng milestone cấp khoa. Trước khi mở milestone cấp trường, maintainer chạy audit sâu → phát hiện:

- 8.1 GB disk local (phần lớn là dev-only video upload) → đã dọn xuống 1.4 GB
- 6 thư mục AI skill folder trùng lặp (`.agent/`, `.agents/`, `.kiro/`, `.qwen/`, `skills/`, `.claude/skills/`) → consolidate về 1
- Docs tree lẫn lộn shipped vs in-flight → tách thành `archive/2026-Q1/` theo policy mới
- Thiếu SOTA standard files: `SECURITY.md`, `CODEOWNERS`, Issue/PR templates, Dependabot config, CodeRabbit config
- **Chưa có branch protection cho `main`** (P0 gap — force-push được)
- **13 npm vulnerabilities** (2 mod + 11 high) trong `fe/` → `npm audit fix` giảm xuống 9
- **Auto-delete head branches tắt** → merged hotfix lingering trên origin

Toàn bộ đã được đóng gói thành 8 PR có đầy đủ template, linked issue, test plan.

### 1.2 Tình trạng repo khi soạn handoff này

- **`main` HEAD**: commit `565d7fe7` (production pause runbook merged)
- **Production**: GCP VM `lms-production` đang PAUSED (tiết kiệm credit)
- **CI/CD**: build+push images luôn chạy; deploy job gated bằng repo variable `DEPLOY_ENABLED=false`
- **DB backup**: `backups/prod-2026-04-24.dump` (483 KB, `pg_restore` custom format)

### 1.3 7 Pull Request chờ merge

| # | Branch | Scope | Merge risk |
|---|---|---|---|
| [#106](https://github.com/linhlinhlin/LMS_hohulili/pull/106) | `chore/docs-q1-2026-archive` | Archive Q1 working docs + retention policy | Low — 83 `git mv`, 6 link fix |
| [#108](https://github.com/linhlinhlin/LMS_hohulili/pull/108) | `chore/consolidate-ai-skill-folders` | Xóa 5 folder AI duplicate | Low — 0 code |
| [#110](https://github.com/linhlinhlin/LMS_hohulili/pull/110) | `chore/untrack-stale-artifacts` | `git rm --cached fe/test-results/.last-run.json` | None |
| [#112](https://github.com/linhlinhlin/LMS_hohulili/pull/112) | `chore/dev-reset-script` | Thêm `scripts/dev/reset-local-data.sh` | None |
| [#114](https://github.com/linhlinhlin/LMS_hohulili/pull/114) | `chore/repo-health-audit-and-pro-docs` | `SECURITY.md`, `CODEOWNERS`, audit report, branch hygiene runbook | None — docs only |
| [#116](https://github.com/linhlinhlin/LMS_hohulili/pull/116) | `chore/dependabot-config` | `.github/dependabot.yml` | None |
| [#117](https://github.com/linhlinhlin/LMS_hohulili/pull/117) | `fix/npm-audit-fe` | `package-lock.json` — 13 → 9 prod vulns | Low (build verified) |
| [#118](https://github.com/linhlinhlin/LMS_hohulili/pull/118) | `docs/github-setup-runbook` | Admin setup runbook + `.coderabbit.yaml` | None |

Plus 2 PR **pre-existing** (không phải đợt này): #104 PWA debug logs + #80 PWA offline fallback — admin tự quyết.

---

## 2. Merge order (dựa trên dependency + conflict surface)

Thứ tự **tối ưu** từ ít phụ thuộc → nhiều phụ thuộc:

```
#110 → #112 → #108 → #117 → #116 → #114 → #106 → #118
```

Lý do:

- **#110** (untrack file) — 0 file change code → merge trước là sạch nhất
- **#112** (reset script) — 0 conflict với bất cứ gì
- **#108** (xóa 5 folder AI) — 0 conflict
- **#117** (npm audit fix) — chỉ đụng `package-lock.json`
- **#116** (Dependabot config) — chỉ add `.github/dependabot.yml`
- **#114** (SECURITY + CODEOWNERS + audit report) — add files, chạm `CHANGELOG.md` + `docs/runbooks/README.md`
- **#106** (docs Q1 archive) — 83 file moves + chạm `docs/reports/README.md` + `docs/runbooks/README.md` — **có thể conflict với #114 ở 2 README này** (trivial resolve: giữ cả 2 entries)
- **#118** (CodeRabbit + setup runbook) — reference mọi thứ ở trên

Nếu conflict xảy ra, rebase branch sau trên `main` đã merge các PR trước.

### 2.1 Codex CLI thực hiện merge

```bash
# Verify CI pass cho từng PR trước khi merge
gh pr checks 110
gh pr checks 112
# ...

# Merge theo thứ tự, squash để giữ main lịch sử gọn
for pr in 110 112 108 117 116 114 106 118; do
  echo "=== Merging PR #$pr ==="
  gh pr checks $pr && gh pr merge $pr --squash --delete-branch || {
    echo "FAILED on #$pr — fix conflicts manually then retry"
    break
  }
done
```

Nếu bật **"Automatically delete head branches"** trước khi merge (mục 5), `--delete-branch` không cần flag (tự xóa).

---

## 3. Prerequisites

### 3.1 Tài khoản

- [ ] Đăng nhập GitHub browser bằng tài khoản admin (chủ repo hoặc có role `admin`)
- [ ] Verify role: `gh api repos/linhlinhlin/LMS_hohulili/collaborators/<your-username>/permission --jq '.permission'` → phải là `admin`

### 3.2 CLI

```bash
# Codex đã có sẵn; chỉ cần verify:
gh --version          # GitHub CLI ≥ 2.40
gh auth status        # Đã login với đủ scope (repo, admin:repo_hook)
```

Nếu scope thiếu:

```bash
gh auth refresh -s admin:repo_hook,workflow,write:packages
```

### 3.3 Git

```bash
git --version         # ≥ 2.40
```

Không cần đụng gì thêm — toàn bộ setup qua `gh` CLI + GitHub UI.

---

## 4. Install CodeRabbit (AI code review)

### 4.1 Tại sao cần

Dự án đang dùng **nhiều AI agent đồng thời** (Claude Code, Codex, có thể thêm Gemini/Qwen trong tương lai). Mỗi agent implement + tự review PR của mình, nhưng **không agent nào thấy context từ agent khác**. CodeRabbit làm **second independent reviewer** đọc toàn bộ PR diff, đọc `CLAUDE.md` + `DOCUMENTATION_POLICY.md` + các ADR, và cross-check theo 10 `path_instructions` đã configured sẵn trong `.coderabbit.yaml`.

Config file `.coderabbit.yaml` có trong PR #118 — khi PR đó merge, CodeRabbit đọc tự động.

### 4.2 Steps

1. Mở https://github.com/marketplace/coderabbit
2. **Set up a plan** → chọn **Free tier** (public repo + solo maintainer)
   - Nếu sau muốn mở rộng sang private repo: upgrade Lite ($15/mo) hoặc Pro
3. **Install** → chọn `Only select repositories` → tick đúng `linhlinhlin/LMS_hohulili`
4. Approve permissions:
   - Contents: Read
   - Issues: Read & Write
   - Pull requests: Read & Write
   - Checks: Read & Write
   - Metadata: Read
5. Verify trong Settings → Integrations → GitHub Apps → CodeRabbit (phải hiện)

### 4.3 Verify review

Sau install:

1. Mở một trong PR đang chờ (#118 là PR tốt vì có `.coderabbit.yaml`) → bot comment trong ~60s
2. Kiểm tra output:
   - Review bằng **tiếng Việt** (config `language: vi-VN`)
   - Có **high-level summary** ở đầu
   - Path-specific comments dùng đúng context (ví dụ comment về `backend/src/main/java/**` phải nhắc Clean Architecture)
3. Nếu review không đúng style hoặc ngôn ngữ: sửa `.coderabbit.yaml` trên main → commit → PR mới sẽ dùng config mới

### 4.4 Commands dùng trong PR

Comment trong PR conversation:

- `@coderabbitai review` — force re-review
- `@coderabbitai summary` — tái tạo summary
- `@coderabbitai resolve` — đóng threads CodeRabbit đã mở
- `@coderabbitai ignore` — skip PR này
- `@coderabbitai help` — xem full list commands

### 4.5 Chi phí

- **Free tier** (public repo): unlimited reviews, ~24 hours latency acceptance cao.
- **Lite $15/mo**: faster review, private repo support.
- Free đủ cho dự án này. Không cần card.

---

## 5. Enable repo-level features (Settings)

Thực hiện tuần tự. Mỗi bước có command verify.

### 5.1 Pull Request strategy

**Settings → General → Pull Requests**:

- [ ] ❌ **Uncheck** Allow merge commits
- [ ] ✅ **Check** Allow squash merging — default commit message: **"Pull request title"**
- [ ] ❌ **Uncheck** Allow rebase merging
- [ ] ✅ **Check** Always suggest updating pull request branches
- [ ] ✅ **Check** Allow auto-merge
- [ ] ✅ **Check** **Automatically delete head branches** ← giải thích remote stale hiện tại

**Save**.

Verify:

```bash
gh api repos/linhlinhlin/LMS_hohulili --jq \
  '{squash: .allow_squash_merge, merge: .allow_merge_commit, rebase: .allow_rebase_merge, auto: .allow_auto_merge, del: .delete_branch_on_merge}'
```

Expected:
```json
{"squash":true,"merge":false,"rebase":false,"auto":true,"del":true}
```

### 5.2 Features

**Settings → General → Features**:

- [ ] ❌ **Uncheck** Wikis (không dùng — docs tree là source of truth)
- [ ] Giữ **Issues** ✅
- [ ] **Projects** và **Discussions**: tuỳ bạn

### 5.3 Security & Analysis

**Settings → Code security and analysis**:

- [ ] ✅ **Enable** Dependabot alerts
- [ ] ✅ **Enable** Dependabot security updates (auto-PR cho CVE)
- [ ] ✅ **Enable** Dependabot version updates — sẽ đọc `.github/dependabot.yml` đã có trong PR #116
- [ ] ✅ **Enable** Secret scanning
- [ ] ✅ **Enable** Secret scanning push protection (block commit có token/key)
- [ ] ✅ **Enable** CodeQL analysis (Default setup) — chọn Java + JavaScript/TypeScript
- [ ] ✅ **Enable** Private vulnerability reporting (pair với `SECURITY.md` đã có)

Verify (sau ~1 phút để GitHub process):

```bash
gh api repos/linhlinhlin/LMS_hohulili --jq '.security_and_analysis'
```

### 5.4 Branch protection cho `main`

**Settings → Branches → Add rule** (hoặc Rulesets nếu muốn dùng format mới):

Branch name pattern: `main`

Rules tick:

- [ ] ✅ Require a pull request before merging
  - Required approving reviews: **1** (nếu solo, có thể 0 nhưng vẫn cần PR)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (dùng `.github/CODEOWNERS` từ PR #114)
  - ✅ Require approval of the most recent reviewable push
  - ✅ Require conversation resolution before merging
- [ ] ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Select required checks (sau khi có CI run đầu tiên xanh, mới show list):
    - ✅ `Backend Tests`
    - ✅ `Frontend Build`
    - ✅ `Compose Validation`
    - ✅ `Docker Smoke Test`
- [ ] ✅ Require linear history (pair với squash-only)
- [ ] ❌ Require signed commits (optional — bật nếu maintainer đã setup GPG/SSH signing)
- [ ] ✅ **Do not allow bypassing the above settings** (áp dụng cho cả admin — sau rule active, kể cả owner cũng phải qua PR)
- [ ] ❌ **Do not allow force pushes** (critical)
- [ ] ❌ **Do not allow deletions** (critical)

**Create** rule.

Verify:

```bash
gh api repos/linhlinhlin/LMS_hohulili/branches/main/protection --jq '{
  reviews: .required_pull_request_reviews.required_approving_review_count,
  code_owner: .required_pull_request_reviews.require_code_owner_reviews,
  checks: .required_status_checks.contexts,
  force_push: .allow_force_pushes.enabled,
  deletion: .allow_deletions.enabled,
  linear: .required_linear_history.enabled
}'
```

Expected (ít nhất):
```json
{"reviews":1,"code_owner":true,"checks":["Backend Tests","Frontend Build","Compose Validation","Docker Smoke Test"],"force_push":false,"deletion":false,"linear":true}
```

---

## 6. After rules active — workflow mới

Sau khi branch protection bật, **không ai (kể cả admin)** push thẳng lên main được. Mọi thay đổi phải qua PR. Điều này BẮT BUỘC cho multi-agent workflow.

### 6.1 Agent viết code → PR

```bash
# Agent workflow
git checkout -b chore/<topic> main        # Branch từ main mới nhất
# ... edit files ...
git add . && git commit -m "..."
git push -u origin chore/<topic>
gh pr create --base main ...               # Mở PR
```

### 6.2 CodeRabbit auto-review

- Bot comment trong ~60s
- Review tiếng Việt với path-specific rules
- Maintainer hoặc agent tiếp theo đọc review

### 6.3 Human gate

- CODEOWNERS (hiện là `@meiiie`) phải approve — đảm bảo **human final review** cho mọi PR dù bot đã OK
- Conversation phải resolved
- CI checks phải pass

### 6.4 Merge

- Squash merge only (giữ lịch sử gọn)
- Auto-delete branch (setup ở 5.1)

---

## 7. Verification total

Sau khi xong 4 + 5:

```bash
# Script verify tổng (paste vào terminal)
echo "=== Repo settings ==="
gh api repos/linhlinhlin/LMS_hohulili --jq \
  '{squash:.allow_squash_merge, merge:.allow_merge_commit, rebase:.allow_rebase_merge, auto:.allow_auto_merge, del:.delete_branch_on_merge, wiki:.has_wiki}'

echo
echo "=== Security features ==="
gh api repos/linhlinhlin/LMS_hohulili --jq '.security_and_analysis'

echo
echo "=== Branch protection (main) ==="
gh api repos/linhlinhlin/LMS_hohulili/branches/main/protection --jq '{
  reviews: .required_pull_request_reviews.required_approving_review_count,
  code_owner: .required_pull_request_reviews.require_code_owner_reviews,
  checks: .required_status_checks.contexts,
  force_push: .allow_force_pushes.enabled,
  deletion: .allow_deletions.enabled,
  linear: .required_linear_history.enabled
}'

echo
echo "=== CodeRabbit installed ==="
gh api repos/linhlinhlin/LMS_hohulili/installation --jq '.app_slug' || echo "GitHub App not installed or no permission"

echo
echo "=== Open PRs ==="
gh pr list --state open --json number,title | python -c "import json,sys;[print(f'#{p[\"number\"]} {p[\"title\"]}') for p in json.load(sys.stdin)]"
```

---

## 8. Multi-agent PR rules (QUAN TRỌNG)

Dự án dùng nhiều agent đồng thời → phải có rule cứng để tránh stepping on each other's toes.

### 8.1 Branch naming convention

Mỗi agent/session tạo branch theo format:

```
<type>/<short-slug>
```

Với `<type>`:
- `feat/` — feature mới
- `fix/` — bug fix
- `chore/` — cleanup, docs, tooling
- `refactor/` — refactor không đổi behavior
- `perf/` — performance
- `hotfix/` — production emergency
- `docs/` — docs-only
- `ci/` — CI/CD changes

Examples:
- `feat/teacher-assignment-rubric`
- `fix/quiz-403-free-course`
- `chore/upgrade-angular-20.3.24`

Một số agent có prefix riêng (e.g. Claude Code có `claude/*`, Codex có `codex/*` worktrees). **Các prefix này không push lên remote** — agent phải promote sang type-prefix trước khi push.

### 8.2 Conventional commit + agent attribution

Mọi commit phải:
- Conventional commit format: `<type>(<scope>): <subject>`
- Không hard limit line length nhưng hướng subject < 72 char
- `Co-Authored-By` trailer xác định agent:

```
feat(curriculum): add chapter reorder via drag-drop

<body giải thích why + edge cases>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Hoặc cho Codex:

```
Co-Authored-By: Codex CLI <noreply@anthropic.com>
```

Mục đích: `git log --author="Claude"` filter được commit do Claude viết, giúp audit sau.

### 8.3 Không chồng chéo branch

**Quy tắc vàng**: một file không được sửa song song bởi 2 agent trên 2 branch khác nhau chưa merge.

Cách tránh:

1. Trước khi bắt đầu session: `gh pr list --state open` → xem PR nào đang mở
2. Nếu có PR mở đụng file mình định sửa → **đợi PR đó merge trước** hoặc **rebase branch mình onto branch đang mở** (không khuyến khích — dễ rối)
3. Short-lived branch: < 7 ngày. PR mở quá 2 tuần → đóng + tạo lại

### 8.4 Pre-push checks (agent phải tự chạy)

Trước khi `git push`:

- [ ] Conventional commit format
- [ ] Không commit secret (`.env*`, key, token)
- [ ] Files không intended (cache, build output) đã gitignored
- [ ] Backend: `mvn compile` pass (nếu đụng Java)
- [ ] FE: `npm run build` pass (nếu đụng TypeScript/HTML/SCSS) — hoặc ít nhất `tsc --noEmit`
- [ ] Test pass nếu có test file relevant
- [ ] Không còn `console.log` tạm (trừ PWA intentional logs)
- [ ] Không còn TODO/FIXME không tạo issue

Nếu check fail → fix trước khi push.

### 8.5 Không force-push branch đã share

- **Never** `git push --force` lên branch đã ai đó fork/checkout (kể cả bot)
- Nếu cần rewrite: dùng `git push --force-with-lease` (an toàn hơn) hoặc open PR mới thay thế
- Branch protection đã block force-push lên main

### 8.6 PR template phải điền đủ

File `.github/pull_request_template.md` (từ PR #106) tự động fill khi mở PR. **Agent phải điền đủ**:

- Summary (1-2 câu)
- Linked issue (`Closes #N` nếu có)
- Change type (check exactly 1)
- What changed (bullet list)
- Why
- Testing (cụ thể, không viết "tested manually")
- Risk & rollback
- Checklist tick đầy đủ

Nếu PR thiếu mục nào → CodeRabbit hoặc maintainer sẽ yêu cầu bổ sung.

### 8.7 Maintainer gate

- Merge chỉ được thực hiện bởi **human maintainer** (hoặc admin)
- Agent **tuyệt đối không** tự merge PR của mình — kể cả khi CI xanh + CodeRabbit approve
- Lý do: human final review là hàng rào cuối đảm bảo không có regression kỳ lạ mà bot bỏ sót

### 8.8 Conflict resolution khi 2 agent đụng nhau

Trường hợp: agent A merged PR đụng file X, agent B mở PR cũng đụng file X.

Quy trình:

```bash
# Agent B rebase branch mình lên main mới
git checkout <branch-của-B>
git fetch origin
git rebase origin/main
# Resolve conflict thủ công hoặc qua IDE
git add <files>
git rebase --continue
git push --force-with-lease
```

Nếu conflict phức tạp → đóng PR của B, cherry-pick các commit lên branch mới.

### 8.9 Documentation policy

Khi agent chạm docs:

- Nếu là doc sống (`reference/`, `runbooks/`, `research/`, `architecture/` tên cố định): **được sửa**
- Nếu là doc archived (`docs/archive/`): **không sửa**, nếu cần erratum thì tạo `ERRATUM.md` cùng folder
- Nếu là working doc đã ship > 2 tuần (`plans/`, `superpowers/specs/`, dated reports): **promote** core knowledge lên reference/runbook rồi `git mv` bản gốc vào archive
- Tiếng Việt cho ops; tiếng Anh cho tên công nghệ (theo `DOCUMENTATION_POLICY.md §1`)

### 8.10 Secret discipline

- Không commit `.env*` (kể cả tạm)
- Không commit key, token, password
- Nếu vô tình commit → rotate secret ngay trên production + rewrite history nếu chưa push (hoặc đề nghị admin rewrite)
- GitHub Secret Scanning push protection (bật ở 5.3) sẽ block nhưng đừng dựa

### 8.11 Agent-specific files

- `.claude/` — Claude Code specific; các agent khác không sửa
- `.codex/` — Codex specific; tương tự
- Nếu adopt agent mới: thêm folder riêng `.<tool>/` + cập nhật `.gitignore` nếu cần

### 8.12 Issue tracking

- Mọi PR đáng kể phải link tới issue (`Closes #N`)
- Issue dùng template (bug/feature/documentation) trong `.github/ISSUE_TEMPLATE/`
- Label theo scope: `frontend`, `backend`, `dependencies`, `documentation`, `security`
- Priority: `P0` (critical), `P1` (should), `P2` (nice to have)

---

## 9. Weekly maintenance (admin)

Admin nên dành 15-30 phút đầu tuần Monday:

1. **Review Dependabot PRs** (8:00 Monday Asia/Ho_Chi_Minh):
   - Security updates: merge nhanh nếu CI xanh
   - Version updates: rà từng group, test nếu Angular/Spring bump
2. **Check Dependabot alerts** (Security tab):
   - Critical/High: fix trong tuần
   - Moderate/Low: batch cuối tháng
3. **Check Secret Scanning alerts**: immediate rotate nếu có
4. **Check CodeQL findings**: triage + fix
5. **Close stale PRs** (mở > 2 tuần không activity): comment + close

Monthly:

- Audit open issues (backlog grooming)
- Review merged PRs last month, xem pattern có nên promote thành ADR
- Update `CHANGELOG.md` nếu có milestone

Quarterly:

- Run `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md`
- Rotate JWT production secret (khi resume VM)
- Archive working docs theo `DOCUMENTATION_POLICY.md §6`
- Regenerate deploy SSH key nếu có concern leak

---

## 10. Troubleshooting

### 10.1 CodeRabbit không comment

1. Check PR không phải **Draft** (config `auto_review.drafts: false`)
2. Check base branch là `main` hoặc `develop`
3. Check app vẫn installed: Settings → Integrations → GitHub Apps
4. Comment `@coderabbitai review` để force trigger

### 10.2 Branch protection block admin

Triệu chứng: admin không push được lên main sau khi bật rule.

- Đúng là intentional — rule "Do not allow bypassing" áp dụng cho admin
- Workaround: mở PR như mọi người, self-approve nếu solo, merge

Nếu thật sự cần emergency push (rất hiếm):
1. Settings → Branches → edit rule
2. Uncheck "Do not allow bypassing" tạm
3. Push
4. Re-check "Do not allow bypassing"

### 10.3 Dependabot spam quá nhiều PR

Tuning trong `.github/dependabot.yml`:

- Giảm `open-pull-requests-limit` xuống 2 hoặc 3
- Thêm `ignore:` cho dependencies không quan tâm
- Tăng `groups:` để gom nhiều PR thành 1

### 10.4 Required status checks không xanh

Nếu CI có job mới chưa có trong branch protection list:

- Tạm uncheck required, merge PR
- Re-check sau khi CI run đủ 1 lần thành công

### 10.5 Conflict khi merge 7 PR

Nếu conflict trên README index files:
- Giữ cả 2 "entries" (new + existing)
- Xoá dupe
- Chạy `gh pr checks` lại

### 10.6 npm audit vẫn còn 9 high sau PR #117 merged

Đây là 9 vulns trong Angular compiler chain — cần **coordinated upgrade** Angular 20.3.17 → 20.3.24 bằng một PR riêng. Dependabot (sau khi bật ở 5.3) sẽ tự đề xuất PR này vào Monday tới. Review + merge như bình thường.

---

## 11. Escalation

Nếu gặp gì ngoài runbook:

- **Architecture question**: check `backend/docs/adr/` trước
- **Runtime/ops**: check `docs/runbooks/`
- **Production incident**: `docs/runbooks/PRODUCTION_SMOKE_TEST.md` + `PRODUCTION_PAUSE_RESUME_RUNBOOK.md`
- **Security**: follow `SECURITY.md` reporting flow — tuyệt đối không public disclosure
- **Không rõ**: comment trong một PR bất kỳ, maintainer `@meiiie` sẽ respond

---

## 12. Sign-off

Sau khi hoàn tất, check vào đây để archive:

- [ ] 7 PR merged trong thứ tự đề xuất (mục 2.1)
- [ ] CodeRabbit installed + first review verified (mục 4)
- [ ] Repo settings (mục 5.1 + 5.2) đã apply
- [ ] Security features (mục 5.3) bật hết
- [ ] Branch protection (mục 5.4) active cho `main`
- [ ] `gh api` verification pass (mục 7)
- [ ] Multi-agent rules (mục 8) đã phổ biến tới tất cả agent đang dùng

Khi tất cả tick: `git mv docs/handoff/2026-04-24-admin-professional-setup.md docs/archive/2026-Q2/handoff/` + commit.

---

## 13. References

- `SECURITY.md` — security reporting (từ PR #114)
- `.github/CODEOWNERS` — code review routing (từ PR #114)
- `.github/dependabot.yml` — Dependabot config (từ PR #116)
- `.coderabbit.yaml` — CodeRabbit config (từ PR #118)
- `docs/runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md` — full checklist (từ PR #118)
- `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md` — quarterly branch prune (từ PR #114)
- `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md` — VM stop/start
- `docs/reports/2026-04-24-repo-health-audit.md` — full audit report (từ PR #114)
- `docs/reference/DOCUMENTATION_POLICY.md` — docs convention + archive policy (từ PR #106)
- `CLAUDE.md` — project overview cho AI agent
- `AGENTS.md` — agent-specific notes (local-only, git excluded)

---

## 14. Handoff complete signal

Khi admin confirm xong, reply theo format:

```
[HANDOFF COMPLETE 2026-04-24-admin-professional-setup]
- PRs merged: 7/7
- CodeRabbit: installed
- Branch protection: active
- Dependabot: running
- CodeQL: running
- Notes: <bất kỳ deviation nào>
```

Maintainer (`@meiiie`) sẽ archive handoff doc + mở milestone cấp trường.

---

**Cảm ơn bạn đã làm việc kỹ lưỡng với setup này. Repo sẽ ở chuẩn SOTA sau khi xong — rất giá trị cho multi-agent workflow dài hạn.**
