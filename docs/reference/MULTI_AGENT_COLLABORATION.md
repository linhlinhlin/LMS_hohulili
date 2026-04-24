# Multi-Agent Collaboration Rules

Quy tắc cho dự án **LMS Maritime** khi có nhiều AI agent (Claude Code, Codex, Gemini, Qwen, …) + human contributor cùng work trên repo.

Living doc — cập nhật khi adopt agent mới hoặc sửa workflow.

## 1. Tại sao cần rule này?

Mỗi agent session là một "contributor mới" vào repo, nhưng:

- Không thấy context các agent khác đang làm
- Không nhớ được rule đã agree trong session trước
- Có tendency tạo branch mới cho mỗi task → branch sprawl
- Có thể force-push, rewrite history, làm hỏng PR của agent khác

Rule cứng giúp coordinate mà không cần meta-agent orchestrator.

## 2. Branch naming

Format: `<type>/<short-slug>`.

Types được chấp nhận: `feat`, `fix`, `chore`, `refactor`, `perf`, `test`, `docs`, `ci`, `build`, `hotfix` — xem [`COMMIT_CONVENTION.md`](COMMIT_CONVENTION.md).

Examples:

- `feat/teacher-assignment-rubric`
- `fix/quiz-403-free-course`
- `chore/upgrade-angular-20.3.24`
- `docs/adr-video-streaming-choice`

**Không** dùng prefix agent-specific cho branch push lên remote. Ví dụ: `claude/foo` và `codex/bar` chỉ tồn tại local hoặc worktree — phải promote sang `<type>/*` trước khi push.

**Lifespan**: mục tiêu < 7 ngày. PR mở > 2 tuần không activity → đóng + tạo lại khi cần.

## 3. Conventional commits + agent attribution

```
feat(curriculum): add chapter reorder via drag-drop

<body>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Agent phải **luôn** thêm `Co-Authored-By` trailer khi commit được viết bởi AI. Human-only commit không cần.

Hiệu ứng: `git log --author="Claude"` filter được để audit.

Chi tiết: [`COMMIT_CONVENTION.md`](COMMIT_CONVENTION.md).

## 4. Tránh chồng chéo branch

**Rule vàng**: một file không được sửa song song bởi 2 agent trên 2 branch khác nhau đều chưa merge.

### Trước khi bắt đầu session

```bash
gh pr list --state open --json number,title,headRefName
```

Nếu có PR mở đụng file bạn định sửa:

- **Đợi PR đó merge trước** (khuyến nghị)
- **Hoặc rebase branch mình onto branch đang mở**, base PR trên PR đó — không khuyến khích trừ khi cần thiết

### Khi 2 agent cùng edit file

Một trong 2 branch sẽ bị conflict. Resolve:

```bash
git checkout <branch-cần-rebase>
git fetch origin
git rebase origin/main
# Resolve conflict thủ công hoặc qua IDE
git add <files>
git rebase --continue
git push --force-with-lease
```

**Dùng `--force-with-lease`** — không bao giờ `--force` bare. `--force-with-lease` check remote chưa move trước khi overwrite.

## 5. Pre-push checks (agent BẮT BUỘC chạy)

Trước `git push`:

- [ ] Conventional commit format (subject ≤ 72 chars, type đúng)
- [ ] Không commit secret (`.env*`, key, token) — grep check trước
- [ ] Files không intended (cache, build output) đã gitignored
- [ ] **Backend**: `mvn compile -q` pass (nếu đụng Java)
- [ ] **FE**: `npx ng build` hoặc tối thiểu `npx tsc --noEmit` pass
- [ ] Relevant test pass nếu đụng logic
- [ ] Không còn `console.log` tạm (trừ PWA intentional với prefix `[PWA]` / `[LMS-Offline]`)
- [ ] Không còn `TODO` / `FIXME` chưa mở issue
- [ ] Không có merge conflict marker (`<<<<<<<`, `=======`, `>>>>>>>`)

Nếu 1 check fail → fix trước khi push.

Verify:

```bash
git diff --cached | grep -E "^\+" | grep -iE "password|secret|api_key|token" || echo "OK no secret"
git diff --cached | grep -E "^\+.*console\.(log|debug)" && echo "WARN: console.log added" || echo "OK"
git diff --cached | grep -E "^\+.*TODO|FIXME" && echo "WARN: TODO added" || echo "OK"
```

## 6. Never force-push shared branches

- `main`: branch protection block force-push (sau khi admin setup)
- Branch khác đang có người/agent đang fork hoặc checkout: dùng `--force-with-lease` với clear communication
- Nếu cần rewrite history nặng: đóng PR cũ + mở PR mới thay thế

## 7. PR template compliance

`.github/pull_request_template.md` tự fill khi mở PR. Agent phải điền đủ:

- [x] Summary (1-2 câu)
- [x] Linked issue (`Closes #N` nếu có)
- [x] Change type (check exactly 1 loại)
- [x] What changed (bullet list file:line nếu giúp review)
- [x] Why (motivation)
- [x] Testing (cụ thể — KHÔNG viết "tested manually")
- [x] Risk & rollback
- [x] Checklist tick

