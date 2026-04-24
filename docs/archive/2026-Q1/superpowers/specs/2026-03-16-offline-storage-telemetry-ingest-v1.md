# Spec: Offline Storage Telemetry Ingest V1

> Ngày: 2026-03-16  
> Trạng thái: Approved for implementation  
> Phạm vi: Frontend PWA + Backend shared

## Mục tiêu

Cho phép hệ thống nhận và lưu các event lỗi quan trọng của offline storage lên backend để:

- QA/admin không phải chỉ dựa vào clipboard cục bộ
- dev có thể tra cứu lỗi production sau khi user thoát phiên
- support có dấu vết tập trung khi learner gặp `IndexedDB` corruption / fallback `online-only`

## Không làm trong V1

- không làm hệ analytics tổng quát
- không làm dashboard admin hoàn chỉnh
- không ingest toàn bộ console log
- không chặn UX nếu gửi telemetry thất bại

## Event scope V1

Chỉ ingest các event có giá trị điều tra cao:

- `recreate-failed`
- `disabled`
- `manual-reset`

`recovery-started` và `recovered` tiếp tục giữ ở client-side local telemetry, chưa bắt buộc đẩy lên server trong V1.

## Backend

### API

- `POST /api/v3/client-telemetry/offline-storage`
  - yêu cầu `isAuthenticated()`
  - nhận một event telemetry
  - append-only
  - trả `success`

- `GET /api/v3/admin/client-telemetry/offline-storage`
  - chỉ `ADMIN` và `ORG_ADMIN`
  - hỗ trợ phân trang cơ bản
  - filter tối thiểu:
    - `eventType`
    - `userId`

### Dữ liệu cần lưu

- `user_id`
- `event_type`
- `availability`
- `recovery_action`
- `db_name`
- `requires_redownload`
- `error_name`
- `error_message`
- `route`
- `user_agent`
- `platform`
- `connection_type`
- `occurred_at`
- `payload_json`
- `created_at`

V1 không cần index quá nhiều, chỉ đủ cho query gần nhất theo thời gian và lọc user/event type.

## Frontend

### Sender

Tạo một sender service toàn cục:

- subscribe vào telemetry stream hiện có
- chỉ gửi các event thuộc scope V1
- dùng `HttpBackend` để bỏ qua interceptor / offline queue
- nếu gửi lỗi:
  - không toast
  - không throw
  - chỉ fail silently

### Dedupe

Không gửi lặp cùng một `event.id` trong một phiên app.

### Khởi tạo

Sender được inject ở root app để hoạt động dù user không ở `/student/storage`.

## Security và privacy

- chỉ nhận event từ user đã xác thực
- không lưu token
- không lưu raw clipboard ngoài payload telemetry
- payload nên đủ chẩn đoán nhưng không chứa nội dung học hay đáp án quiz

## Verify V1

1. build frontend xanh
2. backend tests xanh
3. POST ingest bằng user thật trả `200`
4. khi mô phỏng corruption, frontend tự POST event `disabled`
5. admin query thấy event mới trong danh sách
