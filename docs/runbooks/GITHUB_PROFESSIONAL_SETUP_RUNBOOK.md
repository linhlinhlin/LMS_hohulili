# GitHub Professional Setup Runbook

One-shot checklist để cấu hình `linhlinhlin/LMS_hohulili` theo chuẩn SOTA của các tổ chức lớn (Google, Kubernetes, Stripe). **Cần quyền admin của repo** — thực hiện bằng tài khoản chủ (`linhlinhlin`), không phải collaborator.

Các task chia theo **phải làm ngay (P0)** và **nên làm (P1)**.

---

## 1. Repo Settings (Settings → General)

### P0 — Pull Requests section

- [ ] **Allow merge commits**: OFF (chọn đúng 1 chiến lược; giữ lịch sử sạch)
- [ ] **Allow squash merging**: ON (strategy mặc định — gọn history, 1 commit/PR)
- [ ] **Allow rebase merging**: OFF (tránh rewrite của reviewer)
- [ ] **Always suggest updating pull request branches**: ON
- [ ] **Allow auto-merge**: ON (queue merge sau khi CI pass)
- [ ] **Automatically delete head branches**: **ON** ← giải thích việc stale `hotfix/*` hiện tại

Commit message mặc định khi squash:
- Default: **"Pull request title"**
- Body: **"Pull request body"**

### P1 — Features

- [ ] **Wikis**: OFF (không dùng — docs tree đã là source of truth)
- [ ] **Projects**: ON nếu track roadmap, OFF nếu không
- [ ] **Discussions**: OFF hoặc ON tuỳ nhu cầu
- [ ] **Issues**: ON (đang dùng)

---

## 2. Branch Protection (Settings → Branches → Add rule)

### P0 — Rule cho `main`

Branch name pattern: `main`

- [ ] **Require a pull request before merging**: ON
  - [ ] Required approving reviews: **1** (hoặc 0 nếu solo — vẫn cần PR để có record)
  - [ ] Dismiss stale pull request approvals when new commits are pushed: ON
  - [ ] Require review from Code Owners: ON (dùng `.github/CODEOWNERS` đã thêm)
  - [ ] Require approval of the most recent reviewable push: ON
  - [ ] Require conversation resolution before merging: ON

- [ ] **Require status checks to pass before merging**: ON
  - [ ] Require branches to be up to date before merging: ON
  - Select checks (sau khi 1 CI run xanh, mới hiển thị):
    - [ ] `Backend Tests`
    - [ ] `Frontend Build`
    - [ ] `Compose Validation`
    - [ ] `Docker Smoke Test`

- [ ] **Require signed commits**: ON (bật nếu maintainer đã setup GPG/SSH signing)
- [ ] **Require linear history**: ON (khớp với squash-only strategy)
- [ ] **Require deployments to succeed**: OFF (production deploy gated riêng qua `DEPLOY_ENABLED`)
- [ ] **Lock branch**: OFF (trừ khi freeze release)

- [ ] **Do not allow bypassing the above settings**: ON (áp dụng cả admin)
- [ ] **Restrict who can push to matching branches**: OFF (đã có rule PR + reviews)
- [ ] **Allow force pushes**: **OFF** (critical — tránh history rewrite trên main)
- [ ] **Allow deletions**: **OFF** (critical — tránh xóa main nhầm)

### P1 — Rule cho `develop` (nếu còn dùng)

Nếu `develop` là integration branch active, apply cùng rule như `main` nhưng có thể nới reviews = 0.

---

## 3. Security & Analysis (Settings → Security → Code security and analysis)

### P0

- [ ] **Dependabot alerts**: ENABLED
- [ ] **Dependabot security updates**: ENABLED (tự động PR fix cho CVE high/critical)
- [ ] **Dependabot version updates**: ENABLED (đọc từ `.github/dependabot.yml` đã thêm)

- [ ] **Secret scanning**: ENABLED (public repo free)
- [ ] **Secret scanning push protection**: ENABLED (block commit có secret pattern)

### P1

- [ ] **CodeQL analysis**: ENABLED (public repo free)
  - Default setup → runs on push + PR + weekly
  - Languages: Java, JavaScript/TypeScript
  - Fix advisory alerts trong Security tab

- [ ] **Private vulnerability reporting**: ENABLED (link từ `SECURITY.md`)

---

## 4. Actions Secrets & Variables (Settings → Secrets and variables → Actions)

### Environment `production` (existing)

Verify có đủ:

- Secrets (encrypted):
  - [ ] `DEPLOY_SSH_PRIVATE_KEY` — SSH key để SSH vào GCP VM
  - [ ] `DEPLOY_KNOWN_HOSTS` — GitHub → VM host verification