Nếu PR thiếu mục → reviewer (human hoặc CodeRabbit) yêu cầu bổ sung trước approve.

## 8. Maintainer gate

**Agent tuyệt đối không tự merge PR của mình** — kể cả khi CI xanh + CodeRabbit approve.

- Merge chỉ được thực hiện bởi **human maintainer** hoặc **repo admin**
- Nếu agent hoạt động dưới credential của human (ví dụ user chạy Claude Code) — vẫn yêu cầu human tick "Approve" rõ ràng trong PR UI trước khi merge

Lý do: human final review là hàng rào cuối đảm bảo không có regression kỳ lạ mà bot bỏ sót.

## 9. Conflict resolution protocol

Sequential:

1. Agent A merge PR có file X
2. Agent B đang có branch B' đụng file X cũng đang mở PR
3. Github hiển thị "Conflicting" trên PR của B
4. Agent B rebase branch onto `main`:
   ```bash
   git fetch origin && git rebase origin/main
   # Resolve
   git add <files> && git rebase --continue
   git push --force-with-lease
   ```
5. CI re-run → merge

Nếu conflict quá phức tạp (> 10 file hoặc rename collision): **đóng PR** của B, cherry-pick commit lên branch mới, resolve từ đầu.

## 10. Documentation policy compliance

Khi agent chạm docs:

- **Doc sống** (`reference/`, `runbooks/`, `research/`, `architecture/` tên cố định): được sửa thoải mái
- **Doc archived** (`docs/archive/`): KHÔNG sửa. Nếu cần correction, tạo `ERRATUM.md` cùng folder
- **Working doc đã ship > 2 tuần** (`plans/`, `superpowers/specs/`, dated reports): promote core knowledge lên reference/runbook, `git mv` bản gốc vào archive
- **Language rule**: tiếng Việt cho ops docs (runbook, reference đề cập quy trình), tiếng Anh cho tên công nghệ (React, TypeScript, JPA, …)

Chi tiết: [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md).

## 11. Secret discipline

### Tuyệt đối không

- Commit `.env*` (kể cả tạm)
- Commit key, token, password, certificate
- Paste secret vào issue/PR comment (GitHub Secret Scanning sẽ flag)

### Nếu vô tình

1. Nếu chưa push: `git reset HEAD~1` + rewrite
2. Nếu đã push: **rotate secret ngay** trên production, sau đó rewrite history:
   ```bash
   git filter-repo --path <file> --invert-paths
   git push --force-with-lease  # cần coordination với team
   ```
3. Hoặc dùng BFG Repo-Cleaner

### Prevention

