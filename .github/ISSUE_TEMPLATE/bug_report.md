---
name: Bug report
about: Báo lỗi reproducible trong production, staging, hoặc dev
title: "bug: "
labels: ["bug", "triage"]
assignees: []
---

## Tóm tắt

<!-- Một câu mô tả lỗi. -->

## Môi trường

- Surface: `[fe | backend | infra | docker-compose]`
- URL hoặc route: `...`
- Branch / commit SHA: `...`
- Browser / OS (nếu FE): `...`

## Steps to reproduce

1.
2.
3.

## Kết quả hiện tại

<!-- Log, screenshot, HTTP status, stack trace. -->

## Kết quả mong muốn

<!-- Hành vi đúng theo spec. -->

## Mức độ ảnh hưởng

- [ ] P0 — chặn production, cần hotfix
- [ ] P1 — ảnh hưởng user flow chính
- [ ] P2 — workaround có sẵn
- [ ] P3 — cosmetic / edge case

## Checklist trước khi gửi

- [ ] Đã reproduce ít nhất 2 lần
- [ ] Đã search issue trùng
- [ ] Đã xem `docs/runbooks/` / `docs/bugs/README.md`
- [ ] Đã đính kèm log/screenshot nếu khả thi
