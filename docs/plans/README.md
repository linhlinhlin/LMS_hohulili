# Plans Guide

Thư mục này chứa plan, design note, và execution note theo từng đợt làm việc.

## Cách đọc đúng

- đây là tài liệu đang làm hoặc đã làm theo phiên
- có thể mô tả ý định, triển khai một phần, hoặc công việc đã hoàn tất tại thời điểm ghi
- không mặc định là source of truth hiện tại

## Quy ước tên file

- `YYYY-MM-DD-*-design.md`: hướng thiết kế, phương án, UX reasoning
- `YYYY-MM-DD-*.md`: execution plan, checklist, note triển khai

## Quy tắc bảo trì

- plan nào trở thành quy ước sống thì promote sang `docs/architecture/`, `docs/reference/`, `docs/runbooks/`, hoặc `docs/testing/`
- không dùng thư mục này để giữ runtime guidance lâu dài