- GitHub Secret Scanning push protection (admin enable) block commit có token pattern
- `.gitignore` comprehensive
- Pre-commit scanner (optional): `gitleaks`, `truffleHog`

## 12. Agent-specific files

- `.claude/` — Claude Code workspace + skills + local settings
- `.codex/` — Codex CLI workspace
- `.github/copilot-instructions.md` — GitHub Copilot (nếu adopt)
- `.cursor/` — Cursor IDE rules

**Rule**: mỗi agent chỉ sửa folder của mình. Không cross-modify. Nếu adopt agent mới:

1. Tạo folder `.<tool>/`
2. Thêm vào `.gitignore` nếu là per-user local (setting, cache)
3. Commit folder level vào repo nếu là team-shared config (skills, path instructions)
4. Update `docs/reference/AGENT_ONBOARDING.md` với setup steps cho agent mới

## 13. Issue tracking discipline

### PR đáng kể (feat, fix P0/P1, refactor, breaking-change)

- Phải link issue: `Closes #N` hoặc `Refs #N`
- Issue tạo qua template: `.github/ISSUE_TEMPLATE/{bug,feature,documentation}.md`
- Label đúng scope: `frontend` / `backend` / `infra` / `documentation`
- Priority: `P0` / `P1` / `P2` / `P3` (xem label descriptions)

### PR nhỏ (docs typo, chore dọn dẹp < 50 LOC)

- Không cần issue
- Vẫn cần PR + reviewer

## 14. Weekly rhythm agent phải theo

- **Monday 08:00 Asia/Ho_Chi_Minh**: Dependabot batch PR xuất hiện — review + triage
- **Trước mỗi session**: `git pull origin main` + `gh pr list` xem state
- **Sau mỗi session**: clean up local branch đã merge (`git branch --merged main | xargs git branch -d`)
- **Cuối tuần**: không commit WIP; nếu cần, push draft PR với label `blocked`

## 15. Escalation

Nếu agent gặp tình huống rule không cover:

1. **Đọc ADR** trong `backend/docs/adr/` — architecture decisions
2. **Đọc runbook** phù hợp trong `docs/runbooks/`
3. **Đọc CLAUDE.md** + `AGENTS.md` (nếu agent có quyền đọc) — project overview
4. **Open issue + label `needs-triage`** để human maintainer phân loại
5. **Không tự tạo rule mới** vào docs mà chưa được maintainer approve

## 16. Compliance verification

Script check (có thể chạy định kỳ):

```bash
# Commit trong 30 ngày gần nhất có Co-Authored-By nếu từ agent
git log --since="30 days ago" --grep="feat\|fix\|chore" --format="%H %an %s" \
  | while read sha author subject; do
      trailer=$(git log -1 --format="%(trailers:key=Co-Authored-By)" $sha)
      if echo "$subject" | grep -iE "claude|codex|ai-generated" > /dev/null; then
        [ -z "$trailer" ] && echo "MISSING trailer: $sha"
      fi
    done

# Branch local merged chưa xóa
git branch --merged main | grep -vE "^\*|main"

# Branch quá 14 ngày
git for-each-ref --sort=committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short)' \
  | awk -v cutoff="$(date -d '14 days ago' +%Y-%m-%d)" '$1 < cutoff'
```

## 17. References

- [`COMMIT_CONVENTION.md`](COMMIT_CONVENTION.md)
- [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md)
- [`AGENT_ONBOARDING.md`](AGENT_ONBOARDING.md)
- [`../runbooks/BRANCH_HYGIENE_RUNBOOK.md`](../runbooks/BRANCH_HYGIENE_RUNBOOK.md)
- [`../runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md`](../runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md)
- [`../../.github/CODEOWNERS`](../../.github/CODEOWNERS)
- [`../../.coderabbit.yaml`](../../.coderabbit.yaml)
- [`../../CLAUDE.md`](../../CLAUDE.md)
