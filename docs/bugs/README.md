# Bug handoffs

Bug note / handoff ở mức đủ chi tiết để team khác reproduce + fix.

## Đang có

_(chưa có bug mở — các bug resolved Q1 đã archive sang [`docs/archive/2026-Q1/bugs/`](../archive/2026-Q1/bugs/))._

## Khi nào tạo file ở đây

- Bàn giao bug giữa agent/team
- Lưu reproduce steps, root cause, dữ liệu test
- Giữ một bug ở dạng handoff trước khi code fix

## Lifecycle

- Bug fixed → phản ánh vào `CHANGELOG.md` nếu đáng kể, chuyển knowledge sống sang `runbook/` / `reference/` / code test
- Sau khi đóng, `git mv` file vào `archive/YYYY-QN/bugs/`
