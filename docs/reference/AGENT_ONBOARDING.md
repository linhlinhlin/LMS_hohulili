# Agent Onboarding

Hướng dẫn onboard AI agent mới (Claude Code, Codex, Gemini, Qwen, Cursor, …) vào dự án **LMS Maritime**. Áp dụng cho cả human contributor dùng tool AI assistant.

## 1. Prerequisites

### Cần có

- GitHub account với role `write` hoặc cao hơn trên `linhlinhlin/LMS_hohulili`
- Git version ≥ 2.40
- Node.js 20+ (cho FE work) hoặc Java 21+ + Maven 3.9+ (cho BE work)
- Docker Desktop / Colima (cho full-stack dev)
- gh CLI ≥ 2.40

### Nếu dùng Claude Code

- Claude Code CLI cài đặt: https://docs.claude.com/en/docs/claude-code
- Login: `claude login`
- Skill setup: skill folder đã có trong `.claude/skills/` (commit vào repo)

### Nếu dùng Codex CLI

- Codex CLI: https://github.com/openai/codex
- Login với OpenAI key
- Workspace: tự tạo `.codex/` nếu cần

### Nếu dùng Cursor / Copilot / Gemini

- Cursor: clone repo, mở workspace, install extension
- Copilot: enable trong GitHub Settings → Copilot
- Gemini: cài Cloud Code extension

## 2. First-time repo setup

```bash
# Clone
git clone git@github.com:linhlinhlin/LMS_hohulili.git
cd LMS_hohulili

# Install deps
cd fe && npm ci && cd ..
cd backend && mvn dependency:resolve && cd ..

# Verify build
(cd fe && npm run build) &
(cd backend && mvn compile -q -DskipTests) &
wait

# Setup env
cp .env.dev.example .env
# Edit .env với credential local — KHÔNG commit

# Bring up dev stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend
cd fe && npm start  # FE trên localhost:4200
```

Verify:

- http://localhost:8088/actuator/health → `{"status":"UP"}`
- http://localhost:4200 → login page hiện

## 3. Đọc bắt buộc trước khi code

Thứ tự, không skip:

1. **`CLAUDE.md`** — project overview, quick start, current status, architecture map
2. **`docs/reference/DOCUMENTATION_POLICY.md`** — quy tắc docs + archive
3. **`docs/reference/COMMIT_CONVENTION.md`** — commit format
4. **`docs/reference/MULTI_AGENT_COLLABORATION.md`** — quy tắc agent coordination
5. **`docs/reference/RUNTIME_CONVENTIONS.md`** — backend + FE convention
6. **`docs/reference/ROLE_ACCESS_MATRIX.md`** — multi-tier admin system
7. **`backend/docs/adr/ADR-*.md`** — architecture decisions

Nếu agent có context window lớn (Claude 1M, Gemini 2M): load tất cả vào context. Nếu nhỏ: load `CLAUDE.md` + file relevant tới task.

## 4. Setup skill / rule file (per-agent)

### Claude Code

- Skill library: `.claude/skills/` (commit vào repo) — hiện có 29 skills: angular-v20-frontend, 01-backend-ddd-development, adapt, audit, brainstorming, …
- Per-repo CLAUDE.md: `/CLAUDE.md` (đã có)
- Local settings: `.claude/settings.local.json` (gitignored — user-specific)

### Codex CLI

- Thêm repo-level instruction: tạo `AGENTS.md` ở root (hoặc `.codex/AGENTS.md`)
- Pattern: giống CLAUDE.md — project overview + conventions
- Note: `AGENTS.md` hiện đang gitignored qua `.git/info/exclude` (local-only)

### Cursor

- `.cursor/rules/`: rule files markdown
- Thêm rule file pointing tới `CLAUDE.md` + `docs/reference/*.md`

### Copilot (GitHub)

- `.github/copilot-instructions.md` (nếu muốn custom instructions)

### Gemini Code Assist

- `.idx/airules.md` hoặc similar — check Gemini docs

## 5. First task flow

```bash
# 1. Sync main
git checkout main && git pull

# 2. Check state
gh pr list --state open
gh issue list --state open --label "needs-triage"

# 3. Pick task — ví dụ issue #91
gh issue view 91

# 4. Branch
git checkout -b fix/offline-chunk-fetch-failures main

# 5. Code, test, commit
# ... edit files ...
mvn compile -q -DskipTests            # nếu đụng Java
(cd fe && npx tsc --noEmit)           # nếu đụng TS

git add <files>
git commit -m "$(cat <<'EOF'
fix(pwa): handle chunk fetch failures when device goes offline

<body giải thích>

Closes #91

Co-Authored-By: <Agent Name> <noreply@host>
EOF
)"

# 6. Push + PR
git push -u origin fix/offline-chunk-fetch-failures
gh pr create --base main --fill
```

Template PR tự fill từ `.github/pull_request_template.md` — agent điền đầy đủ.

## 6. Review process

Sau push:

1. **CI auto-run**: Backend Tests, Frontend Build, Compose Validation, Docker Smoke (~3-4 phút)
2. **CodeRabbit auto-review**: comment trong ~60s (tiếng Việt)
3. **Human maintainer review**: `@meiiie` (xem `.github/CODEOWNERS`)
4. **Approve + merge**: squash merge, branch auto-delete (sau khi admin bật setting)

