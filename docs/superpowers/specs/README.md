# Specs

Design / handoff specs tạo ra TRƯỚC khi implement. Lưu reasoning để review và handoff cross-team.

## Đang có

_(trống — Q1 2026 đã archive sang [`docs/archive/2026-Q1/superpowers/specs/`](../../archive/2026-Q1/superpowers/specs/))._

## Nguyên tắc

Specs **không tự động** trở thành source of truth. Khi feature ship + ổn định, promote living parts vào:

- `docs/architecture/`
- `docs/reference/`
- `docs/runbooks/`

Sau đó `git mv` spec gốc sang archive theo [`DOCUMENTATION_POLICY.md §6`](../../reference/DOCUMENTATION_POLICY.md).

## Convention

`YYYY-MM-DD-<topic>-design.md` hoặc `YYYY-MM-DD-<topic>.md` tuỳ phạm vi.

## Đã promote

- Google login environment setup/rollout → `docs/runbooks/GOOGLE_LOGIN_GIS_SETUP_RUNBOOK.md`
