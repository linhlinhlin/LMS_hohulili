# Production Report: Admin Offline Storage Telemetry Analytics Light

> **Date**: 2026-03-16  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: Deploy successful, analytics smoke passed

## Mục tiêu

Bổ sung analytics nhẹ ngay trên màn `ADMIN` offline storage telemetry để support/QA nhận biết nhanh:

- sự cố có đang lan rộng không
- route nào đang lỗi nhiều
- platform nào đang lỗi nhiều
- có bao nhiêu người dùng bị ảnh hưởng

## Thay đổi đã deploy

- Endpoint mới:
  - `GET /api/v3/admin/client-telemetry/offline-storage/analytics`
- Màn `/admin/offline-storage` có thêm:
  - switch `7/14/30 ngày`
  - summary cards
  - daily trend
  - top routes
  - top platforms

## Verify production

### 1. Health

- `GET https://holilihu.online/actuator/health` -> `UP`

### 2. Analytics endpoint

- Login `admin@maritime.edu`
- Gọi:

```text
GET /api/v3/admin/client-telemetry/offline-storage/analytics?days=7&search=student@maritime.edu
```

Kết quả:

- `success = true`
- `days = 7`
- `totalEvents = 3`
- `affectedUsers = 1`
- `topRoutes` có dữ liệu
- `topPlatforms` có dữ liệu

### 3. Route phục vụ bình thường

- `HEAD https://holilihu.online/admin/offline-storage` -> `200`

## Kết luận

Phase 2 analytics nhẹ đã đủ dùng cho vận hành:

- có số liệu tổng hợp
- có trend ngắn hạn
- có top route/platform để ưu tiên xử lý

Chưa làm trong batch này:

- export CSV
- cảnh báo tự động
- dashboard analytics tách riêng
