# Production Report: Offline Storage Telemetry Ingest V1

> **Date**: 2026-03-16  
> **Environment**: Production (`https://holilihu.online`)  
> **Operator**: Codex  
> **Status**: Deploy successful, API smoke passed

## Mục tiêu

Batch này bổ sung một kênh ingest tối thiểu để các lỗi `offline storage` quan trọng không chỉ nằm trong clipboard cục bộ của người dùng.

Mục tiêu V1:

- frontend gửi telemetry best-effort khi gặp event quan trọng
- backend nhận và lưu lại có cấu trúc
- `ADMIN` có thể tra cứu log gần đây mà không cần chờ người dùng sao chép JSON

## Scope đã triển khai

### Frontend

- File:
  - `fe/src/app/core/services/offline-storage-telemetry-ingest.service.ts`
  - `fe/src/app/app.ts`

- Hành vi:
  - theo dõi event từ `OfflineStorageTelemetryService`
  - chỉ gửi các event:
    - `recreate-failed`
    - `disabled`
    - `manual-reset`
  - chỉ gửi khi:
    - user đã đăng nhập
    - thiết bị đang online
    - event chưa từng gửi trong phiên local hiện tại
  - dùng `HttpBackend` để bypass offline interceptor và sync queue

### Backend

- Endpoint:
  - `POST /api/v3/client-telemetry/offline-storage`
  - `GET /api/v3/admin/client-telemetry/offline-storage`

- Persistence:
  - migration `V93__offline_storage_telemetry.sql`
  - bảng `offline_storage_telemetry`

- Chính sách:
  - `POST` yêu cầu `isAuthenticated()`
  - `GET admin` yêu cầu `hasRole('ADMIN')`
  - chỉ chấp nhận `eventType`, `availability`, `recoveryAction` trong whitelist V1

## Giá trị vận hành

Sau batch này, QA/admin có thể:

- biết user nào đang gặp lỗi offline storage
- lọc theo `eventType`
- xem nhanh `errorName`, `errorMessage`, `route`, `platform`, `connectionType`
- phân biệt event `manual-reset` với `disabled`

## Verify sau deploy

### 1. Health

- `GET https://holilihu.online/actuator/health` -> `UP`
- `HEAD/GET https://holilihu.online/student/storage` -> `200`

### 2. Student ingest smoke

- Login bằng `student@maritime.edu`
- Gọi `POST /api/v3/client-telemetry/offline-storage`
- Payload smoke:
  - `eventType = manual-reset`
  - `availability = online-only`
  - `recoveryAction = manual-reset`
  - `route = /student/storage`
  - `errorName = UnknownError`

Kết quả:

- `success = true`
- message trả về: ghi nhận telemetry thành công

### 3. Admin query smoke

- Login bằng `admin@maritime.edu`
- Gọi `GET /api/v3/admin/client-telemetry/offline-storage?page=0&size=5&eventType=manual-reset`

Kết quả:

- `success = true`
- `totalElements = 1`
- Bản ghi đầu tiên đọc ra đúng:
  - `userEmail = student@maritime.edu`
  - `eventType = manual-reset`
  - `availability = online-only`
  - `dbName = lms-maritime-offline-v3`
  - `route = /student/storage`
  - `errorName = UnknownError`

## Kết luận

Batch ingest V1 đã lên production và đang hoạt động đúng ở mức API/runtime cơ bản:

- frontend shell vẫn lên bình thường sau khi nối sender vào root app
- user đã đăng nhập có thể ghi telemetry offline storage lên backend
- `ADMIN` có thể đọc lại log gần đây từ production database

V1 hiện đủ dùng cho QA/support tra cứu nhanh các lỗi `offline storage` nghiêm trọng mà không còn lệ thuộc hoàn toàn vào clipboard JSON từ máy người dùng.

## Lưu ý

- Đây là ingest tối thiểu, chưa phải analytics pipeline đầy đủ.
- Telemetry vẫn là best-effort:
  - gửi lỗi không được thì không chặn UX
  - không có retry queue riêng cho telemetry này
- Hiện chưa có UI admin chuyên biệt; admin tra cứu qua API là đủ cho V1.
