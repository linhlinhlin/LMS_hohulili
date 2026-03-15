# Bug Handoffs

Thư mục này chứa các bug note hoặc handoff bug ở mức đủ chi tiết để team khác có thể reproduce và sửa.

## Khi nào dùng

- cần bàn giao bug giữa các agent/team
- cần lưu reproduce steps, root cause, và dữ liệu test
- cần giữ một bug mở ở dạng tài liệu ngắn trước khi code fix

## Lưu ý

- đây không phải source of truth vận hành
- bug đã fix xong nên được:
  - phản ánh vào `CHANGELOG.md` nếu đủ quan trọng
  - chuyển tri thức sống sang `runbook`, `reference`, hoặc code/test
