# Repo Health Audit — 2026-04-24

> **Phạm vi**: toàn bộ repo `LMS_hohulili` tại HEAD `main`  
> **Người thực hiện**: Claude Opus 4.7 (auto-audit) + maintainer review  
> **Mục đích**: checkpoint cuối cấp khoa, đầu cấp trường — đảm bảo repo sạch trước khi mở milestone tiếp theo

## Tóm tắt

| Dimension | Status | Note |
|---|---|---|
| Local disk footprint | 🟢 | Đã giảm từ 8.1 GB → 1.4 GB (−6.7 GB) |
| Code quality markers | 🟢 | 0 TODO / FIXME / HACK / XXX |
| Production debug noise | 🟡 | 5 `console.log` còn trong FE (PWA debug, cố ý) |
| Hardcoded secrets | 🟢 | Không phát hiện; `.env` gitignored |
| Backup files (`.bak`, `.orig`) | 🟢 | 0 |
| Branch sprawl | 🟠 | 42 branches (22 local, 11 remote) — nhiều stale |
| Documentation coverage | 🟡 | Vừa thêm `SECURITY.md`, `CODEOWNERS`; `CHANGELOG.md` cần update |
| ADR coverage | 🟢 | 3 ADR sống trong `backend/docs/adr/` |
| Large components | 🟠 | `section-editor.component.ts` 1.6k LOC (đã flag từ trước) |
| Dependency hygiene | 🟡 | Chưa chạy `npm audit` / `mvn dependency:analyze` trong báo cáo này |

## 1. Disk footprint

### Before / After (cùng branch, cùng code)

```
8.1 GB   before cleanup
 ↓
 6.7 GB  freed by emptying backend/uploads/
  42 MB  freed by Phase 1 (root PNG, docx, graphify-out, e2e-screenshots)
 ~10 MB  freed by Phase 4 (fe/fe, fe/screenshots, fe/.tmp, fe/out-tsc)
 ↓
1.4 GB   after cleanup
```

### Breakdown sau cleanup

| Folder | Size | Note |
|---|---|---|
| `fe/node_modules/` | 509 MB | Standard |
| `.git/` | 632 MB | History |
| `fe/.angular/` | 93 MB | Build cache (giữ để rebuild nhanh) |
| `fe/public/` | 49 MB | Static assets (logo, icons, OG image) |
| `backend/target/` | 31 MB | Maven cache (giữ) |
| `fe/src/` | 7.3 MB | Source |
| `backend/src/` | 6.4 MB | Source |
| `fe/vendor/xlsx-0.20.3.tgz` | 2.4 MB | Vendored package (tracked có chủ ý) |
| Khác | <5 MB | docs/, scripts/, coord/, backups/ |

## 2. Code quality

### Markers

```bash
grep -rE "TODO|FIXME|HACK|XXX" backend/src/main --include='*.java'
# 0 matches
grep -rE "TODO|FIXME|HACK|XXX" fe/src --include='*.ts'
# 0 matches
```

Code base không có comment marker chưa giải quyết. Điều này **ấn tượng** — thông thường dự án 6 tháng chạy Agile sẽ có ít nhất vài chục. Cho thấy team có kỷ luật resolve-or-delete.

### Production debug logs (FE)

5 `console.log` còn lại trong production path:

| File | Dòng | Nội dung | Đánh giá |
|---|---|---|---|
| `fe/src/app/core/db/lms-offline.db.ts` | 1 | `'[LMS-Offline] v4 migration: cleared old data for multi-account isolation'` | Cố ý — log 1 lần khi migration xảy ra |
| `fe/src/app/shared/components/offline-indicator/offline-indicator.component.ts` | 3 | `'[PWA] Network Status'`, `'online event fired'`, `'offline event fired'` | Cố ý — debug offline detection |
| `fe/src/server.ts` | 1 | `Node Express server listening…` | Server-side SSR startup log |

**Khuyến nghị**: giữ lại toàn bộ. Các log này giúp debug production PWA issue nhanh. Nếu muốn clean hơn, dùng `environment.production` flag để gate.

### Backend

```bash
grep -rE "System\.out\.print" backend/src/main --include='*.java'
# 0 matches
```

Backend dùng `Logger` (SLF4J) xuyên suốt — chuẩn SOTA.

## 3. Security

### Hardcoded secrets scan

```bash
grep -rE "(password|secret|api_key|apikey|token)\s*=\s*[\"'][^\"']{8,}" \
  backend/src/main --include='*.java' --include='*.yml' --include='*.properties'
```

Matches đều là **URL builder** (`?token=` trong reset-password, email invite, CF Stream playback). **Không phải credential**. Sạch.

### Config

- `.env` gitignored (`.gitignore` dòng 51)
- `.env.*.example` có placeholder, không có secret thật
- `.git/info/exclude` cũng có `.env*` để local exclude

### Surface hardening

Đã được documented trong [`SECURITY.md`](../../SECURITY.md).

## 4. Branch hygiene

### Current state

- **Local branches**: 22 (bao gồm `main`, `develop`, nhiều `codex/*`, `fix/*`, `hotfix/*`, `chore/*`)
- **Remote branches**: 11 (bao gồm 4 PR đang mở + `main` + `develop` + vài stale)

### Stale candidates (local, chưa push)