Agent KHÔNG tự merge PR mình — xem [`MULTI_AGENT_COLLABORATION.md §8`](MULTI_AGENT_COLLABORATION.md).

## 7. Common patterns

### Backend (Spring Boot 3.2, Java 21, DDD)

- Xem `backend/docs/adr/ADR-001-clean-architecture.md`
- Domain model trong `*/domain/model/` — KHÔNG có `@Entity`
- JPA entity trong `*/infrastructure/persistence/entity/*JpaEntity.java`
- `JpaRepository<XJpaEntity, UUID>` — KHÔNG `<DomainModel, UUID>` → "Not a managed type" error
- UseCase ở `application/usecase/`, controller ở `infrastructure/web/`
- Tất cả `@PreAuthorize("hasRole('ADMIN')")` — include ORG_ADMIN trừ 3 endpoint system-only
- Test: JUnit 5 + Mockito + AssertJ + ArchUnit

### Frontend (Angular 20.3, Signals)

- Xem `backend/docs/adr/ADR-004-angular-signals-adoption.md`
- **0 legacy pattern** — không `@Input`, không `*ngIf`, không `standalone: true`
- Dùng `inject()`, `signal()`, `computed()`, `effect()`, `input()`, `output()`, `viewChild()`
- Control flow: `@if`, `@for`, `@switch`, `@empty`
- `ChangeDetectionStrategy.OnPush` 100%
- SCSS: Tailwind-based với design tokens (`#0056D2` primary)

### PWA / Offline

- Xem `backend/docs/adr/ADR-005-pwa-offline-strategy.md`
- IndexedDB compound key `[userId+...]` cho multi-account isolation
- Quiz offline: chỉ `PRACTICE`; `ASSESSMENT`/`EXAM` reject
- Video dùng Cache API route, KHÔNG IndexedDB
- Sync queue BẮT BUỘC có `clientOperationId`, `publicationId`, `occurredAt`

## 8. Deploy (production)

Production paused khi bàn giao runbook này — xem `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`.

CI/CD flow:

- Push to `main` → `.github/workflows/deploy.yml` chạy
- Build images → push lên GHCR
- Deploy job gated bằng repo variable `DEPLOY_ENABLED` (hiện `false`)

Khi cần deploy:

```bash
gh variable set DEPLOY_ENABLED --body true
git commit --allow-empty -m "chore: trigger deploy" && git push
```

## 9. Troubleshooting quick reference

| Symptom | Runbook |
|---|---|
| Backend crashes on startup | `docs/runbooks/PRODUCTION_SMOKE_TEST.md`, CLAUDE.md §"COMMON ERRORS" |
| PWA offline không hoạt động | `docs/runbooks/PWA_OFFLINE_RUNBOOK.md` |
| IndexedDB corrupt | `docs/runbooks/OFFLINE_STORAGE_CORRUPTION_RUNBOOK.md` |
| Sync conflict | `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md` |
| Video playback fail | `docs/runbooks/VIDEO_R2_SHAKA_CUTOVER_CHECKLIST.md` |
| Payment webhook error | `docs/runbooks/PAYMENT_PAYOUT_RUNBOOK.md` |
| Deploy fail | `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`, `.github/workflows/deploy.yml` |

## 10. Hygiene expectations

Per session:

- [ ] Verify git status clean trước khi exit
- [ ] Local branch đã merge: xóa (`git branch -d`)
- [ ] Nếu có WIP: tạo draft PR thay vì local-only
- [ ] Commit atomic (một concern per commit)
- [ ] Update `CHANGELOG.md` nếu commit lớn (feat, breaking, milestone)

Per week:

- [ ] Review Dependabot PRs mới (Monday)
- [ ] Check GitHub Security tab (Dependabot + Secret Scanning alerts)

## 11. Quick commands cheat sheet

```bash
# Sync + clean
git fetch origin --prune
git checkout main && git pull
git branch --merged main | grep -vE "^\*|main" | xargs -r git branch -d

# Start new task
git checkout -b <type>/<slug> main

# Pre-push
git diff --cached | grep -iE "password|secret|api_key|token" && echo "LEAK risk" || true
mvn compile -q -DskipTests  # BE
npx tsc --noEmit -p fe/tsconfig.json  # FE

# Push + PR
git push -u origin <branch>
gh pr create --base main --fill

# Review bot output
gh pr view <N> --comments

# After merge
git checkout main && git pull
git branch -d <branch>
```

## 12. References

- [`CLAUDE.md`](../../CLAUDE.md) — project overview
- [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md)
- [`COMMIT_CONVENTION.md`](COMMIT_CONVENTION.md)
- [`MULTI_AGENT_COLLABORATION.md`](MULTI_AGENT_COLLABORATION.md)
- [`RUNTIME_CONVENTIONS.md`](RUNTIME_CONVENTIONS.md)
- [`backend/docs/adr/`](../../backend/docs/adr/) — all ADRs
- [`docs/runbooks/`](../runbooks/) — operational runbooks
- [`../handoff/2026-04-24-admin-professional-setup.md`](../handoff/2026-04-24-admin-professional-setup.md) — admin setup handoff
