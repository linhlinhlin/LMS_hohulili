# Handoff docs

Tài liệu **point-in-time** dùng để bàn giao giữa các team/agent/maintainer tại một thời điểm cụ thể. Khác với `runbooks/` (living — luôn active) và `archive/` (historical — không sửa), handoff là dạng trung gian: **được thực hiện một lần rồi archive**.

## Convention đặt tên

```
YYYY-MM-DD-<subject>.md
```

Ví dụ: `2026-04-24-admin-professional-setup.md`

## Lifecycle

1. **Soạn**: người bàn giao viết theo template bên dưới
2. **Gửi**: share link/paste nội dung tới người nhận
3. **Thực hiện**: người nhận tick từng checklist trong doc (edit file trực tiếp, commit)
4. **Archive**: khi hoàn tất > 2 tuần → `git mv docs/handoff/<file> docs/archive/YYYY-QN/handoff/`

## Template tối thiểu

```markdown
# Handoff: <tiêu đề> — YYYY-MM-DD

> **From**: <tên người soạn>
> **To**: <tên người nhận>
> **Deadline**: YYYY-MM-DD hoặc "không urgent"
> **Scope**: 1-2 câu mô tả phạm vi

## Context
## Prerequisites
## Steps
- [ ] step 1
- [ ] step 2
## Verification
## Troubleshooting
## After completion
```

## Handoff hiện có

- `2026-04-24-admin-professional-setup.md` — bàn giao admin setup GitHub professional + CodeRabbit + multi-agent PR rules
