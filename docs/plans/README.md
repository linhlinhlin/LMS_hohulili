# Plans

Thư mục chứa plan / design note đang trong phase thiết kế hoặc handoff.

## Đang có

_(chưa có plan active — Q1 2026 đã được archive ngày 24-04-2026)._

Khi bắt đầu một plan mới, thêm file theo convention `YYYY-MM-DD-<topic>-design.md` hoặc `YYYY-MM-DD-<topic>.md`.

## Cách đọc đúng

- Plan ở đây là **đang làm hoặc sắp làm**, không mặc định đã ship.
- Không coi là runtime truth — truth đi sau implementation + promote sang `reference/` / `runbooks/` / `architecture/`.

## Quy ước tên

- `YYYY-MM-DD-<topic>-design.md`: design direction, UX reasoning, alternatives
- `YYYY-MM-DD-<topic>.md`: execution plan, checklist, handoff

## Maintenance

- Plan đã ship + ổn định ≥ 2 tuần → promote cốt lõi sang `architecture/` / `reference/` / `runbooks/`, sau đó `git mv` file gốc vào `archive/YYYY-QN/plans/` theo [`DOCUMENTATION_POLICY.md §6`](../reference/DOCUMENTATION_POLICY.md).
- Lịch sử Q1 2026: [`docs/archive/2026-Q1/plans/`](../archive/2026-Q1/plans/).
