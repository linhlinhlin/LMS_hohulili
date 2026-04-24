# Commit Convention

Quy tắc commit message áp dụng cho **mọi contributor** (human, Claude Code, Codex, Dependabot, và agent khác). Được enforce bằng CodeRabbit + human maintainer review.

## 1. Format

```
<type>(<scope>): <subject>

<body — vì sao / edge case / decision>

<footer — co-authored-by, refs, breaking changes>
```

Line length: subject ≤ 72 ký tự, body wrap ~72-100 ký tự.

## 2. Type (bắt buộc 1 trong)

| Type | Ý nghĩa |
|---|---|
| `feat` | Tính năng mới user-facing |
| `fix` | Bug fix (regression hoặc khuyết defect) |
| `chore` | Cleanup, tooling, không đổi behavior |
| `refactor` | Code cải tổ, giữ nguyên behavior |
| `perf` | Tối ưu performance |
| `test` | Thêm / sửa test, không đụng code prod |
| `docs` | Documentation only |
| `ci` | CI/CD config changes |
| `build` | Build system (Maven, npm, Docker, Caddy) |
| `hotfix` | Production emergency fix |

Không có prefix nào khác được chấp nhận.

## 3. Scope (optional nhưng nên có)

Scope trong `()` — mô tả module/feature bị ảnh hưởng. Ví dụ:

- `feat(curriculum)`, `feat(quiz)`, `feat(payment)`
- `fix(pwa)`, `fix(offline)`, `fix(auth)`
- `chore(deps)`, `chore(scripts)`, `chore(docs)`
- `refactor(org-admin)`, `refactor(teacher)`
- `ci(deploy)`, `ci(test)`
- `docs(adr)`, `docs(runbook)`

Scope không phải 1 danh sách cố định — dùng theo context. Nhưng consistent: nếu đã dùng `curriculum` thì sau này cũng dùng `curriculum`, đừng đổi thành `course-curriculum`.

## 4. Subject

- Present tense, mệnh lệnh: "add", "fix", "remove" — KHÔNG "added", "fixed", "removing"
- Không dấu câu ở cuối
- Viết thường, trừ proper noun
- Không emoji
- Mô tả WHAT chứ không WHY (WHY ở body)

Good:

```
feat(curriculum): add chapter reorder via drag-drop
fix(offline): handle corrupted IndexedDB backing store
chore(deps): bump angular-compiler to 20.3.24
```

Bad:

```
✨ Added new curriculum feature!
Fix the bug.
Refactoring some stuff
```

## 5. Body

Giải thích **WHY** + **edge cases** + **trade-offs**. Không viết lại what đã có trong subject.

Example:

```
feat(curriculum): add chapter reorder via drag-drop

Teachers complained that reordering chapters required opening a
modal and clicking up/down buttons (7+ clicks per reorder). UI
audit (2026-04-12) flagged this as top friction point.

Uses @angular/cdk/drag-drop. Optimistic local update (no server
round-trip during drag); batch save on drop via PATCH endpoint.
Undo via Cmd+Z not supported in V1 — tracked in #125.
```

## 6. Footer — Co-authored-by (BẮT BUỘC khi có AI agent)

Mọi commit viết bởi AI agent (Claude Code, Codex, Gemini, etc.) PHẢI có `Co-Authored-By` trailer để audit được:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Hoặc:

```
Co-Authored-By: Codex CLI <noreply@openai.com>
```

Multiple agents cùng session: nhiều `Co-Authored-By` line.

Human commit (không dùng AI): không cần trailer.

Hiệu ứng: `git log --author="Claude"` sẽ filter được toàn bộ commit agent-assisted — giúp audit contribution ratio và regression tracing.

## 7. Breaking changes

Nếu PR break API contract, thêm footer:

```
BREAKING CHANGE: rename GET /api/v3/courses to /api/v3/courses/list.

Migration: clients sửa URL. Backend emit deprecation warning trên
endpoint cũ for 2 weeks before removing.
```

Body nên có section "Migration" hướng dẫn.

Label PR với `breaking-change`.

## 8. Linked issues

PR title nên:

- `Closes #N` nếu PR fix hoàn toàn issue N (auto-close khi merge)
- `Refs #N` nếu liên quan nhưng không đóng
- `Fixes #N` tương tự `Closes`

Nếu PR không link issue → phải là docs/chore nhỏ, hoặc tạo issue trước.

## 9. Multi-commit PR

Khi 1 PR có nhiều commit atomic (ví dụ refactor phức tạp):

- Mỗi commit tự đứng được (build + test pass nếu `git checkout <sha>`)
- Squash-merge sẽ gộp thành 1 — dùng "Pull request title" làm squash title
- Commit messages riêng không quan trọng sau merge, nhưng trước merge reviewer đọc từng commit → giữ professional

Khi nào **không** squash:

- Branch là trunk hoặc release branch (không có ở dự án này hiện tại)
- Nhiều co-author từ nhiều team (protect attribution)

## 10. Dependabot commit format

Dependabot tự tạo commit theo config trong `.github/dependabot.yml`:

```yaml
commit-message:
  prefix: "chore(deps)"
  prefix-development: "chore(deps-dev)"
  include: "scope"
```

Maintainer không sửa Dependabot message — chỉ approve/merge hoặc close.

## 11. Revert commit

Khi revert:

```
revert: <type>(<scope>): <subject của commit bị revert>

This reverts commit <SHA>.

Reason: <vì sao>

Tracking: #N (issue cho fix thật)
```

## 12. Verification

Pre-commit hook (optional, chưa setup tại repo này):

```bash
# commit-msg hook
#!/bin/sh
pattern='^(feat|fix|chore|refactor|perf|test|docs|ci|build|hotfix)(\([a-z0-9-]+\))?: .{1,72}'
if ! grep -qE "$pattern" "$1"; then
  echo "ERROR: Commit message không theo convention"
  exit 1
fi
```

CI không enforce hiện tại, nhưng human + CodeRabbit reviewer sẽ flag nếu lệch.

## 13. Examples — good

```
feat(curriculum): add chapter reorder via drag-drop

Closes #125

---

fix(offline): handle corrupted IndexedDB backing store

Recovery ladder:
1. try open — if fail, rotate DB name
2. retry open new DB
3. if still fail, clear all local storage + force relogin

Closes #91

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

---

chore(deps): bump angular-compiler 20.3.17 → 20.3.24

Fixes GHSA-g93w-mfhg-p222 XSS in i18n attribute bindings.
Regression tested: PWA offline, quiz take, payment flow.

Closes #115 (partial)

---

docs(adr): adopt Angular Signals for frontend state

ADR-004 documents the decision retroactively after 100% conversion
completed through S60-S80. CodeRabbit path_instructions now enforce
via .coderabbit.yaml.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## 14. Examples — bad

```
Fix stuff                        # no type, no scope, vague
feat: fixing a bug               # wrong type (should be fix)
FEAT(CURRICULUM): Added...       # uppercase, past tense
chore: deps bump                 # no scope, vague subject
update                           # useless
WIP                              # don't commit WIP to main branch
```

## 15. References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)
- [Angular Commit Message Format](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- `.coderabbit.yaml` path_instructions
- `docs/reference/MULTI_AGENT_COLLABORATION.md` — agent-specific rules
- `.github/pull_request_template.md` — PR template enforces conventional title
