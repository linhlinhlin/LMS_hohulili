# Spec: Admin UI cho Offline Storage Telemetry V1

> **Date**: 2026-03-16  
> **Status**: Approved for implementation  
> **Owner**: Codex

## Mục tiêu

Tạo một trang quản trị hệ thống để `ADMIN` tra cứu nhanh các lỗi `offline storage` quan trọng đã được client gửi về backend, thay vì phụ thuộc hoàn toàn vào JSON chẩn đoán cục bộ từ máy người dùng.

## Phạm vi V1

- Route quản trị riêng cho telemetry offline storage
- Chỉ mở cho `ADMIN`
- Hiển thị danh sách log gần đây có phân trang
- Bộ lọc theo:
  - `eventType`
  - tìm theo email/tên người dùng
- Xem chi tiết bản ghi:
  - user
  - route
  - availability
  - recoveryAction
  - dbName
  - requiresRedownload
  - errorName / errorMessage
  - payload JSON

## Không làm trong V1

- Dashboard analytics lớn
- biểu đồ xu hướng theo ngày/tháng
- export CSV
- ORG_ADMIN access
- realtime streaming / alerting

## Thiết kế

### Backend

- Mở rộng endpoint:
  - `GET /api/v3/admin/client-telemetry/offline-storage`
- Thêm filter `search`
  - match theo `email` hoặc `fullName`
- Giữ phân trang hiện tại
- Không thay đổi endpoint ingest client

### Frontend

- Route mới:
  - `/admin/offline-storage`
- Sidebar:
  - thêm mục `Bộ nhớ ngoại tuyến`
  - group `Hệ thống`
  - chỉ hiện với `ADMIN`
- Component:
  - `OfflineStorageTelemetryComponent`
  - external template
  - signals + OnPush

## UX

### Khối đầu trang

- tiêu đề: `Giám sát bộ nhớ ngoại tuyến`
- mô tả ngắn: dùng cho QA/support tra cứu lỗi `IndexedDB`, fallback `online-only`, và thao tác reset

### Summary cards

Do backend V1 chưa có aggregate endpoint riêng, summary cards sẽ dựa trên tập dữ liệu đang hiển thị:

- `Tổng bản ghi phù hợp`
- `Disabled`
- `Manual reset`
- `Recreate failed`

### Bộ lọc

- ô tìm kiếm `Email hoặc tên người dùng`
- select `Loại sự kiện`
- nút `Làm mới`
- nút `Xóa bộ lọc`

### Bảng log

Cột:

- người dùng
- sự kiện
- trạng thái
- route
- nền tảng
- thời gian xảy ra
- thao tác `Xem chi tiết`

### Panel chi tiết

- mở rộng ngay dưới hàng được chọn
- hiển thị đầy đủ:
  - `dbName`
  - `requiresRedownload`
  - `errorName`
  - `errorMessage`
  - `connectionType`
  - `payload`

## Kiểm thử

- `ADMIN` mở route mới được
- `ORG_ADMIN` không thấy menu và không vào được route
- lọc theo `eventType` hoạt động
- tìm theo email hoạt động
- xem chi tiết payload hoạt động
- frontend build pass

## Ghi chú triển khai

- Ưu tiên bám pattern hiện có của `AuditLogsComponent`
- Không nhét trang này vào `Analytics`; đây là màn support/operations, không phải dashboard kinh doanh
