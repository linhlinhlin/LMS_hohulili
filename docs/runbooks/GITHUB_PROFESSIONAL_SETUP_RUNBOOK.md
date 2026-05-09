# GitHub professional setup runbook

Runbook này dùng để đưa repo `linhlinhlin/LMS_hohulili` về trạng thái vận hành chuyên nghiệp. Một số bước cần quyền admin của repository owner.

Authority: `@meiiie` là project owner/primary maintainer. Repository owner/admins có toàn quyền quản trị GitHub settings, rulesets, permissions, emergency merge, và rollback khi cần.

## 1. Audit hiện trạng

```powershell
.\scripts\github\audit-repo-settings.ps1 -Repo linhlinhlin/LMS_hohulili
```

Ghi lại:

- Quyền hiện tại của tài khoản CLI.
- Merge strategy đang bật.
- `deleteBranchOnMerge`.
- Wiki, Projects, Discussions.
- Branch protection hoặc ruleset của `main`.
- Số lượng label hiện có.

## 2. Sync label taxonomy

Dry run:

```powershell
.\scripts\github\sync-labels.ps1 -Repo linhlinhlin/LMS_hohulili
```

Apply:

```powershell
.\scripts\github\sync-labels.ps1 -Repo linhlinhlin/LMS_hohulili -Apply
```

Không xóa label cũ trong script mặc định để tránh làm mất metadata của issue/PR cũ. Dọn label legacy bằng tay sau khi audit các issue đang mở.

## 3. Repo Settings cần owner/admin bật

Settings -> General:

- Description: `Production-first maritime LMS with Angular, Spring Boot, PWA offline learning, adaptive video, and role-based operations.`
- Homepage: `https://holilihu.online`
- Topics: `lms`, `maritime`, `angular`, `spring-boot`, `postgresql`, `pwa`, `offline-first`, `adaptive-video`, `clean-architecture`, `ddd`
- Wiki: OFF
- Issues: ON
- Projects: ON nếu team dùng board
- Discussions: OFF cho tới khi có maintainer phụ trách

Pull Requests:

- Allow squash merging: ON
- Allow merge commits: OFF
- Allow rebase merging: OFF
- Allow auto-merge: ON
- Automatically delete head branches: ON
- Always suggest updating pull request branches: ON

## 4. Ruleset cho `main`

Ưu tiên Rulesets thay vì branch protection cũ nếu repo có quyền dùng Rulesets.

Settings -> Rules -> Rulesets -> New branch ruleset:

- Name: `main-protection`
- Target: default branch / `main`
- Enforcement: Active
- Require pull request before merging: ON
- Required approvals: 1
- Dismiss stale approvals: ON
- Require code owner review: ON
- Require approval of most recent reviewable push: ON
- Require conversation resolution: ON
- Require status checks:
  - `Backend Tests`
  - `Frontend Build`
  - `Compose Validation`
  - `Docker Smoke Test`
- Require branch up to date: ON
- Require linear history: ON
- Block force pushes: ON
- Block deletions: ON

Reference proposal: `.github/rulesets/main-protection.recommended.json`.

## 5. Security and analysis

Settings -> Code security and analysis:

- Dependabot alerts: ON
- Dependabot security updates: ON
- Secret scanning: ON
- Secret scanning push protection: ON
- CodeQL default setup: ON for Java and JavaScript/TypeScript
- Private vulnerability reporting: ON if available

Security policy is already tracked at `SECURITY.md`.

## 6. Social preview and repository visuals

Recommended asset:

- `docs/assets/github/repository-card.svg`

Owner/admin can upload a PNG export of this card in Settings -> General -> Social preview. GitHub currently requires upload via UI for custom Open Graph images.

## 7. Verification after setup

Run:

```powershell
.\scripts\github\audit-repo-settings.ps1 -Repo linhlinhlin/LMS_hohulili
gh pr list --repo linhlinhlin/LMS_hohulili --state open --limit 20
gh label list --repo linhlinhlin/LMS_hohulili --limit 200
```

Expected high-level result:

- New issues open through YAML forms.
- PR body uses the review-ready template.
- Labels include `type/*`, `area/*`, `risk/*`, `status/*`, and `size/*`.
- `main` cannot be merged into without PR, CI, review, and conversation resolution.

## 8. Ongoing hygiene

Weekly:

- Review Dependabot PRs.
- Merge security updates before version updates.
- Triage issues with `needs-triage`.
- Close stale draft PRs or move them to `blocked`.

Monthly:

- Audit labels and milestones.
- Review CodeQL and Dependabot alerts.
- Audit branch protection/rulesets.

Quarterly:

- Run `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md`.
- Archive stale docs according to `docs/reference/DOCUMENTATION_POLICY.md`.
- Review `CODEOWNERS` as team ownership changes.
