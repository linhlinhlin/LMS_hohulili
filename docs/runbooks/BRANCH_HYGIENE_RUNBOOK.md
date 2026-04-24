# Branch Hygiene Runbook

Runbook để dọn dẹp branch cũ an toàn. Chạy định kỳ cuối mỗi milestone (quarterly) hoặc sau khi merge nhiều PR.

## Nguyên tắc

- **Never force-push `main`, `develop`**
- **Không xóa branch mà chưa verify merge status** (`git branch --merged` hoặc `gh pr list --state merged`)
- **Luôn keep copy trên remote** cho tới khi chắc chắn (`git push origin --delete` là reversible trong vài ngày qua GitHub's reflog)
- **Local và remote tách biệt** — dọn local không ảnh hưởng remote và ngược lại

## 1. Audit

```bash
# Liệt kê tất cả branch local + remote
git branch -a

# Branch đã merge vào main
git branch --merged main

# Branch CHƯA merge
git branch --no-merged main

# Remote branch đã stale (không còn trên GitHub)
git remote prune origin --dry-run

# Last commit date cho mỗi branch local
git for-each-ref --sort=committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short)'
```

## 2. Xóa local branch an toàn

### 2.1 Branch đã merge vào main

```bash
# Liệt kê
git branch --merged main | grep -vE '^\*|^  main$|^  develop$'

# Xóa hàng loạt (an toàn — Git từ chối nếu chưa merge)
git branch --merged main \
  | grep -vE '^\*|^  main$|^  develop$' \
  | xargs -r git branch -d
```

`-d` (lowercase) từ chối xóa branch chưa merge → tự bảo vệ.

### 2.2 Branch chưa merge nhưng bạn chắc chắn bỏ

Chỉ dùng `-D` (uppercase) khi bạn đã confirm không cần nội dung:

```bash
git branch -D codex/wip-snapshot-20260325
```

Trước khi `-D`, luôn check diff:

```bash
git log main..codex/wip-snapshot-20260325 --oneline
git diff main...codex/wip-snapshot-20260325
```

Nếu thấy nội dung đáng giữ, tạo tag trước khi xóa:

```bash
git tag archive/codex/wip-snapshot-20260325 codex/wip-snapshot-20260325
git branch -D codex/wip-snapshot-20260325
# Push tag lên remote để preserve
git push origin archive/codex/wip-snapshot-20260325
```

## 3. Xóa remote branch

```bash
# Prune các remote-tracking branch đã bị xóa trên GitHub
git remote prune origin

# Xóa remote branch thủ công (sau khi đã merge)
git push origin --delete chore/dev-reset-script
```

Hoặc dùng `gh` để xóa hàng loạt branch của PR đã merge:

```bash
# Liệt kê PR merged gần đây
gh pr list --state merged --limit 20 --json number,headRefName

# Xóa branch của PR đã merged (GitHub tự offer nút "Delete branch" sau merge,
# dùng cái đó qua UI thay vì CLI là chuẩn nhất)
```

## 4. Claude Code / AI worktrees

Một số branch được tạo bởi Claude/agent workflow:

- `worktree-agent-*` — Claude worktree tạm (xóa được sau session)
- `claude/*` — Claude-created branch
- `codex/wip-snapshot-*`, `codex/recovery-lms-*` — OpenAI Codex WIP

**Nguyên tắc**: các branch này không phải source of truth. Khi session kết thúc, nội dung đã được promote sang proper `chore/*`, `feat/*`, `fix/*` branch — các WIP snapshot có thể xóa.

## 5. Checklist quarterly cleanup

Chạy tại cuối mỗi milestone:

- [ ] `git fetch --all --prune`
- [ ] Liệt kê branch chưa merge: `git branch --no-merged main`
- [ ] Review từng branch: có giá trị lưu không?
- [ ] Nếu không: `git branch -D <name>` hoặc tag-then-delete
- [ ] Xóa merged branch: `git branch --merged main | xargs git branch -d`
- [ ] Remote prune: `git remote prune origin`
- [ ] Xóa remote branch của PR đã merge qua GitHub UI
- [ ] Document cleanup trong `CHANGELOG.md` dưới `### Repo Health`

## 6. Tránh bị tích tụ lại

- Enable **"Automatically delete head branches"** trong GitHub repo settings → mỗi khi merge PR, branch tự bị xóa trên remote
- Dùng **short-lived branch** (< 1 tuần) — PR mở càng lâu càng dễ quên
- Đặt **naming convention**: `chore/*`, `feat/*`, `fix/*`, `hotfix/*` — xem [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Tag quan trọng trước khi xóa WIP branch, không reset `HEAD~N` để "ẩn" commit

## 7. Recovery nếu xóa nhầm

Git không thật sự xóa ngay — reflog giữ trong 30 ngày mặc định:

```bash
# Tìm commit của branch đã xóa
git reflog | grep <partial-branch-name>

# Khôi phục bằng cách tạo branch mới tại commit đó
git branch recovered-name <sha>
```

Với remote branch đã xóa: liên hệ GitHub support trong 90 ngày — họ có archival copy.

## 8. Tham khảo

- [`docs/reports/2026-04-24-repo-health-audit.md`](../reports/2026-04-24-repo-health-audit.md) — snapshot branch state tại checkpoint cấp khoa
- [GitHub Docs: Managing branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository)
- [Git Book: Branch management](https://git-scm.com/book/en/v2/Git-Branching-Branch-Management)
