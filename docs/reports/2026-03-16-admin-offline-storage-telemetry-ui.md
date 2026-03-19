# Production Report: Admin Offline Storage Telemetry UI V1

> **Date**: 2026-03-16  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: Deploy successful, API smoke passed

## Mục tiêu

Đưa một màn quản trị riêng cho `offline storage telemetry` lên production để `ADMIN` có thể tra cứu nhanh sự cố PWA/offline storage mà không phụ thuộc hoàn toàn vào JSON cục bộ từ máy người dùng.

## Thay đổi đã deploy

- Route mới:
  - `/admin/offline-storage`
- Sidebar:
  - mục `Bộ nhớ ngoại tuyến` trong nhóm `Hệ thống`
- UI:
  - filter theo `eventType`
  - tìm theo `email/tên người dùng`
  - bảng log phân trang
  - panel chi tiết hiển thị `dbName`, `requiresRedownload`, `errorName`, `userAgent`, `payload`
- Backend filter:
  - mở rộng `GET /api/v3/admin/client-telemetry/offline-storage` với tham số `search`

## Verify production

### 1. Health

- `GET https://holilihu.online/actuator/health` -> `UP`

### 2. Admin query theo email

- Login `admin@maritime.edu`
- Gọi:

```text
GET /api/v3/admin/client-telemetry/offline-storage?page=0&size=5&search=student@maritime.edu
```

Kết quả:

- `success = true`
- `totalElements = 1`
- bản ghi đầu tiên trả đúng `userEmail = student@maritime.edu`

### 3. Chặn ORG_ADMIN đúng quyền

- Login `orgadmin@maritime.edu`
- Gọi:

```text
GET /api/v3/admin/client-telemetry/offline-storage?page=0&size=1
```

Kết quả:

- `403 Forbidden`

## Kết luận

UI admin V1 cho `offline storage telemetry` đã đủ dùng cho support/QA ở production:

- `ADMIN` tra cứu được log gần đây
- filter theo email hoạt động
- `ORG_ADMIN` không được mở rộng quyền ngoài phạm vi hệ thống

Phần chưa làm trong batch này:

- chart/trend analytics
- export CSV
- dashboard tổng hợp riêng
