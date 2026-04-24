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
| **Branch protection** | 🔴 | **Chưa bật** cho `main` (P0 critical gap) |
| **Dependency vulnerabilities** | 🔴 | **13 vulns** (2 mod, 11 high) — DOMPurify XSS, path-to-regexp DoS |
| **Delete branch on merge** | 🔴 | Tắt — giải thích remote stale |
| Dependabot / secret scan | 🟡 | Unknown — cần verify trong Settings |
| Open issues | 🟠 | 16 open (5 của cleanup + 11 pre-existing) |
| GCP resources khác | 🟢 | 0 snapshot, firewall chuẩn, IP reserved khi VM stopped |

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

## 8. GitHub settings audit

Kiểm tra qua `gh api`:

| Setting | Current | Recommendation |
|---|---|---|
| Visibility | Public | Giữ |
| Default branch | `main` | ✅ |
| Allow squash merge | ✅ | Giữ |
| Allow rebase merge | ✅ | Giữ |
| Allow auto-merge | ❌ | Bật nếu muốn queue merge theo CI |
| **Delete branch on merge** | ❌ | **Bật ngay** — giải thích tại sao còn remote branch stale |
| **Branch protection (main)** | ❌ **KHÔNG có** | **P0 critical gap** — bật: require PR + CI check + no force-push |
| Issues | ✅ | Giữ |
| Wiki | ✅ | Xem xét disable nếu không dùng |
| Projects | ✅ | Xem xét disable nếu không dùng |
| Secret scanning | ⚠️ Unknown (API không trả rõ) | Verify trong Settings → Code security |
| Dependabot alerts | ⚠️ Unknown | **Bật ngay** |
| Dependabot security updates | ⚠️ Unknown | **Bật ngay** |

## 9. Dependency vulnerabilities

Chạy `npm audit --production` trong `fe/`:

```
13 vulnerabilities (2 moderate, 11 high)

- DOMPurify: Prototype Pollution to XSS Bypass
  GHSA-v9jr-rg53-9pgp
- path-to-regexp: Denial of Service via sequential optional groups
  GHSA-j3q9-mxjg-w52f
- path-to-regexp: ReDoS via multiple wildcards
  GHSA-27v5-c462-wpq7

fix available via `npm audit fix`
```

**Impact**:
- DOMPurify XSS bypass: ảnh hưởng mọi nơi FE render HTML user-supplied (Editor.js quiz content, rich text lesson content). **High severity, cần fix ngay.**
- path-to-regexp DoS: trong dependency transitive của Express router (SSR). Low exploit chance nhưng high severity nếu attacker biết đường route pattern.

**Hành động đề xuất**: tạo PR riêng `fix/npm-audit-fix` chạy `npm audit fix`, verify không breaking change, merge.

Backend: chưa chạy `mvn dependency:analyze` / `mvn versions:display-dependency-updates` — đẩy sang milestone sau.

## 10. Remote branch state

Qua `git ls-remote origin`:

| Branch | Trạng thái | Action |
|---|---|---|
| `main` | Active | Giữ |
| `develop` | Unclear | Kiểm tra — nếu không dùng, xóa |
| `chore/consolidate-ai-skill-folders` | PR #108 OPEN | Merge → auto-delete nếu bật setting |
| `chore/dev-reset-script` | PR #112 OPEN | Merge → auto-delete |
| `chore/docs-q1-2026-archive` | PR #106 OPEN | Merge → auto-delete |
| `chore/repo-health-audit-and-pro-docs` | PR #114 OPEN | Merge → auto-delete |
| `chore/untrack-stale-artifacts` | PR #110 OPEN | Merge → auto-delete |
| `fix/issue-78-79-offline-fallback` | PR #80 OPEN | Review |
| `hotfix/caddy-header-delete-collision` | **Đã merge** (PR #100, 2026-04-23) | **Xóa ngay** (`git push origin --delete …`) |
| `hotfix/deploy-workflow-use-script` | **Đã merge** (PR #102, 2026-04-23) | **Xóa ngay** |
| `hotfix/remove-pwa-network-debug-logs` | PR #104 OPEN | Review |

→ 2 remote branch là "đã merge nhưng còn" — điển hình khi chưa bật auto-delete.

## 11. GCP resources beyond VM

| Resource | Status | Cost impact |
|---|---|---|
| VM `lms-production` | TERMINATED | $0 compute |
| Disk `lms-production` | 30 GB pd-balanced | ~$3.60/mo |
| Static IP `lms-static-ip` | RESERVED, IN_USE (attached to stopped VM) | ~$3.60/mo |
| Firewall rules | `allow-http`, `allow-https` (standard) | $0 |
| Snapshots | 0 | $0 ✅ |

Tổng: ~$7/mo khi paused. Khớp với con số dự kiến.

## 12. Issues backlog

**16 open issues** tại thời điểm audit:

- 5 là issue của đợt cleanup này (#105, #107, #109, #111, #113) — đã link PR, đóng khi merge
- 11 là bugs/refactor từ các session trước:
  - PWA stack: #78, #79, #91, #92, #103 (5 bugs cần review)
  - Admin surfaces: #73, #77, #72
  - Org-admin portal: #74, #75, #76 (refactor stack)
- Không có issue nào quá hạn > 1 tuần chưa assign

**Khuyến nghị**: tạo milestone "School-level" cho các issue còn mở, assign về đúng scope.

## 13. Chưa audit trong session này

Trung thực về những gì **CHƯA** cover:

- [ ] `mvn dependency:analyze` (backend unused deps)
- [ ] `npm run build` / `mvn package` (verify build còn xanh)
- [ ] Unused imports scan (`tsc --noEmit`, Java compiler warnings)
- [ ] Angular routes dead code analysis
- [ ] Backend `@RestController` unused endpoints
- [ ] CSS unused rules scan (PurgeCSS)
- [ ] SSR hydration mismatch check
- [ ] GHCR image count (cần `read:packages` scope)
- [ ] GitHub Actions secrets list (sensitive)
- [ ] Test actual pass rate (BE + FE E2E)
- [ ] Docker image build reproducibility
- [ ] Caddy config syntax check
- [ ] Flyway migration gap/order check
- [ ] LF vs CRLF line ending issues
- [ ] `.gitattributes` effectiveness
- [ ] `package.json` vs `package-lock.json` drift

Các mục này nên được cover trong milestone School-level hoặc khi có budget thời gian dành riêng.

## 14. Khuyến nghị sau audit

### Priority P0 (cần làm tuần này)

- [ ] **Bật branch protection cho `main`** (require PR + CI + no force-push)
- [ ] **Bật "Delete branch on merge"** trong repo settings
- [ ] **Bật Dependabot alerts + security updates** (Settings → Code security)
- [ ] **Chạy `npm audit fix`** trong `fe/` — 13 vulnerabilities (2 mod, 11 high)
- [ ] Review + merge 5 PR cleanup (#106, #108, #110, #112, #114)
- [ ] Xóa 2 remote branch đã merge (`hotfix/caddy-header-delete-collision`, `hotfix/deploy-workflow-use-script`)

### Priority P1 (milestone School-level)

- [ ] `mvn dependency:analyze` → xóa unused backend deps
- [ ] `npm run build` + `mvn package` smoke — verify build xanh
- [ ] Refactor `section-editor.component.ts` (1.6k LOC)
- [ ] Triage + close/assign 11 non-cleanup issues
- [ ] Kiểm tra `develop` branch có còn active không
- [ ] Review PR #80, #104 (PWA pre-existing)
- [ ] Thêm ADR cho FE (Signals adoption, PWA strategy)
- [ ] Enable GitHub secret scanning (verify đã bật)

### Priority P2 (nice to have)

- [ ] Cấu hình Renovate (nếu muốn tinh chỉnh hơn Dependabot)
- [ ] Thêm `CODE_OF_CONDUCT.md` nếu mở contribution
- [ ] Rotate JWT secret khi resume VM
- [ ] Disable Wiki/Projects nếu không dùng
- [ ] Lên milestone cho backend test target 900
- [ ] Audit unused Angular routes + backend endpoints
- [ ] Setup CodeQL scanning (GitHub Security → Code scanning)

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