| Nhánh | Hint |
|---|---|
| `chore/ui-consistency` | Không có remote — có thể đã merge và quên xóa |
| `codex/fix-*` (3 nhánh) | Codex sessions cũ |
| `codex/recovery-lms-*` (2 nhánh) | Recovery snapshots từ 2026-04-11 |
| `codex/wip-snapshot-20260325` | WIP cũ |
| `fix/isAdminRole-*`, `fix/issue-15`, `fix/issue-20` | Fix đã merge |
| `fix/prod-*` (5 nhánh) | Prod hotfix đã merge |
| `hotfix/caddy-*`, `hotfix/edge-*`, `hotfix/deploy-*` | Đã merge qua PR |
| `worktree-agent-afdceda4` | Claude worktree tạm |
| `claude/thirsty-khorana` | Claude session tạm |

### Remote stale

| Remote | Hint |
|---|---|
| `origin/develop` | Dùng song song `main` không? |
| `origin/fix/issue-78-79-offline-fallback` | PR #80 — review |
| `origin/hotfix/caddy-header-delete-collision` | Đã merge qua PR #100 |
| `origin/hotfix/deploy-workflow-use-script` | Đã merge qua PR #102 |
| `origin/hotfix/remove-pwa-network-debug-logs` | PR #104 — review |

### Khuyến nghị

Xem [`BRANCH_HYGIENE_RUNBOOK.md`](../runbooks/BRANCH_HYGIENE_RUNBOOK.md) để thực hiện prune an toàn.

## 5. Documentation

### Gap đã fill trong session này

| File | Tình trạng | Ghi chú |
|---|---|---|
| `SECURITY.md` | ✅ Mới | Security policy + reporting + hardening summary |
| `.github/CODEOWNERS` | ✅ Mới | Code review routing |
| `.github/ISSUE_TEMPLATE/*` | ✅ Trong PR #106 | bug/feature/docs + config.yml |
| `.github/pull_request_template.md` | ✅ Trong PR #106 | Conventional commit + self-review |
| `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md` | ✅ Đã merge | pg_dump + VM stop/start |
| `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md` | ✅ Mới | Stale branch prune |
| `docs/archive/` + `docs/academic/` | ✅ Trong PR #106 | Archive policy §6 |
| `scripts/dev/reset-local-data.sh` | ✅ Trong PR #112 | Repeatable local cleanup |

### Gap còn lại

- **CHANGELOG.md** last update 2026-03-24 → đã cập nhật trong PR này đến 2026-04-24
- **`docs/research/`** không có time-box → phù hợp để giữ
- **ADR**: chỉ có 3 ADR trong `backend/docs/adr/`, chưa có ADR cho FE architecture. Có thể xem xét thêm sau.

## 6. Empty folders

```
./.agents/skills/docker-compose-production
./.agents/skills/karpathy-guidelines
```

Các folder này trong `.agents/skills/` — sẽ được xóa toàn bộ khi PR #108 (consolidate AI folders) merge.

`backend/uploads/*` có 10 subfolder trống sau Phase 5 cleanup — giữ lại cho Docker volume mount.

## 7. Open PRs tại thời điểm audit

| # | Title | Status |
|---|---|---|
| #106 | docs: establish Q1 2026 archive boundary | OPEN |
| #108 | chore: consolidate 6 duplicate AI skill folders | OPEN |
| #110 | chore: untrack fe/test-results/.last-run.json | OPEN |
| #112 | chore(scripts): dev/reset-local-data.sh | OPEN |
| #104 | fix(pwa): remove offline indicator debug logs | OPEN (pre-existing) |
| #80  | fix(pwa): harden offline recovery | OPEN (pre-existing) |

## 8. Khuyến nghị sau audit

### Priority P0 (làm ngay)
- [ ] Review + merge 4 PR cleanup (#106, #108, #110, #112)
- [ ] Prune stale branches theo [`BRANCH_HYGIENE_RUNBOOK.md`](../runbooks/BRANCH_HYGIENE_RUNBOOK.md)
- [ ] Review PR #80 và #104 (pre-existing)

### Priority P1 (nên làm)
- [ ] Chạy `npm audit` + fix vulnerabilities (đặc biệt ở fe/)
- [ ] Chạy `mvn dependency:analyze` xem dep nào unused
- [ ] Refactor `section-editor.component.ts` (1.6k LOC) — split god component
- [ ] Thêm ADR cho quyết định architecture lớn (e.g. Angular Signals adoption, PWA strategy)

### Priority P2 (nice to have)
- [ ] Cấu hình Dependabot / Renovate cho auto-update
- [ ] Thêm `CODE_OF_CONDUCT.md` nếu mở cho contributor
- [ ] Rà soát `.kiro/`, `.qwen/`, `.codex/` — sau khi PR #108 merge
- [ ] Rotate JWT secret trên production khi resume VM (best practice sau pause)

## 9. Chỉ số milestone

| Metric | Faculty milestone (2026-04-24) | Target cho School milestone |
|---|---|---|
| Disk footprint local | 1.4 GB | < 1.5 GB (maintain) |
| Open PRs | 6 | < 3 |
| Stale branches | 22 local | < 5 local |
| TODO markers | 0 | 0 |
| `SECURITY.md` | ✅ | ✅ |
| `CODEOWNERS` | ✅ | ✅ |
| `CHANGELOG.md` up-to-date | ✅ | luôn update theo commit lớn |
| ADR count | 3 | +2 (Signals, PWA) |
| Test coverage (backend) | 806 tests | +100 (target 900) |
| Dependabot enabled | No | Yes |

---

**Ký checkpoint**: repo state tại HEAD `main` khi audit này ghi, plus 4 PR cleanup đang chờ review. Maintainer ký tên khi đọc + confirm.
