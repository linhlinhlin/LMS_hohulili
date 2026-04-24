# Superpowers

Specs / handoff docs sinh ra từ workflow thiết kế agent-driven. Dùng để đồng bộ hướng triển khai khi feature đủ lớn.

## Cấu trúc

- `specs/` — design specs đang active

## Lưu ý

- Không phải runtime truth lâu dài. Khi feature ship + ổn định, promote phần sống sang `architecture/` / `reference/` / `runbooks/` / `testing/`, sau đó `git mv` spec gốc vào `archive/YYYY-QN/superpowers/`.
- Lịch sử Q1 2026: [`docs/archive/2026-Q1/superpowers/`](../archive/2026-Q1/superpowers/).