- Variables (plaintext):
  - [ ] `DEPLOY_HOST` — IP hoặc hostname VM
  - [ ] `DEPLOY_USER` — user SSH (e.g. `Admin`)
  - [ ] `DEPLOY_APP_DIR` — `/home/Admin/LMS_hohulili`

### Repository variables (existing)

- [ ] `DEPLOY_ENABLED` = `false` hiện tại (VM paused); set `true` khi resume

---

## 5. Labels (Settings → Labels)

### P1 — Consolidate labels

Default labels đủ cho indie project. Nếu muốn chuyên nghiệp hơn:

- [ ] Giữ: `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `question`, `wontfix`, `duplicate`, `invalid`
- [ ] Thêm nếu cần:
  - `security` (màu đỏ đậm) — track security issues
  - `dependencies` (màu tím) — Dependabot đã dùng label này
  - `frontend` / `backend` — scope triage
  - `P0` / `P1` / `P2` — priority
  - `needs-triage` — issue mới chưa assigned
  - `blocked` — PR/issue bị blocker
  - `breaking-change` — highlight cho changelog

---

## 6. Webhooks & Integrations (Settings → Webhooks)

### P1 — Chỉ cần xác nhận không có webhook lạ

- [ ] Liệt kê webhook hiện có (Settings → Webhooks)
- [ ] Xóa webhook không nhận ra — đặc biệt nếu có webhook cũ pointing đến VM/IP không còn dùng

---

## 7. Repository Rulesets (Settings → Rules → Rulesets) — modern alternative

GitHub đang dần chuyển từ "Branch protection" sang "Rulesets". Nếu dùng ruleset, tạo ruleset tên `main-protection` với:

- Target: `main`
- Enforcement: Active
- Rules: (giống mục 2)

Rulesets linh hoạt hơn, dễ export/import giữa repos.

---

## 8. Verify sau khi setup

Chạy các check sau qua CLI hoặc Settings:

```bash
# Repo basic
gh api repos/linhlinhlin/LMS_hohulili --jq \
  '{delete_branch_on_merge, allow_auto_merge, allow_squash_merge, allow_merge_commit, allow_rebase_merge}'

# Branch protection
gh api repos/linhlinhlin/LMS_hohulili/branches/main/protection --jq '.'

# Required status checks
gh api repos/linhlinhlin/LMS_hohulili/branches/main/protection/required_status_checks --jq '.contexts'
```

Kết quả mong đợi:

```json
{
  "delete_branch_on_merge": true,
  "allow_auto_merge": true,
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false
}
```

```json
["Backend Tests", "Frontend Build", "Compose Validation", "Docker Smoke Test"]
```

---

## 9. Ongoing hygiene

### Weekly

- [ ] Review Dependabot PRs (8:00 Monday Asia/Ho_Chi_Minh per `.github/dependabot.yml`)
- [ ] Merge security updates trước version updates
- [ ] Check Dependabot alerts — fix critical/high ngay

### Monthly

- [ ] Audit open issues (backlog grooming)
- [ ] Check CodeQL findings
- [ ] Rà soát secret scanning results

### Quarterly

- [ ] Run [`BRANCH_HYGIENE_RUNBOOK.md`](BRANCH_HYGIENE_RUNBOOK.md)
- [ ] Rotate JWT secret (production)
- [ ] Regenerate deploy SSH key nếu bị leak nghi vấn
- [ ] Archive working docs theo `DOCUMENTATION_POLICY.md §6`

---

## 10. Escalation

Nếu không có quyền admin:

- Contributor có quyền "Maintain" hoặc cao hơn có thể sửa Settings → General
- Chỉ Owner hoặc tổ chức admin mới enable Dependabot và CodeQL
- Branch protection: Admin only

Để check role:

```bash
gh api repos/linhlinhlin/LMS_hohulili/collaborators/YOUR_USERNAME/permission --jq '.permission'
```

Expected values: `admin` > `maintain` > `write` > `triage` > `read`.

---

## 11. Tham khảo

- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Docs: Configuring Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates)
- [GitHub Docs: Managing security and analysis settings](https://docs.github.com/en/repositories/managing-your-repositories-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository)
- [`.github/CODEOWNERS`](../../.github/CODEOWNERS)
- [`SECURITY.md`](../../SECURITY.md)
- [`docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md`](BRANCH_HYGIENE_RUNBOOK.md)
- [`docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`](PRODUCTION_PAUSE_RESUME_RUNBOOK.md)
