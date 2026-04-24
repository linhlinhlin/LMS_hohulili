<!--
Tiêu đề PR: dùng conventional commit prefix
  feat | fix | docs | chore | refactor | perf | test | ci | build
Ví dụ: "feat(curriculum): add chapter reorder via drag-drop"
-->

## Summary

<!-- 1-2 câu mô tả thay đổi này làm gì và vì sao. -->

## Linked issues

Closes #

## Change type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] Infra / CI
- [ ] Breaking change

## What changed

<!-- Bullet list các thay đổi kỹ thuật chính. Liên kết file:line nếu giúp review. -->

-

## Why

<!-- Motivation ngắn gọn: user problem, constraint, quyết định kỹ thuật. -->

## Testing

<!-- Liệt kê cách đã verify. Không viết "tested manually" chung chung. -->

- [ ] Unit / integration tests
- [ ] Manual smoke test: ...
- [ ] Browser check (nếu FE): ...
- [ ] Production-like env (docker-compose.prod.yml): ...

## Risk & rollback

<!-- Rủi ro chính + cách rollback (git revert SHA hoặc feature flag). -->

- **Risk**:
- **Rollback**:

## Screenshots / artifacts

<!-- FE: before/after screenshot. BE: curl response. -->

## Checklist

- [ ] Tuân thủ conventional commits
- [ ] Không commit secret (`.env*`, key, token)
- [ ] Cập nhật docs nếu thay đổi public API hoặc deploy flow
- [ ] Không để dead code / TODO không có issue
- [ ] CI pass (backend tests, frontend build, compose validate, smoke)
- [ ] Self-reviewed diff
