# 🤖 AI Pipeline Workflow — LMS_hohulili

> **Bối cảnh:** TTTN VIMARU defense lần cuối (đầu tháng 6/2026). Tài liệu này định nghĩa pipeline 3-tier AI agent + GitHub standards để Claude Code tuân thủ qua các phiên làm việc.
>
> **Cập nhật:** 2026-04-28 | **Repo:** `linhlinhlin/LMS_hohulili` | **Owner:** `meiiie`

---

## 📋 Mục lục

1. [Kiến trúc 3-tier AI](#kiến-trúc-3-tier-ai)
2. [Vai trò từng agent](#vai-trò-từng-agent)
3. [Triggers (cách user gọi)](#triggers)
4. [GitHub Standards](#github-standards)
5. [Quality gates](#quality-gates)
6. [Playbooks (kịch bản hành động)](#playbooks)
7. [Anti-patterns](#anti-patterns-không-làm)
8. [Skills mapping](#skills-mapping)
9. [Decision log](#decision-log)

---

## Kiến trúc 3-tier AI

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Codex IDE    │ ──► │ Claude Code  │ ──► │ CodeRabbit   │ ──► │ User     │
│ (OpenAI)     │     │ (Anthropic)  │     │ (auto rev)   │     │ (meiiie) │
│ SPEC ISSUE   │     │ IMPLEMENT PR │     │ REVIEW PR    │     │ APPROVE  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┘
   audit + write        clone + code         comment +            merge +
   spec markdown        + test + deploy      auto-suggest         deploy
                                             fixes
```

**Nguồn:** Pattern Anthropic + Google + Stripe áp dụng 2026 — AI auditor specialization + AI implementer + AI reviewer + human gate.

---

## Vai trò từng agent

### 🛡️ Codex (OpenAI Codex IDE) — Auditor

- **Input:** prompt định nghĩa scope (xem prompt riêng đã setup)
- **Output:** GitHub Issues markdown blocks (user paste thủ công)
- **Trách nhiệm:**
  - Sweep codebase theo từng luồng (10 luồng định sẵn)
  - Spec vấn đề chi tiết: root cause, SOTA reference, acceptance criteria
  - Cite ≥ 2 tổ chức lớn cho mỗi issue
  - Estimate effort + risk
- **Không làm:** implement code, push commit, merge PR

### 🛠️ Claude Code (Anthropic) — Implementer

- **Input:** GitHub Issues với label `seed-data` / `tttn-defense`
- **Output:** PR sẵn để review + merge
- **Trách nhiệm:**
  - Đọc spec issue → verify với codebase + DB
  - Implement theo Clean Architecture + DDD
  - Tuân thủ Karpathy guidelines (surgical, simplicity, goal-driven)
  - Chạy test, deploy CI, verify acceptance criteria
  - Address CodeRabbit comments
  - Comment back issue với PR link + verification results
- **Không làm:** spec issue mới, merge PR, push direct main

### 🤖 CodeRabbit — Reviewer

- **Input:** PR mở
- **Output:** Comment review tự động + suggested commits
- **Config:** `.coderabbit.yaml` (đã cài sẵn)
- **Trách nhiệm:**
  - Phát hiện code smell, security issue, perf issue
  - Suggest improvements với patches sẵn
- **Không làm:** approve PR (cần human)

### 👤 User (meiiie) — Orchestrator + Approver

- **Trách nhiệm:**
  - Trigger: paste issues từ Codex vào GitHub
  - Trigger: gõ "check đi" để Claude bắt đầu
  - Review PR + CodeRabbit comments
  - Approve + merge
  - Cancel/escalate khi cần

---

## Triggers

### `check đi` (sweep mode)

User gõ khi Codex đã push issues mới lên GitHub. Claude sẽ:

1. `gh issue list -R linhlinhlin/LMS_hohulili --label seed-data --state open`
2. Sort theo priority (p0 → p1 → p2)
3. Pick issue đầu queue
4. Báo: "Bắt đầu issue #N — [title]"
5. Run [Playbook: Implement issue](#khi-nhận-1-issue) cho issue đó
6. Khi PR merged hoặc đặt vào trạng thái `claude-pr-ready`, tự động pick issue tiếp theo
7. Stop khi: queue rỗng HOẶC user nói "stop" HOẶC gặp error cần human

### `check #N` (single mode)

User chỉ định issue cụ thể. Claude chỉ làm issue đó, không sweep.

### Im lặng (default)

Không có trigger → Claude **KHÔNG** tự động làm gì trên repo. Tránh conflict với Codex/user commits.

---

## GitHub Standards

### Branch naming (kebab-case + prefix)

| Prefix | Use case | Ví dụ |
|---|---|---|
| `fix/` | Bug fix | `fix/course-list-chapter-count` |
| `feat/` | New feature | `feat/quiz-attempt-bulk-seed` |
| `chore/` | Refactor, tooling, deps | `chore/upgrade-spring-boot-3.3` |
| `docs/` | Docs only | `docs/ai-workflow-process` |
| `seed/` | Seed data migration | `seed/quiz-attempts-realistic` |
| `test/` | Test improvements | `test/coverage-enrollment-flow` |

**Không bao giờ:** spaces, underscore, camelCase, branch trên `main` trực tiếp.

### Commit messages (Conventional Commits)

Format đã được repo dùng nhất quán (xem `git log`):

```
<type>(<scope>): <subject ngắn gọn — tiếng Việt OK>

<body — giải thích why + what + impact, wrap ~72 cols>

<footer:
- Refs #N hoặc Closes #N
- Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>>
```

**Type hợp lệ:** `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `seed`, `diag`.

**Ví dụ tốt** (từ history repo):
```
fix(course-list): chapterCount luôn 0 — batch count thay vì lazy collection

Root cause: getPublicCourses() → toSummaryBatch() không hề set chapterCount
(int default = 0). toDetail() dùng course.getChapters().size() trên domain
model nơi collection không eager-loaded → cũng trả 0.

Fix theo pattern batch-aggregate đã dùng cho enrollmentCountMap.

Verify post-deploy: NAV-101 chapterCount=7 (DB: 7) ✓

Closes #N

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### PR template

```markdown
## 🎯 Mục tiêu
Closes #<issue-number>

## 📝 Thay đổi
- `<file>:<line>` — <thay đổi>
- `<file>:<line>` — <thay đổi>

## 🧪 Test plan
- [x] Unit/integration tests pass (X/Y tests)
- [x] Acceptance criteria của issue:
  - [x] <criterion 1 — verified by SQL/curl>
  - [x] <criterion 2>
- [x] Verified post-deploy trên prod

## 📊 Verification (số liệu cụ thể)
<curl output, SQL count, screenshot>

## 🏛️ SOTA pattern
- Mirror pattern <X> đã có sẵn trong codebase
- Reference: <Org A> + <Org B>

## ⚠️ Risks
- <Risk + mitigation>

## 🔄 Rollback
- <Strategy nếu fail post-deploy>

🤖 Generated with [Claude Code](https://claude.com/claude-code) following the AI Pipeline Workflow.
```

### Atomic commits

- 1 logical change per commit
- KHÔNG gộp "fix bug + refactor + add test" vào 1 commit
- KHÔNG split 1 thay đổi logic ra nhiều commit

### Linear history

- **Rebase** thay vì merge commit
- Squash khi merge PR (giữ history main sạch)
- Repo có 670 commits, history linear → giữ pattern này

### Issue references

- `Closes #N` — đóng issue khi PR merge
- `Refs #N` — chỉ tham chiếu, không đóng
- `Part of #N` — sub-task của issue lớn

---

## Quality gates

### Pre-commit (Claude tự check)

- [ ] `mvn test -Dtest='*<Scope>*'` pass
- [ ] No `--no-verify`, `--force-push`, `--no-gpg-sign`
- [ ] Karpathy compliance (xem [Anti-patterns](#anti-patterns-không-làm))
- [ ] No secrets/`.env*`/token committed
- [ ] Diff size hợp lý (issue spec ≈ effort estimate)

### Pre-push (trước khi `git push`)

- [ ] Full test scope đã pass local
- [ ] Branch name đúng convention
- [ ] Commit message theo Conventional Commits
- [ ] Verify acceptance criteria của issue đã đạt local

### Pre-PR-merge (Claude báo "ready" cho user)

- [ ] CI pass (build + test + deploy đều xanh)
- [ ] CodeRabbit không còn comment chưa address
- [ ] Verify acceptance criteria post-deploy (curl prod)
- [ ] Issue đã có comment với PR link + verification results

### Approver gate (User)

- [ ] Đọc PR body
- [ ] Spot check 1-2 file changes
- [ ] Đọc CodeRabbit verdict
- [ ] Approve + merge

---

## Playbooks

### Khi user gọi `check đi`

```
1. gh issue list -R linhlinhlin/LMS_hohulili \
     --label seed-data --state open \
     --json number,title,labels,body

2. Filter: chưa có label "status/claude-implementing" + "status/claude-pr-ready"

3. Sort theo: priority/p0 → p1 → p2 → priority/(none)

4. Nếu queue rỗng → báo user "Queue trống, không có issue mới"

5. Pick issue đầu → báo user "Bắt đầu issue #N — [title]"

6. Run [Playbook: Khi nhận 1 issue] cho issue đó

7. Sau khi PR ready → quay lại bước 1 cho issue tiếp theo

8. Stop conditions:
   - Queue rỗng
   - User nói "stop"
   - 3 issues liên tiếp gặp blocking error
```

### Khi nhận 1 issue

```
1. gh issue view <N> -R linhlinhlin/LMS_hohulili → đọc full body
2. Comment lên issue: "🤖 Claude bắt đầu — sẽ ping khi PR ready"
3. Add label: status/claude-implementing
4. git checkout main && git pull
5. git checkout -b <prefix>/<scope>-<short-desc>
6. Đọc files liên quan (path từ issue body)
7. Verify với prod DB nếu cần (gcloud SSH read-only)
8. Implement theo skill phù hợp (xem [Skills mapping])
9. mvn test -Dtest=... → ALL GREEN
10. git add <specific files> (KHÔNG `add -A`)
11. git commit theo Conventional Commits
12. git push -u origin <branch>
13. gh pr create với body theo PR template
14. Đợi CI:
    - Pass → comment lên issue: "PR #M ready, đợi CodeRabbit"
    - Fail → debug, push fix, KHÔNG --force-push
15. Đọc CodeRabbit comments → address từng cái → push fix
16. Run [Playbook: Verify post-deploy]
17. Add label: status/claude-pr-ready, remove status/claude-implementing
18. Comment final lên issue với verification kết quả
```

### Khi tests fail

```
1. KHÔNG --skip-tests, KHÔNG mock workaround
2. Đọc full stack trace
3. Identify root cause (test logic? code change? environment?)
4. Fix root cause:
   - Nếu test sai do API thay đổi → update test
   - Nếu code sai → fix code
   - Nếu environment → fix environment
5. Re-run → green
6. Commit fix riêng nếu là test-only change
```

### Khi deploy fail

```
1. gh run list --limit 1 → xem run nào fail
2. gh run view <run-id> --log-failed → đọc error
3. Common causes:
   - Compile error → mvn compile local trước khi push
   - Test fail → đã handle ở [Khi tests fail]
   - Migration fail → check Flyway log
   - Container startup → check application logs
4. Fix → push lại (KHÔNG --force)
5. Nếu prod đang down → notify user IMMEDIATELY
6. Rollback strategy (xem từng issue)
```

### Khi CodeRabbit comment

```
1. Đọc tất cả comments
2. Phân loại:
   - Bug thật → fix
   - Style suggestion → fix (consistency)
   - Nit/preference → comment lý do giữ nguyên
   - False positive → comment "agreed false positive" + lý do
3. Push fixes (commits riêng cho từng concern)
4. Comment "@coderabbitai resolve" sau khi address
5. Đợi re-review
```

### Khi conflict với commit của user/Codex

```
1. KHÔNG --force-push
2. git fetch origin
3. git rebase origin/main
4. Resolve conflicts (đọc kỹ cả 2 phía, merge logic)
5. mvn test → green
6. git push (regular, không force)
7. Nếu rebase mất safety → abort, ask user
```

---

## Anti-patterns (KHÔNG làm)

| Anti-pattern | Lý do |
|---|---|
| `git push --force` lên `main` | Mất history, không reversible |
| `git commit --no-verify` | Skip pre-commit hooks = trust violation |
| `git commit --amend` sau khi push | Force-push downstream |
| Direct push lên `main` | Bypass review gate |
| Commit `.env*`, secrets, tokens | Security incident |
| `mvn test -DskipTests` | Hidden regression |
| Refactor adjacent code khi fix bug | Karpathy: surgical changes |
| Tạo abstraction cho 1-use code | Karpathy: simplicity first |
| Generic seed data ("user_1", "course_test") | Quality bar fail |
| Bỏ dấu tiếng Việt | "Pham" thay vì "Phạm" — fail |
| Auto-merge PR | Cần human gate |
| Skip CodeRabbit comments | Workflow violation |
| Sweep ngoài scope issue | Scope creep |

---

## Skills mapping

Khi pick issue, đọc skill phù hợp trước khi implement:

| Issue scope | Skill chính | Skill phụ |
|---|---|---|
| Schema/migration/seed | `lms-schema-audit` | `postgresql`, `sql-optimization-patterns` |
| Performance (N+1, slow query) | `sql-optimization-patterns` | `postgresql` |
| Spring Boot bug/feature | `01-backend-ddd-development` | `karpathy-guidelines` |
| Angular FE bug/feature | `angular-v20-frontend` | `karpathy-guidelines` |
| Refactor/cleanup | `karpathy-guidelines` + `simplify` | — |
| UI/UX polish | `polish` + `web-design-guidelines` | `audit` |
| Docker/deployment | `docker-expert` + `docker-compose-production` | — |
| Security review | `security-review` | — |
| Deep root-cause | `cot-research` | — |

**Quy tắc:** Đọc SKILL.md TRƯỚC khi viết code. Skip skill = bypass best practice.

---

## Tracking

**GitHub Issues là source of truth.** KHÔNG tạo file tracker rời (rotting risk theo Karpathy).

### Labels schema

| Label | Giá trị |
|---|---|
| `priority/p0` | Critical, defense-blocker |
| `priority/p1` | High, demo-impacting |
| `priority/p2` | Medium, polish |
| `flow/learning` | Learning flow audit |
| `flow/auth` | Auth flow audit |
| `flow/discovery`, `flow/grading`, ... | (10 flows total) |
| `seed-data` | Seed data tasks |
| `tttn-defense` | TTTN scope |
| `status/codex-spec` | Codex đã spec, chưa pick up |
| `status/claude-implementing` | Claude đang code |
| `status/claude-pr-ready` | PR mở, đợi review |
| `status/blocked` | Cần user input |

### Setup labels (run 1 lần)

```bash
gh label create -R linhlinhlin/LMS_hohulili priority/p0 --color B60205 --description "Critical, defense-blocker"
gh label create -R linhlinhlin/LMS_hohulili priority/p1 --color D93F0B --description "High, demo-impacting"
gh label create -R linhlinhlin/LMS_hohulili priority/p2 --color FBCA04 --description "Medium, polish"
# ... (full list trong scripts/setup-labels.sh nếu cần)
```

---

## Decision log

### 2026-04-28 — Setup workflow

- ✅ Adopt 3-tier AI: Codex spec + Claude implement + CodeRabbit review
- ✅ Manual trigger "check đi" thay vì cron (cost optimization, user control)
- ✅ Repo: `linhlinhlin/LMS_hohulili`, account `meiiie`
- ✅ Branch: PR-only, linear history, rebase strategy
- ✅ This file: `docs/process/AI_WORKFLOW.md` — single source of truth cho workflow

### Để mở rộng tương lai

Khi có quyết định lớn ảnh hưởng workflow, append vào đây:

```
### YYYY-MM-DD — <decision title>
- Context: ...
- Decision: ...
- Trade-off: ...
- Alternatives considered: ...
```

---

## 📚 References

- [`CLAUDE.md`](../../CLAUDE.md) — Project overview
- [`MEMORY.md`](../../MEMORY.md) — Auto-memory index (Claude-only)
- [`backend/README.md`](../../backend/README.md) — Backend architecture
- [`fe/FRONTEND_ARCHITECTURE.md`](../../fe/FRONTEND_ARCHITECTURE.md) — Frontend architecture
- [`docs/PWA_OFFLINE_RESEARCH.md`](../PWA_OFFLINE_RESEARCH.md) — PWA decisions
- [`.coderabbit.yaml`](../../.coderabbit.yaml) — Auto-review config
- [`.claude/skills/`](../../.claude/skills/) — Available skills

---

*File này là contract giữa user (meiiie) và Claude Code. Update khi workflow thay đổi.*
